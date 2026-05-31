import { normalizeWordTimings } from "@/lib/tts";
import type { WordTiming } from "@/lib/storage";
import type { SegmentState, SegmentStatus, UploadStatus } from "./types";

export function buildInitialSegments(paragraphs: string[]): SegmentState[] {
  return paragraphs.map((text, i) => ({
    id: `seg-${i}`,
    text,
    status: "idle" as SegmentStatus,
  }));
}

export function countReadySegments(segments: SegmentState[]): number {
  return segments.filter((segment) => segment.status === "ready").length;
}

export function revokeSegmentAudioUrls(segments: SegmentState[]): void {
  if (typeof URL === "undefined") return;

  segments.forEach((segment) => {
    if (segment.audioUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(segment.audioUrl);
    }
  });
}

export function mergeStoredAudioUrls(
  segments: SegmentState[],
  audioUrls: string[]
): SegmentState[] {
  return segments.map((segment) => {
    const matchingUrl = audioUrls.find((url) => url.includes(`/${segment.id}.wav`));
    if (!matchingUrl) {
      return segment;
    }

    return {
      ...segment,
      status: "ready" as SegmentStatus,
      audioUrl: matchingUrl,
      cloudUrl: matchingUrl,
      uploadStatus: "success" as UploadStatus,
      uploadError: undefined,
    };
  });
}

export function applySegmentWordTimings(
  segments: SegmentState[],
  segmentWordTimings: Record<string, WordTiming[]>
): SegmentState[] {
  return segments.map((segment) => {
    const next = normalizeWordTimings(segmentWordTimings[segment.id]);
    if (next) {
      return { ...segment, wordTimings: next };
    }
    if (segment.wordTimings) {
      return { ...segment, wordTimings: undefined };
    }
    return segment;
  });
}
