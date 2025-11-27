"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SegmentState } from "./useTTSQueue";

export const SEEK_STEP_SECONDS = 2;

interface UseAudioControllerOptions {
  segmentsRef: React.MutableRefObject<SegmentState[]>;
  updateSegment: (id: string, updates: Partial<SegmentState>) => void;
  updateAllSegments: (updater: (seg: SegmentState) => SegmentState) => void;
  onNotice?: (message: string) => void;
}

export function useAudioController({
  segmentsRef,
  updateSegment,
  updateAllSegments,
  onNotice,
}: UseAudioControllerOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);
  const sequenceActiveRef = useRef(false);
  useEffect(() => {
    sequenceActiveRef.current = sequenceActive;
  }, [sequenceActive]);
  const sequenceIndexRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef<() => void>(() => {});
  const onErrorRef = useRef<() => void>(() => {});

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    updateAllSegments((seg) => ({ ...seg, isPlaying: false, currentTime: 0 }));
    setActiveId(null);
    activeIdRef.current = null;
    setSequenceActive(false);
    sequenceActiveRef.current = false;
    sequenceIndexRef.current = null;
    setExpandedId(null);
  }, [updateAllSegments]);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("timeupdate", () => {
      const id = activeIdRef.current;
      if (!id) return;
      updateSegment(id, {
        currentTime: audio.currentTime,
        duration: audio.duration || undefined,
      });
    });

    audio.addEventListener("loadedmetadata", () => {
      const id = activeIdRef.current;
      if (!id) return;
      updateSegment(id, { duration: audio.duration });
    });

    audio.addEventListener("ended", () => {
      onEndedRef.current();
    });

    audio.addEventListener("error", () => {
      onErrorRef.current();
    });

    audioRef.current = audio;
    return audio;
  }, [updateSegment]);

  const playSegment = useCallback(
    (id: string, options?: { restart?: boolean }) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || seg.status !== "ready" || !seg.audioUrl) {
        onNotice?.("请先生成音频后再播放");
        return;
      }

      const audio = ensureAudio();
      if (activeIdRef.current !== id || options?.restart) {
        audio.src = seg.audioUrl;
        audio.currentTime = 0;
      }

      audio
        .play()
        .then(() => {
          setActiveId(id);
          activeIdRef.current = id;
          setExpandedId(id);
          updateAllSegments((item) => ({
            ...item,
            isPlaying: item.id === id,
          }));

          const currentIndex = segmentsRef.current.findIndex((s) => s.id === id);
          sequenceIndexRef.current = currentIndex >= 0 ? currentIndex : null;
        })
        .catch(() => {
          onNotice?.("播放失败，请检查音频或稍后重试");
          updateSegment(id, { isPlaying: false });
        });
    },
    [ensureAudio, segmentsRef, updateSegment, updateAllSegments, onNotice]
  );

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    updateAllSegments((item) => ({ ...item, isPlaying: false }));
    setActiveId(null);
    activeIdRef.current = null;
    setSequenceActive(false);
    sequenceActiveRef.current = false;
  }, [updateAllSegments]);

  const restartPlayback = useCallback(
    (id: string) => {
      playSegment(id, { restart: true });
    },
    [playSegment]
  );

  const stepTime = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || audio.currentTime + delta));
    audio.currentTime = next;
  }, []);

  const handleSeek = useCallback(
    (value: number, id: string) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || !seg.audioUrl) return;
      const audio = ensureAudio();
      if (activeIdRef.current !== id || audio.src !== seg.audioUrl) {
        stopPlayback();
        audio.src = seg.audioUrl;
        setExpandedId(id);
        setActiveId(id);
        activeIdRef.current = id;
      }
      audio.currentTime = value;
      updateSegment(id, { currentTime: value, duration: seg.duration });
    },
    [ensureAudio, stopPlayback, segmentsRef, updateSegment]
  );

  const playNextInSequence = useCallback(() => {
    if (!sequenceActiveRef.current) return;
    const currentIndex = sequenceIndexRef.current ?? -1;
    for (let i = currentIndex + 1; i < segmentsRef.current.length; i += 1) {
      const nextSeg = segmentsRef.current[i];
      if (nextSeg.status === "ready" && nextSeg.audioUrl) {
        sequenceIndexRef.current = i;
        playSegment(nextSeg.id, { restart: true });
        return;
      }
    }
    setSequenceActive(false);
    sequenceActiveRef.current = false;
    setActiveId(null);
    activeIdRef.current = null;
    setExpandedId(null);
  }, [playSegment, segmentsRef]);

  const startSequenceFrom = useCallback(
    (id: string) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || seg.status !== "ready" || !seg.audioUrl) {
        onNotice?.("顺序播放前请先生成所需段落的音频");
        return;
      }
      const index = segmentsRef.current.findIndex((s) => s.id === id);
      sequenceIndexRef.current = index >= 0 ? index : null;
      setSequenceActive(true);
      sequenceActiveRef.current = true;
      playSegment(id, { restart: true });
    },
    [playSegment, segmentsRef, onNotice]
  );

  useEffect(() => {
    onEndedRef.current = () => {
      const id = activeIdRef.current;
      if (id) {
        updateSegment(id, { isPlaying: false });
      }
      if (sequenceActiveRef.current) {
        playNextInSequence();
      } else {
        setActiveId(null);
        activeIdRef.current = null;
        setExpandedId(null);
      }
    };
  }, [updateSegment, playNextInSequence]);

  useEffect(() => {
    onErrorRef.current = () => {
      const id = activeIdRef.current;
      if (id) {
        updateSegment(id, { isPlaying: false, error: "音频播放失败" });
      }
      stopPlayback();
      onNotice?.("音频播放失败，请重新播放或重新生成音频");
    };
  }, [updateSegment, stopPlayback, onNotice]);

  return {
    activeId,
    expandedId,
    sequenceActive,
    setExpandedId,
    stopPlayback,
    playSegment,
    pausePlayback,
    restartPlayback,
    stepTime,
    handleSeek,
    startSequenceFrom,
  };
}
