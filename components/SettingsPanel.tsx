"use client";

import { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const boldOptions = [
  { value: "low" as const, label: "低" },
  { value: "medium" as const, label: "标准" },
  { value: "high" as const, label: "高" },
];

const themeOptions = [
  { value: "sepia" as const, label: "米色" },
  { value: "white" as const, label: "纯白" },
  { value: "dark" as const, label: "深色" },
];

const alignOptions = [
  { value: "left" as const, label: "左对齐" },
  { value: "justify" as const, label: "两端对齐" },
  { value: "center" as const, label: "居中" },
];

const fontFamilies = [
  {
    value: "Charter, 'Bitstream Charter', Georgia, serif",
    label: "Charter (衬线)",
  },
  {
    value:
      "'Source Han Serif SC', 'Songti SC', 'Noto Serif SC', serif",
    label: "思源宋体",
  },
  {
    value:
      "'Source Han Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    label: "思源黑体",
  },
  {
    value: "'LXGW WenKai', 'STKaiti', 'Kaiti SC', serif",
    label: "霞鹜文楷",
  },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings } = useSettings();

  const fontFamilyOptions = useMemo(() => fontFamilies, []);

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`${styles.panel} surface-card ${
          isOpen ? styles.panelOpen : ""
        }`}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>阅读设置</h2>
            <p className="muted-text">即刻调整最舒适的阅读体验</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            关闭
          </button>
        </header>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>阅读模式</div>
          <div className={styles.fieldRow}>
            <label className={styles.switchLabel}>
              <span>仿生阅读</span>
              <input
                type="checkbox"
                checked={settings.enableBionic}
                onChange={(e) =>
                  updateSettings({ enableBionic: e.target.checked })
                }
              />
              <span className={styles.switchSlider} />
            </label>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>加粗强度</span>
            <div className={styles.segmentedControl}>
              {boldOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.segmentButton} ${
                    settings.boldRatio === option.value
                      ? styles.segmentActive
                      : ""
                  }`}
                  onClick={() => updateSettings({ boldRatio: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>主题</span>
            <div className={styles.segmentedControl}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.segmentButton} ${
                    settings.theme === option.value
                      ? styles.segmentActive
                      : ""
                  }`}
                  onClick={() => updateSettings({ theme: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>排版参数</div>

          <RangeField
            label="字号"
            value={settings.fontSize}
            unit="px"
            min={16}
            max={36}
            step={1}
            onChange={(value) => updateSettings({ fontSize: value })}
          />

          <RangeField
            label="行高"
            value={settings.lineHeight}
            min={1.2}
            max={3}
            step={0.1}
            onChange={(value) => updateSettings({ lineHeight: value })}
          />

          <RangeField
            label="段落间距"
            value={settings.paragraphSpacing}
            min={0.8}
            max={3}
            step={0.1}
            onChange={(value) => updateSettings({ paragraphSpacing: value })}
          />

          <RangeField
            label="页面宽度"
            value={settings.pageWidth}
            unit="px"
            min={600}
            max={1200}
            step={10}
            onChange={(value) => updateSettings({ pageWidth: value })}
          />

          <RangeField
            label="页边距"
            value={settings.readingPadding}
            unit="px"
            min={20}
            max={120}
            step={5}
            onChange={(value) => updateSettings({ readingPadding: value })}
          />

          <div className={styles.fieldColumn}>
            <label className={styles.fieldLabel} htmlFor="fontFamily">
              正文字体
            </label>
            <select
              id="fontFamily"
              className={styles.select}
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            >
              {fontFamilyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>对齐方式</span>
            <div className={styles.segmentedControl}>
              {alignOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.segmentButton} ${
                    settings.textAlign === option.value
                      ? styles.segmentActive
                      : ""
                  }`}
                  onClick={() => updateSettings({ textAlign: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={resetSettings}>
            恢复默认
          </button>
        </div>
      </aside>
    </>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: RangeFieldProps) {
  const displayValue = useMemo(() => {
    if (Number.isInteger(step)) {
      return Math.round(value);
    }
    return Number(value.toFixed(1));
  }, [step, value]);

  return (
    <div className={styles.fieldColumn}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>
          {displayValue}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={styles.rangeInput}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
