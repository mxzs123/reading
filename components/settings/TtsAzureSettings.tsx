"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import type { AzureTTSVoice } from "@/lib/settings";
import { SecretTextField, RangeField } from "@/components/ui";
import { azureVoiceOptions, translateOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsAzureSettings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="Azure API Key"
        value={settings.azureApiKey}
        placeholder={t("settings.tts.azurePlaceholder")}
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ azureApiKey: value })}
        hint={
          <>
            {t("settings.tts.azureHintBefore")}
            <a
              href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
              target="_blank"
              rel="noopener noreferrer"
            >
              Azure Portal
            </a>
            {t("settings.tts.azureHintAfter")}
          </>
        }
      />

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.tts.voice")}</label>
        <select
          className={styles.select}
          value={settings.azureVoice}
          onChange={(e) =>
            updateSettings({ azureVoice: e.target.value as AzureTTSVoice })
          }
        >
          {translateOptions(azureVoiceOptions, t).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>{t("settings.tts.advanced")}</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label={t("settings.tts.rate")}
              value={settings.ttsRate}
              min={0.6}
              max={1.6}
              step={0.05}
              onChange={(value) => updateSettings({ ttsRate: value })}
            />
            <RangeField
              label={t("settings.tts.volume")}
              value={settings.ttsVolume}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateSettings({ ttsVolume: value })}
            />
          </div>

          <div className={styles.fieldColumn}>
            <label className={styles.fieldLabel}>{t("settings.tts.pause")}</label>
            <input
              type="number"
              min={0}
              className={styles.apiKeyInput}
              value={settings.ttsPauseMs}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                updateSettings({
                  ttsPauseMs: Number.isNaN(parsed)
                    ? 400
                    : Math.max(0, Math.min(2000, parsed)),
                });
              }}
            />
            <p className={styles.apiKeyHint}>
              {t("settings.tts.pauseHint")}
            </p>
          </div>
        </div>
      </details>
    </>
  );
}
