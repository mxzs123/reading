"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DictionaryData } from "@/components/DictionaryPanel";

function normalizeDictionaryWord(word: string): { trimmed: string; normalized: string } | null {
  const trimmed = word.trim();
  if (!trimmed) return null;
  return { trimmed, normalized: trimmed.toLowerCase() };
}

export interface UseDictionaryOptions {
  onData?: (data: DictionaryData) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface UseDictionaryReturn {
  lookup: (word: string) => { trimmed: string; cached: DictionaryData | null } | null;
  prefetch: (word: string) => void;
  abortCurrentLookup: () => void;
  clearCache: () => void;
}

export function useDictionary(options: UseDictionaryOptions = {}): UseDictionaryReturn {
  const { onData, onError, onLoadingChange } = options;

  const cacheRef = useRef<Map<string, DictionaryData>>(new Map());
  const prefetchControllersRef = useRef<Map<string, AbortController>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const requestDictionary = useCallback(
    async (word: string, signal?: AbortSignal): Promise<DictionaryData> => {
      const response = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error("查询失败");
      }
      const data = (await response.json()) as DictionaryData & { error?: string };
      if (data.error) {
        throw new Error(data.error);
      }
      return {
        phonetics: data.phonetics,
        meanings: data.meanings ?? [],
        webTranslations: data.webTranslations ?? [],
      };
    },
    []
  );

  const prefetch = useCallback(
    (word: string) => {
      const parsed = normalizeDictionaryWord(word);
      if (!parsed) return;
      const { normalized } = parsed;

      if (cacheRef.current.has(normalized) || prefetchControllersRef.current.has(normalized)) {
        return;
      }

      const controller = new AbortController();
      prefetchControllersRef.current.set(normalized, controller);

      requestDictionary(normalized, controller.signal)
        .then((data) => {
          cacheRef.current.set(normalized, data);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.debug("词典预取失败", error);
        })
        .finally(() => {
          prefetchControllersRef.current.delete(normalized);
        });
    },
    [requestDictionary]
  );

  const lookup = useCallback(
    (word: string): { trimmed: string; cached: DictionaryData | null } | null => {
      const parsed = normalizeDictionaryWord(word);
      if (!parsed) return null;
      const { trimmed, normalized } = parsed;

      const cached = cacheRef.current.get(normalized) ?? null;

      if (cached) {
        onData?.(cached);
        onLoadingChange?.(false);
      } else {
        onLoadingChange?.(true);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      requestDictionary(normalized, controller.signal)
        .then((data) => {
          cacheRef.current.set(normalized, data);
          if (controller.signal.aborted) return;
          onData?.(data);
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          console.warn("词典查询错误", error);
          onError?.("查询失败，请稍后再试");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            onLoadingChange?.(false);
          }
        });

      return { trimmed, cached };
    },
    [requestDictionary, onData, onError, onLoadingChange]
  );

  const abortCurrentLookup = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Warmup on mount
  useEffect(() => {
    prefetch("warmup");
  }, [prefetch]);

  // Cleanup on unmount
  useEffect(() => {
    const controllers = prefetchControllersRef.current;
    return () => {
      abortRef.current?.abort();
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  return {
    lookup,
    prefetch,
    abortCurrentLookup,
    clearCache,
  };
}
