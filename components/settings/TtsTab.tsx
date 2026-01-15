"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { SegmentedControl, SwitchField } from "@/components/ui";
import { ttsProviderOptions } from "./options";
import { TtsAzureSettings } from "./TtsAzureSettings";
import { TtsElevenSettings } from "./TtsElevenSettings";
import { TtsGeminiSettings } from "./TtsGeminiSettings";
import styles from "./settingsStyles.module.css";

export function TtsTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>语音朗读</div>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>TTS 提供商</span>
        <SegmentedControl
          value={settings.ttsProvider}
          options={ttsProviderOptions}
          onChange={(value) => updateSettings({ ttsProvider: value })}
        />
      </div>

      {settings.ttsProvider === "azure" ? (
        <TtsAzureSettings />
      ) : settings.ttsProvider === "elevenlabs" ? (
        <TtsElevenSettings />
      ) : (
        <TtsGeminiSettings />
      )}

      <SwitchField
        label="自动播放下一段"
        checked={settings.autoPlayNext}
        onChange={(checked) => updateSettings({ autoPlayNext: checked })}
      />

      {settings.ttsProvider === "elevenlabs" ? (
        <SwitchField
          label="单词同步高亮"
          checked={settings.elevenWordSyncHighlight}
          onChange={(checked) =>
            updateSettings({ elevenWordSyncHighlight: checked })
          }
        />
      ) : null}

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>并发生成上限</label>
        <input
          type="number"
          min={1}
          className={styles.apiKeyInput}
          value={settings.ttsConcurrency}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            updateSettings({
              ttsConcurrency: Number.isNaN(parsed)
                ? 1
                : Math.max(1, Math.min(8, parsed)),
            });
          }}
        />
        <p className={styles.apiKeyHint}>
          每批请求会并行发送至多该数量的段落音频，完成后再继续下一批；并发越高越易触发配额限制。
        </p>
      </div>
    </section>
  );
}
