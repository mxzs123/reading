"use client";

import { formatTime } from "@/lib/paragraphs";
import { SEEK_STEP_SECONDS } from "@/hooks/useAudioController";
import styles from "./ParagraphAudioList.module.css";

interface PlayerControlsProps {
  isPlaying: boolean;
  isActive: boolean;
  canPlay: boolean;
  duration: number;
  currentTime: number;
  sequenceActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (value: number) => void;
  onStartSequence: () => void;
}

export function PlayerControls({
  isPlaying,
  isActive,
  canPlay,
  duration,
  currentTime,
  sequenceActive,
  onPlay,
  onPause,
  onRestart,
  onStepBack,
  onStepForward,
  onSeek,
  onStartSequence,
}: PlayerControlsProps) {
  return (
    <div className={styles.playerRow}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onStepBack}
          disabled={!canPlay || !isActive}
          title={`后退 ${SEEK_STEP_SECONDS} 秒`}
        >
          -{SEEK_STEP_SECONDS}s
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={isPlaying ? onPause : onPlay}
          disabled={!canPlay}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onStepForward}
          disabled={!canPlay || !isActive}
          title={`快进 ${SEEK_STEP_SECONDS} 秒`}
        >
          +{SEEK_STEP_SECONDS}s
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onRestart}
          disabled={!canPlay}
          title="重新播放"
        >
          ↻
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${sequenceActive && isActive ? styles.iconButtonActive : ""}`}
          onClick={onStartSequence}
          disabled={!canPlay}
          title="从此处顺序播放"
        >
          ➡ 顺序
        </button>
      </div>

      <div className={styles.progressArea}>
        <div className={styles.timeRow}>
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : "--:--"}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={duration ? currentTime : 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          className={styles.seek}
          disabled={!canPlay}
          aria-label="播放进度"
        />
      </div>
    </div>
  );
}
