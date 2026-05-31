"use client";

import { useSettingFieldUpdater, useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import { SegmentedControl, RangeField, SelectField } from "@/components/ui";
import { alignOptions, fontFamilies, translateOptions } from "./options";
import {
  FieldGrid,
  FieldRow,
  SettingsDetails,
  SettingsFieldLabel,
  SettingsSection,
} from "./SettingsLayout";

export function TypographyTab() {
  const { settings } = useSettings();
  const updateField = useSettingFieldUpdater();
  const { t } = useI18n();

  return (
    <SettingsSection title={t("settings.typography.section")}>
      <SelectField
        label={t("settings.typography.font")}
        value={settings.fontFamily}
        options={translateOptions(fontFamilies, t)}
        onChange={updateField("fontFamily")}
      />

      <FieldGrid>
        <RangeField
          label={t("settings.typography.fontSize")}
          value={settings.fontSize}
          unit="px"
          min={14}
          max={30}
          step={0.25}
          onChange={updateField("fontSize")}
        />
        <RangeField
          label={t("settings.typography.lineHeight")}
          value={settings.lineHeight}
          min={1.2}
          max={2.4}
          step={0.02}
          onChange={updateField("lineHeight")}
        />
        <RangeField
          label={t("settings.typography.paragraphSpacing")}
          value={settings.paragraphSpacing}
          unit="em"
          min={0.4}
          max={2}
          step={0.05}
          onChange={updateField("paragraphSpacing")}
        />
      </FieldGrid>

      <SettingsDetails title={t("settings.typography.advanced")}>
        <FieldGrid>
          <RangeField
            label={t("settings.typography.bodyWeight")}
            value={settings.bodyFontWeight}
            min={350}
            max={800}
            step={25}
            onChange={updateField("bodyFontWeight")}
          />
          <RangeField
            label={t("settings.typography.indent")}
            value={settings.textIndent}
            unit="em"
            min={0}
            max={2}
            step={0.1}
            onChange={updateField("textIndent")}
          />
        </FieldGrid>

        <FieldRow>
          <SettingsFieldLabel>
            {t("settings.typography.align")}
          </SettingsFieldLabel>
          <SegmentedControl
            value={settings.textAlign}
            options={translateOptions(alignOptions, t)}
            onChange={updateField("textAlign")}
          />
        </FieldRow>
      </SettingsDetails>
    </SettingsSection>
  );
}
