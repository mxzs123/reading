"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SegmentState } from "./useTTSQueue";

export const SEEK_STEP_SECONDS = 2;

interface UseAudioControllerOptions {
  segmentsRef: React.MutableRefObject<SegmentState[]>;
  onNotice?: (message: string) => void;
}

export function useAudioController({
  segmentsRef,
  onNotice,
}: UseAudioControllerOptions) {
  // 当前激活的段落 ID（已加载音频的段落）
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 播放状态
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 展开的段落（可以与 activeId 不同）
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 顺序播放
  const [sequenceActive, setSequenceActive] = useState(false);
  const sequenceActiveRef = useRef(false);
  useEffect(() => {
    sequenceActiveRef.current = sequenceActive;
  }, [sequenceActive]);
  const sequenceIndexRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef<() => void>(() => {});
  const onErrorRef = useRef<() => void>(() => {});

  // 完全停止播放并重置状态
  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setActiveId(null);
    activeIdRef.current = null;
    setIsPaused(true);
    setCurrentTime(0);
    setDuration(0);
    setSequenceActive(false);
    sequenceActiveRef.current = false;
    sequenceIndexRef.current = null;
    setExpandedId(null);
  }, []);

  // 初始化或获取共享的 Audio 元素
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("play", () => {
      setIsPaused(false);
    });

    audio.addEventListener("pause", () => {
      setIsPaused(true);
    });

    audio.addEventListener("ended", () => {
      onEndedRef.current();
    });

    audio.addEventListener("error", () => {
      onErrorRef.current();
    });

    audioRef.current = audio;
    return audio;
  }, []);

  // 播放指定段落
  const playSegment = useCallback(
    (id: string, options?: { restart?: boolean }) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || seg.status !== "ready" || !seg.audioUrl) {
        onNotice?.("请先生成音频后再播放");
        return;
      }

      const audio = ensureAudio();

      // 如果切换到新段落或需要重新开始
      if (activeIdRef.current !== id || options?.restart) {
        audio.src = seg.audioUrl;
        audio.currentTime = 0;
        setCurrentTime(0);
      }

      audio
        .play()
        .then(() => {
          setActiveId(id);
          activeIdRef.current = id;
          setExpandedId(id);

          const currentIndex = segmentsRef.current.findIndex((s) => s.id === id);
          sequenceIndexRef.current = currentIndex >= 0 ? currentIndex : null;
        })
        .catch(() => {
          onNotice?.("播放失败，请检查音频或稍后重试");
        });
    },
    [ensureAudio, segmentsRef, onNotice]
  );

  // 暂停播放（保留当前位置和 activeId）
  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    // 不清除 activeId，保留播放位置
  }, []);

  // 恢复播放
  const resumePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeIdRef.current) return;

    audio.play().catch(() => {
      onNotice?.("播放失败，请检查音频或稍后重试");
    });
  }, [onNotice]);

  // 切换播放/暂停
  const togglePlayback = useCallback(
    (id: string) => {
      // 如果是当前段落，切换播放/暂停
      if (activeIdRef.current === id) {
        const audio = audioRef.current;
        if (audio?.paused) {
          resumePlayback();
        } else {
          pausePlayback();
        }
      } else {
        // 否则播放新段落
        playSegment(id);
      }
    },
    [playSegment, pausePlayback, resumePlayback]
  );

  // 重新从头播放
  const restartPlayback = useCallback(
    (id: string) => {
      playSegment(id, { restart: true });
    },
    [playSegment]
  );

  // 快进/快退
  const stepTime = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !activeIdRef.current) return;
    const next = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  // 拖动进度条
  const handleSeek = useCallback(
    (value: number, id: string) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || !seg.audioUrl) return;

      const audio = ensureAudio();

      // 如果切换到新段落
      if (activeIdRef.current !== id) {
        audio.src = seg.audioUrl;
        setActiveId(id);
        activeIdRef.current = id;
        setExpandedId(id);
        // 加载后设置时间
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = value;
            setCurrentTime(value);
            setDuration(audio.duration);
          },
          { once: true }
        );
      } else {
        audio.currentTime = value;
        setCurrentTime(value);
      }
    },
    [ensureAudio, segmentsRef]
  );

  // 播放下一个段落（顺序播放）
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
    // 没有更多可播放的段落，结束顺序播放
    setSequenceActive(false);
    sequenceActiveRef.current = false;
    setIsPaused(true);
  }, [playSegment, segmentsRef]);

  // 从指定段落开始顺序播放
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

  // 播放结束回调
  useEffect(() => {
    onEndedRef.current = () => {
      setIsPaused(true);
      if (sequenceActiveRef.current) {
        playNextInSequence();
      }
    };
  }, [playNextInSequence]);

  // 播放错误回调
  useEffect(() => {
    onErrorRef.current = () => {
      stopPlayback();
      onNotice?.("音频播放失败，请重新播放或重新生成音频");
    };
  }, [stopPlayback, onNotice]);

  // 判断指定段落是否正在播放
  const isSegmentPlaying = useCallback(
    (id: string) => activeId === id && !isPaused,
    [activeId, isPaused]
  );

  return {
    activeId,
    expandedId,
    sequenceActive,
    isPaused,
    currentTime,
    duration,
    setExpandedId,
    stopPlayback,
    playSegment,
    pausePlayback,
    resumePlayback,
    togglePlayback,
    restartPlayback,
    stepTime,
    handleSeek,
    startSequenceFrom,
    isSegmentPlaying,
  };
}
