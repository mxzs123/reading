"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { LinkHint, SecretTextField, SelectField, SwitchField, TextField } from "@/components/ui";
import { geminiModelOptions, translateOptions } from "./options";
import { FieldGrid, SettingsDetails, SettingsHint } from "./SettingsLayout";

export function TtsGeminiSettings() {
  const { settings } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <>
      <SecretTextField
        label="Gemini API Key"
        value={settings.geminiApiKey}
        placeholder={t("settings.gemini.apiPlaceholder")}
        onChange={updateField("geminiApiKey")}
        hint={
          <LinkHint
            before={t("settings.gemini.apiHintBefore")}
            href="https://aistudio.google.com/app/apikey"
            after={t("settings.gemini.apiHintAfter")}
          >
            Google AI Studio
          </LinkHint>
        }
      />

      <FieldGrid>
        <SelectField
          label={t("settings.gemini.model")}
          value={settings.geminiModel}
          options={translateOptions(geminiModelOptions, t)}
          onChange={updateField("geminiModel")}
        />

        <TextField
          label={t("settings.gemini.voice")}
          value={settings.geminiVoiceName}
          onChange={updateField("geminiVoiceName")}
          placeholder={t("settings.gemini.voicePlaceholder")}
          hint={t("settings.gemini.voiceHint")}
        />
      </FieldGrid>

      <SettingsDetails title={t("settings.gemini.advanced")}>
        <TextField
          label={t("settings.gemini.stylePrompt")}
          value={settings.geminiStylePrompt}
          onChange={updateField("geminiStylePrompt")}
          placeholder={t("settings.gemini.stylePlaceholder")}
          hint={t("settings.gemini.styleHint")}
          multiline
          rows={4}
        />

        <SwitchField
          label={t("settings.gemini.multiSpeaker")}
          checked={settings.geminiUseMultiSpeaker}
          onChange={updateField("geminiUseMultiSpeaker")}
        />

        {settings.geminiUseMultiSpeaker ? (
          <>
            <FieldGrid>
              <TextField
                label={t("settings.gemini.speaker1Name")}
                value={settings.geminiSpeaker1Name}
                onChange={updateField("geminiSpeaker1Name")}
                placeholder={t("settings.gemini.speakerNamePlaceholder")}
              />
              <TextField
                label={t("settings.gemini.speaker1Voice")}
                value={settings.geminiSpeaker1VoiceName}
                onChange={updateField("geminiSpeaker1VoiceName")}
                placeholder={t("settings.gemini.voicePlaceholder")}
              />
            </FieldGrid>

            <FieldGrid>
              <TextField
                label={t("settings.gemini.speaker2Name")}
                value={settings.geminiSpeaker2Name}
                onChange={updateField("geminiSpeaker2Name")}
                placeholder={t("settings.gemini.speakerNamePlaceholder2")}
              />
              <TextField
                label={t("settings.gemini.speaker2Voice")}
                value={settings.geminiSpeaker2VoiceName}
                onChange={updateField("geminiSpeaker2VoiceName")}
                placeholder={DEFAULT_SETTINGS.geminiSpeaker2VoiceName}
              />
            </FieldGrid>

            <SettingsHint>
              {t("settings.gemini.dialogueHint", {
                speaker:
                  settings.geminiSpeaker1Name ||
                  DEFAULT_SETTINGS.geminiSpeaker1Name,
              })}
            </SettingsHint>
          </>
        ) : null}
      </SettingsDetails>
    </>
  );
}
