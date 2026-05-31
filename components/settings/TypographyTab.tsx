"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { SegmentedControl, RangeField } from "@/components/ui";
import { alignOptions, fontFamilies, translateOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TypographyTab() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>{t("settings.typography.section")}</div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.typography.font")}</label>
        <select
          className={styles.select}
          value={settings.fontFamily}
          onChange={(e) => updateSettings({ fontFamily: e.target.value })}
        >
          {translateOptions(fontFamilies, t).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.grid2}>
        <RangeField
          label={t("settings.typography.fontSize")}
          value={settings.fontSize}
          unit="px"
          min={14}
          max={30}
          step={0.25}
          onChange={(value) => updateSettings({ fontSize: value })}
        />
        <RangeField
          label={t("settings.typography.lineHeight")}
          value={settings.lineHeight}
          min={1.2}
          max={2.4}
          step={0.02}
          onChange={(value) => updateSettings({ lineHeight: value })}
        />
        <RangeField
          label={t("settings.typography.paragraphSpacing")}
          value={settings.paragraphSpacing}
          unit="em"
          min={0.4}
          max={2}
          step={0.05}
          onChange={(value) => updateSettings({ paragraphSpacing: value })}
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>{t("settings.typography.advanced")}</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label={t("settings.typography.letterSpacing")}
              value={settings.letterSpacing}
              unit="em"
              min={-0.05}
              max={0.12}
              step={0.002}
              onChange={(value) => updateSettings({ letterSpacing: value })}
            />
            <RangeField
              label={t("settings.typography.bodyWeight")}
              value={settings.bodyFontWeight}
              min={350}
              max={800}
              step={25}
              onChange={(value) => updateSettings({ bodyFontWeight: value })}
            />
            <RangeField
              label={t("settings.typography.indent")}
              value={settings.textIndent}
              unit="em"
              min={0}
              max={2}
              step={0.1}
              onChange={(value) => updateSettings({ textIndent: value })}
            />
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{t("settings.typography.align")}</span>
            <SegmentedControl
              value={settings.textAlign}
              options={translateOptions(alignOptions, t)}
              onChange={(value) => updateSettings({ textAlign: value })}
            />
          </div>
        </div>
      </details>
    </section>
  );
}
