import type { Article } from "@/lib/storage";
import type { DataStoreMode } from "./types";
import { getDataStoreForMode } from "./index";

export type SyncDirection = "local-to-cloud" | "cloud-to-local";
export type SyncScope = "articles" | "settings";

export interface SyncOptions {
  direction: SyncDirection;
  scopes: SyncScope[];
  articleIds?: string[];
}

export interface SyncResult {
  direction: SyncDirection;
  articles: number;
  settings: number;
}

function modesForDirection(direction: SyncDirection): {
  source: DataStoreMode;
  target: DataStoreMode;
} {
  return direction === "local-to-cloud"
    ? { source: "local", target: "supabase" }
    : { source: "supabase", target: "local" };
}

function isArticle(article: Article | null): article is Article {
  return article !== null;
}

export async function syncDataStores(options: SyncOptions): Promise<SyncResult> {
  const { source, target } = modesForDirection(options.direction);
  const sourceStore = getDataStoreForMode(source);
  const targetStore = getDataStoreForMode(target);
  const result: SyncResult = {
    direction: options.direction,
    articles: 0,
    settings: 0,
  };

  if (options.scopes.includes("articles")) {
    const articleIds = options.articleIds?.filter(Boolean) ?? [];
    const articles =
      articleIds.length > 0
        ? (await Promise.all(
            articleIds.map((id) => sourceStore.articles.getArticle(id))
          )).filter(isArticle)
        : await sourceStore.articles.listArticles();

    for (const article of articles) {
      await targetStore.articles.saveArticle(article);
      result.articles += 1;
    }
  }

  if (options.scopes.includes("settings")) {
    const settings = await sourceStore.settings.getSettings();
    if (settings) {
      await targetStore.settings.updateSettings(settings);
      result.settings = 1;
    }
  }

  return result;
}
