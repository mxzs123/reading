"use client";

import { useSettings } from "@/contexts/SettingsContext";
import type { EdgeTTSVoice } from "@/lib/settings";
import { RangeField } from "@/components/ui";
import { edgeVoiceOptions } from "./options";
import styles from "./settingsStyles.module.css";

export function TtsEdgeSettings() {
  const { settings, updateSettings } = useSettings();

  return (
    <>
      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>朗读声音</label>
        <select
          className={styles.select}
          value={settings.edgeVoice}
          onChange={(e) =>
            updateSettings({ edgeVoice: e.target.value as EdgeTTSVoice })
          }
        >
          {edgeVoiceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.apiKeyHint}>
          Edge Read Aloud 档位走浏览器朗读服务，无需 API Key，默认使用 Emma。
        </p>
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>高级参数</summary>
        <div className={styles.detailsBody}>
          <div className={styles.grid2}>
            <RangeField
              label="语速"
              value={settings.edgeRate}
              min={0.6}
              max={1.8}
              step={0.05}
              onChange={(value) => updateSettings({ edgeRate: value })}
            />
            <RangeField
              label="音高"
              value={settings.edgePitch}
              min={-50}
              max={50}
              step={5}
              unit="Hz"
              onChange={(value) => updateSettings({ edgePitch: value })}
            />
          </div>
        </div>
      </details>
    </>
  );
}
