"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import type { GeminiTTSModel } from "@/lib/settings";
import { SecretTextField, SwitchField } from "@/components/ui";
import { geminiModelOptions, translateOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsGeminiSettings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="Gemini API Key"
        value={settings.geminiApiKey}
        placeholder={t("settings.gemini.apiPlaceholder")}
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ geminiApiKey: value })}
        hint={
          <>
            {t("settings.gemini.apiHintBefore")}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
            {t("settings.gemini.apiHintAfter")}
          </>
        }
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.gemini.model")}</label>
          <select
            className={styles.select}
            value={settings.geminiModel}
            onChange={(e) =>
              updateSettings({ geminiModel: e.target.value as GeminiTTSModel })
            }
          >
            {translateOptions(geminiModelOptions, t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.gemini.voice")}</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.geminiVoiceName}
            onChange={(e) => updateSettings({ geminiVoiceName: e.target.value })}
            placeholder={t("settings.gemini.voicePlaceholder")}
          />
          <p className={styles.apiKeyHint}>{t("settings.gemini.voiceHint")}</p>
        </div>
      </div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.gemini.language")}</label>
        <input
          type="text"
          className={styles.apiKeyInput}
          value={settings.geminiLanguageCode}
          onChange={(e) => updateSettings({ geminiLanguageCode: e.target.value })}
          placeholder={t("settings.gemini.languagePlaceholder")}
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>{t("settings.gemini.advanced")}</summary>
        <div className={styles.detailsBody}>
          <div className={styles.fieldColumn}>
            <label className={styles.fieldLabel}>{t("settings.gemini.stylePrompt")}</label>
            <textarea
              className={styles.apiKeyInput}
              value={settings.geminiStylePrompt}
              onChange={(e) =>
                updateSettings({ geminiStylePrompt: e.target.value })
              }
              placeholder={t("settings.gemini.stylePlaceholder")}
              rows={4}
            />
            <p className={styles.apiKeyHint}>
              {t("settings.gemini.styleHint")}
            </p>
          </div>

          <SwitchField
            label={t("settings.gemini.multiSpeaker")}
            checked={settings.geminiUseMultiSpeaker}
            onChange={(checked) =>
              updateSettings({ geminiUseMultiSpeaker: checked })
            }
          />

          {settings.geminiUseMultiSpeaker ? (
            <>
              <div className={styles.grid2}>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>{t("settings.gemini.speaker1Name")}</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker1Name}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker1Name: e.target.value,
                      })
                    }
                    placeholder={t("settings.gemini.speakerNamePlaceholder")}
                  />
                </div>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>{t("settings.gemini.speaker1Voice")}</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker1VoiceName}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker1VoiceName: e.target.value,
                      })
                    }
                    placeholder={t("settings.gemini.voicePlaceholder")}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>{t("settings.gemini.speaker2Name")}</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker2Name}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker2Name: e.target.value,
                      })
                    }
                    placeholder={t("settings.gemini.speakerNamePlaceholder2")}
                  />
                </div>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>{t("settings.gemini.speaker2Voice")}</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker2VoiceName}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker2VoiceName: e.target.value,
                      })
                    }
                    placeholder="Puck"
                  />
                </div>
              </div>

              <p className={styles.apiKeyHint}>
                {t("settings.gemini.dialogueHint", {
                  speaker: settings.geminiSpeaker1Name || "Speaker1",
                })}
              </p>
            </>
          ) : null}
        </div>
      </details>
    </>
  );
}
