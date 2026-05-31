import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { deleteR2Folder } from "@/lib/r2";

// GET /api/articles - 获取文章列表
export async function GET(): Promise<Response> {
  try {
    const articles = await getDataStore().articles.listArticles();
    return Response.json(articles);
  } catch (error) {
    console.error("获取文章列表失败:", error);
    return Response.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

// POST /api/articles - 创建文章
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return Response.json({ error: "缺少文章内容" }, { status: 400 });
    }

    const article = await getDataStore().articles.createArticle({
      title: body.title,
      text: body.text,
    });
    return Response.json(article);
  } catch (error) {
    console.error("创建文章失败:", error);
    return Response.json({ error: "创建文章失败" }, { status: 500 });
  }
}

// DELETE /api/articles - 清除所有文章
export async function DELETE(): Promise<Response> {
  try {
    const dataStore = getDataStore();
    const articleIds = await dataStore.articles.deleteAllArticles();

    if (articleIds.length === 0) {
      return Response.json({ deleted: 0 });
    }

    // 删除所有文章的音频文件
    for (const id of articleIds) {
      try {
        await deleteR2Folder(`audio/${id}/`);
      } catch {
        // 忽略单个删除失败
      }
    }

    return Response.json({ deleted: articleIds.length });
  } catch (error) {
    console.error("清除所有文章失败:", error);
    return Response.json({ error: "清除所有文章失败" }, { status: 500 });
  }
}
