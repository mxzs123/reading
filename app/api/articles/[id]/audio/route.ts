import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { uploadToR2 } from "@/lib/r2";

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

    // 上传到 R2
    const key = `audio/${id}/${segmentId}.wav`;
    const url = await uploadToR2(key, file, "audio/wav");

    // 更新文章的 audioUrls
    const audioUrls = article.audioUrls || [];
    // 如果该段落已有音频，替换；否则添加
    const existingIndex = audioUrls.findIndex((u) =>
      u.includes(`/${segmentId}.wav`)
    );
    if (existingIndex >= 0) {
      audioUrls[existingIndex] = url;
    } else {
      audioUrls.push(url);
    }

    await kv.hset(`article:${id}`, { audioUrls });

    return Response.json({ url });
  } catch (error) {
    console.error("上传音频失败:", error);
    return Response.json({ error: "上传音频失败" }, { status: 500 });
  }
}
