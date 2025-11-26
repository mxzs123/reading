"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BionicText } from "@/components/BionicText";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import AudioPlayer from "@/components/AudioPlayer";
import ArticleManager from "@/components/ArticleManager";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Article } from "@/lib/storage";
import styles from "./page.module.css";

interface DictionaryMeaning {
  pos?: string | null;
  translation: string;
}

interface DictionaryData {
  phonetics?: {
    us?: string;
    uk?: string;
  };
  meanings: DictionaryMeaning[];
  webTranslations: Array<{
    key: string;
    translations: string[];
  }>;
}

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  // 默认折叠设置面板（桌面与移动端一致）
  const [userSettingsOpen, setUserSettingsOpen] = useState<boolean>(false);
  // 文章管理弹窗
  const [articlesOpen, setArticlesOpen] = useState<boolean>(false);
  // 原文输入是否折叠
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const settingsOpen = userSettingsOpen;
  const inputSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputSectionRef = useRef<HTMLElement | null>(null);

  const handleWordSelected = useCallback(
    (
      selection: {
        word: string;
        rect: { top: number; left: number; width: number; height: number };
      }
    ) => {
      const trimmed = selection.word.trim();
      if (!trimmed) return;

      setSelectedWord(trimmed);
      setDictionaryAnchor(isMobile ? null : selection.rect);
      setDictionaryOpen(true);
      setDictionaryData(undefined);
      setDictionaryLoading(true);
      setDictionaryError(undefined);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/dictionary?word=${encodeURIComponent(trimmed.toLowerCase())}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("查询失败");
          }
          const data = (await response.json()) as DictionaryData & {
            error?: string;
          };
          if (data.error) {
            throw new Error(data.error);
          }
          setDictionaryError(undefined);
          setDictionaryData({
            phonetics: data.phonetics,
            meanings: data.meanings ?? [],
            webTranslations: data.webTranslations ?? [],
          });
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          console.warn("词典查询错误", error);
          setDictionaryData(undefined);
          setDictionaryError("查询失败，请稍后再试");
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setDictionaryLoading(false);
        });
    },
    [isMobile]
  );

  const handleCloseDictionary = useCallback(() => {
    abortRef.current?.abort();
    setDictionaryOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
    setAudioBlob(article.audioBlob || null);
    setInputCollapsed(true);
    setDictionaryOpen(false);
    setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  // 文章保存后更新 ID
  const handleArticleSaved = useCallback((article: Article) => {
    setCurrentArticleId(article.id);
  }, []);

  // 音频生成后保存
  const handleAudioGenerated = useCallback((blob: Blob) => {
    setAudioBlob(blob);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headline}>仿生阅读器 · Next.js</h1>
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
                        setDictionaryAnchor(null);
                        setDictionaryData(undefined);
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
              <h2>仿生阅读</h2>
              <span className="muted-text">点击单词即可发音与查询释义</span>
            </div>

            {sourceText.trim() && (
              <AudioPlayer
                text={sourceText}
                audioBlob={audioBlob}
                onAudioGenerated={handleAudioGenerated}
              />
            )}

            <div
              key={readingPulseKey}
              className={`${styles.outputInner} ${
                sourceText.trim() ? styles.readingPulse : ""
              }`}
            >
              <BionicText text={sourceText} onWordSelected={handleWordSelected} />
            </div>
          </section>

        </main>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setUserSettingsOpen(false)}
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
      />

      <ArticleManager
        isOpen={articlesOpen}
        onClose={() => setArticlesOpen(false)}
        currentText={sourceText}
        currentAudioBlob={audioBlob}
        currentArticleId={currentArticleId}
        onArticleLoad={handleArticleLoad}
        onArticleSaved={handleArticleSaved}
      />
    </div>
  );
}
