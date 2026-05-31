"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  LinkHint,
  NumberField,
  SecretTextField,
  RangeField,
  SelectField,
  SwitchField,
  TextField,
} from "@/components/ui";
import {
  elevenModelOptions,
  elevenOutputFormatOptions,
  textNormalizationOptions,
  latencyOptions,
  translateOptions,
} from "./options";
import { FieldGrid, SettingsDetails } from "./SettingsLayout";

export function TtsElevenSettings() {
  const { settings, updateSetting } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <>
      <SecretTextField
        label="ElevenLabs API Key"
        value={settings.elevenApiKey}
        placeholder="xi-api-key"
        onChange={updateField("elevenApiKey")}
        hint={
          <LinkHint
            before={t("settings.eleven.consoleHintBefore")}
            href="https://elevenlabs.io/app"
            after={t("settings.eleven.consoleHintAfter")}
          >
            {t("settings.eleven.consoleLink")}
          </LinkHint>
        }
      />

      <FieldGrid>
        <TextField
          label="Voice ID"
          value={settings.elevenVoiceId}
          onChange={updateField("elevenVoiceId")}
          placeholder={t("settings.eleven.voicePlaceholder")}
          hint={t("settings.eleven.voiceHint")}
        />
        <SelectField
          label={t("settings.eleven.model")}
          value={settings.elevenModelId}
          options={translateOptions(elevenModelOptions, t)}
          onChange={updateField("elevenModelId")}
        />
      </FieldGrid>

      <FieldGrid>
        <SelectField
          label={t("settings.eleven.format")}
          value={settings.elevenOutputFormat}
          options={translateOptions(elevenOutputFormatOptions, t)}
          onChange={updateField("elevenOutputFormat")}
        />
        <TextField
          label={t("settings.eleven.languageCode")}
          value={settings.elevenLanguageCode}
          onChange={updateField("elevenLanguageCode")}
          placeholder="en / zh / ja ..."
        />
      </FieldGrid>

      <FieldGrid>
        <RangeField
          label={t("settings.eleven.stability")}
          value={settings.elevenStability}
          min={0}
          max={1}
          step={0.05}
          onChange={updateField("elevenStability")}
        />
        <RangeField
          label={t("settings.eleven.similarity")}
          value={settings.elevenSimilarityBoost}
          min={0}
          max={1}
          step={0.05}
          onChange={updateField("elevenSimilarityBoost")}
        />
      </FieldGrid>

      <SettingsDetails title={t("settings.tts.advanced")}>
        <FieldGrid>
          <RangeField
            label={t("settings.eleven.style")}
            value={settings.elevenStyle}
            min={0}
            max={1}
            step={0.05}
            onChange={updateField("elevenStyle")}
          />
          <RangeField
            label={t("settings.eleven.speed")}
            value={settings.elevenSpeed}
            min={0.5}
            max={2}
            step={0.05}
            onChange={updateField("elevenSpeed")}
          />
        </FieldGrid>

        <SwitchField
          label="Speaker Boost"
          checked={settings.elevenUseSpeakerBoost}
          onChange={updateField("elevenUseSpeakerBoost")}
        />

        <FieldGrid>
          <NumberField
            label={t("settings.eleven.seed")}
            value={settings.elevenSeed}
            min={0}
            placeholder={t("settings.eleven.seedPlaceholder")}
            allowEmpty
            onChange={updateField("elevenSeed")}
          />
          <SelectField
            label={t("settings.eleven.textNormalization")}
            value={settings.elevenApplyTextNormalization}
            options={translateOptions(textNormalizationOptions, t)}
            onChange={updateField("elevenApplyTextNormalization")}
          />
        </FieldGrid>

        <FieldGrid>
          <SwitchField
            label="enable_logging"
            checked={settings.elevenEnableLogging}
            onChange={updateField("elevenEnableLogging")}
          />

          <SelectField
            label={t("settings.eleven.streamLatency")}
            value={settings.elevenOptimizeStreamingLatency ?? ""}
            options={translateOptions(latencyOptions, t)}
            onChange={(elevenOptimizeStreamingLatency) =>
              updateSetting(
                "elevenOptimizeStreamingLatency",
                elevenOptimizeStreamingLatency === ""
                  ? null
                  : elevenOptimizeStreamingLatency
              )
            }
          />
        </FieldGrid>
      </SettingsDetails>
    </>
  );
}
