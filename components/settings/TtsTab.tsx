"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { SegmentedControl, SwitchField } from "@/components/ui";
import { translateOptions, ttsProviderOptions } from "./options";
import { TtsEdgeSettings } from "./TtsEdgeSettings";
import { TtsAzureSettings } from "./TtsAzureSettings";
import { TtsElevenSettings } from "./TtsElevenSettings";
import { TtsGeminiSettings } from "./TtsGeminiSettings";
import styles from "./settingsStyles.module.css";

export function TtsTab() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>{t("settings.tts.section")}</div>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{t("settings.tts.provider")}</span>
        <SegmentedControl
          value={settings.ttsProvider}
          options={translateOptions(ttsProviderOptions, t)}
          onChange={(value) => updateSettings({ ttsProvider: value })}
        />
      </div>

      {settings.ttsProvider === "edge" ? (
        <TtsEdgeSettings />
      ) : settings.ttsProvider === "azure" ? (
        <TtsAzureSettings />
      ) : settings.ttsProvider === "elevenlabs" ? (
        <TtsElevenSettings />
      ) : (
        <TtsGeminiSettings />
      )}

      <SwitchField
        label={t("settings.tts.autoPlayNext")}
        checked={settings.autoPlayNext}
        onChange={(checked) => updateSettings({ autoPlayNext: checked })}
      />

      {settings.ttsProvider === "elevenlabs" ? (
        <SwitchField
          label={t("settings.tts.wordSync")}
          checked={settings.elevenWordSyncHighlight}
          onChange={(checked) =>
            updateSettings({ elevenWordSyncHighlight: checked })
          }
        />
      ) : null}

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.tts.concurrency")}</label>
        <input
          type="number"
          min={1}
          className={styles.apiKeyInput}
          value={settings.ttsConcurrency}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            updateSettings({
              ttsConcurrency: Number.isNaN(parsed)
                ? 1
                : Math.max(1, Math.min(8, parsed)),
            });
          }}
        />
        <p className={styles.apiKeyHint}>
          {t("settings.tts.concurrencyHint")}
        </p>
      </div>
    </section>
  );
}
