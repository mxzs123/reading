import { generateTtsAudio } from "@/lib/tts";
import { DEFAULT_SETTINGS, type TtsGenerationParams } from "@/lib/settings";
import { MAX_CONCURRENCY } from "./constants";
import { createGenerationQueue } from "./generationQueue";
import { updateSegment } from "./segments";
import type { AudioStoreGet, AudioStoreSet } from "./types";

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
  let concurrencyLimitInternal = DEFAULT_SETTINGS.ttsConcurrency;
  let generationRunId = 0;

  const runGenerationTask = async (task: AudioGenerationTask, signal: AbortSignal) => {
    const { id, params, runId } = task;
    if (signal.aborted || runId !== generationRunId) return;

    const segment = get().segments.find((s) => s.id === id);
    if (!segment) return;

    set((state) => ({
      segments: updateSegment(state.segments, id, {
        status: "generating",
        error: undefined,
      }),
    }));

    try {
      const audio = await generateTtsAudio(segment.text, params, { signal });
      if (signal.aborted || runId !== generationRunId) return;

      const url = URL.createObjectURL(audio.blob);

      set((state) => ({
        segments: updateSegment(state.segments, id, {
          status: "ready",
          audioUrl: url,
          audioBlob: audio.blob,
          wordTimings: audio.wordTimings,
          error: undefined,
        }),
      }));
    } catch (err) {
      if (signal.aborted || runId !== generationRunId) return;

      set((state) => ({
        segments: updateSegment(state.segments, id, {
          status: "error",
          error: err instanceof Error ? err.message : "生成失败",
        }),
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
      queue.pump();
    },
  };
}
