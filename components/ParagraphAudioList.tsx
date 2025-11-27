"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { playWordSound } from "@/lib/wordAudio";
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

type SegmentStatus = "idle" | "generating" | "ready" | "error";

interface SegmentState {
  id: string;
  text: string;
  status: SegmentStatus;
  error?: string;
  audioUrl?: string;
  blob?: Blob;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
}

interface QueueOptions {
  autoPlay?: boolean;
  priority?: boolean;
  sequence?: boolean;
}

const MAX_CONCURRENT = 3;
const MAX_CHUNK_LENGTH = 600;

export function ParagraphAudioList({ text, onWordSelected }: ParagraphAudioListProps) {
  const { settings } = useSettings();
  const paragraphs = useMemo(() => buildParagraphs(text), [text]);
  const paragraphKey = useMemo(() => buildParagraphKey(paragraphs), [paragraphs]);

  const [segments, setSegments] = useState<SegmentState[]>(() =>
    paragraphs.map((p, index) => ({ id: `seg-${index}`, text: p, status: "idle" }))
  );

  const segmentsRef = useRef<SegmentState[]>(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // 当段落变化时，重置队列与状态
  useEffect(() => {
    queueRef.current = [];
    activeGenRef.current = 0;
    pendingOptsRef.current.clear();
    setSegments(paragraphs.map((p, index) => ({ id: `seg-${index}`, text: p, status: "idle" })));
    stopPlayback();
  }, [paragraphKey]);

  const queueRef = useRef<string[]>([]);
  const pendingOptsRef = useRef<Map<string, QueueOptions>>(new Map());
  const activeGenRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);
  const sequenceIndexRef = useRef<number | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "auto";

    const handleTimeUpdate = () => {
      if (!activeId) return;
      const currentTime = audio.currentTime;
      setSegments((prev) =>
        prev.map((seg) =>
          seg.id === activeId ? { ...seg, currentTime, duration: seg.duration ?? audio.duration } : seg
        )
      );
    };

    const handleLoadedMetadata = () => {
      if (!activeId) return;
      setSegments((prev) => prev.map((seg) => (seg.id === activeId ? { ...seg, duration: audio.duration } : seg)));
    };

    const handleEnded = () => {
      if (!activeId) return;
      setSegments((prev) => prev.map((seg) => (seg.id === activeId ? { ...seg, isPlaying: false } : seg)));
      if (sequenceActive) {
        playNextInSequence();
      } else {
        setActiveId(null);
      }
    };

    const handleError = () => {
      if (!activeId) return;
      setSegments((prev) =>
        prev.map((seg) =>
          seg.id === activeId
            ? {
                ...seg,
                isPlaying: false,
                error: "音频播放失败",
              }
            : seg
        )
      );
      setActiveId(null);
      setSequenceActive(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audioRef.current = audio;
    return audio;
  }, [activeId, sequenceActive]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setActiveId(null);
    setSequenceActive(false);
    sequenceIndexRef.current = null;
    setSegments((prev) => prev.map((seg) => ({ ...seg, isPlaying: false, currentTime: 0 })));
  }, []);

  const startPlayback = useCallback(
    (id: string, resetTime = false) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg || !seg.audioUrl) return;

      const audio = ensureAudio();

      // 切换播放源或从头播放
      if (activeId !== id) {
        audio.src = seg.audioUrl;
        audio.currentTime = 0;
      }
      if (resetTime) {
        audio.currentTime = 0;
      }

      audio
        .play()
        .then(() => {
          setActiveId(id);
          setSegments((prev) =>
            prev.map((item) => ({
              ...item,
              isPlaying: item.id === id,
              error: item.id === id ? undefined : item.error,
            }))
          );
          // 记录当前所在段落索引，便于顺序播放
          const currentIndex = segmentsRef.current.findIndex((s) => s.id === id);
          sequenceIndexRef.current = currentIndex >= 0 ? currentIndex : null;
        })
        .catch((error) => {
          console.error("播放失败", error);
          setSegments((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, isPlaying: false, error: "播放失败" } : item
            )
          );
          setActiveId(null);
        });
    },
    [activeId, ensureAudio]
  );

  const generateOne = useCallback(
    async (id: string, options?: QueueOptions) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg) return;

      if (!settings.geminiApiKey) {
        setSegments((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: "error", error: "请先在设置中填入 Gemini API Key" }
              : item
          )
        );
        return;
      }

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: seg.text.trim(),
            apiKey: settings.geminiApiKey,
            voice: settings.ttsVoice,
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || "生成失败");
        }

        const audioBase64 = (data as { audio?: string }).audio;
        if (!audioBase64) {
          throw new Error("未收到音频数据");
        }

        const blob = base64ToWavBlob(audioBase64);
        const url = URL.createObjectURL(blob);

        setSegments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "ready",
                  error: undefined,
                  blob,
                  audioUrl: url,
                  isPlaying: false,
                  currentTime: 0,
                }
              : item
          )
        );

        const shouldAutoPlay = options?.autoPlay;
        if (shouldAutoPlay) {
          startPlayback(id, true);
        }
      } catch (err) {
        setSegments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "生成失败",
                }
              : item
          )
        );
        setSequenceActive(false);
      }
    },
    [settings.geminiApiKey, settings.ttsVoice, startPlayback]
  );

  const processQueue = useCallback(() => {
    if (activeGenRef.current >= MAX_CONCURRENT) return;
    const nextId = queueRef.current.shift();
    if (!nextId) return;

    const options = pendingOptsRef.current.get(nextId);
    pendingOptsRef.current.delete(nextId);

    activeGenRef.current += 1;
    generateOne(nextId, options)
      .catch(() => {
        // 错误已在 generateOne 内处理
      })
      .finally(() => {
        activeGenRef.current -= 1;
        processQueue();
      });
  }, [generateOne]);

  const enqueueGeneration = useCallback(
    (id: string, options?: QueueOptions) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg) return;
      if (seg.status === "generating") return;

      pendingOptsRef.current.set(id, { ...options });

      setSegments((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "generating",
                error: undefined,
              }
            : item
        )
      );

      if (options?.priority) {
        queueRef.current = [id, ...queueRef.current.filter((x) => x !== id)];
      } else {
        if (!queueRef.current.includes(id)) {
          queueRef.current.push(id);
        }
      }

      processQueue();
    },
    [processQueue]
  );

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setSegments((prev) => prev.map((item) => ({ ...item, isPlaying: false })));
    setActiveId(null);
    setSequenceActive(false);
  }, []);

  const handlePlayClick = useCallback(
    (id: string) => {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg) return;

      if (seg.status === "idle" || seg.status === "error") {
        enqueueGeneration(id, { autoPlay: true, priority: true });
        return;
      }

      if (!seg.audioUrl) return;

      if (seg.isPlaying) {
        pausePlayback();
      } else {
        startPlayback(id);
      }
    },
    [enqueueGeneration, pausePlayback, startPlayback]
  );

  const handleRetry = useCallback(
    (id: string) => {
      enqueueGeneration(id, { autoPlay: false, priority: true });
    },
    [enqueueGeneration]
  );

  const handleSequence = useCallback(
    (id: string) => {
      setSequenceActive(true);
      const index = segmentsRef.current.findIndex((s) => s.id === id);
      sequenceIndexRef.current = index >= 0 ? index : null;

      const seg = segmentsRef.current.find((s) => s.id === id);
      if (!seg) return;
      if (seg.status === "ready" && seg.audioUrl) {
        startPlayback(id, true);
      } else {
        enqueueGeneration(id, { autoPlay: true, priority: true, sequence: true });
      }
    },
    [enqueueGeneration, startPlayback]
  );

  const playNextInSequence = useCallback(() => {
    if (!sequenceActive || sequenceIndexRef.current === null) {
      setSequenceActive(false);
      return;
    }

    const nextIndex = sequenceIndexRef.current + 1;
    if (nextIndex >= segmentsRef.current.length) {
      setSequenceActive(false);
      setActiveId(null);
      return;
    }

    const nextSeg = segmentsRef.current[nextIndex];
    sequenceIndexRef.current = nextIndex;

    if (nextSeg.status === "ready" && nextSeg.audioUrl) {
      startPlayback(nextSeg.id, true);
    } else {
      enqueueGeneration(nextSeg.id, { autoPlay: true, priority: true, sequence: true });
    }
  }, [enqueueGeneration, sequenceActive, startPlayback]);

  const handleSeek = useCallback((id: string, value: number) => {
    if (activeId !== id) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
  }, [activeId]);

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

  const renderParagraphText = useCallback(
    (segment: SegmentState, index: number) => {
      const tokens = tokenize(segment.text);
      return (
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
                  {renderBionicWord(token.value, settings.boldRatio)}
                </span>
              ) : (
                <span key={`${segment.id}-t-${tokenIndex}`}>{token.value}</span>
              )
            )}
          </div>
        </div>
      );
    },
    [handleWordClick, settings.boldRatio]
  );

  if (!paragraphs.length) {
    return <div className="muted-text">输入文本后将在此显示仿生阅读与分段播放器。</div>;
  }

  return (
    <div className={styles.list}>
      {segments.map((segment, index) => {
        const duration = segment.duration ?? 0;
        const currentTime = segment.currentTime ?? 0;
        const progress = duration ? (currentTime / duration) * 100 : 0;

        return (
          <div key={segment.id} className={styles.card}>
            {renderParagraphText(segment, index)}

            <div className={styles.playerRow}>
              <div className={styles.controls}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => handlePlayClick(segment.id)}
                  disabled={segment.status === "generating"}
                >
                  {segment.isPlaying ? "⏸" : "▶"}
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => {
                    if (segment.status === "idle" || segment.status === "error") {
                      handleRetry(segment.id);
                    } else {
                      startPlayback(segment.id, true);
                    }
                  }}
                  disabled={segment.status === "generating"}
                  title="重新播放/重新生成"
                >
                  ↻
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => handleSequence(segment.id)}
                  disabled={segment.status === "generating"}
                  title="从此处顺序播放"
                >
                  ➡
                </button>
                {segment.status === "generating" && <span className={styles.badge}>生成中…</span>}
                {segment.status === "error" && (
                  <span className={styles.badgeError}>{segment.error || "生成失败"}</span>
                )}
              </div>

              <div className={styles.progressArea}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.timeRow}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration ? formatTime(duration) : "--:--"}</span>
                </div>
                {segment.status !== "ready" && (
                  <div className={styles.statusText}>
                    {segment.status === "idle" && "未生成，点击播放自动生成"}
                    {segment.status === "generating" && "生成中，请稍候…"}
                    {segment.status === "error" && (segment.error || "生成失败")}
                  </div>
                )}
                {segment.status === "ready" && (
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={duration ? currentTime : 0}
                    onChange={(e) => handleSeek(segment.id, Number(e.target.value))}
                    className={styles.seek}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function base64ToWavBlob(base64: string): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

function buildParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const rawParagraphs = normalized.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

  const result: string[] = [];
  rawParagraphs.forEach((para) => {
    if (para.length <= MAX_CHUNK_LENGTH) {
      result.push(para);
      return;
    }

    // 大段落再按单词长度切分，避免超时
    const words = para.split(/\s+/);
    let buffer: string[] = [];
    words.forEach((word) => {
      const candidate = buffer.length ? `${buffer.join(" ")} ${word}` : word;
      if (candidate.length > MAX_CHUNK_LENGTH) {
        if (buffer.length) {
          result.push(buffer.join(" "));
          buffer = [word];
        } else {
          // 单个单词超长，直接推入
          result.push(word);
          buffer = [];
        }
      } else {
        buffer.push(word);
      }
    });
    if (buffer.length) {
      result.push(buffer.join(" "));
    }
  });

  return result;
}

function buildParagraphKey(paragraphs: string[]): string {
  if (!paragraphs.length) return "paragraphs-empty";
  const hashBase = paragraphs.join("|");
  let hash = 0;
  for (let i = 0; i < hashBase.length; i += 1) {
    hash = (hash * 31 + hashBase.charCodeAt(i)) >>> 0;
  }
  return `paragraphs-${paragraphs.length}-${hash}`;
}

type Token = { type: "word"; value: string } | { type: "text"; value: string };

const WORD_REGEX = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  if (!content) return tokens;

  let lastIndex = 0;
  content.replace(WORD_REGEX, (match, offset) => {
    if (offset > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, offset) });
    }
    tokens.push({ type: "word", value: match });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}

function renderBionicWord(word: string, ratio: "low" | "medium" | "high") {
  const map: Record<"low" | "medium" | "high", number> = { low: 0.3, medium: 0.45, high: 0.6 };
  const boldCount = Math.min(Math.max(Math.ceil(word.length * map[ratio]), 1), word.length);
  const lead = word.slice(0, boldCount);
  const tail = word.slice(boldCount);
  return (
    <>
      <b>{lead}</b>
      {tail}
    </>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
