"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { buildParagraphs, buildParagraphKey } from "@/lib/paragraphs";
import { useTTSQueue } from "@/hooks/useTTSQueue";
import { useAudioController } from "@/hooks/useAudioController";
import { ParagraphToolbar } from "./ParagraphToolbar";
import { ParagraphCard } from "./ParagraphCard";
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

interface ParagraphAudioListProps {
  text: string;
  onWordSelected?: (selection: WordSelection) => void;
}

export function ParagraphAudioList({ text, onWordSelected }: ParagraphAudioListProps) {
  const { settings } = useSettings();
  const maxConcurrentGen = Math.max(1, settings.ttsConcurrency || 5);
  const paragraphs = useMemo(() => buildParagraphs(text), [text]);
  const paragraphKey = useMemo(() => buildParagraphKey(paragraphs), [paragraphs]);

  const [notice, setNotice] = useState<string | null>(null);

  const handleNotice = useCallback((message: string) => {
    setNotice(message);
  }, []);

  const { segments, segmentsRef, generateAll, stats, updateSegment, updateAllSegments } = useTTSQueue({
    paragraphs,
    paragraphKey,
    geminiApiKey: settings.geminiApiKey,
    ttsVoice: settings.ttsVoice,
    maxConcurrent: maxConcurrentGen,
  });

  const audioController = useAudioController({
    segmentsRef,
    updateSegment,
    updateAllSegments,
    onNotice: handleNotice,
  });

  const {
    activeId,
    expandedId,
    sequenceActive,
    setExpandedId,
    stopPlayback,
    playSegment,
    pausePlayback,
    restartPlayback,
    stepTime,
    handleSeek,
    startSequenceFrom,
  } = audioController;

  const stopPlaybackRef = useRef(stopPlayback);
  useEffect(() => {
    stopPlaybackRef.current = stopPlayback;
  }, [stopPlayback]);

  const prevParagraphKeyRef = useRef(paragraphKey);
  useEffect(() => {
    if (prevParagraphKeyRef.current !== paragraphKey) {
      stopPlaybackRef.current();
      prevParagraphKeyRef.current = paragraphKey;
    }
  }, [paragraphKey]);

  const handleGenerateAll = useCallback(() => {
    if (!settings.geminiApiKey) {
      setNotice("请先在设置中填入 Gemini API Key");
      return;
    }
    generateAll();
  }, [generateAll, settings.geminiApiKey]);

  const handleStopPlayback = () => {
    stopPlayback();
    setNotice(null);
  };

  if (!paragraphs.length) {
    return <div className="muted-text">输入文本后将在此显示仿生阅读与分段播放器。</div>;
  }

  const primaryOpenId = expandedId ?? activeId;

  return (
    <div className={styles.list}>
      <ParagraphToolbar
        onGenerateAll={handleGenerateAll}
        onStopPlayback={handleStopPlayback}
        isPlaying={!!activeId}
        stats={stats}
      />

      {notice && (
        <div className={styles.notice}>
          <span>{notice}</span>
          <button type="button" className={styles.noticeClose} onClick={() => setNotice(null)}>
            关闭
          </button>
        </div>
      )}

      {segments.map((segment, index) => {
        const hasAudio = segment.status === "ready" && !!segment.audioUrl;
        const isExpanded = hasAudio && primaryOpenId === segment.id;
        const isActive = activeId === segment.id;

        return (
          <ParagraphCard
            key={segment.id}
            segment={segment}
            index={index}
            boldRatio={settings.boldRatio}
            isExpanded={isExpanded}
            isActive={isActive}
            sequenceActive={sequenceActive}
            onWordSelected={onWordSelected}
            onPlay={() => playSegment(segment.id)}
            onPause={pausePlayback}
            onRestart={() => restartPlayback(segment.id)}
            onStepTime={stepTime}
            onSeek={(value) => handleSeek(value, segment.id)}
            onStartSequence={() => startSequenceFrom(segment.id)}
            onToggleExpand={() => {
              if (isExpanded) {
                setExpandedId(null);
              } else {
                stopPlayback();
                setExpandedId(segment.id);
              }
            }}
          />
        );
      })}
    </div>
  );
}
