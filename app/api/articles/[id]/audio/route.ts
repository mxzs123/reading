import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { kv } from "@vercel/kv";

interface ArticleMetadata {
  id: string;
  title: string;
  text: string;
  audioUrls?: string[];
  createdAt: number;
  updatedAt: number;
}

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/articles/[id]/audio - 上传段落音频
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();

    const file = formData.get("audio") as Blob | null;
    const segmentId = formData.get("segmentId") as string | null;

    if (!file) {
      return Response.json({ error: "缺少音频文件" }, { status: 400 });
    }

    if (!segmentId) {
      return Response.json({ error: "缺少段落 ID" }, { status: 400 });
    }

    // 检查文章是否存在
    const article = (await kv.hgetall(`article:${id}`)) as ArticleMetadata | null;
    if (!article) {
      return Response.json({ error: "文章不存在" }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return Response.json({ error: "存储凭证未配置" }, { status: 500 });
    }

    // 上传到 Blob
    const blob = await put(`audio/${id}/${segmentId}.wav`, file, {
      access: "public",
      contentType: "audio/wav",
      token: blobToken,
    });

    // 更新文章的 audioUrls
    const audioUrls = article.audioUrls || [];
    // 如果该段落已有音频，替换；否则添加
    const existingIndex = audioUrls.findIndex((url) =>
      url.includes(`/${segmentId}.wav`)
    );
    if (existingIndex >= 0) {
      audioUrls[existingIndex] = blob.url;
    } else {
      audioUrls.push(blob.url);
    }

    await kv.hset(`article:${id}`, { audioUrls });

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error("上传音频失败:", error);
    return Response.json({ error: "上传音频失败" }, { status: 500 });
  }
}
