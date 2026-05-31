import type { Article } from "@/lib/storage";
import type { DataStoreMode } from "./types";
import { getDataStoreForMode } from "./index";

type SyncDirection = "local-to-cloud" | "cloud-to-local";
type SyncScope = "articles" | "settings";

const SYNC_DIRECTIONS = ["local-to-cloud", "cloud-to-local"] as const;
const SYNC_SCOPES = ["articles", "settings"] as const;

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

type SyncParseResult =
  | { ok: true; options: SyncOptions }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isSyncDirection(value: unknown): value is SyncDirection {
  return (
    typeof value === "string" &&
    (SYNC_DIRECTIONS as readonly string[]).includes(value)
  );
}

function isSyncScope(value: unknown): value is SyncScope {
  return (
    typeof value === "string" && (SYNC_SCOPES as readonly string[]).includes(value)
  );
}

function parseArticleIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    return null;
  }

  return [...new Set(value.map((id) => id.trim()).filter(Boolean))];
}

export function parseSyncOptions(body: unknown): SyncParseResult {
  if (!isRecord(body) || !isSyncDirection(body.direction)) {
    return { ok: false, error: "同步方向无效" };
  }

  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    return { ok: false, error: "请选择同步范围" };
  }

  if (!body.scopes.every(isSyncScope)) {
    return { ok: false, error: "同步范围无效" };
  }

  const articleIds = parseArticleIds(body.articleIds);
  if (articleIds === null) {
    return { ok: false, error: "文章 ID 无效" };
  }

  const options: SyncOptions = {
    direction: body.direction,
    scopes: [...new Set(body.scopes)],
  };

  if (articleIds.length > 0) {
    options.articleIds = articleIds;
  }

  return { ok: true, options };
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
