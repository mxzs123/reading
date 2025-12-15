"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { formatTime } from "@/lib/paragraphs";
import styles from "./MiniPlayer.module.css";

const SEEK_STEP_SECONDS = 2;

export function MiniPlayer() {
  const activeSegmentId = useAudioStore((s) => s.activeSegmentId);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);
  const seek = useAudioStore((s) => s.seek);

  const playbackRef = useRef({ current: 0, duration: 0 });
  const pulseTimeoutRef = useRef<number | null>(null);
  const [hotkeyPulse, setHotkeyPulse] = useState(false);

  const triggerHotkeyPulse = useCallback(() => {
    setHotkeyPulse(false);
    requestAnimationFrame(() => setHotkeyPulse(true));

    if (pulseTimeoutRef.current) {
      window.clearTimeout(pulseTimeoutRef.current);
    }
    pulseTimeoutRef.current = window.setTimeout(() => setHotkeyPulse(false), 340);
  }, []);

  const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
  const safeDuration = Number.isFinite(duration) ? duration : 0;

  useEffect(() => {
    playbackRef.current = { current: safeCurrent, duration: safeDuration };
  }, [safeCurrent, safeDuration]);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleHotkey = () => {
      triggerHotkeyPulse();
    };

    window.addEventListener("mini-player-hotkey", handleHotkey as EventListener);
    return () => window.removeEventListener("mini-player-hotkey", handleHotkey as EventListener);
  }, [triggerHotkeyPulse]);

  useEffect(() => {
    if (!activeSegmentId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        (tagName && ["INPUT", "TEXTAREA", "SELECT"].includes(tagName))
      ) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();

      const { current, duration } = playbackRef.current;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const delta = event.key === "ArrowRight" ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS;
      const next = Math.min(Math.max(0, current + delta), duration);
      seek(next);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSegmentId, seek]);

  if (!activeSegmentId) return null;

  return (
    <div className={styles.player} role="complementary" aria-label="迷你播放器">
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.primaryButton} ${hotkeyPulse ? styles.hotkeyPulse : ""}`}
          onClick={togglePlayPause}
          aria-label={isPlaying ? "暂停当前段落" : "播放当前段落"}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className={styles.progressArea}>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.1}
            value={Math.min(safeDuration, safeCurrent)}
            onChange={(e) => seek(Number(e.target.value))}
            className={styles.seekBar}
            aria-label="播放进度"
            aria-valuemin={0}
            aria-valuemax={safeDuration}
            aria-valuenow={safeCurrent}
            aria-valuetext={`${formatTime(safeCurrent)} / ${formatTime(safeDuration)}`}
          />
          <div className={styles.timeRow}>
            <span>{formatTime(safeCurrent)}</span>
            <span>{formatTime(safeDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
