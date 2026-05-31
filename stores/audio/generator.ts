import { generateTtsAudio } from "@/lib/tts";
import type { TtsGenerationParams } from "@/lib/settings";
import { DEFAULT_TTS_CONCURRENCY, MAX_CONCURRENCY } from "./constants";
import { createGenerationQueue } from "./generationQueue";
import { countReadySegments } from "./segments";
import type { AudioStoreGet, AudioStoreSet, SegmentStatus } from "./types";

interface AudioGeneratorOptions {
  get: AudioStoreGet;
  set: AudioStoreSet;
}

interface AudioGenerationTask {
  id: string;
  params: TtsGenerationParams;
  runId: number;
}

export function createAudioGenerator({ get, set }: AudioGeneratorOptions) {
  let concurrencyLimitInternal = DEFAULT_TTS_CONCURRENCY;
  let generationRunId = 0;

  const runGenerationTask = async (task: AudioGenerationTask, signal: AbortSignal) => {
    const { id, params, runId } = task;
    if (signal.aborted || runId !== generationRunId) return;

    const segment = get().segments.find((s) => s.id === id);
    if (!segment) return;

    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, status: "generating" as SegmentStatus, error: undefined } : s
      ),
      generatingCount: state.generatingCount + 1,
    }));

    try {
      const audio = await generateTtsAudio(segment.text, params, { signal });
      if (signal.aborted || runId !== generationRunId) return;

      const url = URL.createObjectURL(audio.blob);

      set((state) => {
        const nextSegments = state.segments.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "ready" as SegmentStatus,
                audioUrl: url,
                audioBlob: audio.blob,
                wordTimings: audio.wordTimings,
                error: undefined,
              }
            : s
        );

        return {
          segments: nextSegments,
          generatingCount: Math.max(0, state.generatingCount - 1),
          readyCount: countReadySegments(nextSegments),
        };
      });
    } catch (err) {
      if (signal.aborted || runId !== generationRunId) return;

      set((state) => ({
        segments: state.segments.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "error" as SegmentStatus,
                error: err instanceof Error ? err.message : "生成失败",
              }
            : s
        ),
        generatingCount: Math.max(0, state.generatingCount - 1),
      }));
    }
  };

  const queue = createGenerationQueue<AudioGenerationTask>(
    () => concurrencyLimitInternal,
    runGenerationTask
  );

  const resetGeneration = () => {
    generationRunId += 1;
    queue.abortAll();
  };

  return {
    generateAll: (params: TtsGenerationParams) => {
      const { segments } = get();
      segments
        .filter((seg) => seg.status !== "ready" && seg.status !== "generating")
        .forEach((seg) => {
          get().generateSegment(seg.id, params);
        });
    },

    generateSegment: async (id: string, params: TtsGenerationParams) => {
      const segment = get().segments.find((s) => s.id === id);
      if (!segment || segment.status === "ready" || segment.status === "generating") {
        return;
      }

      if (queue.has(id)) {
        return;
      }

      await queue.enqueue({ id, params, runId: generationRunId });
    },

    resetGeneration,

    setConcurrencyLimit: (limit: number) => {
      const next = Math.max(1, Math.min(limit, MAX_CONCURRENCY));
      concurrencyLimitInternal = next;
      set({ concurrencyLimit: next });
      queue.pump();
    },
  };
}
