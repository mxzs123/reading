"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import type { AzureTTSVoice } from "@/lib/settings";
import { SecretTextField, RangeField } from "@/components/ui";
import { azureVoiceOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsAzureSettings() {
  const { settings, updateSettings } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="Azure API Key"
        value={settings.azureApiKey}
        placeholder="输入您的 API Key"
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ azureApiKey: value })}
        hint={
          <>
            从{" "}
            <a
              href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
              target="_blank"
              rel="noopener noreferrer"
            >
              Azure Portal
            </a>{" "}
            创建语音服务获取 API Key
          </>
        }
      />

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>朗读声音</label>
        <select
          className={styles.select}
          value={settings.azureVoice}
          onChange={(e) =>
            updateSettings({ azureVoice: e.target.value as AzureTTSVoice })
          }
        >
          {azureVoiceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>高级参数</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label="语速"
              value={settings.ttsRate}
              min={0.6}
              max={1.6}
              step={0.05}
              onChange={(value) => updateSettings({ ttsRate: value })}
            />
            <RangeField
              label="音量"
              value={settings.ttsVolume}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateSettings({ ttsVolume: value })}
            />
          </div>

          <div className={styles.fieldColumn}>
            <label className={styles.fieldLabel}>句间停顿 (毫秒)</label>
            <input
              type="number"
              min={0}
              className={styles.apiKeyInput}
              value={settings.ttsPauseMs}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                updateSettings({
                  ttsPauseMs: Number.isNaN(parsed)
                    ? 400
                    : Math.max(0, Math.min(2000, parsed)),
                });
              }}
            />
            <p className={styles.apiKeyHint}>
              控制段落或句子之间的停顿时长，可在长文本朗读时留出缓冲。
            </p>
          </div>
        </div>
      </details>
    </>
  );
}
