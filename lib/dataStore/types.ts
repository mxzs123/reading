import type { Article, WordTiming } from "@/lib/storage";
import type { ReaderSettings } from "@/lib/settings";

export type DataStoreMode = "local" | "supabase";

export type ArticleInput = {
  title?: string;
  text: string;
};

export type ArticleUpdate = Partial<
  Pick<Article, "title" | "text" | "audioUrls" | "segmentWordTimings">
>;

interface ArticleStore {
  listArticles(): Promise<Article[]>;
  createArticle(input: ArticleInput): Promise<Article>;
  saveArticle(article: Article): Promise<Article>;
  getArticle(id: string): Promise<Article | null>;
  updateArticle(id: string, patch: ArticleUpdate): Promise<Article | null>;
  deleteArticle(id: string): Promise<void>;
  deleteAllArticles(): Promise<string[]>;
  articleExists(id: string): Promise<boolean>;
  upsertArticleAudio(
    articleId: string,
    segmentId: string,
    url: string,
    wordTimings?: WordTiming[]
  ): Promise<void>;
}

interface SettingsStore {
  getSettings(): Promise<Partial<ReaderSettings> | null>;
  updateSettings(settings: Partial<ReaderSettings>): Promise<void>;
}

export interface DataStore {
  articles: ArticleStore;
  settings: SettingsStore;
}
