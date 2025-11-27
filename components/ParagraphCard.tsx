"use client";

import { useCallback } from "react";
import { playWordSound } from "@/lib/wordAudio";
import { tokenize, renderBionicWord } from "@/lib/paragraphs";
import type { SegmentState } from "@/hooks/useTTSQueue";
import { SEEK_STEP_SECONDS } from "@/hooks/useAudioController";
import { PlayerControls } from "./PlayerControls";
import styles from "./ParagraphAudioList.module.css";

interface WordSelection {
  word: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface ParagraphCardProps {
  segment: SegmentState;
  index: number;
  boldRatio: "low" | "medium" | "high";
  isExpanded: boolean;
  isActive: boolean;
  sequenceActive: boolean;
  onWordSelected?: (selection: WordSelection) => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStepTime: (delta: number) => void;
  onSeek: (value: number) => void;
  onStartSequence: () => void;
  onToggleExpand: () => void;
}

export function ParagraphCard({
  segment,
  index,
  boldRatio,
  isExpanded,
  isActive,
  sequenceActive,
  onWordSelected,
  onPlay,
  onPause,
  onRestart,
  onStepTime,
  onSeek,
  onStartSequence,
  onToggleExpand,
}: ParagraphCardProps) {
  const handleWordClick = useCallback(
    (word: string, target: HTMLElement) => {
      if (!word.trim()) return;
      playWordSound(word);

      target.classList.add("active-highlight");
      window.setTimeout(() => target.classList.remove("active-highlight"), 280);

      const rect = target.getBoundingClientRect();
      onWordSelected?.({
        word,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      });
    },
    [onWordSelected]
  );

  const hasAudio = segment.status === "ready" && !!segment.audioUrl;
  const duration = segment.duration ?? 0;
  const currentTime = segment.currentTime ?? 0;
  const canPlay = hasAudio;

  const tokens = tokenize(segment.text);

  return (
    <div className={`${styles.card} ${isExpanded ? styles.cardActive : ""}`}>
      <div className={styles.paragraphText}>
        <div className={styles.paragraphLabel}>段落 {index + 1}</div>
        <div className={styles.bionicParagraph}>
          {tokens.map((token, tokenIndex) =>
            token.type === "word" ? (
              <span
                key={`${segment.id}-${tokenIndex}`}
                className="bionic-word"
                role="button"
                tabIndex={0}
                onClick={(e) => handleWordClick(token.value, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleWordClick(token.value, e.currentTarget);
                  }
                }}
              >
                {(() => {
                  const { lead, tail } = renderBionicWord(token.value, boldRatio);
                  return (
                    <>
                      <b>{lead}</b>
                      {tail}
                    </>
                  );
                })()}
              </span>
            ) : (
              <span key={`${segment.id}-t-${tokenIndex}`}>{token.value}</span>
            )
          )}
        </div>
      </div>

      <div className={styles.segmentBar}>
        <div className={styles.statusGroup}>
          {hasAudio && <span className={styles.badgeReady}>已生成</span>}
          {segment.status === "generating" && <span className={styles.badge}>生成中…</span>}
          {segment.status === "error" && (
            <span className={styles.badgeError}>{segment.error || "生成失败"}</span>
          )}
        </div>

        {hasAudio && (
          <div className={styles.compactControls}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={segment.isPlaying ? onPause : onPlay}
              disabled={!canPlay}
              title={segment.isPlaying ? "暂停" : "播放"}
            >
              {segment.isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onToggleExpand}
              title={isExpanded ? "折叠播放器" : "展开播放器"}
            >
              {isExpanded ? "收起" : "展开"}
            </button>
          </div>
        )}
      </div>

      {hasAudio && isExpanded && (
        <PlayerControls
          isPlaying={!!segment.isPlaying}
          isActive={isActive}
          canPlay={canPlay}
          duration={duration}
          currentTime={currentTime}
          sequenceActive={sequenceActive}
          onPlay={onPlay}
          onPause={onPause}
          onRestart={onRestart}
          onStepBack={() => onStepTime(-SEEK_STEP_SECONDS)}
          onStepForward={() => onStepTime(SEEK_STEP_SECONDS)}
          onSeek={onSeek}
          onStartSequence={onStartSequence}
        />
      )}
    </div>
  );
}
