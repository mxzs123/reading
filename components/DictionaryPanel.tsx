"use client";

import { useMemo, type CSSProperties } from "react";
import styles from "./DictionaryPanel.module.css";

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

interface DictionaryPanelProps {
  isOpen: boolean;
  word: string;
  data?: DictionaryData;
  loading?: boolean;
  error?: string;
  anchor?: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  isMobile: boolean;
  onClose: () => void;
}

export function DictionaryPanel({
  isOpen,
  word,
  data,
  loading,
  error,
  anchor,
  isMobile,
  onClose,
}: DictionaryPanelProps) {
  const anchored = !isMobile && Boolean(anchor);

  const panelStyle = useMemo<CSSProperties | undefined>(() => {
    if (isMobile || !anchor) return undefined;

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : undefined;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : undefined;
    const estimatedWidth = 360;
    const estimatedHeight = 260;

    let top = anchor.top + anchor.height + 12;
    let left = anchor.left;

    if (viewportWidth) {
      left = Math.min(left, viewportWidth - estimatedWidth - 16);
      left = Math.max(16, left);
    }

    if (viewportHeight) {
      if (top + estimatedHeight > viewportHeight - 16) {
        top = Math.max(16, anchor.top - estimatedHeight - 16);
      }
    }

    return { top, left };
  }, [anchor, isMobile]);

  const wrapperClassName = [
    styles.wrapper,
    isMobile ? styles.mobile : anchored ? styles.anchored : styles.floating,
    isOpen ? styles.open : "",
    "surface-card",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClassName}
      role="dialog"
      aria-live="polite"
      style={panelStyle}
    >
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{word || "词典"}</h3>
          {data?.phonetics && (
            <p className="muted-text">
              {data.phonetics.uk && <span>英 /{data.phonetics.uk}/</span>}
              {data.phonetics.us && (
                <span className={styles.phoneticDivider}>
                  美 /{data.phonetics.us}/
                </span>
              )}
            </p>
          )}
        </div>
        <button className={styles.close} onClick={onClose}>
          关闭
        </button>
      </header>

      <div className={styles.content}>
        {loading && <p className="muted-text">正在查询…</p>}
        {error && !loading && <p className={styles.error}>{error}</p>}

        {!loading && !error && data && data.meanings.length > 0 && (
          <ul className={styles.meanings}>
            {data.meanings.map((meaning, index) => (
              <li key={`${meaning.translation}-${index}`}>
                {meaning.pos && (
                  <span className={styles.pos}>{meaning.pos}</span>
                )}
                <span>{meaning.translation}</span>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && data && data.meanings.length === 0 && (
          <p className="muted-text">暂未查询到释义，可尝试其他单词。</p>
        )}

        {!loading && !error && data && data.webTranslations.length > 0 && (
          <div className={styles.webSection}>
            <h4>网络用法</h4>
            <ul>
              {data.webTranslations.slice(0, 3).map((item) => (
                <li key={item.key}>
                  <strong>{item.key}</strong>
                  <p className="muted-text">
                    {item.translations.slice(0, 2).join("；")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
