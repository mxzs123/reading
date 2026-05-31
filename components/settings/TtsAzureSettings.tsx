"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { LinkHint, NumberField, SecretTextField, RangeField, SelectField } from "@/components/ui";
import { azureVoiceOptions, translateOptions } from "./options";
import { FieldGrid, SettingsDetails } from "./SettingsLayout";

export function TtsAzureSettings() {
  const { settings, updateSetting } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <>
      <SecretTextField
        label="Azure API Key"
        value={settings.azureApiKey}
        placeholder={t("settings.tts.azurePlaceholder")}
        onChange={updateField("azureApiKey")}
        hint={
          <LinkHint
            before={t("settings.tts.azureHintBefore")}
            href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
            after={t("settings.tts.azureHintAfter")}
          >
            Azure Portal
          </LinkHint>
        }
      />

      <SelectField
        label={t("settings.tts.voice")}
        value={settings.azureVoice}
        options={translateOptions(azureVoiceOptions, t)}
        onChange={updateField("azureVoice")}
      />

      <SettingsDetails title={t("settings.tts.advanced")}>
        <FieldGrid>
          <RangeField
            label={t("settings.tts.rate")}
            value={settings.ttsRate}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={updateField("ttsRate")}
          />
          <RangeField
            label={t("settings.tts.volume")}
            value={settings.ttsVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={updateField("ttsVolume")}
          />
        </FieldGrid>

        <NumberField
          label={t("settings.tts.pause")}
          value={settings.ttsPauseMs}
          min={0}
          max={2000}
          fallback={400}
          hint={t("settings.tts.pauseHint")}
          onChange={(value) => updateSetting("ttsPauseMs", value ?? 400)}
        />
      </SettingsDetails>
    </>
  );
}
