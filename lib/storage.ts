/**
 * 云存储模块 - 通过 REST API 访问 Vercel KV/Blob
 */

export interface Article {
  id: string;
  title: string;
  text: string;
  audioUrls?: string[];
  createdAt: number;
  updatedAt: number;
}

export class UploadAudioError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadAudioError";
    this.status = status;
  }
}

/**
 * 获取所有文章（按更新时间倒序）
 */
export async function getAllArticles(): Promise<Article[]> {
  const response = await fetch("/api/articles", {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error("获取文章列表失败");
  }
  return response.json();
}

/**
 * 获取单篇文章
 */
export async function getArticle(id: string): Promise<Article | null> {
  const response = await fetch(`/api/articles/${id}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("获取文章失败");
  }
  return response.json();
}

/**
 * 保存文章（创建或更新）
 */
export async function saveArticle(
  article: Partial<Omit<Article, "createdAt" | "updatedAt">> & { text: string }
): Promise<Article> {
  if (article.id) {
    // 更新
    const response = await fetch(`/api/articles/${article.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(article),
    });
    if (!response.ok) {
      throw new Error("更新文章失败");
    }
    return response.json();
  } else {
    // 创建
    const response = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(article),
    });
    if (!response.ok) {
      throw new Error("创建文章失败");
    }
    return response.json();
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(id: string): Promise<void> {
  const response = await fetch(`/api/articles/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("删除文章失败");
  }
}

/**
 * 上传音频到云端
 */
export async function uploadAudio(
  articleId: string,
  segmentId: string,
  audioBlob: Blob,
  options?: { signal?: AbortSignal; timeoutMs?: number }
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

  try {
    const response = await fetch(`/api/articles/${articleId}/audio`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      let serverMessage: string | undefined;

      if (contentType.includes("application/json")) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        serverMessage = payload?.error;
      } else {
        serverMessage = await response.text().catch(() => undefined);
      }

      throw new UploadAudioError(serverMessage || "上传音频失败", response.status);
    }

    const data = (await response.json().catch(() => null)) as { url?: string } | null;
    const url = data?.url;
    if (!url) {
      throw new UploadAudioError("上传成功但未返回 URL");
    }
    return url;
  } finally {
    cleanup.forEach((fn) => fn());
  }
}

/**
 * 创建新文章对象（仅用于本地构造，需调用 saveArticle 保存）
 */
export function createArticle(
  text: string,
  title?: string
): Omit<Article, "id" | "createdAt" | "updatedAt"> {
  return {
    title: title || `文章 ${new Date().toLocaleDateString()}`,
    text,
  };
}
