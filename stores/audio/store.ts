import { create } from "zustand";
import { createAudioGenerator } from "./generator";
import { createPlaybackController } from "./playback";
import {
  applySegmentWordTimings,
  buildInitialSegments,
  mergeStoredAudioUrls,
  revokeSegmentAudioUrls,
} from "./segments";
import { createAudioUploader } from "./uploader";
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
      });
    },

    loadAudioUrls: (audioUrls) => {
      if (audioUrls.length === 0) return;

      set((state) => {
        const segments = mergeStoredAudioUrls(state.segments, audioUrls);
        return { segments };
      });
    },

    loadSegmentWordTimings: (segmentWordTimings) => {
      set((state) => ({
        segments: applySegmentWordTimings(state.segments, segmentWordTimings),
      }));
    },
  };
});
