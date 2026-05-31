import { createLocalDataStore } from "./local";
import { createSupabaseDataStore } from "./supabase";
import type { DataStore, DataStoreMode } from "./types";

export type {
  ArticleUpdate,
  DataStore,
  DataStoreMode,
} from "./types";

function getDataStoreMode(): DataStoreMode {
  return process.env.DATA_STORE_MODE === "supabase" ? "supabase" : "local";
}

export function getDataStoreForMode(mode: DataStoreMode): DataStore {
  return mode === "supabase"
    ? createSupabaseDataStore()
    : createLocalDataStore();
}

export function getDataStore(): DataStore {
  return getDataStoreForMode(getDataStoreMode());
}
