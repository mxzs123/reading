"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BionicText } from "@/components/BionicText";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  const [userSettingsOpen, setUserSettingsOpen] = useState<boolean | null>(null);
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
  const abortRef = useRef<AbortController | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1025px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const settingsOpen = userSettingsOpen ?? isDesktop;

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
      setDictionaryOpen(true);
      setDictionaryData(undefined);
      setDictionaryLoading(true);
      setDictionaryError(undefined);

      setDictionaryAnchor(isMobile ? null : selection.rect);

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
    setDictionaryAnchor(null);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
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
            onClick={() =>
              setUserSettingsOpen((prev) => {
                const current = (prev ?? isDesktop) === true;
                const next = !current;
                const defaultState = isDesktop;
                return next === defaultState ? null : next;
              })
            }
          >
            {settingsOpen ? "收起设置" : "打开设置"}
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={`${styles.inputSection} surface-card`}>
            <div className={styles.sectionHeader}>
              <h2>原文输入</h2>
              <span className="muted-text">支持键鼠与触屏编辑</span>
            </div>
            <textarea
              className={styles.textarea}
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={placeholder}
              rows={12}
            />
            <div className={styles.helperRow}>
              <span className="muted-text">
                字数：{sourceText.trim().length ? sourceText.length : 0}
              </span>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  setSourceText("");
                  setDictionaryOpen(false);
                  setDictionaryAnchor(null);
                  setDictionaryData(undefined);
                  setDictionaryError(undefined);
                }}
              >
                清空
              </button>
            </div>
          </section>

          <section className={`${styles.outputSection} surface-card`}>
            <div className={styles.sectionHeader}>
              <h2>仿生阅读</h2>
              <span className="muted-text">点击单词即可发音与查询释义</span>
            </div>
            <div className={styles.outputInner}>
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
    </div>
  );
}
