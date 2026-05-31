import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { deleteR2Folder } from "@/lib/r2";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/articles/[id] - 获取单篇文章
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const article = await getDataStore().articles.getArticle(id);

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

    const updated = await getDataStore().articles.updateArticle(id, body);
    if (!updated) {
      return Response.json({ error: "文章不存在" }, { status: 404 });
    }

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

    await getDataStore().articles.deleteArticle(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("删除文章失败:", error);
    return Response.json({ error: "删除文章失败" }, { status: 500 });
  }
}
