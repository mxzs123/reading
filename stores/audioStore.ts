import { create } from "zustand";
import { base64ToAudioBlob } from "@/lib/paragraphs";
import { UploadAudioError, uploadAudio } from "@/lib/storage";
import { type ApplyTextNormalization } from "@/lib/settings";

const DEFAULT_TTS_CONCURRENCY = 4;
const DEFAULT_UPLOAD_CONCURRENCY = 6;
const MIN_UPLOAD_CONCURRENCY = 2;
const UPLOAD_TIMEOUT_MS = 45_000;
const MAX_UPLOAD_RETRIES = 3;
const MAX_CONCURRENCY = 128;

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
  uploadStatus?: UploadStatus;
  uploadError?: string;
  uploadAttempts?: number;
}

export interface UploadAllResult {
  total: number;
  success: number;
  failed: number;
}

type AzureGenerationParams = {
  provider: "azure";
  apiKey: string;
  region: string;
  voice: string;
  rate: number;
  volume: number;
  pauseMs: number;
};

type ElevenLabsGenerationParams = {
  provider: "elevenlabs";
  apiKey: string;
  voiceId: string;
  modelId: string;
  languageCode?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
  seed?: number | null;
  applyTextNormalization?: ApplyTextNormalization;
  enableLogging?: boolean;
  optimizeStreamingLatency?: number | null;
};

type GenerationParams = AzureGenerationParams | ElevenLabsGenerationParams;

interface GenerationTask {
  id: string;
  params: GenerationParams;
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
    params: GenerationParams
  ) => Promise<void>;
  generateAll: (
    params: GenerationParams
  ) => void;
  playSegment: (id: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  startSequenceFrom: (id: string) => void;
  uploadAllAudio: (articleId: string) => Promise<UploadAllResult>;
  uploadSegmentAudio: (articleId: string, segmentId: string) => Promise<void>;
  loadAudioUrls: (audioUrls: string[]) => void;
  setConcurrencyLimit: (limit: number) => void;
}

// 模块级单例 Audio 元素
let audioElement: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioElement && typeof window !== "undefined") {
    audioElement = new Audio();
    audioElement.preload = "auto";
  }
  return audioElement!;
}

// 追踪排队或正在生成的段落，避免重复生成
const pendingGenerationIds = new Set<string>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    });

    audio.addEventListener("pause", () => {
      set({ isPlaying: false });
    });

    audio.addEventListener("ended", () => {
      const { sequenceMode } = get();
      if (sequenceMode) {
        playNextInSequence();
      } else {
        set({ isPlaying: false });
      }
    });

    audio.addEventListener("error", () => {
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
      let endpoint = "/api/tts";
      let body: Record<string, unknown>;

      if (params.provider === "azure") {
        body = {
          text: trimmedText,
          apiKey: params.apiKey,
          region: params.region,
          voice: params.voice,
          rate: params.rate,
          volume: params.volume,
          pauseMs: params.pauseMs,
        };
      } else {
        endpoint = "/api/tts/elevenlabs";
        body = {
          text: trimmedText,
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
        };
      }

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
        throw new Error((data as { error?: string }).error || "生成失败");
      }

      const audioBase64 = (data as { audio?: string }).audio;
      const mimeType = (data as { mimeType?: string }).mimeType || "audio/mpeg";
      if (!audioBase64) {
        throw new Error("未收到音频数据");
      }

      const blob = base64ToAudioBlob(audioBase64, mimeType);
      const url = URL.createObjectURL(blob);

      set((state) => {
        const newSegments = state.segments.map((s) =>
          s.id === id
            ? { ...s, status: "ready" as SegmentStatus, audioUrl: url, audioBlob: blob, error: undefined }
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
      } else if (isPlaying) {
        // 如果是同一段落且正在播放，重置到开头重新播放
        audio.currentTime = 0;
        set({ currentTime: 0 });
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

      set({
        activeSegmentId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        sequenceMode: false,
      });
    },

    seek: (time) => {
      const audio = getAudio();
      audio.currentTime = time;
      set({ currentTime: time });
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
