"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { LOCALES, type Locale } from "@/lib/i18n";
import { SegmentedControl, type SegmentedOption } from "@/components/ui";
import {
  AiTab,
  LayoutTab,
  ReadingTab,
  SyncTab,
  TtsTab,
  TypographyTab,
} from "@/components/settings";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArticlesCleared?: () => void;
}

type SettingsTab = "reading" | "typography" | "layout" | "tts" | "ai" | "sync";

export function SettingsPanel({ isOpen, onClose, onArticlesCleared }: SettingsPanelProps) {
  const { settings, resetSettings } = useSettings();
  const { locale, localeLabels, setLocale, t } = useI18n();
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
        { value: "reading", label: t("settings.tab.reading") },
        { value: "typography", label: t("settings.tab.typography") },
        { value: "layout", label: t("settings.tab.layout") },
        { value: "ai", label: t("settings.tab.ai") },
        { value: "sync", label: t("settings.tab.sync") },
      ];

      return canConfigureTts
        ? [...base, { value: "tts", label: t("settings.tab.tts") }]
        : base;
    },
    [canConfigureTts, t]
  );

  useEffect(() => {
    if (!canConfigureTts && activeTab === "tts") {
      setActiveTab("reading");
    }
  }, [activeTab, canConfigureTts]);

  const handleClearAllArticles = async () => {
    if (!confirm(t("settings.clearAllConfirm"))) {
      return;
    }
    setIsClearing(true);
    try {
      const response = await fetch("/api/articles", { method: "DELETE" });
      if (response.ok) {
        const data = await response.json();
        alert(t("settings.deletedArticles", { count: data.deleted }));
        onArticlesCleared?.();
      } else {
        alert(t("settings.deleteFailed"));
      }
    } catch {
      alert(t("settings.deleteFailed"));
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
            <h2 className={styles.title}>{t("settings.title")}</h2>
            <p className="muted-text">{t("settings.subtitle")}</p>
          </div>
          <label className={styles.languageSelectWrap}>
            <span>{t("language.label")}</span>
            <select
              className={styles.languageSelect}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {LOCALES.map((item) => (
                <option key={item} value={item}>
                  {localeLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.closeBtn} onClick={onClose}>
            {t("settings.close")}
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

          <div hidden={activeTab !== "ai"} className={styles.tabContent}>
            <AiTab />
          </div>

          <div hidden={activeTab !== "sync"} className={styles.tabContent}>
            <SyncTab />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={resetSettings}>
            {t("settings.reset")}
          </button>
          <button
            className={styles.dangerButton}
            onClick={handleClearAllArticles}
            disabled={isClearing}
          >
            {isClearing ? t("settings.clearing") : t("settings.clearAll")}
          </button>
        </div>
      </aside>
    </>
  );
}
