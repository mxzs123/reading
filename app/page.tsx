"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Edit3,
  FileText,
  Languages,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Sparkles,
  Volume2,
  Wrench,
  X,
} from "lucide-react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DictionaryPanel, type DictionaryData } from "@/components/DictionaryPanel";
import { AiExplainPanel } from "@/components/AiExplainPanel";
import ArticleManager from "@/components/ArticleManager";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAiExplain } from "@/hooks/useAiExplain";
import { useDictionary } from "@/hooks/useDictionary";
import { buildAiExplainTarget } from "@/lib/aiExplain";
import { buildTtsGenerationParams } from "@/lib/settings";
import type { Article } from "@/lib/storage";
import type { WordAskTarget } from "@/lib/wordInteraction";
import { ReadingArea } from "@/components/ReadingArea";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useAudioStore } from "@/stores/audioStore";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import styles from "./page.module.css";

type PanelAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function Home() {
  const { t } = useI18n();
  const [sourceText, setSourceText] = useState("");
  const [userSettingsOpen, setUserSettingsOpen] = useState<boolean>(false);
  const [articleSidebarOpen, setArticleSidebarOpen] = useState<boolean>(true);
  const [toolSidebarOpen, setToolSidebarOpen] = useState<boolean>(true);
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

  const pendingAudioUrlsRef = useRef<string[] | null>(null);
  const pendingSegmentWordTimingsRef = useRef<Article["segmentWordTimings"] | null>(null);
  const wasArticlePlayingRef = useRef(false);

  // 词典状态
  const [dictionaryAnchor, setDictionaryAnchor] = useState<PanelAnchor | null>(null);
  const [dictionaryData, setDictionaryData] = useState<DictionaryData | undefined>();
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | undefined>();
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const dictionaryAnchorCleanupTimeoutRef = useRef<number | null>(null);
  const [aiAnchor, setAiAnchor] = useState<PanelAnchor | null>(null);

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
    onError: () => {
      setDictionaryData(undefined);
      setDictionaryError(t("dictionary.lookupError"));
    },
    onLoadingChange: setDictionaryLoading,
  });
  const {
    answer: aiAnswer,
    close: closeAiExplain,
    error: aiError,
    explain: explainWithAi,
    isOpen: aiOpen,
    loading: aiLoading,
    target: aiTarget,
  } = useAiExplain();

  const handleWordClick = useCallback(
    (word: string, rect: DOMRect) => {
      closeAiExplain();
      setAiAnchor(null);

      const result = dictionary.lookup(word);
      if (!result) return;

      if (!isMobile) setToolSidebarOpen(true);
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
    [closeAiExplain, isMobile, dictionary, setSelectedWordValue]
  );

  const handleWordLongPress = useCallback(
    (target: WordAskTarget) => {
      dictionary.abortCurrentLookup();
      setDictionaryOpen(false);
      setDictionaryData(undefined);
      setDictionaryError(undefined);
      setSelectedWordValue("");
      setDictionaryAnchor(null);

      if (!isMobile) {
        setToolSidebarOpen(true);
        setAiAnchor(null);
      } else {
        setAiAnchor({
          top: target.rect.top,
          left: target.rect.left,
          width: target.rect.width,
          height: target.rect.height,
        });
      }

      const aiTarget = buildAiExplainTarget(
        sourceText,
        target.paragraphText,
        target.word,
        settings.aiContextChars
      );

      void explainWithAi(aiTarget, {
        apiKey: settings.deepseekApiKey,
        model: settings.deepseekModel,
        maxTokens: settings.deepseekMaxTokens,
      });
    },
    [
      dictionary,
      explainWithAi,
      isMobile,
      setSelectedWordValue,
      settings.aiContextChars,
      settings.deepseekApiKey,
      settings.deepseekMaxTokens,
      settings.deepseekModel,
      sourceText,
    ]
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

  const handleCloseAiExplain = useCallback(() => {
    closeAiExplain();
    setAiAnchor(null);
  }, [closeAiExplain]);

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
    () => [t("source.placeholder")].join("\n"),
    [t]
  );
  const trimmedSource = sourceText.trim();
  const sourceStats = useMemo(() => {
    if (!trimmedSource) {
      return { chars: 0, words: 0, paragraphs: 0 };
    }

    return {
      chars: sourceText.length,
      words: trimmedSource.split(/\s+/).filter(Boolean).length,
      paragraphs: trimmedSource.split(/\n{2,}/).filter((item) => item.trim()).length || 1,
    };
  }, [sourceText, trimmedSource]);
  const sourcePreview = useMemo(() => {
    const cleaned = trimmedSource.replace(/\s+/g, " ");
    if (!cleaned) return t("source.defaultPreview");
    return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
  }, [trimmedSource, t]);
  const resetWorkspace = useCallback(() => {
    dictionary.abortCurrentLookup();
    setSourceText("");
    setCurrentArticleId(null);
    setInputCollapsed(false);
    setDictionaryOpen(false);
    closeAiExplain();
    setSelectedWordValue("");
    setDictionaryAnchor(null);
    setAiAnchor(null);
    setDictionaryData(undefined);
    setDictionaryLoading(false);
    setDictionaryError(undefined);
    pendingAudioUrlsRef.current = null;
    pendingSegmentWordTimingsRef.current = null;
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [closeAiExplain, dictionary, setSelectedWordValue]);

  const confirmAndCollapse = useCallback(() => {
    if (!trimmedSource) return;
    setInputCollapsed(true);
    triggerReadingPulse();
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [trimmedSource, triggerReadingPulse]);

  const handleArticleLoad = useCallback((article: Article) => {
    setSourceText(article.text);
    setCurrentArticleId(article.id);
    setInputCollapsed(true);
    setDictionaryOpen(false);
    closeAiExplain();
    setSelectedWordValue("");
    setDictionaryAnchor(null);
    setAiAnchor(null);
    triggerReadingPulse();

    pendingAudioUrlsRef.current =
      article.audioUrls && article.audioUrls.length > 0 ? article.audioUrls : null;
    pendingSegmentWordTimingsRef.current =
      article.segmentWordTimings && Object.keys(article.segmentWordTimings).length > 0
        ? article.segmentWordTimings
        : null;

    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [closeAiExplain, setSelectedWordValue, triggerReadingPulse]);

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
      <div
        className={styles.ideShell}
        data-left-collapsed={articleSidebarOpen ? "false" : "true"}
        data-right-collapsed={toolSidebarOpen ? "false" : "true"}
      >
        <ArticleManager
          variant="sidebar"
          isOpen={articleSidebarOpen}
          onClose={() => setArticleSidebarOpen(false)}
          onToggleCollapse={() => setArticleSidebarOpen((prev) => !prev)}
          currentText={sourceText}
          currentArticleId={currentArticleId}
          onArticleLoad={handleArticleLoad}
          onArticleSaved={handleArticleSaved}
          onNewArticle={resetWorkspace}
        />

        <main className={styles.main}>
          <section
            ref={inputSectionRef}
            className={styles.inputSection}
            data-collapsed={inputCollapsed ? "true" : "false"}
          >
            {!inputCollapsed ? (
              <>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  aria-label={t("source.inputLabel")}
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      confirmAndCollapse();
                    }
                  }}
                  placeholder={placeholder}
                  rows={4}
                />
                <div className={styles.helperRow}>
                  <span className={styles.metaText}>
                    {t("source.stats", { chars: sourceStats.chars, words: sourceStats.words })}
                  </span>
                  <div className={styles.actionGroup}>
                    <button
                      type="button"
                      className={styles.primaryAction}
                      onClick={confirmAndCollapse}
                      title="Ctrl/Cmd + Enter"
                    >
                      <Sparkles aria-hidden="true" className={styles.buttonIcon} />
                      <span>{t("source.generate")}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                type="button"
                className={styles.sourceBar}
                onClick={() => {
                  setInputCollapsed(false);
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                title={t("source.edit")}
              >
                <FileText aria-hidden="true" className={styles.sourceBarIcon} />
                <span className={styles.sourceBarLabel}>{sourcePreview}</span>
                <span className={styles.sourceBarMeta}>{t("source.words", { count: sourceStats.words })}</span>
                <Edit3 aria-hidden="true" className={styles.sourceBarEdit} />
              </button>
            )}
          </section>

          <section ref={outputSectionRef} className={styles.outputSection}>
            <div
              className={`${styles.outputInner} ${
                readingPulse && trimmedSource ? styles.readingPulse : ""
              }`}
            >
              <ReadingArea
                text={sourceText}
                onWordClick={handleWordClick}
                onWordLongPress={handleWordLongPress}
                wordLongPressEnabled={!isMobile && settings.aiExplainEnabled}
                wordLongPressMs={settings.aiLongPressMs}
                onWordPrefetch={dictionary.prefetch}
                onStopArticleAudio={handleStopArticleAudio}
                onWordAudioEnd={handleWordAudioEnd}
              />
            </div>
          </section>
        </main>

        <aside className={styles.toolSidebar} data-collapsed={toolSidebarOpen ? "false" : "true"}>
          {toolSidebarOpen ? (
            <>
              <div className={styles.toolHeader}>
                <h2 className={styles.toolTitle}>
                  <Wrench aria-hidden="true" className={styles.toolTitleIcon} />
                  <span>{t("tools.title")}</span>
                </h2>
                <button
                  type="button"
                  className={`${styles.clearButton} ${styles.iconButton}`}
                  onClick={() => setToolSidebarOpen(false)}
                  aria-label={t("audio.collapseTools")}
                  title={t("audio.collapseTools")}
                >
                  <PanelRightClose aria-hidden="true" />
                </button>
              </div>

              <section className={`${styles.toolSection} ${styles.inspectorSection}`}>
                <div className={styles.toolSectionHeader}>
                  <h3>
                    {aiOpen ? (
                      <Sparkles aria-hidden="true" className={styles.sectionIcon} />
                    ) : (
                      <Languages aria-hidden="true" className={styles.sectionIcon} />
                    )}
                    <span>{aiOpen ? t("ai.explainTitle") : t("dictionary.title")}</span>
                  </h3>
                  {aiOpen || selectedWord ? (
                    <button
                      type="button"
                      className={`${styles.toolTextButton} ${styles.iconButton}`}
                      onClick={aiOpen ? handleCloseAiExplain : handleCloseDictionary}
                      aria-label={t("dictionary.clear")}
                      title={t("dictionary.clear")}
                    >
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {aiOpen ? (
                  <div className={styles.aiTool}>
                    {aiTarget?.text ? (
                      <div className={styles.dictionaryWord}>
                        <strong>{aiTarget.text}</strong>
                      </div>
                    ) : null}
                    {aiLoading && !aiAnswer.trim() ? (
                      <p className={styles.toolMuted}>{t("ai.loading")}</p>
                    ) : null}
                    {aiError ? <p className={styles.toolError}>{t("ai.error")}</p> : null}
                    {aiAnswer.trim() ? (
                      <div className={styles.aiAnswer}>{aiAnswer.trim()}</div>
                    ) : null}
                  </div>
                ) : selectedWord ? (
                  <div className={styles.dictionaryTool}>
                    <div className={styles.dictionaryWord}>
                      <strong>{selectedWord}</strong>
                      {dictionaryData?.phonetics ? (
                        <span>
                          {dictionaryData.phonetics.uk ? `${t("dictionary.uk")} /${dictionaryData.phonetics.uk}/` : ""}
                          {dictionaryData.phonetics.us ? ` ${t("dictionary.us")} /${dictionaryData.phonetics.us}/` : ""}
                        </span>
                      ) : null}
                    </div>

                    {dictionaryLoading ? <p className={styles.toolMuted}>{t("dictionary.loading")}</p> : null}
                    {dictionaryError && !dictionaryLoading ? (
                      <p className={styles.toolError}>{dictionaryError}</p>
                    ) : null}
                    {!dictionaryLoading && !dictionaryError && dictionaryData ? (
                      <>
                        {dictionaryData.meanings.length > 0 ? (
                          <ul className={styles.meaningList}>
                            {dictionaryData.meanings.slice(0, 5).map((meaning, index) => (
                              <li key={`${meaning.translation}-${index}`}>
                                {meaning.pos ? <span>{meaning.pos}</span> : null}
                                <p>{meaning.translation}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.toolMuted}>{t("dictionary.empty")}</p>
                        )}
                        {dictionaryData.webTranslations.length > 0 ? (
                          <div className={styles.webMeanings}>
                            <span>{t("dictionary.webUsage")}</span>
                            {dictionaryData.webTranslations.slice(0, 2).map((item) => (
                              <p key={item.key}>
                                <strong>{item.key}</strong> {item.translations.slice(0, 2).join("；")}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.toolMuted}>{t("dictionary.hint")}</p>
                )}
              </section>

              <section className={styles.toolSection}>
                <div className={styles.toolSectionHeader}>
                  <h3>
                    <Volume2 aria-hidden="true" className={styles.sectionIcon} />
                    <span>{t("audio.readAloud")}</span>
                  </h3>
                  <span className={styles.toolStatus}>
                    {settings.readingMode === "audio" ? t("audio.audioMode") : t("audio.pureMode")}
                  </span>
                </div>
                {settings.readingMode === "audio" && trimmedSource && total > 0 ? (
                  <div className={styles.toolStack}>
                    <span className={styles.progressText}>
                      {t("audio.ready", { ready: readyCount, total })}
                    </span>
                    <button
                      type="button"
                      className={styles.primaryAction}
                      onClick={() => generateAll(ttsParams)}
                      disabled={generatingCount > 0}
                    >
                      <Volume2 aria-hidden="true" className={styles.buttonIcon} />
                      <span>{generatingCount > 0 ? t("audio.generating") : t("audio.generate")}</span>
                    </button>
                  </div>
                ) : (
                  <p className={styles.toolMuted}>{t("audio.manageHint")}</p>
                )}
              </section>

              <div className={styles.toolFooter}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setUserSettingsOpen(true)}
                >
                  <Settings aria-hidden="true" className={styles.buttonIcon} />
                  <span>{t("common.settings")}</span>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className={styles.toolCollapsedButton}
              onClick={() => setToolSidebarOpen(true)}
              aria-label={t("audio.expandTools")}
              title={t("audio.expandTools")}
            >
              <PanelRightOpen aria-hidden="true" className={styles.railActionIcon} />
              <span className={styles.railIdentity}>
                <Wrench aria-hidden="true" />
                <span>{t("tools.title")}</span>
              </span>
            </button>
          )}
        </aside>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setUserSettingsOpen(false)}
          onArticlesCleared={() => {
            setSourceText("");
            setCurrentArticleId(null);
          }}
        />
      </div>

      {isMobile ? (
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
      ) : null}

      {isMobile ? (
        <AiExplainPanel
          isOpen={aiOpen}
          target={aiTarget}
          answer={aiAnswer}
          loading={aiLoading}
          error={aiError}
          anchor={aiAnchor}
          onClose={handleCloseAiExplain}
        />
      ) : null}

      <MiniPlayer />
    </div>
  );
}
