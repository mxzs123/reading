"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { base64ToWavBlob } from "@/lib/paragraphs";

export type SegmentStatus = "idle" | "generating" | "ready" | "error";

export interface SegmentState {
  id: string;
  text: string;
  status: SegmentStatus;
  error?: string;
  audioUrl?: string;
  blob?: Blob;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
}

interface UseTTSQueueOptions {
  paragraphs: string[];
  paragraphKey: string;
  geminiApiKey: string;
  ttsVoice: string;
  maxConcurrent: number;
}

function paragraphsToSegments(paragraphs: string[]): SegmentState[] {
  return paragraphs.map((p, index) => ({ id: `seg-${index}`, text: p, status: "idle" }));
}

export function useTTSQueue({
  paragraphs,
  paragraphKey,
  geminiApiKey,
  ttsVoice,
  maxConcurrent,
}: UseTTSQueueOptions) {
  const [segments, setSegments] = useState<SegmentState[]>(() => paragraphsToSegments(paragraphs));
  const segmentsRef = useRef<SegmentState[]>(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const queueRef = useRef<string[]>([]);
  const activeGenRef = useRef(0);
  const generatingRef = useRef<Set<string>>(new Set());

  const cleanupObjectUrls = useCallback((list: SegmentState[]) => {
    list.forEach((seg) => {
      if (seg.audioUrl) {
        URL.revokeObjectURL(seg.audioUrl);
      }
    });
  }, []);

  const generateSegment = useCallback(
    async (id: string) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg) return;

      if (!geminiApiKey) {
        setSegments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "error", error: "请先在设置中填入 Gemini API Key" } : item
          )
        );
        return;
      }

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: seg.text.trim(),
            apiKey: geminiApiKey,
            voice: ttsVoice,
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || "生成失败");
        }

        const audioBase64 = (data as { audio?: string }).audio;
        if (!audioBase64) {
          throw new Error("未收到音频数据");
        }

        const blob = base64ToWavBlob(audioBase64);
        const url = URL.createObjectURL(blob);

        setSegments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "ready",
                  error: undefined,
                  blob,
                  audioUrl: url,
                  isPlaying: false,
                  currentTime: 0,
                }
              : item
          )
        );
      } catch (err) {
        setSegments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "生成失败",
                }
              : item
          )
        );
      }
    },
    [geminiApiKey, ttsVoice]
  );

  const pumpQueue = useCallback(() => {
    while (activeGenRef.current < maxConcurrent && queueRef.current.length) {
      const nextId = queueRef.current.shift();
      if (!nextId) return;

      activeGenRef.current += 1;
      generateSegment(nextId)
        .catch(() => {})
        .finally(() => {
          activeGenRef.current -= 1;
          generatingRef.current.delete(nextId);
          pumpQueue();
        });
    }
  }, [generateSegment, maxConcurrent]);

  const enqueueGeneration = useCallback(
    (ids: string[]): boolean => {
      if (!geminiApiKey) {
        return false;
      }

      let hasNew = false;
      ids.forEach((id) => {
        const seg = segmentsRef.current.find((s) => s.id === id);
        if (!seg) return;
        if (seg.status === "ready" || seg.status === "generating") return;
        if (generatingRef.current.has(id) || queueRef.current.includes(id)) return;

        generatingRef.current.add(id);
        queueRef.current.push(id);
        hasNew = true;

        setSegments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "generating", error: undefined } : item))
        );
      });

      if (hasNew) {
        pumpQueue();
      }
      return hasNew;
    },
    [pumpQueue, geminiApiKey]
  );

  const generateAll = useCallback(() => {
    const pendingIds = segmentsRef.current
      .filter((seg) => seg.status !== "ready")
      .map((seg) => seg.id);
    return enqueueGeneration(pendingIds);
  }, [enqueueGeneration]);

  const updateSegment = useCallback((id: string, updates: Partial<SegmentState>) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, ...updates } : seg))
    );
  }, []);

  const updateAllSegments = useCallback((updater: (seg: SegmentState) => SegmentState) => {
    setSegments((prev) => prev.map(updater));
  }, []);

  const resetSegments = useCallback(() => {
    cleanupObjectUrls(segmentsRef.current);
    queueRef.current = [];
    activeGenRef.current = 0;
    generatingRef.current = new Set();
    setSegments(paragraphsToSegments(paragraphs));
  }, [paragraphs, cleanupObjectUrls]);

  useEffect(() => {
    resetSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphKey]);

  useEffect(() => {
    return () => {
      cleanupObjectUrls(segmentsRef.current);
    };
  }, [cleanupObjectUrls]);

  const readyCount = segments.filter((s) => s.status === "ready").length;
  const generatingCount = segments.filter((s) => s.status === "generating").length;
  const errorCount = segments.filter((s) => s.status === "error").length;
  const progressPercent = paragraphs.length ? Math.round((readyCount / paragraphs.length) * 100) : 0;

  return {
    segments,
    segmentsRef,
    generateAll,
    enqueueGeneration,
    updateSegment,
    updateAllSegments,
    stats: {
      readyCount,
      generatingCount,
      errorCount,
      progressPercent,
      total: paragraphs.length,
    },
  };
}
