import { findWordIndexAtTime } from "./utils";
import { getAudio, startSyncLoop, stopSyncLoop } from "./audioPlayer";
import type { AudioStoreGet, AudioStoreSet } from "./types";

interface PlaybackControllerOptions {
  get: AudioStoreGet;
  set: AudioStoreSet;
}

export function createPlaybackController({ get, set }: PlaybackControllerOptions) {
  const playSegment = (id: string) => {
    const segment = get().segments.find((s) => s.id === id);
    if (!segment?.audioUrl) return;

    const audio = getAudio();
    const { activeSegmentId, isPlaying } = get();

    if (activeSegmentId !== id) {
      audio.src = segment.audioUrl;
      audio.currentTime = 0;
      set({ currentTime: 0, activeWordIndex: null });
    } else if (isPlaying) {
      audio.currentTime = 0;
      set({ currentTime: 0, activeWordIndex: null });
    }

    audio.play().catch(() => {});
    set({ activeSegmentId: id });
  };

  const playNextInSequence = () => {
    const { segments, activeSegmentId, sequenceMode } = get();
    if (!sequenceMode || !activeSegmentId) return;

    const currentIndex = segments.findIndex((s) => s.id === activeSegmentId);
    const next = segments.slice(currentIndex + 1).find((s) => s.status === "ready" && s.audioUrl);

    if (next) {
      playSegment(next.id);
    } else {
      set({ sequenceMode: false, isPlaying: false });
    }
  };

  const handleSyncTick = () => {
    const audio = getAudio();
    const { activeSegmentId, activeWordIndex, segments } = get();
    const segment = activeSegmentId ? segments.find((s) => s.id === activeSegmentId) : undefined;
    const wordTimings = segment?.wordTimings;
    const nextIndex = wordTimings ? findWordIndexAtTime(wordTimings, audio.currentTime) : null;
    if (nextIndex !== activeWordIndex) {
      set({ activeWordIndex: nextIndex });
    }
  };

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
      startSyncLoop(handleSyncTick);
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
      stop();
    });
  }

  const pause = () => {
    const audio = getAudio();
    if (audio && !audio.paused) {
      audio.pause();
    }
  };

  const stop = () => {
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
  };

  const resetPlayback = () => {
    const audio = getAudio();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }

    stopSyncLoop();
  };

  return {
    pause,
    playSegment,
    resetPlayback,
    seek: (time: number) => {
      const audio = getAudio();
      audio.currentTime = time;

      const { activeSegmentId, segments } = get();
      const segment = activeSegmentId ? segments.find((s) => s.id === activeSegmentId) : undefined;
      const nextIndex = segment?.wordTimings ? findWordIndexAtTime(segment.wordTimings, time) : null;
      set({ currentTime: time, activeWordIndex: nextIndex });
    },
    startSequenceFrom: (id: string) => {
      set({ sequenceMode: true });
      playSegment(id);
    },
    stop,
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
  };
}
