import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { errorResponse, readJsonRequest, withApiError } from "@/lib/http";
import { deleteArticleAudioFiles } from "@/lib/articleAudioFiles";

type ArticleCreateRequest = {
  text?: unknown;
  title?: string;
};

export async function GET(): Promise<Response> {
  return withApiError(async () => {
    const articles = await getDataStore().articles.listArticles();
    return Response.json(articles);
  }, "获取文章列表失败");
}

export async function POST(request: NextRequest): Promise<Response> {
  return withApiError(async () => {
    const json = await readJsonRequest<ArticleCreateRequest>(request);
    if (!json.ok) return json.response;

    const { text, title } = json.body;
    if (typeof text !== "string" || !text) {
      return errorResponse("缺少文章内容", 400);
    }

    const article = await getDataStore().articles.createArticle({
      title,
      text,
    });
    return Response.json(article);
  }, "创建文章失败");
}

export async function DELETE(): Promise<Response> {
  return withApiError(async () => {
    const dataStore = getDataStore();
    const articleIds = await dataStore.articles.deleteAllArticles();

    if (articleIds.length === 0) {
      return Response.json({ deleted: 0 });
    }

    for (const id of articleIds) {
      await deleteArticleAudioFiles(id);
    }

    return Response.json({ deleted: articleIds.length });
  }, "清除所有文章失败");
}
