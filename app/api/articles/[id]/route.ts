import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { deleteR2Folder } from "@/lib/r2";

interface ArticleMetadata {
  id: string;
  title: string;
  text: string;
  audioUrls?: string[];
  segmentWordTimings?: Record<string, { start: number; end: number }[]>;
  createdAt: number;
  updatedAt: number;
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/articles/[id] - 获取单篇文章
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const article = await kv.hgetall(`article:${id}`);

    if (!article) {
      return Response.json({ error: "文章不存在" }, { status: 404 });
    }

    return Response.json(article);
  } catch (error) {
    console.error("获取文章失败:", error);
    return Response.json({ error: "获取文章失败" }, { status: 500 });
  }
}

// PUT /api/articles/[id] - 更新文章
export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = (await kv.hgetall(`article:${id}`)) as ArticleMetadata | null;
    if (!existing) {
      return Response.json({ error: "文章不存在" }, { status: 404 });
    }

    const updated: ArticleMetadata = {
      ...existing,
      ...body,
      id, // 确保 id 不被覆盖
      updatedAt: Date.now(),
    };

    await kv.hset(`article:${id}`, updated as unknown as Record<string, unknown>);
    await kv.zadd("articles:index", { score: updated.updatedAt, member: id });

    return Response.json(updated);
  } catch (error) {
    console.error("更新文章失败:", error);
    return Response.json({ error: "更新文章失败" }, { status: 500 });
  }
}

// DELETE /api/articles/[id] - 删除文章
export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;

    // 删除关联的音频文件
    try {
      await deleteR2Folder(`audio/${id}/`);
    } catch {
      // R2 删除失败不影响主流程
      console.warn("删除音频文件失败");
    }

    // 删除 KV 中的数据
    await kv.del(`article:${id}`);
    await kv.zrem("articles:index", id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("删除文章失败:", error);
    return Response.json({ error: "删除文章失败" }, { status: 500 });
  }
}
