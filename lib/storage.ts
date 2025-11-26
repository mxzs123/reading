/**
 * IndexedDB 存储模块 - 用于保存文章和音频
 */

const DB_NAME = "bionicReaderDB";
const DB_VERSION = 1;
const STORE_NAME = "articles";

export interface Article {
  id: string;
  title: string;
  text: string;
  audioBlob?: Blob;
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * 打开数据库连接
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB 仅在浏览器环境可用"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 保存文章
 */
export async function saveArticle(article: Article): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(article);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 获取单篇文章
 */
export async function getArticle(id: string): Promise<Article | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * 获取所有文章（按更新时间倒序）
 */
export async function getAllArticles(): Promise<Article[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("updatedAt");
    const request = index.openCursor(null, "prev");

    const articles: Article[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        articles.push(cursor.value);
        cursor.continue();
      } else {
        resolve(articles);
      }
    };
  });
}

/**
 * 删除文章
 */
export async function deleteArticle(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 更新文章的音频
 */
export async function updateArticleAudio(
  id: string,
  audioBlob: Blob
): Promise<void> {
  const article = await getArticle(id);
  if (!article) {
    throw new Error("文章不存在");
  }

  article.audioBlob = audioBlob;
  article.updatedAt = Date.now();

  await saveArticle(article);
}

/**
 * 创建新文章
 */
export function createArticle(
  text: string,
  title?: string
): Article {
  const now = Date.now();
  return {
    id: generateId(),
    title: title || `文章 ${new Date(now).toLocaleDateString()}`,
    text,
    createdAt: now,
    updatedAt: now,
  };
}
