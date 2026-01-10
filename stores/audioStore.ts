import { create } from "zustand";
import { base64ToAudioBlob } from "@/lib/paragraphs";
import { UploadAudioError, uploadAudio, type WordTiming } from "@/lib/storage";
import type { TtsGenerationParams } from "@/lib/settings";

const DEFAULT_TTS_CONCURRENCY = 4;
const DEFAULT_UPLOAD_CONCURRENCY = 6;
const MIN_UPLOAD_CONCURRENCY = 2;
const UPLOAD_TIMEOUT_MS = 45_000;
const MAX_UPLOAD_RETRIES = 3;
const MAX_CONCURRENCY = 128;

const SYNC_START_EPSILON_SEC = 0.02;
const SYNC_END_EPSILON_SEC = 0.06;

export type SegmentStatus = "idle" | "generating" | "ready" | "error";

export type UploadStatus = "pending" | "uploading" | "success" | "failed";

export interface SegmentState {
  id: string;
  text: string;
  status: SegmentStatus;
  error?: string;
  audioUrl?: string;
  audioBlob?: Blob; // 保存原始 blob 用于上传
  cloudUrl?: string; // 云端 URL
  wordTimings?: WordTiming[];
  uploadStatus?: UploadStatus;
  uploadError?: string;
  uploadAttempts?: number;
}

export interface UploadAllResult {
  total: number;
  success: number;
  failed: number;
}

interface GenerationTask {
  id: string;
  params: TtsGenerationParams;
  settle: () => void;
}

interface AudioStore {
  // 段落数据
  segments: SegmentState[];

  // 播放状态
  activeSegmentId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  // 同步高亮（当前段落的单词索引）
  activeWordIndex: number | null;

  // 顺序播放
  sequenceMode: boolean;

  // 计算属性
  readyCount: number;
  generatingCount: number;
  total: number;
  concurrencyLimit: number;

  // Actions
  pause: () => void;
  initSegments: (paragraphs: string[]) => void;
  generateSegment: (
    id: string,
    params: TtsGenerationParams
  ) => Promise<void>;
  generateAll: (
    params: TtsGenerationParams
  ) => void;
  playSegment: (id: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  startSequenceFrom: (id: string) => void;
  uploadAllAudio: (articleId: string) => Promise<UploadAllResult>;
  uploadSegmentAudio: (articleId: string, segmentId: string) => Promise<void>;
  loadAudioUrls: (audioUrls: string[]) => void;
  loadSegmentWordTimings: (segmentWordTimings: Record<string, WordTiming[]>) => void;
  setConcurrencyLimit: (limit: number) => void;
}

// 模块级单例 Audio 元素
let audioElement: HTMLAudioElement | null = null;
let syncRafId: number | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioElement && typeof window !== "undefined") {
    audioElement = new Audio();
    audioElement.preload = "auto";
  }
  return audioElement!;
}

function findWordIndexAtTime(wordTimings: WordTiming[], time: number): number | null {
  if (!wordTimings.length) return null;
  if (!Number.isFinite(time)) return null;
  const t = Math.max(0, time);

  let lo = 0;
  let hi = wordTimings.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const start = wordTimings[mid]?.start;
    if (typeof start === "number" && start <= t + SYNC_START_EPSILON_SEC) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (ans < 0) return null;

  const current = wordTimings[ans];
  if (!current) return null;

  const nextStart = ans + 1 < wordTimings.length ? wordTimings[ans + 1]?.start : Number.POSITIVE_INFINITY;
  const end = Number.isFinite(current.end) ? current.end : nextStart;

  if (!Number.isFinite(current.start)) return null;
  if (t < current.start - SYNC_START_EPSILON_SEC) return null;
  if (t <= end + SYNC_END_EPSILON_SEC) return ans;
  return null;
}

// 追踪排队或正在生成的段落，避免重复生成
const pendingGenerationIds = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function buildTtsRequest(text: string, params: TtsGenerationParams): { endpoint: string; body: Record<string, unknown> } {
  if (params.provider === "azure") {
    return {
      endpoint: "/api/tts",
      body: {
        text,
        apiKey: params.apiKey,
        region: params.region,
        voice: params.voice,
        rate: params.rate,
        volume: params.volume,
        pauseMs: params.pauseMs,
      },
    };
  }

  if (params.provider === "elevenlabs") {
    return {
      endpoint: "/api/tts/elevenlabs",
      body: {
        text,
        apiKey: params.apiKey,
        voiceId: params.voiceId,
        modelId: params.modelId,
        languageCode: params.languageCode,
        outputFormat: params.outputFormat,
        stability: params.stability,
        similarityBoost: params.similarityBoost,
        style: params.style,
        useSpeakerBoost: params.useSpeakerBoost,
        speed: params.speed,
        seed: params.seed ?? null,
        applyTextNormalization: params.applyTextNormalization,
        enableLogging: params.enableLogging,
        optimizeStreamingLatency: params.optimizeStreamingLatency,
      },
    };
  }

  return {
    endpoint: "/api/tts/gemini",
    body: {
      text,
      apiKey: params.apiKey,
      model: params.model,
      voiceName: params.voiceName || "Kore",
      languageCode: params.languageCode,
      stylePrompt: params.stylePrompt,
      multiSpeaker: params.multiSpeaker,
      speaker1Name: params.speaker1Name,
      speaker1VoiceName: params.speaker1VoiceName,
      speaker2Name: params.speaker2Name,
      speaker2VoiceName: params.speaker2VoiceName,
    },
  };
}

function normalizeWordTimings(value: unknown): WordTiming[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const normalized: WordTiming[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const start = (item as { start?: unknown }).start;
    const end = (item as { end?: unknown }).end;
    if (typeof start !== "number" || typeof end !== "number") return;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    if (end < start) return;
    normalized.push({ start, end });
  });

  return normalized.length ? normalized : undefined;
}

function getUploadErrorInfo(error: unknown): { message: string; status?: number; retryable: boolean } {
  if (error instanceof UploadAudioError) {
    const status = error.status;
    const retryable = status ? [408, 425, 429, 500, 502, 503, 504].includes(status) : true;
    return { message: error.message || "上传音频失败", status, retryable };
  }

  if (error instanceof Error) {
    const message = error.message || "上传音频失败";
    return { message, retryable: true };
  }

  return { message: "上传音频失败", retryable: true };
}

export const useAudioStore = create<AudioStore>((set, get) => {
  // 内部辅助函数：播放下一个段落
  const playNextInSequence = () => {
    const { segments, activeSegmentId, sequenceMode } = get();
    if (!sequenceMode || !activeSegmentId) return;

    const currentIndex = segments.findIndex((s) => s.id === activeSegmentId);
    const next = segments.slice(currentIndex + 1).find((s) => s.status === "ready" && s.audioUrl);

    if (next) {
      get().playSegment(next.id);
    } else {
      set({ sequenceMode: false, isPlaying: false });
    }
  };

  const stopSyncLoop = () => {
    if (syncRafId !== null) {
      cancelAnimationFrame(syncRafId);
      syncRafId = null;
    }
  };

  const startSyncLoop = () => {
    if (syncRafId !== null) return;

    const tick = () => {
      const audio = getAudio();
      if (!audio || audio.paused) {
        syncRafId = null;
        return;
      }

      const { activeSegmentId, activeWordIndex, segments } = get();
      const segment = activeSegmentId ? segments.find((s) => s.id === activeSegmentId) : undefined;
      const wordTimings = segment?.wordTimings;
      const nextIndex = wordTimings ? findWordIndexAtTime(wordTimings, audio.currentTime) : null;
      if (nextIndex !== activeWordIndex) {
        set({ activeWordIndex: nextIndex });
      }

      syncRafId = requestAnimationFrame(tick);
    };

    syncRafId = requestAnimationFrame(tick);
  };

  // 初始化 Audio 事件监听
  if (typeof window !== "undefined") {
    const audio = getAudio();

    audio.addEventListener("timeupdate", () => {
      set({ currentTime: audio.currentTime });
    });

    audio.addEventListener("loadedmetadata", () => {
      set({ duration: audio.duration });
    });

    audio.addEventListener("play", () => {
      set({ isPlaying: true });
      startSyncLoop();
    });

    audio.addEventListener("pause", () => {
      set({ isPlaying: false });
      stopSyncLoop();
    });

    audio.addEventListener("ended", () => {
      const { sequenceMode } = get();
      if (sequenceMode) {
        playNextInSequence();
      } else {
        set({ isPlaying: false });
      }

      stopSyncLoop();
      set({ activeWordIndex: null });
    });

    audio.addEventListener("error", () => {
      stopSyncLoop();
      get().stop();
    });
  }

  const generationQueue: GenerationTask[] = [];
  let activeBatchCount = 0;
  let concurrencyLimitInternal = DEFAULT_TTS_CONCURRENCY;

  let uploadInProgress = false;

  const setSegmentUploadState = (segmentId: string, patch: Partial<SegmentState>) => {
    set((state) => ({
      segments: state.segments.map((s) => (s.id === segmentId ? { ...s, ...patch } : s)),
    }));
  };

  const uploadSegmentWithRetry = async (articleId: string, segmentId: string) => {
    const segment = get().segments.find((s) => s.id === segmentId);
    if (!segment?.audioBlob || segment.cloudUrl) {
      return { ok: true as const };
    }

    let lastStatus: number | undefined;
    let lastMessage = "上传音频失败";

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
      setSegmentUploadState(segmentId, {
        uploadStatus: "uploading",
        uploadAttempts: attempt,
        uploadError: undefined,
      });

      try {
        const cloudUrl = await uploadAudio(articleId, segmentId, segment.audioBlob, {
          timeoutMs: UPLOAD_TIMEOUT_MS,
          wordTimings: segment.wordTimings,
        });

        setSegmentUploadState(segmentId, {
          cloudUrl,
          uploadStatus: "success",
          uploadError: undefined,
        });

        return { ok: true as const };
      } catch (error) {
        const info = getUploadErrorInfo(error);
        lastStatus = info.status;
        lastMessage = info.message;

        const canRetry = info.retryable && attempt < MAX_UPLOAD_RETRIES;
        if (!canRetry) {
          setSegmentUploadState(segmentId, {
            uploadStatus: "failed",
            uploadError: lastMessage,
          });
          return { ok: false as const, status: lastStatus };
        }

        const base = info.status === 429 ? 1500 : 700;
        const backoff = Math.min(8000, base * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 300);
        setSegmentUploadState(segmentId, {
          uploadError: `${lastMessage}（第 ${attempt}/${MAX_UPLOAD_RETRIES} 次失败，准备重试）`,
        });
        await sleep(backoff + jitter);
      }
    }

    setSegmentUploadState(segmentId, {
      uploadStatus: "failed",
      uploadError: lastMessage,
    });
    return { ok: false as const, status: lastStatus };
  };

  const runGenerationTask = async (task: GenerationTask) => {
    const { id, params } = task;
    const segment = get().segments.find((s) => s.id === id);
    if (!segment) {
      return;
    }

    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, status: "generating" as SegmentStatus, error: undefined } : s
      ),
      generatingCount: state.generatingCount + 1,
    }));

    try {
      const trimmedText = segment.text.trim();
      if (!trimmedText) {
        throw new Error("段落内容为空，无法生成音频");
      }
      const { endpoint, body } = buildTtsRequest(trimmedText, params);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        const errorMessage = (data as { error?: string }).error || "生成失败";
        console.warn("TTS 请求失败", {
          endpoint,
          status: response.status,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const audioBase64 = (data as { audio?: string }).audio;
      const mimeType = (data as { mimeType?: string }).mimeType || "audio/mpeg";
      const wordTimings = normalizeWordTimings((data as { wordTimings?: unknown }).wordTimings);
      if (!audioBase64) {
        throw new Error("未收到音频数据");
      }

      const blob = base64ToAudioBlob(audioBase64, mimeType);
      const url = URL.createObjectURL(blob);

      set((state) => {
        const newSegments = state.segments.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "ready" as SegmentStatus,
                audioUrl: url,
                audioBlob: blob,
                wordTimings,
                error: undefined,
              }
            : s
        );
        return {
          segments: newSegments,
          generatingCount: Math.max(0, state.generatingCount - 1),
          readyCount: newSegments.filter((s) => s.status === "ready").length,
        };
      });
    } catch (err) {
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

  const startNextBatch = () => {
    if (activeBatchCount !== 0) return;
    if (generationQueue.length === 0) return;

    const batchSize = Math.min(Math.max(1, concurrencyLimitInternal), generationQueue.length);
    const batch = generationQueue.splice(0, batchSize);
    activeBatchCount = batch.length;

    batch.forEach((task) => {
      runGenerationTask(task)
        .catch(() => {
          // 错误已在 runGenerationTask 内处理
        })
        .finally(() => {
          pendingGenerationIds.delete(task.id);
          task.settle();
          activeBatchCount -= 1;
          if (activeBatchCount === 0) {
            startNextBatch();
          }
        });
    });
  };

  const enqueueGenerationTask = (task: GenerationTask) => {
    generationQueue.push(task);
    if (activeBatchCount === 0) {
      startNextBatch();
    }
  };

  return {
    // 初始状态
    segments: [],
    activeSegmentId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    activeWordIndex: null,
    sequenceMode: false,
    readyCount: 0,
    generatingCount: 0,
    total: 0,
    concurrencyLimit: DEFAULT_TTS_CONCURRENCY,

    pause: () => {
      const audio = getAudio();
      if (audio && !audio.paused) {
        audio.pause();
      }
    },

    initSegments: (paragraphs) => {
      // 清理旧的 Object URLs
      get().segments.forEach((seg) => {
        if (seg.audioUrl) URL.revokeObjectURL(seg.audioUrl);
      });

      // 重置生成状态
      pendingGenerationIds.clear();
      if (generationQueue.length) {
        const pendingTasks = generationQueue.splice(0);
        pendingTasks.forEach((task) => task.settle());
      }

      // 停止当前播放
      const audio = getAudio();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      }

      const newSegments = paragraphs.map((text, i) => ({
        id: `seg-${i}`,
        text,
        status: "idle" as SegmentStatus,
      }));

      set({
        segments: newSegments,
        activeSegmentId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        activeWordIndex: null,
        sequenceMode: false,
        readyCount: 0,
        generatingCount: 0,
        total: paragraphs.length,
      });
    },

    generateSegment: async (id, params) => {
      const segment = get().segments.find((s) => s.id === id);
      if (!segment || segment.status === "ready" || segment.status === "generating") {
        return;
      }

      if (params.provider === "azure" && !params.apiKey) {
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id ? { ...s, status: "error" as SegmentStatus, error: "请先在设置中填入 Azure API Key" } : s
          ),
        }));
        return;
      } else if (params.provider === "elevenlabs") {
        if (!params.apiKey) {
          set((state) => ({
            segments: state.segments.map((s) =>
              s.id === id
                ? { ...s, status: "error" as SegmentStatus, error: "请先在设置中填入 ElevenLabs API Key" }
                : s
            ),
          }));
          return;
        }

        if (!params.voiceId) {
          set((state) => ({
            segments: state.segments.map((s) =>
              s.id === id
                ? { ...s, status: "error" as SegmentStatus, error: "请先填写 ElevenLabs Voice ID" }
                : s
            ),
          }));
          return;
        }
      } else if (params.provider === "gemini") {
        if (!params.apiKey) {
          set((state) => ({
            segments: state.segments.map((s) =>
              s.id === id
                ? { ...s, status: "error" as SegmentStatus, error: "请先在设置中填入 Gemini API Key" }
                : s
            ),
          }));
          return;
        }
      }

      if (pendingGenerationIds.has(id)) {
        return;
      }
      pendingGenerationIds.add(id);

      return new Promise<void>((resolve) => {
        enqueueGenerationTask({
          id,
          params,
          settle: resolve,
        });
      });
    },

    generateAll: (params) => {
      const { segments } = get();
      // 将所有段落加入队列，由调度器按批次生成
      segments
        .filter((seg) => seg.status !== "ready" && seg.status !== "generating")
        .forEach((seg) => {
          get().generateSegment(seg.id, params);
        });
    },

    playSegment: (id) => {
      const segment = get().segments.find((s) => s.id === id);
      if (!segment?.audioUrl) return;

      const audio = getAudio();
      const { activeSegmentId, isPlaying } = get();

      // 如果是切换到新段落
      if (activeSegmentId !== id) {
        audio.src = segment.audioUrl;
        audio.currentTime = 0;
        set({ currentTime: 0 });
        set({ activeWordIndex: null });
      } else if (isPlaying) {
        // 如果是同一段落且正在播放，重置到开头重新播放
        audio.currentTime = 0;
        set({ currentTime: 0 });
        set({ activeWordIndex: null });
      }

      audio.play().catch(() => {
        // 播放失败时静默处理
      });
      set({ activeSegmentId: id });
    },

    togglePlayPause: () => {
      const audio = getAudio();
      const { activeSegmentId } = get();
      if (!activeSegmentId) return;

      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    },

    stop: () => {
      const audio = getAudio();
      audio.pause();
      audio.currentTime = 0;

      stopSyncLoop();

      set({
        activeSegmentId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        activeWordIndex: null,
        sequenceMode: false,
      });
    },

    seek: (time) => {
      const audio = getAudio();
      audio.currentTime = time;

      const { activeSegmentId, segments } = get();
      const segment = activeSegmentId ? segments.find((s) => s.id === activeSegmentId) : undefined;
      const nextIndex = segment?.wordTimings ? findWordIndexAtTime(segment.wordTimings, time) : null;
      set({ currentTime: time, activeWordIndex: nextIndex });
    },

    startSequenceFrom: (id) => {
      set({ sequenceMode: true });
      get().playSegment(id);
    },

    uploadAllAudio: async (articleId) => {
      if (uploadInProgress) {
        return { total: 0, success: 0, failed: 0 };
      }

      uploadInProgress = true;
      try {
        const { segments } = get();
        const readySegments = segments.filter((s) => s.status === "ready" && s.audioBlob && !s.cloudUrl);
        if (readySegments.length === 0) {
          return { total: 0, success: 0, failed: 0 };
        }

        // 初始化上传状态
        set((state) => ({
          segments: state.segments.map((s) =>
            s.status === "ready" && s.audioBlob && !s.cloudUrl
              ? { ...s, uploadStatus: "pending", uploadError: undefined, uploadAttempts: 0 }
              : s
          ),
        }));

        let concurrency = DEFAULT_UPLOAD_CONCURRENCY;
        let success = 0;
        let failed = 0;

        for (let i = 0; i < readySegments.length; ) {
          const batch = readySegments.slice(i, i + concurrency);
          const results = await Promise.all(batch.map((seg) => uploadSegmentWithRetry(articleId, seg.id)));
          const shouldBackoff = results.some(
            (r) => !r.ok && r.status !== undefined && [429, 500, 502, 503, 504].includes(r.status)
          );
          if (shouldBackoff && concurrency > MIN_UPLOAD_CONCURRENCY) {
            concurrency = Math.max(MIN_UPLOAD_CONCURRENCY, Math.floor(concurrency / 2));
          }

          results.forEach((r) => {
            if (r.ok) success += 1;
            else failed += 1;
          });

          i += batch.length;
        }

        return { total: readySegments.length, success, failed };
      } finally {
        uploadInProgress = false;
      }
    },

    uploadSegmentAudio: async (articleId, segmentId) => {
      const segment = get().segments.find((s) => s.id === segmentId);
      if (!segment?.audioBlob || segment.cloudUrl) return;
      if (segment.uploadStatus === "uploading") return;

      setSegmentUploadState(segmentId, {
        uploadStatus: "pending",
        uploadError: undefined,
        uploadAttempts: 0,
      });

      await uploadSegmentWithRetry(articleId, segmentId);
    },

    loadAudioUrls: (audioUrls) => {
      if (!audioUrls || audioUrls.length === 0) return;

      set((state) => {
        const newSegments = state.segments.map((seg) => {
          // 从 URL 中提取 segment id (格式: .../seg-0.wav)
          const matchingUrl = audioUrls.find((url) => url.includes(`/${seg.id}.wav`));
          if (matchingUrl) {
            return {
              ...seg,
              status: "ready" as SegmentStatus,
              audioUrl: matchingUrl,
              cloudUrl: matchingUrl,
              uploadStatus: "success" as UploadStatus,
              uploadError: undefined,
            };
          }
          return seg;
        });
        return {
          segments: newSegments,
          readyCount: newSegments.filter((s) => s.status === "ready").length,
        };
      });
    },

    loadSegmentWordTimings: (segmentWordTimings) => {
      if (!segmentWordTimings) return;

      set((state) => ({
        segments: state.segments.map((seg) => {
          const next = normalizeWordTimings(segmentWordTimings[seg.id]);
          if (next) {
            return { ...seg, wordTimings: next };
          }
          if (seg.wordTimings) {
            return { ...seg, wordTimings: undefined };
          }
          return seg;
        }),
      }));
    },

    setConcurrencyLimit: (limit) => {
      const next = Math.max(1, Math.min(limit, MAX_CONCURRENCY));
      concurrencyLimitInternal = next;
      set({ concurrencyLimit: next });
      if (activeBatchCount === 0) {
        startNextBatch();
      }
    },
  };
});
