"use client";

import { useMemo, type ReactNode } from "react";
import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SegmentedControl, RangeField } from "@/components/ui";
import { translateOptions, widthModeOptions } from "./options";
import {
  FieldGrid,
  FieldRow,
  SettingsFieldLabel,
  SettingsHint,
  SettingsSection,
} from "./SettingsLayout";

interface LayoutTabProps {
  viewportWidth: number;
}

export function LayoutTab({ viewportWidth }: LayoutTabProps) {
  const { settings, hydrated } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();
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
        label={t("settings.layout.contentWidth")}
        value={settings.pageWidthVw}
        unit="vw"
        min={60}
        max={96}
        step={1}
        onChange={updateField("pageWidthVw")}
      />
    );
  } else if (widthMode === "ch") {
    pageWidthControl = (
      <RangeField
        label={t("settings.layout.contentWidth")}
        value={settings.pageWidthCh}
        unit="ch"
        min={40}
        max={120}
        step={1}
        onChange={updateField("pageWidthCh")}
      />
    );
  } else {
    const pageWidthMin = isMobile ? 260 : 400;
    const pageWidthMax = isMobile
      ? Math.max(pageWidthMin, Math.round(viewportWidth * 0.94) || 420)
      : 1200;

    pageWidthControl = (
      <RangeField
        label={t("settings.layout.contentWidth")}
        value={settings.pageWidth}
        unit="px"
        min={pageWidthMin}
        max={pageWidthMax}
        step={isMobile ? 2 : 10}
        onChange={updateField("pageWidth")}
      />
    );
  }

  return (
    <SettingsSection title={t("settings.layout.section")}>
      <FieldRow>
        <SettingsFieldLabel>{t("settings.layout.widthMode")}</SettingsFieldLabel>
        <SegmentedControl
          value={widthMode}
          options={translateOptions(widthModeOptions, t)}
          onChange={updateField("pageWidthMode")}
        />
      </FieldRow>

      <FieldGrid>
        {pageWidthControl}
        <RangeField
          label={t("settings.layout.margin")}
          value={settings.readingPadding}
          unit="px"
          min={8}
          max={120}
          step={2}
          onChange={updateField("readingPadding")}
        />
      </FieldGrid>
      <SettingsHint>
        {approxCharsPerLine
          ? t("settings.layout.approx", { count: approxCharsPerLine })
          : t("settings.layout.narrowHint")}
      </SettingsHint>
    </SettingsSection>
  );
}
