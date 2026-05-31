"use client";

import { Fragment, useCallback, useMemo } from "react";
import type React from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import { useWordLongPress } from "@/hooks/useWordLongPress";
import { tokenize, renderBionicWord } from "@/lib/paragraphs";
import { buildTtsGenerationParams } from "@/lib/settings";
import type { WordAskTarget } from "@/lib/wordInteraction";
import { playWordSound } from "@/lib/wordAudio";
import styles from "./ReadingArea.module.css";

interface ParagraphProps {
  id: string;
  text: string;
  onWordClick: (word: string, rect: DOMRect) => void;
  onWordLongPress?: (target: WordAskTarget) => void;
  wordLongPressEnabled?: boolean;
  wordLongPressMs?: number;
  onWordPrefetch?: (word: string) => void;
  onStopArticleAudio?: () => void;
  onWordAudioEnd?: () => void;
}

export function Paragraph({
  id,
  text,
  onWordClick,
  onWordLongPress,
  wordLongPressEnabled = false,
  wordLongPressMs = 520,
  onWordPrefetch,
  onStopArticleAudio,
  onWordAudioEnd,
}: ParagraphProps) {
  const { settings } = useSettings();
  const {
    activeIndex: longPressingIndex,
    clear: clearWordLongPress,
    consumeHandledClick,
    start: startWordLongPress,
  } = useWordLongPress({
    enabled: wordLongPressEnabled && Boolean(onWordLongPress),
    delayMs: wordLongPressMs,
  });

  const playSegment = useAudioStore((s) => s.playSegment);
  const startSequenceFrom = useAudioStore((s) => s.startSequenceFrom);
  const generateSegment = useAudioStore((s) => s.generateSegment);

  const isActive = useAudioStore((s) => s.activeSegmentId === id && s.isPlaying);
  const syncHighlightEnabled = settings.ttsProvider === "elevenlabs" && settings.elevenWordSyncHighlight;
  const syncedWordIndex = useAudioStore((s) => {
    if (!syncHighlightEnabled) return null;
    if (s.activeSegmentId !== id) return null;
    return s.activeWordIndex;
  });

  const ttsParams = useMemo(() => buildTtsGenerationParams(settings), [settings]);

  const tokens = useMemo(() => tokenize(text), [text]);
  const wordIndexByTokenIndex = useMemo(() => {
    const indices: Array<number | null> = new Array(tokens.length);
    let nextWordIndex = 0;
    for (let i = 0; i < tokens.length; i += 1) {
      indices[i] = tokens[i]?.type === "word" ? nextWordIndex++ : null;
    }
    return indices;
  }, [tokens]);

  const handleParagraphClick = useCallback(
    async (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".bionic-word")) return;
      if (settings.readingMode === "pure") return;

      const play = settings.autoPlayNext ? startSequenceFrom : playSegment;

      const currentSegment = useAudioStore.getState().segments.find((seg) => seg.id === id);

      if (currentSegment?.status === "ready") {
        play(id);
      } else if (currentSegment?.status !== "generating") {
        await generateSegment(id, ttsParams);
        play(id);
      }
    },
    [id, playSegment, startSequenceFrom, generateSegment, settings.autoPlayNext, ttsParams, settings.readingMode]
  );

  const handleWordClick = useCallback(
    (word: string, target: HTMLElement) => {
      if (consumeHandledClick()) return;
      playWordSound(word, onStopArticleAudio, undefined, onWordAudioEnd);
      target.classList.add("active-highlight");
      setTimeout(() => target.classList.remove("active-highlight"), 280);
      onWordClick(word, target.getBoundingClientRect());
    },
    [consumeHandledClick, onStopArticleAudio, onWordAudioEnd, onWordClick]
  );

  const handleWordPointerDown = useCallback(
    (word: string, tokenIndex: number, event: React.PointerEvent<HTMLElement>) => {
      startWordLongPress(event, tokenIndex, (target) => {
        target.classList.add("active-highlight");
        window.setTimeout(() => target.classList.remove("active-highlight"), 280);
        onWordLongPress?.({
          word,
          paragraphText: text,
          rect: target.getBoundingClientRect(),
        });
      });
    },
    [onWordLongPress, startWordLongPress, text]
  );

  return (
    <p
      className={`${styles.paragraph} ${isActive ? styles.active : ""}`}
      onClick={handleParagraphClick}
    >
      {tokens.map((token, i) => {
        if (token.type === "word") {
          const ratio =
            settings.boldRatio === "custom"
              ? settings.customBoldRatio
              : settings.boldRatio;
          const { lead, tail } = renderBionicWord(token.value, ratio);

          const wordIdx = wordIndexByTokenIndex[i];
          const isSyncHighlighted =
            wordIdx !== null &&
            syncedWordIndex !== null &&
            syncedWordIndex === wordIdx;

          return (
            <span
              key={i}
              className={`bionic-word ${isSyncHighlighted ? "sync-highlight" : ""} ${
                longPressingIndex === i ? styles.aiPressing : ""
              }`}
              role="button"
              tabIndex={0}
              data-word={token.value.toLowerCase()}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(token.value, e.currentTarget);
              }}
              onPointerDown={(e) => handleWordPointerDown(token.value, i, e)}
              onPointerUp={clearWordLongPress}
              onPointerCancel={clearWordLongPress}
              onPointerLeave={clearWordLongPress}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleWordClick(token.value, e.currentTarget);
                }
              }}
              onMouseEnter={() => onWordPrefetch?.(token.value)}
              onFocus={() => onWordPrefetch?.(token.value)}
            >
              {lead ? <b>{lead}</b> : null}
              {tail}
            </span>
          );
        }
        return <Fragment key={i}>{token.value}</Fragment>;
      })}
    </p>
  );
}
