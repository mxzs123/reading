"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { SegmentedControl, RangeField } from "@/components/ui";
import { boldOptions, readingModeOptions, themeOptions } from "./options";
import styles from "./settingsStyles.module.css";

interface ReadingTabProps {
  onSwitchToTts?: () => void;
}

export function ReadingTab({ onSwitchToTts }: ReadingTabProps) {
  const { settings, updateSettings } = useSettings();

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>阅读模式</div>

        <div className={styles.fieldRow}>
          <SegmentedControl
            value={settings.readingMode}
            options={readingModeOptions}
            onChange={(value) => updateSettings({ readingMode: value })}
          />
          <p className={styles.apiKeyHint}>
            纯净阅读：仅支持单词查词；音频播放：点击段落可生成并播放音频。
          </p>

          {settings.readingMode === "pure" ? (
            <div className={styles.callout}>
              <p className={styles.calloutText}>
                纯净阅读不会生成段落音频；切换到「音频播放」后可配置朗读。
              </p>
              <button
                type="button"
                className={styles.calloutButton}
                onClick={() => {
                  updateSettings({ readingMode: "audio" });
                  onSwitchToTts?.();
                }}
              >
                切换到音频播放
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>显示外观</div>

        <div className={styles.fieldRow}>
          <SegmentedControl
            value={settings.theme}
            options={themeOptions}
            onChange={(value) => updateSettings({ theme: value })}
          />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>仿生强度</span>
          <SegmentedControl
            value={settings.boldRatio}
            options={boldOptions}
            onChange={(value) => updateSettings({ boldRatio: value })}
          />
          {settings.boldRatio === "custom" ? (
            <RangeField
              label="自定义比例"
              value={settings.customBoldRatio}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateSettings({ customBoldRatio: value })}
            />
          ) : null}
          <RangeField
            label="仿生加粗权重"
            value={settings.bionicWeight}
            min={500}
            max={800}
            step={25}
            onChange={(value) => updateSettings({ bionicWeight: value })}
          />
        </div>
      </section>
    </>
  );
}
