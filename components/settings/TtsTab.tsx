"use client";

import type { ComponentType } from "react";
import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { NumberField, SegmentedControl, SwitchField } from "@/components/ui";
import type { TTSProvider } from "@/lib/settings";
import { translateOptions, ttsProviderOptions } from "./options";
import { TtsEdgeSettings } from "./TtsEdgeSettings";
import { TtsAzureSettings } from "./TtsAzureSettings";
import { TtsElevenSettings } from "./TtsElevenSettings";
import { TtsGeminiSettings } from "./TtsGeminiSettings";
import {
  FieldRow,
  SettingsFieldLabel,
  SettingsSection,
} from "./SettingsLayout";

const TTS_PROVIDER_SETTINGS: Record<TTSProvider, ComponentType> = {
  azure: TtsAzureSettings,
  edge: TtsEdgeSettings,
  elevenlabs: TtsElevenSettings,
  gemini: TtsGeminiSettings,
};

export function TtsTab() {
  const { settings, updateSetting } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();
  const ProviderSettings = TTS_PROVIDER_SETTINGS[settings.ttsProvider];

  return (
    <SettingsSection title={t("settings.tts.section")}>
      <FieldRow>
        <SettingsFieldLabel>{t("settings.tts.provider")}</SettingsFieldLabel>
        <SegmentedControl
          value={settings.ttsProvider}
          options={translateOptions(ttsProviderOptions, t)}
          onChange={updateField("ttsProvider")}
        />
      </FieldRow>

      <ProviderSettings />

      <SwitchField
        label={t("settings.tts.autoPlayNext")}
        checked={settings.autoPlayNext}
        onChange={updateField("autoPlayNext")}
      />

      {settings.ttsProvider === "elevenlabs" ? (
        <SwitchField
          label={t("settings.tts.wordSync")}
          checked={settings.elevenWordSyncHighlight}
          onChange={updateField("elevenWordSyncHighlight")}
        />
      ) : null}

      <NumberField
        label={t("settings.tts.concurrency")}
        value={settings.ttsConcurrency}
        min={1}
        max={8}
        fallback={1}
        hint={t("settings.tts.concurrencyHint")}
        onChange={(value) => updateSetting("ttsConcurrency", value ?? 1)}
      />
    </SettingsSection>
  );
}
