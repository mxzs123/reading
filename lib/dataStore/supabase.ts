import type { Article, WordTiming } from "@/lib/storage";
import type { ReaderSettings } from "@/lib/settings";
import type {
  ArticleInput,
  ArticleUpdate,
  DataStore,
} from "./types";
import { withArticleAudio } from "./articleAudio";
import { createArticleFromInput } from "./articleHelpers";

type SupabaseArticleRow = {
  id: string;
  title: string;
  text: string;
  audio_urls: string[] | null;
  segment_word_timings: Record<string, WordTiming[]> | null;
  created_at_ms: number;
  updated_at_ms: number;
};

type SupabaseSettingsRow = {
  id: string;
  value: Partial<ReaderSettings>;
};

type SupabaseRequestInit = Omit<RequestInit, "body"> & {
  json?: unknown;
};

const ARTICLES_TABLE = "reader_articles";
const SETTINGS_TABLE = "reader_settings";
const SETTINGS_ID = "global";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 环境变量");
  }

  return { url, key };
}

function toArticle(row: SupabaseArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    audioUrls: row.audio_urls ?? undefined,
    segmentWordTimings: row.segment_word_timings ?? undefined,
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms,
  };
}

function toArticlePatch(patch: ArticleUpdate): Partial<SupabaseArticleRow> {
  const row: Partial<SupabaseArticleRow> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.text !== undefined) row.text = patch.text;
  if (patch.audioUrls !== undefined) row.audio_urls = patch.audioUrls;
  if (patch.segmentWordTimings !== undefined) {
    row.segment_word_timings = patch.segmentWordTimings;
  }
  return row;
}

function toArticleRow(article: Article): SupabaseArticleRow {
  return {
    id: article.id,
    title: article.title,
    text: article.text,
    audio_urls: article.audioUrls ?? null,
    segment_word_timings: article.segmentWordTimings ?? null,
    created_at_ms: article.createdAt,
    updated_at_ms: article.updatedAt,
  };
}

function toArticleAudioPatch(
  article: Article
): Pick<SupabaseArticleRow, "audio_urls" | "segment_word_timings" | "updated_at_ms"> {
  return {
    audio_urls: article.audioUrls ?? null,
    segment_word_timings: article.segmentWordTimings ?? null,
    updated_at_ms: article.updatedAt,
  };
}

async function requestSupabase<T>(
  path: string,
  init: SupabaseRequestInit = {}
): Promise<T> {
  const { url, key } = getSupabaseConfig();
  const { json, headers, ...requestInit } = init;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("apikey", key);
  requestHeaders.set("Authorization", `Bearer ${key}`);
  requestHeaders.set("Content-Type", "application/json");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...requestInit,
    headers: requestHeaders,
    cache: "no-store",
    body: json === undefined ? undefined : JSON.stringify(json),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase 请求失败 (${response.status})`);
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function createSupabaseDataStore(): DataStore {
  return {
    articles: {
      async listArticles() {
        const rows = await requestSupabase<SupabaseArticleRow[]>(
          `${ARTICLES_TABLE}?select=*&order=updated_at_ms.desc`
        );
        return rows.map(toArticle);
      },

      async createArticle(input: ArticleInput) {
        const row = toArticleRow(createArticleFromInput(input));

        const rows = await requestSupabase<SupabaseArticleRow[]>(
          ARTICLES_TABLE,
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            json: row,
          }
        );
        return toArticle(rows[0]);
      },

      async saveArticle(article: Article) {
        const rows = await requestSupabase<SupabaseArticleRow[]>(
          `${ARTICLES_TABLE}?on_conflict=id`,
          {
            method: "POST",
            headers: {
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            json: toArticleRow(article),
          }
        );
        return toArticle(rows[0]);
      },

      async getArticle(id: string) {
        const rows = await requestSupabase<SupabaseArticleRow[]>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
        );
        return rows[0] ? toArticle(rows[0]) : null;
      },

      async updateArticle(id: string, patch: ArticleUpdate) {
        const row = {
          ...toArticlePatch(patch),
          updated_at_ms: Date.now(),
        };

        const rows = await requestSupabase<SupabaseArticleRow[]>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            json: row,
          }
        );
        return rows[0] ? toArticle(rows[0]) : null;
      },

      async deleteArticle(id: string) {
        await requestSupabase<void>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
      },

      async deleteAllArticles() {
        const articles = await requestSupabase<Array<{ id: string }>>(
          `${ARTICLES_TABLE}?select=id`
        );
        await requestSupabase<void>(`${ARTICLES_TABLE}?id=neq.__none__`, {
          method: "DELETE",
        });
        return articles.map((article) => article.id);
      },

      async articleExists(id: string) {
        const rows = await requestSupabase<Array<{ id: string }>>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(id)}&select=id&limit=1`
        );
        return rows.length > 0;
      },

      async upsertArticleAudio(articleId, segmentId, url, wordTimings) {
        const rows = await requestSupabase<SupabaseArticleRow[]>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(articleId)}&select=*&limit=1`
        );
        const article = rows[0] ? toArticle(rows[0]) : null;
        if (!article) return;

        const updated = withArticleAudio(article, segmentId, url, wordTimings);
        await requestSupabase<void>(
          `${ARTICLES_TABLE}?id=eq.${encodeURIComponent(articleId)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            json: toArticleAudioPatch(updated),
          }
        );
      },
    },

    settings: {
      async getSettings() {
        const rows = await requestSupabase<SupabaseSettingsRow[]>(
          `${SETTINGS_TABLE}?id=eq.${SETTINGS_ID}&select=value&limit=1`
        );
        return rows[0]?.value ?? null;
      },

      async updateSettings(settings) {
        await requestSupabase<void>(
          `${SETTINGS_TABLE}?on_conflict=id`,
          {
            method: "POST",
            headers: {
              Prefer: "resolution=merge-duplicates,return=minimal",
            },
            json: {
              id: SETTINGS_ID,
              value: settings,
              updated_at_ms: Date.now(),
            },
          }
        );
      },
    },
  };
}
