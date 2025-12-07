"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { type AzureTTSVoice } from "@/lib/settings";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const boldOptions = [
  { value: "off" as const, label: "关闭" },
  { value: "low" as const, label: "低 " },
  { value: "medium" as const, label: "中 " },
  { value: "high" as const, label: "高 " },
];

const themeOptions = [
  { value: "sepia" as const, label: "米色" },
  { value: "white" as const, label: "纯白" },
  { value: "dark" as const, label: "深色" },
];

const alignOptions = [
  { value: "left" as const, label: "左对齐" },
  { value: "justify" as const, label: "两端对齐" },
];

const azureVoiceOptions: { value: AzureTTSVoice; label: string }[] = [
  { value: "en-US-Ava:DragonHDLatestNeural", label: "Ava Dragon HD (女声)" },
  { value: "en-US-JennyNeural", label: "Jenny (女声)" },
  { value: "en-US-GuyNeural", label: "Guy (男声)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (英式女声)" },
];


const fontFamilies = [
  {
    value: "Georgia, 'Times New Roman', serif",
    label: "Georgia（衬线，推荐）",
  },
  {
    value: "'Times New Roman', Georgia, serif",
    label: "Times New Roman（衬线）",
  },
  {
    value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    label: "Palatino（衬线）",
  },
  {
    value: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    label: "Arial / Helvetica（无衬线）",
  },
  {
    value: "Verdana, Geneva, sans-serif",
    label: "Verdana（无衬线）",
  },
  {
    value: "Tahoma, Geneva, sans-serif",
    label: "Tahoma（无衬线）",
  },
  {
    value: "'Trebuchet MS', Helvetica, sans-serif",
    label: "Trebuchet MS（无衬线）",
  },
  {
    value: "'Courier New', Courier, monospace",
    label: "Courier New（等宽）",
  },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings, hydrated } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [approxCharsPerLine, setApproxCharsPerLine] = useState<number | null>(null);

  const fontFamilyOptions = useMemo(() => fontFamilies, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;
    const availableWidth = isMobile
      ? Math.min(window.innerWidth * 0.92, settings.pageWidth)
      : settings.pageWidth;
    const charWidth =
      settings.fontSize * Math.max(0.48, 0.55 + settings.letterSpacing);
    if (
      !Number.isFinite(availableWidth) ||
      !Number.isFinite(charWidth) ||
      charWidth <= 0
    ) {
      setApproxCharsPerLine(null);
      return;
    }
    setApproxCharsPerLine(Math.max(10, Math.round(availableWidth / charWidth)));
  }, [hydrated, isMobile, settings.fontSize, settings.letterSpacing, settings.pageWidth]);

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
            <p className="muted-text">定制您的专属阅读体验</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            关闭
          </button>
        </header>

        <div className={styles.scrollContent}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>显示外观</div>
            
            <div className={styles.fieldRow}>
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

            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>仿生强度</span>
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
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>排版样式</div>
            
            <div className={styles.fieldColumn}>
              <select
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

            <div className={styles.grid2}>
              <RangeField
                label="字号"
                value={settings.fontSize}
                unit="px"
                min={16}
                max={24}
                step={0.5}
                onChange={(value) => updateSettings({ fontSize: value })}
              />
              <RangeField
                label="行高"
                value={settings.lineHeight}
                min={1.45}
                max={1.85}
                step={0.05}
                onChange={(value) => updateSettings({ lineHeight: value })}
              />
              <RangeField
                label="字间距"
                value={settings.letterSpacing}
                unit="em"
                min={-0.02}
                max={0.06}
                step={0.005}
                onChange={(value) => updateSettings({ letterSpacing: value })}
              />
              <RangeField
                label="段落间距"
                value={settings.paragraphSpacing}
                unit="em"
                min={0.8}
                max={1.3}
                step={0.05}
                onChange={(value) => updateSettings({ paragraphSpacing: value })}
              />
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
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>页面布局</div>
            <div className={styles.grid2}>
              <RangeField
                label="内容宽度"
                value={settings.pageWidth}
                unit="px"
                min={560}
                max={840}
                step={10}
                onChange={(value) => updateSettings({ pageWidth: value })}
              />
              <RangeField
                label="页边距"
                value={settings.readingPadding}
                unit="px"
                min={16}
                max={80}
                step={4}
                onChange={(value) => updateSettings({ readingPadding: value })}
              />
            </div>
            <p className={styles.apiKeyHint}>
              {approxCharsPerLine
                ? `当前估算约 ${approxCharsPerLine} 字/行；移动端自动收紧至约 92vw。`
                : "移动端自动收紧至约 92vw。"}
            </p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>语音朗读 (Azure TTS)</div>

            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>Azure API Key</label>
              <div className={styles.apiKeyWrapper}>
                <input
                  type={showApiKey ? "text" : "password"}
                  className={styles.apiKeyInput}
                  value={settings.azureApiKey}
                  onChange={(e) => updateSettings({ azureApiKey: e.target.value })}
                  placeholder="输入您的 API Key"
                />
                <button
                  type="button"
                  className={styles.apiKeyToggle}
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? "隐藏" : "显示"}
                </button>
              </div>
              <p className={styles.apiKeyHint}>
                从{" "}
                <a
                  href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Azure Portal
                </a>{" "}
                创建语音服务获取 API Key
              </p>
            </div>

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

            <label className={styles.switchLabel}>
              <span className={styles.fieldLabel}>自动播放下一段</span>
              <input
                type="checkbox"
                hidden
                checked={settings.autoPlayNext}
                onChange={(e) => updateSettings({ autoPlayNext: e.target.checked })}
              />
              <span className={styles.switchSlider}></span>
            </label>

            <div className={styles.fieldColumn}>
              <label className={styles.fieldLabel}>并发生成上限</label>
              <input
                type="number"
                min={1}
                className={styles.apiKeyInput}
                value={settings.ttsConcurrency}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  updateSettings({ ttsConcurrency: Number.isNaN(parsed) ? 1 : Math.max(1, parsed) });
                }}
              />
              <p className={styles.apiKeyHint}>
                每批请求会并行发送至多该数量的段落音频，完成后再继续下一批；并发越高越易触发配额限制。
              </p>
            </div>

          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={resetSettings}>
            恢复默认设置
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
  const clampedValue = useMemo(
    () => Math.min(max, Math.max(min, value)),
    [max, min, value]
  );
  const displayValue = useMemo(() => {
    const numValue = Number(clampedValue);
    if (Math.abs(step) >= 1) {
      return Math.round(numValue);
    }
    // Check for small float precision issues
    return parseFloat(numValue.toFixed(2));
  }, [clampedValue, step]);

  return (
    <div className={styles.rangeContainer}>
      <div className={styles.rangeHeader}>
        <span className={styles.rangeLabel}>{label}</span>
        <span className={styles.rangeValue}>
          {displayValue}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedValue}
        className={styles.rangeInput}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
