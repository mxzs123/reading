"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { SegmentedControl, RangeField } from "@/components/ui";
import { boldOptions, readingModeOptions, themeOptions, translateOptions } from "./options";
import {
  FieldRow,
  SettingsFieldLabel,
  SettingsHint,
  SettingsSection,
} from "./SettingsLayout";
import styles from "./settingsStyles.module.css";

interface ReadingTabProps {
  onSwitchToTts?: () => void;
}

export function ReadingTab({ onSwitchToTts }: ReadingTabProps) {
  const { settings, updateSetting } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <>
      <SettingsSection title={t("settings.reading.mode")}>
        <FieldRow>
          <SegmentedControl
            value={settings.readingMode}
            options={translateOptions(readingModeOptions, t)}
            onChange={updateField("readingMode")}
          />
          <SettingsHint>{t("settings.reading.modeHint")}</SettingsHint>

          {settings.readingMode === "pure" ? (
            <div className={styles.callout}>
              <p className={styles.calloutText}>
                {t("settings.reading.pureCallout")}
              </p>
              <button
                type="button"
                className={styles.calloutButton}
                onClick={() => {
                  updateSetting("readingMode", "audio");
                  onSwitchToTts?.();
                }}
              >
                {t("settings.reading.switchToAudio")}
              </button>
            </div>
          ) : null}
        </FieldRow>
      </SettingsSection>

      <SettingsSection title={t("settings.reading.appearance")}>
        <FieldRow>
          <SegmentedControl
            value={settings.theme}
            options={translateOptions(themeOptions, t)}
            onChange={updateField("theme")}
          />
        </FieldRow>

        <FieldRow>
          <SettingsFieldLabel>
            {t("settings.reading.bionicStrength")}
          </SettingsFieldLabel>
          <SegmentedControl
            value={settings.boldRatio}
            options={translateOptions(boldOptions, t)}
            onChange={updateField("boldRatio")}
          />
          {settings.boldRatio === "custom" ? (
            <RangeField
              label={t("settings.reading.customRatio")}
              value={settings.customBoldRatio}
              min={0}
              max={1}
              step={0.01}
              onChange={updateField("customBoldRatio")}
            />
          ) : null}
          <RangeField
            label={t("settings.reading.bionicWeight")}
            value={settings.bionicWeight}
            min={500}
            max={800}
            step={25}
            onChange={updateField("bionicWeight")}
          />
        </FieldRow>
      </SettingsSection>
    </>
  );
}
