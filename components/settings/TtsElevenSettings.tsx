"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import type { ApplyTextNormalization, ElevenOutputFormat } from "@/lib/settings";
import { SecretTextField, RangeField, SwitchField } from "@/components/ui";
import {
  elevenModelOptions,
  elevenOutputFormatOptions,
  textNormalizationOptions,
  latencyOptions,
} from "./options";
import styles from "./settingsStyles.module.css";

export function TtsElevenSettings() {
  const { settings, updateSettings } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <>
      <SecretTextField
        label="ElevenLabs API Key"
        value={settings.elevenApiKey}
        placeholder="xi-api-key"
        visible={showApiKey}
        onToggleVisible={() => setShowApiKey((prev) => !prev)}
        onChange={(value) => updateSettings({ elevenApiKey: value })}
        hint={
          <>
            在{" "}
            <a
              href="https://elevenlabs.io/app"
              target="_blank"
              rel="noopener noreferrer"
            >
              ElevenLabs 控制台
            </a>{" "}
            获取 API Key。建议使用静态密钥。
          </>
        }
      />

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>Voice ID</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.elevenVoiceId}
            onChange={(e) => updateSettings({ elevenVoiceId: e.target.value })}
            placeholder="如 Bella: EXAVITQu4vr4xnSDxMaL"
          />
          <p className={styles.apiKeyHint}>
            推荐女声：Bella (EXAVITQu4vr4xnSDxMaL)、Rachel (21m00Tcm4TlvDq8ikWAM)。
            可在 ElevenLabs 控制台 Voice Library 按 Female / 高质量筛选更多。
          </p>
        </div>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>模型</label>
          <select
            className={styles.select}
            value={settings.elevenModelId}
            onChange={(e) => updateSettings({ elevenModelId: e.target.value })}
          >
            {elevenModelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>输出格式</label>
          <select
            className={styles.select}
            value={settings.elevenOutputFormat}
            onChange={(e) =>
              updateSettings({
                elevenOutputFormat: e.target.value as ElevenOutputFormat,
              })
            }
          >
            {elevenOutputFormatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldColumn}>
          <label className={styles.fieldLabel}>语言代码 (ISO 639-1)</label>
          <input
            type="text"
            className={styles.apiKeyInput}
            value={settings.elevenLanguageCode}
            onChange={(e) => updateSettings({ elevenLanguageCode: e.target.value })}
            placeholder="en / zh / ja ..."
          />
        </div>
      </div>

      <div className={styles.grid2}>
        <RangeField
          label="稳定性"
          value={settings.elevenStability}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => updateSettings({ elevenStability: value })}
        />
        <RangeField
          label="相似度增强"
          value={settings.elevenSimilarityBoost}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => updateSettings({ elevenSimilarityBoost: value })}
        />
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>高级参数</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label="风格 (Style)"
              value={settings.elevenStyle}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateSettings({ elevenStyle: value })}
            />
            <RangeField
              label="语速 (Speed)"
              value={settings.elevenSpeed}
              min={0.5}
              max={2}
              step={0.05}
              onChange={(value) => updateSettings({ elevenSpeed: value })}
            />
          </div>

          <SwitchField
            label="Speaker Boost"
            checked={settings.elevenUseSpeakerBoost}
            onChange={(checked) =>
              updateSettings({ elevenUseSpeakerBoost: checked })
            }
          />

          <div className={styles.grid2}>
            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>Seed (可选)</label>
              <input
                type="number"
                className={styles.apiKeyInput}
                value={settings.elevenSeed ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = parseInt(val, 10);
                  updateSettings({
                    elevenSeed:
                      val === "" || Number.isNaN(parsed)
                        ? null
                        : Math.max(0, parsed),
                  });
                }}
                placeholder="留空则随机"
              />
            </div>
            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>文本正则化</label>
              <select
                className={styles.select}
                value={settings.elevenApplyTextNormalization}
                onChange={(e) =>
                  updateSettings({
                    elevenApplyTextNormalization:
                      e.target.value as ApplyTextNormalization,
                  })
                }
              >
                {textNormalizationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.grid2}>
            <SwitchField
              label="启用日志 (enable_logging)"
              checked={settings.elevenEnableLogging}
              onChange={(checked) =>
                updateSettings({ elevenEnableLogging: checked })
              }
            />

            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>流式延迟优化</label>
              <select
                className={styles.select}
                value={settings.elevenOptimizeStreamingLatency ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateSettings({
                    elevenOptimizeStreamingLatency:
                      val === ""
                        ? null
                        : Math.max(0, Math.min(4, Number(val))),
                  });
                }}
              >
                {latencyOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
