import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { uploadToR2 } from "@/lib/r2";

type RouteContext = { params: Promise<{ id: string }> };

const upsertAudioUrlsScript = kv.createScript<string>(
  [
    "local articleKey = KEYS[1]",
    "local segmentId = ARGV[1]",
    "local url = ARGV[2]",
    "local wordTimingsJson = ARGV[3]",
    "local current = redis.call('HGET', articleKey, 'audioUrls')",
    "local list = {}",
    "if current and current ~= false then",
    "  local ok, decoded = pcall(cjson.decode, current)",
    "  if ok and type(decoded) == 'table' then",
    "    if decoded[1] ~= nil or next(decoded) == nil then",
    "      list = decoded",
    "    else",
    "      list = {}",
    "    end",
    "  else",
    "    list = { current }",
    "  end",
    "end",
    "local needle = '/' .. segmentId .. '.wav'",
    "local replaced = false",
    "for i = 1, #list do",
    "  local item = list[i]",
    "  if type(item) == 'string' and string.find(item, needle, 1, true) then",
    "    list[i] = url",
    "    replaced = true",
    "    break",
    "  end",
    "end",
    "if not replaced then",
    "  table.insert(list, url)",
    "end",
    "redis.call('HSET', articleKey, 'audioUrls', cjson.encode(list))",

    "local syncKey = 'segmentWordTimings'",
    "local currentSync = redis.call('HGET', articleKey, syncKey)",
    "local sync = {}",
    "if currentSync and currentSync ~= false then",
    "  local ok2, decoded2 = pcall(cjson.decode, currentSync)",
    "  if ok2 and type(decoded2) == 'table' then",
    "    sync = decoded2",
    "  else",
    "    sync = {}",
    "  end",
    "end",

    "if wordTimingsJson == nil or wordTimingsJson == '' then",
    "  sync[segmentId] = nil",
    "else",
    "  local ok3, decoded3 = pcall(cjson.decode, wordTimingsJson)",
    "  if ok3 and type(decoded3) == 'table' then",
    "    sync[segmentId] = decoded3",
    "  else",
    "    sync[segmentId] = nil",
    "  end",
    "end",

    "if next(sync) == nil then",
    "  redis.call('HDEL', articleKey, syncKey)",
    "else",
    "  redis.call('HSET', articleKey, syncKey, cjson.encode(sync))",
    "end",
    "return 'OK'",
  ].join("\n")
);

// POST /api/articles/[id]/audio - 上传段落音频
export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  let segmentId: string | null = null;
  let wordTimingsJson = "";

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("解析音频上传表单失败", { articleId: id, error });
    return Response.json({ error: "解析上传数据失败" }, { status: 400 });
  }

  const file = formData.get("audio") as Blob | null;
  segmentId = formData.get("segmentId") as string | null;
  const wordTimingsRaw = formData.get("wordTimings");

  if (!file) {
    return Response.json({ error: "缺少音频文件" }, { status: 400 });
  }

  if (!segmentId) {
    return Response.json({ error: "缺少段落 ID" }, { status: 400 });
  }

  if (typeof wordTimingsRaw === "string") {
    wordTimingsJson = wordTimingsRaw;
    if (wordTimingsJson.trim()) {
      try {
        const parsed = JSON.parse(wordTimingsJson) as unknown;
        if (!Array.isArray(parsed)) {
          return Response.json({ error: "wordTimings 格式错误" }, { status: 400 });
        }
        for (const item of parsed) {
          if (!item || typeof item !== "object") {
            return Response.json({ error: "wordTimings 格式错误" }, { status: 400 });
          }
          const start = (item as { start?: unknown }).start;
          const end = (item as { end?: unknown }).end;
          if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end)) {
            return Response.json({ error: "wordTimings 格式错误" }, { status: 400 });
          }
        }
      } catch {
        return Response.json({ error: "wordTimings 格式错误" }, { status: 400 });
      }
    }
  }

  const articleKey = `article:${id}`;
  const exists = await kv.exists(articleKey);
  if (!exists) {
    return Response.json({ error: "文章不存在" }, { status: 404 });
  }

  const key = `audio/${id}/${segmentId}.wav`;

  let url: string;
  try {
    url = await uploadToR2(key, file, file.type || "audio/mpeg");
  } catch (error) {
    console.error("上传到 R2 失败", { articleId: id, segmentId, error });
    return Response.json({ error: "上传到存储失败，请稍后重试" }, { status: 502 });
  }

  try {
    await upsertAudioUrlsScript.exec([articleKey], [segmentId, url, wordTimingsJson]);
  } catch (error) {
    console.error("更新文章音频索引失败", { articleId: id, segmentId, error });
    return Response.json({ error: "保存音频地址失败，请稍后重试" }, { status: 500 });
  }

  return Response.json({ url });
}
