"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import type { EdgeTTSVoice } from "@/lib/settings";
import { RangeField } from "@/components/ui";
import { edgeVoiceOptions, translateOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsEdgeSettings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  return (
    <>
      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.tts.voice")}</label>
        <select
          className={styles.select}
          value={settings.edgeVoice}
          onChange={(e) =>
            updateSettings({ edgeVoice: e.target.value as EdgeTTSVoice })
          }
        >
          {translateOptions(edgeVoiceOptions, t).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.apiKeyHint}>
          {t("settings.tts.edgeHint")}
        </p>
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>{t("settings.tts.advanced")}</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label={t("settings.tts.rate")}
              value={settings.edgeRate}
              min={0.6}
              max={1.8}
              step={0.05}
              onChange={(value) => updateSettings({ edgeRate: value })}
            />
            <RangeField
              label={t("settings.tts.pitch")}
              value={settings.edgePitch}
              min={-50}
              max={50}
              step={5}
              unit="Hz"
              onChange={(value) => updateSettings({ edgePitch: value })}
            />
          </div>
        </div>
      </details>
    </>
  );
}
