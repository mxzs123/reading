"use client";

import { useEffect, useMemo, useRef } from "react";
import { FileText } from "lucide-react";
import { useAudioStore } from "@/stores/audioStore";
import { useI18n } from "@/contexts/I18nContext";
import { buildParagraphs, buildParagraphKey } from "@/lib/paragraphs";
import type { WordAskTarget } from "@/lib/wordInteraction";
import { Paragraph } from "./Paragraph";
import styles from "./ReadingArea.module.css";

interface ReadingAreaProps {
  text: string;
  onWordClick: (word: string, rect: DOMRect) => void;
  onWordLongPress?: (target: WordAskTarget) => void;
  wordLongPressEnabled?: boolean;
  wordLongPressMs?: number;
  onWordPrefetch?: (word: string) => void;
  onStopArticleAudio?: () => void;
  onWordAudioEnd?: () => void;
}

export function ReadingArea({
  text,
  onWordClick,
  onWordLongPress,
  wordLongPressEnabled,
  wordLongPressMs,
  onWordPrefetch,
  onStopArticleAudio,
  onWordAudioEnd,
}: ReadingAreaProps) {
  const { t } = useI18n();
  const segments = useAudioStore((s) => s.segments);
  const initSegments = useAudioStore((s) => s.initSegments);
  const lastParagraphKeyRef = useRef<string | null>(null);

  // 构建段落
  const paragraphs = useMemo(() => buildParagraphs(text), [text]);
  const paragraphKey = useMemo(() => buildParagraphKey(paragraphs), [paragraphs]);

  // 当文本变化时重新初始化 segments
  useEffect(() => {
    if (lastParagraphKeyRef.current === paragraphKey) return;
    lastParagraphKeyRef.current = paragraphKey;
    initSegments(paragraphs);
  }, [paragraphKey, paragraphs, initSegments]);

  if (!paragraphs.length) {
    return (
      <div className={styles.empty}>
        <FileText aria-hidden="true" className={styles.emptyIcon} />
        <p className={styles.emptyText}>{t("reading.empty")}</p>
        <p className={styles.emptyHint}>
          <kbd className={styles.kbd}>⌘</kbd>
          <kbd className={styles.kbd}>↵</kbd>
          <span>{t("reading.generateHint")}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {segments.map((seg) => (
        <Paragraph
          key={seg.id}
          id={seg.id}
          text={seg.text}
          onWordClick={onWordClick}
          onWordLongPress={onWordLongPress}
          wordLongPressEnabled={wordLongPressEnabled}
          wordLongPressMs={wordLongPressMs}
          onWordPrefetch={onWordPrefetch}
          onStopArticleAudio={onStopArticleAudio}
          onWordAudioEnd={onWordAudioEnd}
        />
      ))}
    </div>
  );
}
