"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DictionaryPanel, type DictionaryData } from "@/components/DictionaryPanel";
import ArticleManager from "@/components/ArticleManager";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Article } from "@/lib/storage";
import { ReadingArea } from "@/components/ReadingArea";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import styles from "./page.module.css";

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  // 默认折叠设置面板（桌面与移动端一致）
  const [userSettingsOpen, setUserSettingsOpen] = useState<boolean>(false);
  // 文章管理弹窗
  const [articlesOpen, setArticlesOpen] = useState<boolean>(false);
  // 原文输入是否折叠
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");

  // 音频 store
  const { settings } = useSettings();
  const generateAll = useAudioStore((s) => s.generateAll);
  const readyCount = useAudioStore((s) => s.readyCount);
  const generatingCount = useAudioStore((s) => s.generatingCount);
  const total = useAudioStore((s) => s.total);
  const loadAudioUrls = useAudioStore((s) => s.loadAudioUrls);
  const setConcurrencyLimit = useAudioStore((s) => s.setConcurrencyLimit);
  const ttsParams = useMemo(() => {
    if (settings.ttsProvider === "elevenlabs") {
      return {
        provider: "elevenlabs" as const,
        apiKey: settings.elevenApiKey,
        voiceId: settings.elevenVoiceId,
        modelId: settings.elevenModelId,
        languageCode: settings.elevenLanguageCode,
        outputFormat: settings.elevenOutputFormat,
        stability: settings.elevenStability,
        similarityBoost: settings.elevenSimilarityBoost,
        style: settings.elevenStyle,
        useSpeakerBoost: settings.elevenUseSpeakerBoost,
        speed: settings.elevenSpeed,
        seed: settings.elevenSeed,
        applyTextNormalization: settings.elevenApplyTextNormalization,
        enableLogging: settings.elevenEnableLogging,
        optimizeStreamingLatency: settings.elevenOptimizeStreamingLatency,
      };
    }

    return {
      provider: "azure" as const,
      apiKey: settings.azureApiKey,
      region: settings.azureRegion,
      voice: settings.azureVoice,
      rate: settings.ttsRate,
      volume: settings.ttsVolume,
      pauseMs: settings.ttsPauseMs,
    };
  }, [
    settings.azureApiKey,
    settings.azureRegion,
    settings.azureVoice,
    settings.elevenApiKey,
    settings.elevenApplyTextNormalization,
    settings.elevenEnableLogging,
    settings.elevenLanguageCode,
    settings.elevenModelId,
    settings.elevenOptimizeStreamingLatency,
    settings.elevenOutputFormat,
    settings.elevenSeed,
    settings.elevenSimilarityBoost,
    settings.elevenSpeed,
    settings.elevenStability,
    settings.elevenStyle,
    settings.elevenUseSpeakerBoost,
    settings.elevenVoiceId,
    settings.ttsPauseMs,
    settings.ttsProvider,
    settings.ttsRate,
    settings.ttsVolume,
  ]);

  // 待加载的音频 URLs（文章加载后等 segments 初始化完成再恢复）
  const pendingAudioUrlsRef = useRef<string[] | null>(null);
  const wasArticlePlayingRef = useRef(false);
  const [dictionaryAnchor, setDictionaryAnchor] = useState<
    | {
        top: number;
        left: number;
        width: number;
        height: number;
      }
    | null
  >(null);
  const [dictionaryData, setDictionaryData] = useState<DictionaryData | undefined>();
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | undefined>();
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  // 文章和音频状态
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dictionaryCacheRef = useRef<Map<string, DictionaryData>>(new Map());
  const dictionaryPrefetchControllersRef = useRef<Map<string, AbortController>>(new Map());
  const isMobile = useMediaQuery("(max-width: 768px)");
  const settingsOpen = userSettingsOpen;
  const inputSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputSectionRef = useRef<HTMLElement | null>(null);

  const requestDictionary = useCallback(async (word: string, signal?: AbortSignal): Promise<DictionaryData> => {
    const response = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`, {
      signal,
    });
    if (!response.ok) {
      throw new Error("查询失败");
    }
    const data = (await response.json()) as DictionaryData & { error?: string };
    if (data.error) {
      throw new Error(data.error);
    }
    return {
      phonetics: data.phonetics,
      meanings: data.meanings ?? [],
      webTranslations: data.webTranslations ?? [],
    };
  }, []);

  const prefetchDictionary = useCallback(
    (word: string) => {
      const normalized = word.trim().toLowerCase();
      if (!normalized) return;
      if (dictionaryCacheRef.current.has(normalized) || dictionaryPrefetchControllersRef.current.has(normalized)) {
        return;
      }

      const controller = new AbortController();
      dictionaryPrefetchControllersRef.current.set(normalized, controller);

      requestDictionary(normalized, controller.signal)
        .then((data) => {
          dictionaryCacheRef.current.set(normalized, data);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.debug("词典预取失败", error);
        })
        .finally(() => {
          dictionaryPrefetchControllersRef.current.delete(normalized);
        });
    },
    [requestDictionary]
  );

  const handleWordClick = useCallback(
    (word: string, rect: DOMRect) => {
      const trimmed = word.trim();
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();

      setSelectedWord(trimmed);
      setDictionaryAnchor(
        isMobile ? null : { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      );
      setDictionaryOpen(true);
      setDictionaryError(undefined);

      const cached = dictionaryCacheRef.current.get(normalized);
      if (cached) {
        setDictionaryData(cached);
        setDictionaryLoading(false);
      } else {
        setDictionaryData(undefined);
        setDictionaryLoading(true);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      requestDictionary(normalized, controller.signal)
        .then((data) => {
          dictionaryCacheRef.current.set(normalized, data);
          if (controller.signal.aborted) return;
          setDictionaryData(data);
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          console.warn("词典查询错误", error);
          setDictionaryData(undefined);
          setDictionaryError("查询失败，请稍后再试");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setDictionaryLoading(false);
          }
        });
    },
    [isMobile, requestDictionary]
  );

  const handleCloseDictionary = useCallback(() => {
    abortRef.current?.abort();
    setDictionaryOpen(false);
    setSelectedWord("");
    setDictionaryAnchor(null);
  }, []);

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

  useEffect(() => {
    const controllers = dictionaryPrefetchControllersRef.current;
    return () => {
      abortRef.current?.abort();
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    prefetchDictionary("warmup");
  }, [prefetchDictionary]);

  useEffect(() => {
    setConcurrencyLimit(settings.ttsConcurrency);
  }, [settings.ttsConcurrency, setConcurrencyLimit]);

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

      const dictionaryVisible = Boolean(selectedWord.trim());
      if (dictionaryVisible) {
        event.preventDefault();
        event.stopPropagation();
        (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

        abortRef.current?.abort();
        setDictionaryOpen(false);
        setSelectedWord("");
        setDictionaryAnchor(null);

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

      // 词典未显示时，避免打断按钮/链接/单词的键盘交互
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
  }, [selectedWord]);

  const readingPulseKey = useMemo(() => {
    const trimmed = sourceText.trim();
    if (!trimmed) return "output-static";
    const first = trimmed.charCodeAt(0) || 0;
    const last = trimmed.charCodeAt(trimmed.length - 1) || 0;
    return `output-${trimmed.length}-${first}-${last}`;
  }, [sourceText]);

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
    // 没有文本不折叠
    if (!sourceText.trim()) return;
    setInputCollapsed(true);
    // 聚焦阅读区域
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [sourceText]);

  // 加载保存的文章
  const handleArticleLoad = useCallback((article: Article) => {
    setSourceText(article.text);
    setCurrentArticleId(article.id);
    setInputCollapsed(true);
    setDictionaryOpen(false);
    setSelectedWord("");
    setDictionaryAnchor(null);
    // 保存待加载的音频 URLs
    if (article.audioUrls && article.audioUrls.length > 0) {
      pendingAudioUrlsRef.current = article.audioUrls;
    } else {
      pendingAudioUrlsRef.current = null;
    }
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  // 文章保存后更新 ID
  const handleArticleSaved = useCallback((article: Article) => {
    setCurrentArticleId(article.id);
  }, []);

  // 当 segments 初始化完成后，加载待恢复的音频
  useEffect(() => {
    if (pendingAudioUrlsRef.current && total > 0) {
      loadAudioUrls(pendingAudioUrlsRef.current);
      pendingAudioUrlsRef.current = null;
    }
  }, [total, loadAudioUrls]);

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
                        setSelectedWord("");
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
              {sourceText.trim() && total > 0 && (
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
              key={readingPulseKey}
              className={`${styles.outputInner} ${
                sourceText.trim() ? styles.readingPulse : ""
              }`}
            >
              <ReadingArea
                text={sourceText}
                onWordClick={handleWordClick}
                onWordPrefetch={prefetchDictionary}
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
