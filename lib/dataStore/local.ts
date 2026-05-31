import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Article } from "@/lib/storage";
import type { ReaderSettings } from "@/lib/settings";
import type {
  ArticleInput,
  ArticleUpdate,
  DataStore,
} from "./types";
import { withArticleAudio } from "./articleAudio";

interface LocalStoreFile {
  articles: Record<string, Article>;
  settings: Partial<ReaderSettings> | null;
}

const LOCAL_DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local-data");
const LOCAL_STORE_PATH = path.join(LOCAL_DATA_DIR, "reader-store.json");

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createInitialStore(): LocalStoreFile {
  return { articles: {}, settings: null };
}

async function readStore(): Promise<LocalStoreFile> {
  try {
    const text = await readFile(LOCAL_STORE_PATH, "utf8");
    return JSON.parse(text) as LocalStoreFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createInitialStore();
    }
    throw error;
  }
}

async function writeStore(store: LocalStoreFile): Promise<void> {
  await mkdir(LOCAL_DATA_DIR, { recursive: true });
  await writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function createLocalDataStore(): DataStore {
  return {
    articles: {
      async listArticles() {
        const store = await readStore();
        return Object.values(store.articles).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
      },

      async createArticle(input: ArticleInput) {
        const store = await readStore();
        const now = Date.now();
        const article: Article = {
          id: createId(),
          title: input.title || `文章 ${new Date(now).toLocaleDateString()}`,
          text: input.text,
          createdAt: now,
          updatedAt: now,
        };

        store.articles[article.id] = article;
        await writeStore(store);
        return article;
      },

      async saveArticle(article: Article) {
        const store = await readStore();
        store.articles[article.id] = article;
        await writeStore(store);
        return article;
      },

      async getArticle(id: string) {
        const store = await readStore();
        return store.articles[id] ?? null;
      },

      async updateArticle(id: string, patch: ArticleUpdate) {
        const store = await readStore();
        const article = store.articles[id];
        if (!article) return null;

        const updated: Article = {
          ...article,
          ...patch,
          id,
          updatedAt: Date.now(),
        };

        store.articles[id] = updated;
        await writeStore(store);
        return updated;
      },

      async deleteArticle(id: string) {
        const store = await readStore();
        delete store.articles[id];
        await writeStore(store);
      },

      async deleteAllArticles() {
        const store = await readStore();
        const ids = Object.keys(store.articles);
        store.articles = {};
        await writeStore(store);
        return ids;
      },

      async articleExists(id: string) {
        const store = await readStore();
        return Boolean(store.articles[id]);
      },

      async upsertArticleAudio(articleId, segmentId, url, wordTimings) {
        const store = await readStore();
        const article = store.articles[articleId];
        if (!article) return;
        store.articles[articleId] = withArticleAudio(
          article,
          segmentId,
          url,
          wordTimings
        );
        await writeStore(store);
      },
    },

    settings: {
      async getSettings() {
        const store = await readStore();
        return store.settings;
      },

      async updateSettings(settings) {
        const store = await readStore();
        store.settings = settings;
        await writeStore(store);
      },
    },
  };
}
