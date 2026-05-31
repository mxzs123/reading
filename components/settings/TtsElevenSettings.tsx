"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import type { ApplyTextNormalization, ElevenOutputFormat } from "@/lib/settings";
import { SecretTextField, RangeField, SwitchField } from "@/components/ui";
import {
  elevenModelOptions,
  elevenOutputFormatOptions,
  textNormalizationOptions,
  latencyOptions,
  translateOptions,
} from "./options";
import styles from "./settingsStyles.module.css";

export function TtsElevenSettings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="ElevenLabs API Key"
        value={settings.elevenApiKey}
        placeholder="xi-api-key"
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ elevenApiKey: value })}
        hint={
          <>
            {t("settings.eleven.consoleHintBefore")}
            <a
              href="https://elevenlabs.io/app"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("settings.eleven.consoleLink")}
            </a>
            {t("settings.eleven.consoleHintAfter")}
          </>
        }
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>Voice ID</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.elevenVoiceId}
            onChange={(e) => updateSettings({ elevenVoiceId: e.target.value })}
            placeholder={t("settings.eleven.voicePlaceholder")}
          />
          <p className={styles.apiKeyHint}>
            {t("settings.eleven.voiceHint")}
          </p>
        </div>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.eleven.model")}</label>
          <select
            className={styles.select}
            value={settings.elevenModelId}
            onChange={(e) => updateSettings({ elevenModelId: e.target.value })}
          >
            {translateOptions(elevenModelOptions, t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.eleven.format")}</label>
          <select
            className={styles.select}
            value={settings.elevenOutputFormat}
            onChange={(e) =>
              updateSettings({
                elevenOutputFormat: e.target.value as ElevenOutputFormat,
              })
            }
          >
            {translateOptions(elevenOutputFormatOptions, t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.eleven.languageCode")}</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.elevenLanguageCode}
            onChange={(e) => updateSettings({ elevenLanguageCode: e.target.value })}
            placeholder="en / zh / ja ..."
          />
        </div>
      </div>

      <div className={styles.grid2}>
        <RangeField
          label={t("settings.eleven.stability")}
          value={settings.elevenStability}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => updateSettings({ elevenStability: value })}
        />
        <RangeField
          label={t("settings.eleven.similarity")}
          value={settings.elevenSimilarityBoost}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => updateSettings({ elevenSimilarityBoost: value })}
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>{t("settings.tts.advanced")}</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label={t("settings.eleven.style")}
              value={settings.elevenStyle}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateSettings({ elevenStyle: value })}
            />
            <RangeField
              label={t("settings.eleven.speed")}
              value={settings.elevenSpeed}
              min={0.5}
              max={2}
              step={0.05}
              onChange={(value) => updateSettings({ elevenSpeed: value })}
            />
          </div>

          <SwitchField
            label="Speaker Boost"
            checked={settings.elevenUseSpeakerBoost}
            onChange={(checked) =>
              updateSettings({ elevenUseSpeakerBoost: checked })
            }
          />

          <div className={styles.grid2}>
            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>{t("settings.eleven.seed")}</label>
              <input
                type="number"
                className={styles.apiKeyInput}
                value={settings.elevenSeed ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = parseInt(val, 10);
                  updateSettings({
                    elevenSeed:
                      val === "" || Number.isNaN(parsed)
                        ? null
                        : Math.max(0, parsed),
                  });
                }}
                placeholder={t("settings.eleven.seedPlaceholder")}
              />
            </div>
            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>{t("settings.eleven.textNormalization")}</label>
              <select
                className={styles.select}
                value={settings.elevenApplyTextNormalization}
                onChange={(e) =>
                  updateSettings({
                    elevenApplyTextNormalization:
                      e.target.value as ApplyTextNormalization,
                  })
                }
              >
                {translateOptions(textNormalizationOptions, t).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.grid2}>
            <SwitchField
              label="enable_logging"
              checked={settings.elevenEnableLogging}
              onChange={(checked) =>
                updateSettings({ elevenEnableLogging: checked })
              }
            />

            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>{t("settings.eleven.streamLatency")}</label>
              <select
                className={styles.select}
                value={settings.elevenOptimizeStreamingLatency ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateSettings({
                    elevenOptimizeStreamingLatency:
                      val === ""
                        ? null
                        : Math.max(0, Math.min(4, Number(val))),
                  });
                }}
              >
                {translateOptions(latencyOptions, t).map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
