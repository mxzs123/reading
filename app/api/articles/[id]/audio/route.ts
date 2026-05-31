import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { errorResponse, readFormDataRequest, runApiStep } from "@/lib/http";
import { uploadToR2 } from "@/lib/r2";
import type { WordTiming } from "@/lib/storage";
import { parseWordTimingsJson } from "@/lib/wordTimings";

type RouteContext = { params: Promise<{ id: string }> };
const WORD_TIMINGS_ERROR = "wordTimings 格式错误";

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const form = await readFormDataRequest(request, "解析上传数据失败");
  if (!form.ok) return form.response;

  const file = form.formData.get("audio") as Blob | null;
  const segmentId = form.formData.get("segmentId") as string | null;
  const wordTimingsRaw = form.formData.get("wordTimings");

  if (!file) {
    return errorResponse("缺少音频文件", 400);
  }

  if (!segmentId) {
    return errorResponse("缺少段落 ID", 400);
  }

  let wordTimings: WordTiming[] | undefined;
  try {
    wordTimings = parseWordTimingsJson(wordTimingsRaw);
  } catch {
    return errorResponse(WORD_TIMINGS_ERROR, 400);
  }

  const dataStore = getDataStore();
  const exists = await dataStore.articles.articleExists(id);
  if (!exists) {
    return errorResponse("文章不存在", 404);
  }

  const key = `audio/${id}/${segmentId}.wav`;

  const upload = await runApiStep(
    () => uploadToR2(key, file, file.type || "audio/mpeg"),
    "上传到存储失败，请稍后重试",
    502
  );
  if (!upload.ok) return upload.response;

  const save = await runApiStep(
    () => dataStore.articles.upsertArticleAudio(id, segmentId, upload.value, wordTimings),
    "保存音频地址失败，请稍后重试",
    500
  );
  if (!save.ok) return save.response;

  return Response.json({ url: upload.value });
}
