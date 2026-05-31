"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { SegmentedControl, RangeField } from "@/components/ui";
import { boldOptions, readingModeOptions, themeOptions, translateOptions } from "./options";
import styles from "./settingsStyles.module.css";

interface ReadingTabProps {
  onSwitchToTts?: () => void;
}

export function ReadingTab({ onSwitchToTts }: ReadingTabProps) {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>{t("settings.reading.mode")}</div>

        <div className={styles.fieldRow}>
          <SegmentedControl
            value={settings.readingMode}
            options={translateOptions(readingModeOptions, t)}
            onChange={(value) => updateSettings({ readingMode: value })}
          />
          <p className={styles.apiKeyHint}>
            {t("settings.reading.modeHint")}
          </p>

          {settings.readingMode === "pure" ? (
            <div className={styles.callout}>
              <p className={styles.calloutText}>
                {t("settings.reading.pureCallout")}
              </p>
              <button
                type="button"
                className={styles.calloutButton}
                onClick={() => {
                  updateSettings({ readingMode: "audio" });
                  onSwitchToTts?.();
                }}
              >
                {t("settings.reading.switchToAudio")}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>{t("settings.reading.appearance")}</div>

        <div className={styles.fieldRow}>
          <SegmentedControl
            value={settings.theme}
            options={translateOptions(themeOptions, t)}
            onChange={(value) => updateSettings({ theme: value })}
          />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t("settings.reading.bionicStrength")}</span>
          <SegmentedControl
            value={settings.boldRatio}
            options={translateOptions(boldOptions, t)}
            onChange={(value) => updateSettings({ boldRatio: value })}
          />
          {settings.boldRatio === "custom" ? (
            <RangeField
              label={t("settings.reading.customRatio")}
              value={settings.customBoldRatio}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateSettings({ customBoldRatio: value })}
            />
          ) : null}
          <RangeField
            label={t("settings.reading.bionicWeight")}
            value={settings.bionicWeight}
            min={500}
            max={800}
            step={25}
            onChange={(value) => updateSettings({ bionicWeight: value })}
          />
        </div>
      </section>
    </>
  );
}
