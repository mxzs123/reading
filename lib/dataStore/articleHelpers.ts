import type { Article } from "@/lib/storage";
import type { ArticleInput, ArticleUpdate } from "./types";

function createArticleId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createArticleFromInput(input: ArticleInput, now = Date.now()): Article {
  return {
    id: createArticleId(),
    title: input.title || `文章 ${new Date(now).toLocaleDateString()}`,
    text: input.text,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyArticlePatch(
  article: Article,
  id: string,
  patch: ArticleUpdate
): Article {
  return {
    ...article,
    ...patch,
    id,
    updatedAt: Date.now(),
  };
}

export function sortArticlesByUpdatedAt(articles: Article[]): Article[] {
  return articles.sort((a, b) => b.updatedAt - a.updatedAt);
}
