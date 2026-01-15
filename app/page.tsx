"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DictionaryPanel, type DictionaryData } from "@/components/DictionaryPanel";
import ArticleManager from "@/components/ArticleManager";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useDictionary } from "@/hooks/useDictionary";
import { buildTtsGenerationParams } from "@/lib/settings";
import type { Article } from "@/lib/storage";
import { ReadingArea } from "@/components/ReadingArea";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import styles from "./page.module.css";

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [userSettingsOpen, setUserSettingsOpen] = useState<boolean>(false);
  const [articlesOpen, setArticlesOpen] = useState<boolean>(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const selectedWordRef = useRef<string>("");
  const setSelectedWordValue = useCallback((value: string) => {
    selectedWordRef.current = value;
    setSelectedWord(value);
  }, []);
  const [readingPulse, setReadingPulse] = useState(false);
  const readingPulseTimeoutRef = useRef<number | null>(null);

  // 音频 store
  const { settings } = useSettings();
  const generateAll = useAudioStore((s) => s.generateAll);
  const readyCount = useAudioStore((s) => s.readyCount);
  const generatingCount = useAudioStore((s) => s.generatingCount);
  const total = useAudioStore((s) => s.total);
  const loadAudioUrls = useAudioStore((s) => s.loadAudioUrls);
  const loadSegmentWordTimings = useAudioStore((s) => s.loadSegmentWordTimings);
  const setConcurrencyLimit = useAudioStore((s) => s.setConcurrencyLimit);
  const ttsParams = useMemo(() => buildTtsGenerationParams(settings), [settings]);

  // 待加载的音频 URLs
  const pendingAudioUrlsRef = useRef<string[] | null>(null);
  const pendingSegmentWordTimingsRef = useRef<Article["segmentWordTimings"] | null>(null);
  const wasArticlePlayingRef = useRef(false);

  // 词典状态
  const [dictionaryAnchor, setDictionaryAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [dictionaryData, setDictionaryData] = useState<DictionaryData | undefined>();
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | undefined>();
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const dictionaryAnchorCleanupTimeoutRef = useRef<number | null>(null);

  // 文章状态
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);

  // Refs
  const closeDictionaryRef = useRef<() => void>(() => {});
  const isMobile = useMediaQuery("(max-width: 768px)");
  const settingsOpen = userSettingsOpen;
  const inputSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputSectionRef = useRef<HTMLElement | null>(null);

  // 词典 hook
  const dictionary = useDictionary({
    onData: setDictionaryData,
    onError: (error) => {
      setDictionaryData(undefined);
      setDictionaryError(error);
    },
    onLoadingChange: setDictionaryLoading,
  });

  const handleWordClick = useCallback(
    (word: string, rect: DOMRect) => {
      const result = dictionary.lookup(word);
      if (!result) return;

      setSelectedWordValue(result.trimmed);
      setDictionaryAnchor(
        isMobile ? null : { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      );
      setDictionaryOpen(true);
      setDictionaryError(undefined);

      if (result.cached) {
        setDictionaryData(result.cached);
      } else {
        setDictionaryData(undefined);
      }
    },
    [isMobile, dictionary, setSelectedWordValue]
  );

  const handleCloseDictionary = useCallback(() => {
    dictionary.abortCurrentLookup();
    setDictionaryOpen(false);
    setSelectedWordValue("");

    if (dictionaryAnchorCleanupTimeoutRef.current) {
      window.clearTimeout(dictionaryAnchorCleanupTimeoutRef.current);
    }
    dictionaryAnchorCleanupTimeoutRef.current = window.setTimeout(() => {
      setDictionaryAnchor(null);
      dictionaryAnchorCleanupTimeoutRef.current = null;
    }, 300);

    if (typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest?.(".bionic-word")) {
        active.blur();
      }
    }
  }, [dictionary, setSelectedWordValue]);

  useEffect(() => {
    closeDictionaryRef.current = handleCloseDictionary;
  }, [handleCloseDictionary]);

  const handleStopArticleAudio = useCallback(() => {
    const { isPlaying, pause } = useAudioStore.getState();
    wasArticlePlayingRef.current = isPlaying;
    pause();
  }, []);

  const handleResumeArticleAudio = useCallback(() => {
    if (!wasArticlePlayingRef.current) return;
    const { isPlaying, togglePlayPause } = useAudioStore.getState();
    if (!isPlaying) {
      togglePlayPause();
    }
    wasArticlePlayingRef.current = false;
  }, []);

  const handleWordAudioEnd = useCallback(() => {
    if (!wasArticlePlayingRef.current) return;
    handleCloseDictionary();
    handleResumeArticleAudio();
  }, [handleCloseDictionary, handleResumeArticleAudio]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (dictionaryAnchorCleanupTimeoutRef.current) {
        window.clearTimeout(dictionaryAnchorCleanupTimeoutRef.current);
        dictionaryAnchorCleanupTimeoutRef.current = null;
      }
      if (readingPulseTimeoutRef.current) {
        window.clearTimeout(readingPulseTimeoutRef.current);
        readingPulseTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setConcurrencyLimit(settings.ttsConcurrency);
  }, [settings.ttsConcurrency, setConcurrencyLimit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const isSpace = event.code === "Space" || event.key === " " || event.key === "Spacebar";
      if (!isSpace) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isMiniPlayerSeek = Boolean(target?.closest?.("[data-mini-player-seek]"));
      if (target?.isContentEditable || (tagName && ["INPUT", "TEXTAREA", "SELECT"].includes(tagName))) {
        if (!isMiniPlayerSeek) return;
      }

      const dictionaryVisible = Boolean(selectedWordRef.current.trim());
      if (dictionaryVisible) {
        event.preventDefault();
        event.stopPropagation();
        (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

        closeDictionaryRef.current();

        const { activeSegmentId, isPlaying, segments, playSegment, togglePlayPause } = useAudioStore.getState();
        if (activeSegmentId) {
          if (!isPlaying) {
            togglePlayPause();
          }
        } else {
          const firstReady = segments.find((seg) => seg.status === "ready" && seg.audioUrl);
          if (firstReady) {
            playSegment(firstReady.id);
          }
        }

        window.dispatchEvent(new CustomEvent("mini-player-hotkey"));
        return;
      }

      if ((tagName && ["BUTTON", "A"].includes(tagName)) || target?.closest?.(".bionic-word") || target?.closest?.('[role="button"]')) {
        return;
      }

      const { activeSegmentId, segments, playSegment, togglePlayPause } = useAudioStore.getState();
      if (activeSegmentId) {
        event.preventDefault();
        togglePlayPause();
        window.dispatchEvent(new CustomEvent("mini-player-hotkey"));
        return;
      }

      const firstReady = segments.find((seg) => seg.status === "ready" && seg.audioUrl);
      if (!firstReady) return;

      event.preventDefault();
      playSegment(firstReady.id);
      window.dispatchEvent(new CustomEvent("mini-player-hotkey"));
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  const triggerReadingPulse = useCallback(() => {
    if (readingPulseTimeoutRef.current) {
      window.clearTimeout(readingPulseTimeoutRef.current);
      readingPulseTimeoutRef.current = null;
    }

    setReadingPulse(false);
    requestAnimationFrame(() => setReadingPulse(true));

    readingPulseTimeoutRef.current = window.setTimeout(() => {
      setReadingPulse(false);
      readingPulseTimeoutRef.current = null;
    }, 340);
  }, []);

  const placeholder = useMemo(
    () =>
      [
        "粘贴或输入英文文章，系统会自动生成仿生阅读版本…",
        "快捷键：Command / Ctrl + Enter 可快速朗读所选单词。",
        "提示：点击单词可播放发音并查看释义。",
      ].join("\n"),
    []
  );

  const confirmAndCollapse = useCallback(() => {
    if (!sourceText.trim()) return;
    setInputCollapsed(true);
    triggerReadingPulse();
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [sourceText, triggerReadingPulse]);

  const handleArticleLoad = useCallback((article: Article) => {
    setSourceText(article.text);
    setCurrentArticleId(article.id);
    setInputCollapsed(true);
    setDictionaryOpen(false);
    setSelectedWordValue("");
    setDictionaryAnchor(null);
    triggerReadingPulse();

    if (article.audioUrls && article.audioUrls.length > 0) {
      pendingAudioUrlsRef.current = article.audioUrls;
    } else {
      pendingAudioUrlsRef.current = null;
    }

    if (article.segmentWordTimings && Object.keys(article.segmentWordTimings).length > 0) {
      pendingSegmentWordTimingsRef.current = article.segmentWordTimings;
    } else {
      pendingSegmentWordTimingsRef.current = null;
    }

    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [setSelectedWordValue, triggerReadingPulse]);

  const handleArticleSaved = useCallback((article: Article) => {
    setCurrentArticleId(article.id);
  }, []);

  useEffect(() => {
    if (pendingAudioUrlsRef.current && total > 0) {
      loadAudioUrls(pendingAudioUrlsRef.current);
      pendingAudioUrlsRef.current = null;
    }
  }, [total, loadAudioUrls]);

  useEffect(() => {
    if (pendingSegmentWordTimingsRef.current && total > 0) {
      loadSegmentWordTimings(pendingSegmentWordTimingsRef.current);
      pendingSegmentWordTimingsRef.current = null;
    }
  }, [total, loadSegmentWordTimings]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headline}>仿生阅读器 毛毛浩浩版 · Version 1.0.0</h1>
          <p className="muted-text">
            支持多端访问的仿生阅读器，集成发音与词典查询，随时随地快速专注阅读。
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className="primary-button"
            onClick={() => setArticlesOpen((prev) => !prev)}
          >
            我的文章
          </button>
          <button
            className="primary-button"
            onClick={() => setUserSettingsOpen((prev) => !prev)}
          >
            {settingsOpen ? "收起设置" : "打开设置"}
          </button>
          {inputCollapsed && (
            <button
              className="primary-button"
              onClick={() => {
                setInputCollapsed(false);
                setTimeout(() => textareaRef.current?.focus(), 0);
                setTimeout(() => inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
              }}
            >
              编辑原文
            </button>
          )}
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section ref={inputSectionRef} className={`${styles.inputSection} surface-card`}>
            <div className={styles.sectionHeader}>
              <h2>原文输入</h2>
              <span className="muted-text">支持键鼠与触屏编辑</span>
            </div>
            {!inputCollapsed ? (
              <>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      confirmAndCollapse();
                    }
                  }}
                  placeholder={placeholder}
                  rows={8}
                />
                <div className={styles.helperRow}>
                  <span className="muted-text">
                    字数：{sourceText.trim().length ? sourceText.length : 0}
                  </span>
                  <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={() => {
                        setSourceText("");
                        setDictionaryOpen(false);
                        setSelectedWordValue("");
                        setDictionaryAnchor(null);
                        setDictionaryData(undefined);
                        setDictionaryLoading(false);
                        setDictionaryError(undefined);
                        textareaRef.current?.focus();
                      }}
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={confirmAndCollapse}
                      title="确认生成并折叠输入（Ctrl/Cmd + Enter）"
                    >
                      确认生成
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.collapsedNotice}>
                <span>
                  已载入 <strong>{sourceText.trim().length ? sourceText.length : 0}</strong> 字
                </span>
                <div className={styles.collapsedActions}>
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => {
                      setInputCollapsed(false);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                  >
                    重新编辑
                  </button>
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => {
                      setInputCollapsed(false);
                      setSourceText("");
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                  >
                    替换文本
                  </button>
                </div>
              </div>
            )}
          </section>

          <section ref={outputSectionRef} className={`${styles.outputSection} surface-card`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <h2>仿生阅读</h2>
                <span className="muted-text">点击单词发音查词，点击段落播放</span>
              </div>
              {settings.readingMode === "audio" && sourceText.trim() && total > 0 && (
                <div className={styles.audioActions}>
                  {generatingCount > 0 || readyCount > 0 ? (
                    <span className={styles.progressText}>
                      {readyCount}/{total}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => generateAll(ttsParams)}
                    disabled={generatingCount > 0}
                  >
                    {generatingCount > 0 ? "生成中..." : "生成音频"}
                  </button>
                </div>
              )}
            </div>

            <div
              className={`${styles.outputInner} ${
                readingPulse && sourceText.trim() ? styles.readingPulse : ""
              }`}
            >
              <ReadingArea
                text={sourceText}
                onWordClick={handleWordClick}
                onWordPrefetch={dictionary.prefetch}
                onStopArticleAudio={handleStopArticleAudio}
                onWordAudioEnd={handleWordAudioEnd}
              />
            </div>
          </section>
        </main>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setUserSettingsOpen(false)}
          onArticlesCleared={() => {
            setSourceText("");
            setCurrentArticleId(null);
          }}
        />
      </div>

      <DictionaryPanel
        isOpen={dictionaryOpen}
        word={selectedWord}
        data={dictionaryData}
        loading={dictionaryLoading}
        error={dictionaryError}
        anchor={dictionaryAnchor}
        isMobile={isMobile}
        onClose={handleCloseDictionary}
        onStopArticleAudio={handleStopArticleAudio}
        onWordAudioEnd={handleWordAudioEnd}
      />

      <ArticleManager
        isOpen={articlesOpen}
        onClose={() => setArticlesOpen(false)}
        currentText={sourceText}
        currentArticleId={currentArticleId}
        onArticleLoad={handleArticleLoad}
        onArticleSaved={handleArticleSaved}
      />

      <MiniPlayer />
    </div>
  );
}
