"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { SegmentedControl, RangeField } from "@/components/ui";
import { alignOptions, fontFamilies } from "./options";
import styles from "./settingsStyles.module.css";

export function TypographyTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>字体与排版</div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>字体</label>
        <select
          className={styles.select}
          value={settings.fontFamily}
          onChange={(e) => updateSettings({ fontFamily: e.target.value })}
        >
          {fontFamilies.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.grid2}>
        <RangeField
          label="字号"
          value={settings.fontSize}
          unit="px"
          min={14}
          max={30}
          step={0.25}
          onChange={(value) => updateSettings({ fontSize: value })}
        />
        <RangeField
          label="行高"
          value={settings.lineHeight}
          min={1.2}
          max={2.4}
          step={0.02}
          onChange={(value) => updateSettings({ lineHeight: value })}
        />
        <RangeField
          label="段落间距"
          value={settings.paragraphSpacing}
          unit="em"
          min={0.4}
          max={2}
          step={0.05}
          onChange={(value) => updateSettings({ paragraphSpacing: value })}
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>高级排版</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label="字间距"
              value={settings.letterSpacing}
              unit="em"
              min={-0.05}
              max={0.12}
              step={0.002}
              onChange={(value) => updateSettings({ letterSpacing: value })}
            />
            <RangeField
              label="正文字重"
              value={settings.bodyFontWeight}
              min={350}
              max={800}
              step={25}
              onChange={(value) => updateSettings({ bodyFontWeight: value })}
            />
            <RangeField
              label="首行缩进"
              value={settings.textIndent}
              unit="em"
              min={0}
              max={2}
              step={0.1}
              onChange={(value) => updateSettings({ textIndent: value })}
            />
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>对齐方式</span>
            <SegmentedControl
              value={settings.textAlign}
              options={alignOptions}
              onChange={(value) => updateSettings({ textAlign: value })}
            />
          </div>
        </div>
      </details>
    </section>
  );
}
