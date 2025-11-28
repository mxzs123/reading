import { create } from "zustand";
import { base64ToAudioBlob } from "@/lib/paragraphs";
import { uploadAudio } from "@/lib/storage";

export type SegmentStatus = "idle" | "generating" | "ready" | "error";

export interface SegmentState {
  id: string;
  text: string;
  status: SegmentStatus;
  error?: string;
  audioUrl?: string;
  audioBlob?: Blob; // 保存原始 blob 用于上传
  cloudUrl?: string; // 云端 URL
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

  // Actions
  initSegments: (paragraphs: string[]) => void;
  generateSegment: (id: string, apiKey: string, region: string, voice: string) => Promise<void>;
  generateAll: (apiKey: string, region: string, voice: string) => void;
  playSegment: (id: string) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  startSequenceFrom: (id: string) => void;
  uploadAllAudio: (articleId: string) => Promise<void>;
  loadAudioUrls: (audioUrls: string[]) => void;
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

// 追踪正在生成的段落，避免重复生成
const generatingIds = new Set<string>();

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

    initSegments: (paragraphs) => {
      // 清理旧的 Object URLs
      get().segments.forEach((seg) => {
        if (seg.audioUrl) URL.revokeObjectURL(seg.audioUrl);
      });

      // 重置生成状态
      generatingIds.clear();

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

    generateSegment: async (id, apiKey, region, voice) => {
      const segment = get().segments.find((s) => s.id === id);
      if (!segment || segment.status === "ready" || segment.status === "generating") {
        return;
      }

      if (!apiKey) {
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id ? { ...s, status: "error" as SegmentStatus, error: "请先在设置中填入 Azure API Key" } : s
          ),
        }));
        return;
      }

      // 防止重复生成
      if (generatingIds.has(id)) return;
      generatingIds.add(id);

      // 标记为生成中
      set((state) => ({
        segments: state.segments.map((s) =>
          s.id === id ? { ...s, status: "generating" as SegmentStatus, error: undefined } : s
        ),
        generatingCount: state.generatingCount + 1,
      }));

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: segment.text.trim(), apiKey, region, voice }),
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await response.json() : { error: await response.text() };

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
            s.id === id ? { ...s, status: "ready" as SegmentStatus, audioUrl: url, audioBlob: blob, error: undefined } : s
          );
          return {
            segments: newSegments,
            generatingCount: state.generatingCount - 1,
            readyCount: newSegments.filter((s) => s.status === "ready").length,
          };
        });
      } catch (err) {
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id
              ? { ...s, status: "error" as SegmentStatus, error: err instanceof Error ? err.message : "生成失败" }
              : s
          ),
          generatingCount: state.generatingCount - 1,
        }));
      } finally {
        generatingIds.delete(id);
      }
    },

    generateAll: (apiKey, region, voice) => {
      const { segments } = get();
      // Azure TTS 支持高并发 (200次/秒)，可以并行生成所有段落
      segments
        .filter((seg) => seg.status !== "ready" && seg.status !== "generating")
        .forEach((seg) => {
          get().generateSegment(seg.id, apiKey, region, voice);
        });
    },

    playSegment: (id) => {
      const segment = get().segments.find((s) => s.id === id);
      if (!segment?.audioUrl) return;

      const audio = getAudio();
      const { activeSegmentId } = get();

      // 如果是切换到新段落
      if (activeSegmentId !== id) {
        audio.src = segment.audioUrl;
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
      const { segments } = get();
      const readySegments = segments.filter((s) => s.status === "ready" && s.audioBlob && !s.cloudUrl);

      for (const segment of readySegments) {
        if (!segment.audioBlob) continue;
        try {
          const cloudUrl = await uploadAudio(articleId, segment.id, segment.audioBlob);
          set((state) => ({
            segments: state.segments.map((s) =>
              s.id === segment.id ? { ...s, cloudUrl } : s
            ),
          }));
        } catch (error) {
          console.error(`上传音频 ${segment.id} 失败:`, error);
        }
      }
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
  };
});
