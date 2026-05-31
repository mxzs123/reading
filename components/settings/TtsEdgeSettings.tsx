"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { RangeField, SelectField } from "@/components/ui";
import { edgeVoiceOptions, translateOptions } from "./options";
import { FieldGrid, SettingsDetails } from "./SettingsLayout";

export function TtsEdgeSettings() {
  const { settings } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <>
      <SelectField
        label={t("settings.tts.voice")}
        value={settings.edgeVoice}
        options={translateOptions(edgeVoiceOptions, t)}
        onChange={updateField("edgeVoice")}
        hint={t("settings.tts.edgeHint")}
      />

      <SettingsDetails title={t("settings.tts.advanced")}>
        <FieldGrid>
          <RangeField
            label={t("settings.tts.rate")}
            value={settings.edgeRate}
            min={0.6}
            max={1.8}
            step={0.05}
            onChange={updateField("edgeRate")}
          />
          <RangeField
            label={t("settings.tts.pitch")}
            value={settings.edgePitch}
            min={-50}
            max={50}
            step={5}
            unit="Hz"
            onChange={updateField("edgePitch")}
          />
        </FieldGrid>
      </SettingsDetails>
    </>
  );
}
