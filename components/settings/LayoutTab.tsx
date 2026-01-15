"use client";

import { useMemo, type ReactNode } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SegmentedControl, RangeField } from "@/components/ui";
import { widthModeOptions } from "./options";
import styles from "./settingsStyles.module.css";

interface LayoutTabProps {
  viewportWidth: number;
}

export function LayoutTab({ viewportWidth }: LayoutTabProps) {
  const { settings, updateSettings, hydrated } = useSettings();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const widthMode = settings.pageWidthMode ?? "px";

  const approxCharsPerLine = useMemo(() => {
    if (typeof window === "undefined" || !hydrated) return null;

    const mode = settings.pageWidthMode ?? "px";

    if (mode === "ch") {
      return Math.round(settings.pageWidthCh);
    }

    let availableWidth: number;
    if (mode === "vw") {
      const vw = Math.min(Math.max(settings.pageWidthVw, 60), 96) / 100;
      availableWidth = viewportWidth * vw;
    } else if (isMobile) {
      availableWidth = Math.min(viewportWidth * 0.94, settings.pageWidth);
    } else {
      availableWidth = settings.pageWidth;
    }

    const charWidth =
      settings.fontSize * Math.max(0.46, 0.54 + settings.letterSpacing);

    if (
      !Number.isFinite(availableWidth) ||
      !Number.isFinite(charWidth) ||
      charWidth <= 0
    ) {
      return null;
    }
    return Math.max(8, Math.round(availableWidth / charWidth));
  }, [
    hydrated,
    viewportWidth,
    isMobile,
    settings.fontSize,
    settings.letterSpacing,
    settings.pageWidth,
    settings.pageWidthMode,
    settings.pageWidthVw,
    settings.pageWidthCh,
  ]);

  let pageWidthControl: ReactNode;
  if (widthMode === "vw") {
    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidthVw}
        unit="vw"
        min={60}
        max={96}
        step={1}
        onChange={(value) => updateSettings({ pageWidthVw: value })}
      />
    );
  } else if (widthMode === "ch") {
    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidthCh}
        unit="ch"
        min={40}
        max={120}
        step={1}
        onChange={(value) => updateSettings({ pageWidthCh: value })}
      />
    );
  } else {
    const pageWidthMin = isMobile ? 260 : 400;
    const pageWidthMax = isMobile
      ? Math.max(pageWidthMin, Math.round(viewportWidth * 0.94) || 420)
      : 1200;

    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidth}
        unit="px"
        min={pageWidthMin}
        max={pageWidthMax}
        step={isMobile ? 2 : 10}
        onChange={(value) => updateSettings({ pageWidth: value })}
      />
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>页面布局</div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>宽度模式</span>
        <SegmentedControl
          value={widthMode}
          options={widthModeOptions}
          onChange={(value) => updateSettings({ pageWidthMode: value })}
        />
      </div>

      <div className={styles.grid2}>
        {pageWidthControl}
        <RangeField
          label="页边距"
          value={settings.readingPadding}
          unit="px"
          min={8}
          max={120}
          step={2}
          onChange={(value) => updateSettings({ readingPadding: value })}
        />
      </div>
      <p className={styles.apiKeyHint}>
        {approxCharsPerLine
          ? `估算约 ${approxCharsPerLine} 字/行；窄屏下会受屏宽限制。`
          : "窄屏下会受屏宽限制。"}
      </p>
    </section>
  );
}
