import type { WordTiming } from "@/lib/storage";
import { normalizeWordTimings } from "@/lib/wordTimings";
import type { SegmentState } from "./types";

export function buildInitialSegments(paragraphs: string[]): SegmentState[] {
  return paragraphs.map((text, i): SegmentState => ({
    id: `seg-${i}`,
    text,
    status: "idle",
  }));
}

export function updateSegment(
  segments: SegmentState[],
  segmentId: string,
  patch: Partial<SegmentState>
): SegmentState[] {
  return segments.map((segment) =>
    segment.id === segmentId ? { ...segment, ...patch } : segment
  );
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
  return segments.map((segment): SegmentState => {
    const matchingUrl = audioUrls.find((url) => url.includes(`/${segment.id}.wav`));
    if (!matchingUrl) {
      return segment;
    }

    return {
      ...segment,
      status: "ready",
      audioUrl: matchingUrl,
      cloudUrl: matchingUrl,
      uploadStatus: "success",
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
