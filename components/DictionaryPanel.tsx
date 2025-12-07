"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type React from "react";
import { playWordSound } from "@/lib/wordAudio";
import styles from "./DictionaryPanel.module.css";

export interface DictionaryMeaning {
  pos?: string | null;
  translation: string;
}

export interface DictionaryData {
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
  onStopArticleAudio?: () => void;
  onWordAudioEnd?: () => void;
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
  onStopArticleAudio,
  onWordAudioEnd,
}: DictionaryPanelProps) {
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
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

  // 允许按下 ESC 快速关闭
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // 拖拽关闭（仅移动端）
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isMobile || !isOpen) return;
    draggingRef.current = true;
    startYRef.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    setDragY(delta);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const threshold = Math.min(140, Math.round((typeof window !== "undefined" ? window.innerHeight : 600) * 0.3));
    if (dragY > threshold) {
      setDragY(0);
      onClose();
    } else {
      // 回弹
      setDragY(0);
    }
  };

  const wrapperClassName = [
    styles.wrapper,
    isMobile ? styles.mobile : anchored ? styles.anchored : styles.floating,
    isOpen ? styles.open : "",
    "surface-card",
  ]
    .filter(Boolean)
    .join(" ");

  const combinedStyle: CSSProperties | undefined = useMemo(() => {
    if (isMobile) {
      return {
        ...(panelStyle ?? {}),
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragY > 0 ? "none" : undefined,
      } as CSSProperties;
    }
    return panelStyle;
  }, [isMobile, panelStyle, dragY]);

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={wrapperClassName}
        role="dialog"
        aria-live="polite"
        style={combinedStyle}
      >
        {isMobile && (
          <div
            className={styles.dragHandle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
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
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="重播发音"
            title="重播发音"
            disabled={!word}
            onClick={() => word && playWordSound(word, onStopArticleAudio, undefined, onWordAudioEnd)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M3 10v4h4l5 5V5L7 10H3z" fill="currentColor"/>
              <path d="M14 7.35a7 7 0 010 9.3M16.5 4a10.5 10.5 0 010 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={styles.close} onClick={onClose}>
            关闭
          </button>
        </div>
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
    </>
  );
}
