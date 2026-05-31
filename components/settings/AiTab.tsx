"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useI18n } from "@/contexts/I18nContext";
import type { DeepSeekModel } from "@/lib/settings";
import { RangeField, SecretTextField, SwitchField } from "@/components/ui";
import { deepseekModelOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function AiTab() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>{t("settings.ai.section")}</div>

      <SwitchField
        label={t("settings.ai.enable")}
        checked={settings.aiExplainEnabled}
        onChange={(checked) => updateSettings({ aiExplainEnabled: checked })}
      />

      <SecretTextField
        label="DeepSeek API Key"
        value={settings.deepseekApiKey}
        placeholder={t("settings.ai.placeholder")}
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ deepseekApiKey: value })}
        hint={t("settings.ai.deepseekHint")}
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.ai.model")}</label>
          <select
            className={styles.select}
            value={settings.deepseekModel}
            onChange={(e) =>
              updateSettings({ deepseekModel: e.target.value as DeepSeekModel })
            }
          >
            {deepseekModelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>{t("settings.ai.maxTokens")}</label>
          <input
            type="number"
            min={200}
            max={2000}
            className={styles.apiKeyInput}
            value={settings.deepseekMaxTokens}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              updateSettings({
                deepseekMaxTokens: Number.isNaN(parsed)
                  ? 900
                  : Math.max(200, Math.min(2000, parsed)),
              });
            }}
          />
        </div>
      </div>

      <RangeField
        label={t("settings.ai.longPress")}
        value={settings.aiLongPressMs}
        min={350}
        max={1200}
        step={10}
        unit="ms"
        onChange={(value) => updateSettings({ aiLongPressMs: value })}
      />

      <RangeField
        label={t("settings.ai.contextChars")}
        value={settings.aiContextChars}
        min={300}
        max={4000}
        step={100}
        unit={t("settings.ai.contextUnit")}
        onChange={(value) => updateSettings({ aiContextChars: value })}
      />

      <p className={styles.apiKeyHint}>
        {t("settings.ai.desktopHint")}
      </p>
    </section>
  );
}
