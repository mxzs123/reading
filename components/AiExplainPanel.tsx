"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import type { AiExplainTarget } from "@/lib/aiExplain";
import styles from "./AiExplainPanel.module.css";

interface AiExplainPanelProps {
  isOpen: boolean;
  target: AiExplainTarget | null;
  answer: string;
  loading?: boolean;
  error?: string;
  anchor?: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  onClose: () => void;
}

export function AiExplainPanel({
  isOpen,
  target,
  answer,
  loading,
  error,
  anchor,
  onClose,
}: AiExplainPanelProps) {
  const panelStyle = useMemo<CSSProperties | undefined>(() => {
    if (!anchor || typeof window === "undefined") return undefined;

    const estimatedWidth = 440;
    const estimatedHeight = 340;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = anchor.top + anchor.height + 12;
    let left = anchor.left;

    left = Math.min(left, viewportWidth - estimatedWidth - 16);
    left = Math.max(16, left);

    if (top + estimatedHeight > viewportHeight - 16) {
      top = Math.max(16, anchor.top - estimatedHeight - 16);
    }

    return { top, left };
  }, [anchor]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const displayAnswer = answer.trim();

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`${styles.wrapper} ${isOpen ? styles.open : ""} surface-card`}
        role="dialog"
        aria-live="polite"
        style={panelStyle}
      >
        <header className={styles.header}>
          <div className={styles.headingGroup}>
            <p className={styles.kicker}>Ask AI</p>
            <h3 className={styles.title}>{target?.text || "问模型"}</h3>
          </div>
          <button className={styles.close} onClick={onClose}>
            关闭
          </button>
        </header>

        <div className={styles.content}>
          {loading && !displayAnswer ? (
            <p className="muted-text">正在询问模型…</p>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}

          {displayAnswer ? (
            <div className={styles.answer}>{displayAnswer}</div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
