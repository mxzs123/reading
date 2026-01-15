"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import type { GeminiTTSModel } from "@/lib/settings";
import { SecretTextField, SwitchField } from "@/components/ui";
import { geminiModelOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsGeminiSettings() {
  const { settings, updateSettings } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="Gemini API Key"
        value={settings.geminiApiKey}
        placeholder="输入您的 API Key"
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ geminiApiKey: value })}
        hint={
          <>
            在{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>{" "}
            创建 API Key（请勿提交到仓库）。
          </>
        }
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>模型</label>
          <select
            className={styles.select}
            value={settings.geminiModel}
            onChange={(e) =>
              updateSettings({ geminiModel: e.target.value as GeminiTTSModel })
            }
          >
            {geminiModelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>音色（voiceName）</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.geminiVoiceName}
            onChange={(e) => updateSettings({ geminiVoiceName: e.target.value })}
            placeholder="例如 Kore / Puck"
          />
          <p className={styles.apiKeyHint}>示例音色：Kore、Puck。</p>
        </div>
      </div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>输出语言（languageCode，可选）</label>
        <input
          type="text"
          className={styles.apiKeyInput}
          value={settings.geminiLanguageCode}
          onChange={(e) => updateSettings({ geminiLanguageCode: e.target.value })}
          placeholder="BCP-47，例如 en-US"
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>高级：风格与多角色</summary>
        <div className={styles.detailsBody}>
          <div className={styles.fieldColumn}>
            <label className={styles.fieldLabel}>风格提示词（Style Prompt，可选）</label>
            <textarea
              className={styles.apiKeyInput}
              value={settings.geminiStylePrompt}
              onChange={(e) =>
                updateSettings({ geminiStylePrompt: e.target.value })
              }
              placeholder={`例如：Say in a spooky whisper:\n或：Say cheerfully: {{text}}`}
              rows={4}
            />
            <p className={styles.apiKeyHint}>
              Gemini 官方通过自然语言提示词控制语气/情绪/口音/语速；未填写则直接朗读原文。
              支持使用 {"{{text}}"} 作为占位符。
            </p>
          </div>

          <SwitchField
            label="多角色朗读（最多 2 人）"
            checked={settings.geminiUseMultiSpeaker}
            onChange={(checked) =>
              updateSettings({ geminiUseMultiSpeaker: checked })
            }
          />

          {settings.geminiUseMultiSpeaker ? (
            <>
              <div className={styles.grid2}>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>角色 1 名称</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker1Name}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker1Name: e.target.value,
                      })
                    }
                    placeholder="例如 Speaker1 / Joe"
                  />
                </div>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>角色 1 音色（voiceName）</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker1VoiceName}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker1VoiceName: e.target.value,
                      })
                    }
                    placeholder="例如 Kore"
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>角色 2 名称</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker2Name}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker2Name: e.target.value,
                      })
                    }
                    placeholder="例如 Speaker2 / Jane"
                  />
                </div>
                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>角色 2 音色（voiceName）</label>
                  <input
                    type="text"
                    className={styles.apiKeyInput}
                    value={settings.geminiSpeaker2VoiceName}
                    onChange={(e) =>
                      updateSettings({
                        geminiSpeaker2VoiceName: e.target.value,
                      })
                    }
                    placeholder="例如 Puck"
                  />
                </div>
              </div>

              <p className={styles.apiKeyHint}>
                文本需包含与上方名称一致的对话行，例如：
                {settings.geminiSpeaker1Name || "Speaker1"}: ...。
              </p>
            </>
          ) : null}
        </div>
      </details>
    </>
  );
}
