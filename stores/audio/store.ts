import { create } from "zustand";
import { createAudioGenerator } from "./generator";
import { createPlaybackController } from "./playback";
import {
  applySegmentWordTimings,
  buildInitialSegments,
  countReadySegments,
  mergeStoredAudioUrls,
  revokeSegmentAudioUrls,
} from "./segments";
import { createAudioUploader } from "./uploader";
import { DEFAULT_TTS_CONCURRENCY } from "./constants";
import type { AudioStore } from "./types";

export const useAudioStore = create<AudioStore>((set, get) => {
  const generator = createAudioGenerator({ get, set });
  const playback = createPlaybackController({ get, set });
  const uploader = createAudioUploader({ get, set });

  return {
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

    generateAll: generator.generateAll,
    generateSegment: generator.generateSegment,
    pause: playback.pause,
    playSegment: playback.playSegment,
    seek: playback.seek,
    startSequenceFrom: playback.startSequenceFrom,
    stop: playback.stop,
    togglePlayPause: playback.togglePlayPause,
    uploadAllAudio: uploader.uploadAllAudio,
    uploadSegmentAudio: uploader.uploadSegmentAudio,
    setConcurrencyLimit: generator.setConcurrencyLimit,

    initSegments: (paragraphs) => {
      revokeSegmentAudioUrls(get().segments);
      generator.resetGeneration();
      playback.resetPlayback();

      const segments = buildInitialSegments(paragraphs);
      set({
        segments,
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

    loadAudioUrls: (audioUrls) => {
      if (!audioUrls || audioUrls.length === 0) return;

      set((state) => {
        const segments = mergeStoredAudioUrls(state.segments, audioUrls);
        return {
          segments,
          readyCount: countReadySegments(segments),
        };
      });
    },

    loadSegmentWordTimings: (segmentWordTimings) => {
      if (!segmentWordTimings) return;

      set((state) => ({
        segments: applySegmentWordTimings(state.segments, segmentWordTimings),
      }));
    },
  };
});
