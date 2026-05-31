import { request, requestJson, requestJsonBody, requestVoid } from "@/lib/clientRequest";

export interface Article {
  id: string;
  title: string;
  text: string;
  audioUrls?: string[];
  segmentWordTimings?: Record<string, WordTiming[]>;
  createdAt: number;
  updatedAt: number;
}

export type WordTiming = { start: number; end: number };

export async function getAllArticles(): Promise<Article[]> {
  return requestJson<Article[]>(
    "/api/articles",
    {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    },
    "获取文章列表失败"
  );
}

export async function saveArticle(
  article: Partial<Omit<Article, "createdAt" | "updatedAt">> & { text: string }
): Promise<Article> {
  const isUpdate = Boolean(article.id);
  return requestJsonBody<Article>(
    isUpdate ? `/api/articles/${article.id}` : "/api/articles",
    isUpdate ? "PUT" : "POST",
    article,
    isUpdate ? "更新文章失败" : "创建文章失败"
  );
}

export async function deleteArticle(id: string): Promise<void> {
  await requestVoid(`/api/articles/${id}`, { method: "DELETE" }, "删除文章失败");
}

export async function uploadAudio(
  articleId: string,
  segmentId: string,
  audioBlob: Blob,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    wordTimings?: WordTiming[];
  }
): Promise<string> {
  const controller = new AbortController();
  const cleanup: Array<() => void> = [];

  if (options?.timeoutMs && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
    const timeoutId = globalThis.setTimeout(() => controller.abort(), options.timeoutMs);
    cleanup.push(() => globalThis.clearTimeout(timeoutId));
  }

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      options.signal.addEventListener("abort", onAbort);
      cleanup.push(() => options.signal?.removeEventListener("abort", onAbort));
    }
  }

  const formData = new FormData();
  formData.append("audio", audioBlob);
  formData.append("segmentId", segmentId);
  formData.append(
    "wordTimings",
    options?.wordTimings && options.wordTimings.length > 0
      ? JSON.stringify(options.wordTimings)
      : ""
  );

  try {
    const response = await request(
      `/api/articles/${articleId}/audio`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      },
      "上传音频失败"
    );

    const data = (await response.json()) as { url?: string };
    const url = data.url;
    if (!url) {
      throw new Error("上传成功但未返回 URL");
    }
    return url;
  } finally {
    cleanup.forEach((fn) => fn());
  }
}

export function createArticle(
  text: string,
  title?: string
): Omit<Article, "id" | "createdAt" | "updatedAt"> {
  return {
    title: title || `文章 ${new Date().toLocaleDateString()}`,
    text,
  };
}
