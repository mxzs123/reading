import type { WordTiming } from "@/lib/storage";
import type { TtsGenerationParams } from "@/lib/settings";

export type SegmentStatus = "idle" | "generating" | "ready" | "error";

export type UploadStatus = "pending" | "uploading" | "success" | "failed";

export interface SegmentState {
  id: string;
  text: string;
  status: SegmentStatus;
  error?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  cloudUrl?: string;
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

export interface GenerationTask {
  id: string;
  params: TtsGenerationParams;
  settle: () => void;
}

export interface AudioStore {
  segments: SegmentState[];
  activeSegmentId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeWordIndex: number | null;
  sequenceMode: boolean;
  readyCount: number;
  generatingCount: number;
  total: number;
  concurrencyLimit: number;

  pause: () => void;
  initSegments: (paragraphs: string[]) => void;
  generateSegment: (id: string, params: TtsGenerationParams) => Promise<void>;
  generateAll: (params: TtsGenerationParams) => void;
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
