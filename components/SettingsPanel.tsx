"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { SegmentedControl, type SegmentedOption } from "@/components/ui";
import { ReadingTab, TypographyTab, LayoutTab, TtsTab } from "@/components/settings";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArticlesCleared?: () => void;
}

type SettingsTab = "reading" | "typography" | "layout" | "tts";

export function SettingsPanel({ isOpen, onClose, onArticlesCleared }: SettingsPanelProps) {
  const { settings, resetSettings } = useSettings();
  const [isClearing, setIsClearing] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth || 0 : 0
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth || 0);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canConfigureTts = settings.readingMode === "audio";
  const [activeTab, setActiveTab] = useState<SettingsTab>("reading");

  const tabOptions = useMemo<ReadonlyArray<SegmentedOption<SettingsTab>>>(
    () => {
      const base: ReadonlyArray<SegmentedOption<SettingsTab>> = [
        { value: "reading", label: "阅读" },
        { value: "typography", label: "排版" },
        { value: "layout", label: "布局" },
      ];

      return canConfigureTts
        ? [...base, { value: "tts", label: "朗读" }]
        : base;
    },
    [canConfigureTts]
  );

  useEffect(() => {
    if (!canConfigureTts && activeTab === "tts") {
      setActiveTab("reading");
    }
  }, [activeTab, canConfigureTts]);

  const handleClearAllArticles = async () => {
    if (!confirm("确定要删除所有文章吗？此操作不可恢复！")) {
      return;
    }
    setIsClearing(true);
    try {
      const response = await fetch("/api/articles", { method: "DELETE" });
      if (response.ok) {
        const data = await response.json();
        alert(`已删除 ${data.deleted} 篇文章`);
        onArticlesCleared?.();
      } else {
        alert("删除失败，请重试");
      }
    } catch {
      alert("删除失败，请重试");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`${styles.panel} surface-card ${
          isOpen ? styles.panelOpen : ""
        }`}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>阅读设置</h2>
            <p className="muted-text">定制您的专属阅读体验</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            关闭
          </button>
        </header>

        <div className={styles.tabs}>
          <SegmentedControl
            value={activeTab}
            options={tabOptions}
            onChange={setActiveTab}
            layout="tabs"
          />
        </div>

        <div className={styles.scrollContent}>
          <div hidden={activeTab !== "reading"} className={styles.tabContent}>
            <ReadingTab onSwitchToTts={() => setActiveTab("tts")} />
          </div>

          <div hidden={activeTab !== "typography"} className={styles.tabContent}>
            <TypographyTab />
          </div>

          <div hidden={activeTab !== "layout"} className={styles.tabContent}>
            <LayoutTab viewportWidth={viewportWidth} />
          </div>

          {canConfigureTts ? (
            <div hidden={activeTab !== "tts"} className={styles.tabContent}>
              <TtsTab />
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={resetSettings}>
            恢复默认设置
          </button>
          <button
            className={styles.dangerButton}
            onClick={handleClearAllArticles}
            disabled={isClearing}
          >
            {isClearing ? "删除中..." : "清除所有文章"}
          </button>
        </div>
      </aside>
    </>
  );
}
