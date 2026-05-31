"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  NumberField,
  RangeField,
  SecretTextField,
  SelectField,
  SwitchField,
} from "@/components/ui";
import { deepseekModelOptions } from "./options";
import { FieldGrid, SettingsHint, SettingsSection } from "./SettingsLayout";

export function AiTab() {
  const { settings, updateSetting } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <SettingsSection title={t("settings.ai.section")}>
      <SwitchField
        label={t("settings.ai.enable")}
        checked={settings.aiExplainEnabled}
        onChange={updateField("aiExplainEnabled")}
      />

      <SecretTextField
        label="DeepSeek API Key"
        value={settings.deepseekApiKey}
        placeholder={t("settings.ai.placeholder")}
        onChange={updateField("deepseekApiKey")}
        hint={t("settings.ai.deepseekHint")}
      />

      <FieldGrid>
        <SelectField
          label={t("settings.ai.model")}
          value={settings.deepseekModel}
          options={deepseekModelOptions}
          onChange={updateField("deepseekModel")}
        />
        <NumberField
          label={t("settings.ai.maxTokens")}
          value={settings.deepseekMaxTokens}
          min={200}
          max={2000}
          fallback={900}
          onChange={(value) => updateSetting("deepseekMaxTokens", value ?? 900)}
        />
      </FieldGrid>

      <RangeField
        label={t("settings.ai.longPress")}
        value={settings.aiLongPressMs}
        min={350}
        max={1200}
        step={10}
        unit="ms"
        onChange={updateField("aiLongPressMs")}
      />

      <RangeField
        label={t("settings.ai.contextChars")}
        value={settings.aiContextChars}
        min={300}
        max={4000}
        step={100}
        unit={t("settings.ai.contextUnit")}
        onChange={updateField("aiContextChars")}
      />

      <SettingsHint>{t("settings.ai.desktopHint")}</SettingsHint>
    </SettingsSection>
  );
}
