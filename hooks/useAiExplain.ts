"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AiExplainConfig,
  AiExplainRequestBody,
  AiExplainTarget,
} from "@/lib/aiExplain";

interface AiExplainState {
  isOpen: boolean;
  target: AiExplainTarget | null;
  answer: string;
  loading: boolean;
  error?: string;
}

const INITIAL_STATE: AiExplainState = {
  isOpen: false,
  target: null,
  answer: "",
  loading: false,
};

async function readErrorMessage(response: Response): Promise<string> {
  const data = (await response.json()) as { error?: string };
  return data.error || "模型请求失败";
}

export function useAiExplain() {
  const [state, setState] = useState<AiExplainState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
    }));
  }, []);

  const explain = useCallback(
    async (target: AiExplainTarget, config: AiExplainConfig) => {
      abortRef.current?.abort();

      const trimmedKey = config.apiKey.trim();
      const payload: AiExplainRequestBody = {
        ...target,
        apiKey: trimmedKey,
        model: config.model,
        maxTokens: config.maxTokens,
      };

      setState({
        isOpen: true,
        target,
        answer: "",
        loading: true,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (!text) continue;

          setState((prev) => ({ ...prev, answer: prev.answer + text }));
        }

        const tail = decoder.decode();
        if (tail) {
          setState((prev) => ({ ...prev, answer: prev.answer + tail }));
        }

        setState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "模型请求失败";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    explain,
    close,
  };
}
