import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { uploadToR2 } from "@/lib/r2";
import type { WordTiming } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/articles/[id]/audio - 上传段落音频
export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  let segmentId: string | null = null;
  let wordTimings: WordTiming[] | undefined;

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
    if (wordTimingsRaw.trim()) {
      try {
        const parsed = JSON.parse(wordTimingsRaw) as unknown;
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
        wordTimings = parsed as WordTiming[];
      } catch {
        return Response.json({ error: "wordTimings 格式错误" }, { status: 400 });
      }
    }
  }

  const dataStore = getDataStore();
  const exists = await dataStore.articles.articleExists(id);
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
    await dataStore.articles.upsertArticleAudio(id, segmentId, url, wordTimings);
  } catch (error) {
    console.error("更新文章音频索引失败", { articleId: id, segmentId, error });
    return Response.json({ error: "保存音频地址失败，请稍后重试" }, { status: 500 });
  }

  return Response.json({ url });
}
