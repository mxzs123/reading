import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

interface ArticleMetadata {
  id: string;
  title: string;
  text: string;
  audioUrls?: string[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// GET /api/articles - 获取文章列表
export async function GET() {
  try {
    const articleIds = await kv.zrange("articles:index", 0, -1, { rev: true });

    if (!articleIds || articleIds.length === 0) {
      return Response.json([]);
    }

    const articles = await Promise.all(
      articleIds.map((id) => kv.hgetall(`article:${id}`))
    );

    return Response.json(articles.filter(Boolean));
  } catch (error) {
    console.error("获取文章列表失败:", error);
    return Response.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

// POST /api/articles - 创建文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return Response.json({ error: "缺少文章内容" }, { status: 400 });
    }

    const id = generateId();
    const now = Date.now();

    const article: ArticleMetadata = {
      id,
      title: body.title || `文章 ${new Date(now).toLocaleDateString()}`,
      text: body.text,
      createdAt: now,
      updatedAt: now,
    };

    await kv.hset(`article:${id}`, article as unknown as Record<string, unknown>);
    await kv.zadd("articles:index", { score: now, member: id });

    return Response.json(article);
  } catch (error) {
    console.error("创建文章失败:", error);
    return Response.json({ error: "创建文章失败" }, { status: 500 });
  }
}
