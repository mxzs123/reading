import { NextRequest } from "next/server";
import { getDataStore, type ArticleUpdate } from "@/lib/dataStore";
import { errorResponse, readJsonRequest, withApiError } from "@/lib/http";
import { deleteArticleAudioFiles } from "@/lib/articleAudioFiles";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    const { id } = await context.params;
    const article = await getDataStore().articles.getArticle(id);

    if (!article) {
      return errorResponse("文章不存在", 404);
    }

    return Response.json(article);
  }, "获取文章失败");
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    const { id } = await context.params;
    const json = await readJsonRequest<ArticleUpdate>(request);
    if (!json.ok) return json.response;

    const updated = await getDataStore().articles.updateArticle(id, json.body);
    if (!updated) {
      return errorResponse("文章不存在", 404);
    }

    return Response.json(updated);
  }, "更新文章失败");
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiError(async () => {
    const { id } = await context.params;

    await deleteArticleAudioFiles(id);
    await getDataStore().articles.deleteArticle(id);

    return new Response(null, { status: 204 });
  }, "删除文章失败");
}
