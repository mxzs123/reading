"use client";

import { useAudioStore } from "@/stores/audioStore";
import { formatTime } from "@/lib/paragraphs";
import styles from "./MiniPlayer.module.css";

export function MiniPlayer() {
  const activeSegmentId = useAudioStore((s) => s.activeSegmentId);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);
  const stop = useAudioStore((s) => s.stop);
  const seek = useAudioStore((s) => s.seek);

  // 没有活动音频时不显示
  if (!activeSegmentId) return null;

  return (
    <div className={styles.player}>
      <button className={styles.button} onClick={togglePlayPause} aria-label={isPlaying ? "暂停" : "播放"}>
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className={styles.progress}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className={styles.seekBar}
          aria-label="播放进度"
        />
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <button className={styles.button} onClick={stop} aria-label="停止">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      </button>
    </div>
  );
}
