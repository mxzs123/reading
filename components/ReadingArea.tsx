"use client";

import { useEffect, useMemo } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { buildParagraphs, buildParagraphKey } from "@/lib/paragraphs";
import { Paragraph } from "./Paragraph";
import styles from "./ReadingArea.module.css";

interface ReadingAreaProps {
  text: string;
  onWordClick: (word: string, rect: DOMRect) => void;
  onWordPrefetch?: (word: string) => void;
  onStopArticleAudio?: () => void;
  onWordAudioEnd?: () => void;
}

export function ReadingArea({
  text,
  onWordClick,
  onWordPrefetch,
  onStopArticleAudio,
  onWordAudioEnd,
}: ReadingAreaProps) {
  const segments = useAudioStore((s) => s.segments);
  const initSegments = useAudioStore((s) => s.initSegments);

  // 构建段落
  const paragraphs = useMemo(() => buildParagraphs(text), [text]);
  const paragraphKey = useMemo(() => buildParagraphKey(paragraphs), [paragraphs]);

  // 当文本变化时重新初始化 segments
  useEffect(() => {
    initSegments(paragraphs);
  }, [paragraphKey, paragraphs, initSegments]);

  if (!paragraphs.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>在左侧输入英文文本，点击「确认生成」开始阅读</p>
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
          onWordPrefetch={onWordPrefetch}
          onStopArticleAudio={onStopArticleAudio}
          onWordAudioEnd={onWordAudioEnd}
        />
      ))}
    </div>
  );
}
