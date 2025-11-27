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

  const { segments, segmentsRef, generateAll, stats } = useTTSQueue({
    paragraphs,
    paragraphKey,
    geminiApiKey: settings.geminiApiKey,
    ttsVoice: settings.ttsVoice,
    maxConcurrent: maxConcurrentGen,
  });

  const audioController = useAudioController({
    segmentsRef,
    onNotice: handleNotice,
  });

  const {
    activeId,
    expandedId,
    sequenceActive,
    isPaused,
    currentTime,
    duration,
    setExpandedId,
    stopPlayback,
    togglePlayback,
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
  const isPlaying = !!activeId && !isPaused;

  return (
    <div className={styles.list}>
      <ParagraphToolbar
        onGenerateAll={handleGenerateAll}
        onStopPlayback={handleStopPlayback}
        isPlaying={isPlaying}
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
        const segmentIsPlaying = isActive && !isPaused;

        return (
          <ParagraphCard
            key={segment.id}
            segment={segment}
            index={index}
            boldRatio={settings.boldRatio}
            isExpanded={isExpanded}
            isActive={isActive}
            isPlaying={segmentIsPlaying}
            sequenceActive={sequenceActive}
            currentTime={isActive ? currentTime : 0}
            duration={isActive ? duration : 0}
            onWordSelected={onWordSelected}
            onTogglePlay={() => togglePlayback(segment.id)}
            onRestart={() => restartPlayback(segment.id)}
            onStepTime={stepTime}
            onSeek={(value) => handleSeek(value, segment.id)}
            onStartSequence={() => startSequenceFrom(segment.id)}
            onToggleExpand={() => {
              if (isExpanded) {
                setExpandedId(null);
              } else {
                setExpandedId(segment.id);
              }
            }}
          />
        );
      })}
    </div>
  );
}
