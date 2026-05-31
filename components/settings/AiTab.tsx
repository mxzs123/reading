"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import type { DeepSeekModel } from "@/lib/settings";
import { RangeField, SecretTextField, SwitchField } from "@/components/ui";
import { deepseekModelOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function AiTab() {
  const { settings, updateSettings } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>问模型</div>

      <SwitchField
        label="长按单词问模型"
        checked={settings.aiExplainEnabled}
        onChange={(checked) => updateSettings({ aiExplainEnabled: checked })}
      />

      <SecretTextField
        label="DeepSeek API Key"
        value={settings.deepseekApiKey}
        placeholder="输入 DeepSeek API Key"
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ deepseekApiKey: value })}
        hint="Key 只保存在本机 localStorage。"
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>模型</label>
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
          <label className={styles.fieldLabel}>最大输出 tokens</label>
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
        label="长按触发时间"
        value={settings.aiLongPressMs}
        min={350}
        max={1200}
        step={10}
        unit="ms"
        onChange={(value) => updateSettings({ aiLongPressMs: value })}
      />

      <RangeField
        label="上下文长度"
        value={settings.aiContextChars}
        min={300}
        max={4000}
        step={100}
        unit=" 字符"
        onChange={(value) => updateSettings({ aiContextChars: value })}
      />

      <p className={styles.apiKeyHint}>
        桌面端按住英文单词即可发送该词、当前段落和相邻上下文。
      </p>
    </section>
  );
}
