import type { Article } from "./storage";
import { buildParagraphs } from "./paragraphs";

const ARTICLE_PREVIEW_LENGTH = 60;

export interface ArticleStats {
  words: number;
  paragraphs: number;
}

export function getArticlePreview(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > ARTICLE_PREVIEW_LENGTH
    ? `${cleaned.slice(0, ARTICLE_PREVIEW_LENGTH)}...`
    : cleaned;
}

export function getArticleTitle(article: Article): string {
  return article.title || getArticlePreview(article.text);
}

export function getArticleStats(article: Article): ArticleStats {
  const trimmed = article.text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    paragraphs: buildParagraphs(article.text).length,
  };
}

export function hasArticleWordTimings(article: Article): boolean {
  return Object.keys(article.segmentWordTimings ?? {}).length > 0;
}
