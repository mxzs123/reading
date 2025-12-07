"use client";

import { useMemo, useCallback } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import { tokenize, renderBionicWord } from "@/lib/paragraphs";
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

  // 从 store 订阅状态
  const activeSegmentId = useAudioStore((s) => s.activeSegmentId);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const playSegment = useAudioStore((s) => s.playSegment);
  const startSequenceFrom = useAudioStore((s) => s.startSequenceFrom);
  const generateSegment = useAudioStore((s) => s.generateSegment);
  const segment = useAudioStore((s) => s.segments.find((seg) => seg.id === id));

  const isActive = activeSegmentId === id && isPlaying;
  const tokens = useMemo(() => tokenize(text), [text]);

  // 点击段落空白处触发播放
  const handleParagraphClick = useCallback(
    async (e: React.MouseEvent) => {
      // 如果点击的是单词，不处理
      if ((e.target as HTMLElement).closest(".bionic-word")) return;

      const play = settings.autoPlayNext ? startSequenceFrom : playSegment;

      // 如果已生成，直接播放
      if (segment?.status === "ready") {
        play(id);
      } else if (segment?.status !== "generating") {
        // 未生成则先生成再播放
        await generateSegment(id, settings.azureApiKey, settings.azureRegion, settings.azureVoice);
        // 生成完成后播放
        play(id);
      }
    },
    [id, segment, playSegment, startSequenceFrom, generateSegment, settings.autoPlayNext, settings.azureApiKey, settings.azureRegion, settings.azureVoice]
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
      {tokens.map((token, i) =>
        token.type === "word" ? (
          <span
            key={i}
            className="bionic-word"
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
            {(() => {
              const { lead, tail } = renderBionicWord(token.value, settings.boldRatio);
              return (
                <>
                  <b>{lead}</b>
                  {tail}
                </>
              );
            })()}
          </span>
        ) : (
          <span key={i}>{token.value}</span>
        )
      )}
    </p>
  );
}
