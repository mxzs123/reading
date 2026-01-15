"use client";

import { Fragment, useMemo, useCallback } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import { tokenize, renderBionicWord } from "@/lib/paragraphs";
import { buildTtsGenerationParams } from "@/lib/settings";
import { playWordSound } from "@/lib/wordAudio";
import styles from "./ReadingArea.module.css";

interface ParagraphProps {
  id: string;
  text: string;
  onWordClick: (word: string, rect: DOMRect) => void;
  onWordPrefetch?: (word: string) => void;
  onStopArticleAudio?: () => void;
  onWordAudioEnd?: () => void;
}

export function Paragraph({
  id,
  text,
  onWordClick,
  onWordPrefetch,
  onStopArticleAudio,
  onWordAudioEnd,
}: ParagraphProps) {
  const { settings } = useSettings();

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

  // 点击段落空白处触发播放
  const handleParagraphClick = useCallback(
    async (e: React.MouseEvent) => {
      // 如果点击的是单词，不处理
      if ((e.target as HTMLElement).closest(".bionic-word")) return;
      // 纯净阅读模式不触发音频
      if (settings.readingMode === "pure") return;

      const play = settings.autoPlayNext ? startSequenceFrom : playSegment;

      const currentSegment = useAudioStore.getState().segments.find((seg) => seg.id === id);

      // 如果已生成，直接播放
      if (currentSegment?.status === "ready") {
        play(id);
      } else if (currentSegment?.status !== "generating") {
        // 未生成则先生成再播放
        await generateSegment(id, ttsParams);
        // 生成完成后播放
        play(id);
      }
    },
    [id, playSegment, startSequenceFrom, generateSegment, settings.autoPlayNext, ttsParams, settings.readingMode]
  );

  // 单词点击处理
  const handleWordClick = useCallback(
    (word: string, target: HTMLElement) => {
      playWordSound(word, onStopArticleAudio, undefined, onWordAudioEnd);
      target.classList.add("active-highlight");
      setTimeout(() => target.classList.remove("active-highlight"), 280);
      onWordClick(word, target.getBoundingClientRect());
    },
    [onStopArticleAudio, onWordAudioEnd, onWordClick]
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
              className={`bionic-word ${isSyncHighlighted ? "sync-highlight" : ""}`}
              role="button"
              tabIndex={0}
              data-word={token.value.toLowerCase()}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(token.value, e.currentTarget);
              }}
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
