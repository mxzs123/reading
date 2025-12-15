"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import {
  type ApplyTextNormalization,
  type AzureTTSVoice,
  type ElevenOutputFormat,
  type TTSProvider,
} from "@/lib/settings";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArticlesCleared?: () => void;
}

const boldOptions = [
  { value: "off" as const, label: "关闭" },
  { value: "low" as const, label: "低 " },
  { value: "medium" as const, label: "中 " },
  { value: "high" as const, label: "高 " },
  { value: "custom" as const, label: "自定义" },
];

const themeOptions = [
  { value: "sepia" as const, label: "米色" },
  { value: "white" as const, label: "纯白" },
  { value: "dark" as const, label: "深色" },
  { value: "oled" as const, label: "纯黑" },
];

const alignOptions = [
  { value: "left" as const, label: "左对齐" },
  { value: "center" as const, label: "居中" },
  { value: "right" as const, label: "右对齐" },
  { value: "justify" as const, label: "两端对齐" },
];

const widthModeOptions = [
  { value: "px" as const, label: "固定像素" },
  { value: "vw" as const, label: "视口百分比" },
  { value: "ch" as const, label: "按字符数" },
];

const azureVoiceOptions: { value: AzureTTSVoice; label: string }[] = [
  { value: "en-US-Ava:DragonHDLatestNeural", label: "Ava Dragon HD (女声)" },
  { value: "en-US-JennyNeural", label: "Jenny (女声)" },
  { value: "en-US-GuyNeural", label: "Guy (男声)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (英式女声)" },
];

const ttsProviderOptions: { value: TTSProvider; label: string }[] = [
  { value: "azure", label: "Azure Speech" },
  { value: "elevenlabs", label: "ElevenLabs" },
];

const elevenModelOptions = [
  { value: "eleven_v3", label: "Eleven v3（高质量，适合情感/长文本）" },
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5（高质量均衡）" },
  { value: "eleven_flash_v2_5", label: "Flash v2.5（低延迟）" },
  { value: "eleven_multilingual_v2", label: "Multilingual v2（多语种高质量）" },
];

const elevenOutputFormatOptions: { value: ElevenOutputFormat; label: string }[] = [
  { value: "mp3_44100_128", label: "MP3 44.1kHz 128kbps" },
  { value: "mp3_44100_192", label: "MP3 44.1kHz 192kbps" },
  { value: "mp3_24000_48", label: "MP3 24kHz 48kbps" },
  { value: "opus_48000_128", label: "Opus 48kHz 128kbps" },
  { value: "pcm_24000", label: "PCM 24kHz" },
  { value: "ulaw_8000", label: "μ-law 8kHz（Twilio 常用）" },
];

const textNormalizationOptions: { value: ApplyTextNormalization; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "on", label: "开启" },
  { value: "off", label: "关闭" },
];

const latencyOptions: { value: number | ""; label: string }[] = [
  { value: "", label: "默认" },
  { value: 0, label: "0 - 无优化" },
  { value: 1, label: "1 - 低延迟优化" },
  { value: 2, label: "2 - 中等优化" },
  { value: 3, label: "3 - 强化优化" },
  { value: 4, label: "4 - 最低延迟（关闭正则化）" },
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

export function SettingsPanel({ isOpen, onClose, onArticlesCleared }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings, hydrated } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showElevenApiKey, setShowElevenApiKey] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleClearAllArticles = async () => {
    if (!confirm("确定要删除所有文章吗？此操作不可恢复！")) {
      return;
    }
    setIsClearing(true);
    try {
      const response = await fetch("/api/articles", { method: "DELETE" });
      if (response.ok) {
        const data = await response.json();
        alert(`已删除 ${data.deleted} 篇文章`);
        onArticlesCleared?.();
      } else {
        alert("删除失败，请重试");
      }
    } catch {
      alert("删除失败，请重试");
    } finally {
      setIsClearing(false);
    }
  };

  const fontFamilyOptions = useMemo(() => fontFamilies, []);
  const widthMode = settings.pageWidthMode ?? "px";
  const approxCharsPerLine = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!hydrated) return null;

    const mode = settings.pageWidthMode ?? "px";

    if (mode === "ch") {
      return Math.round(settings.pageWidthCh);
    }

    const viewportWidth = window.innerWidth || 0;
    const availableWidth =
      mode === "vw"
        ? viewportWidth * (Math.min(Math.max(settings.pageWidthVw, 60), 96) / 100)
        : isMobile
          ? Math.min(viewportWidth * 0.96, settings.pageWidth)
          : settings.pageWidth;

    const charWidth =
      settings.fontSize * Math.max(0.46, 0.54 + settings.letterSpacing);

    if (
      !Number.isFinite(availableWidth) ||
      !Number.isFinite(charWidth) ||
      charWidth <= 0
    ) {
      return null;
    }
    return Math.max(8, Math.round(availableWidth / charWidth));
  }, [
    hydrated,
    isMobile,
    settings.fontSize,
    settings.letterSpacing,
    settings.pageWidth,
    settings.pageWidthMode,
    settings.pageWidthVw,
    settings.pageWidthCh,
  ]);

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
                min={14}
                max={30}
                step={0.25}
                onChange={(value) => updateSettings({ fontSize: value })}
              />
              <RangeField
                label="行高"
                value={settings.lineHeight}
                min={1.2}
                max={2.4}
                step={0.02}
                onChange={(value) => updateSettings({ lineHeight: value })}
              />
              <RangeField
                label="字间距"
                value={settings.letterSpacing}
                unit="em"
                min={-0.05}
                max={0.12}
                step={0.002}
                onChange={(value) => updateSettings({ letterSpacing: value })}
              />
              <RangeField
                label="段落间距"
                value={settings.paragraphSpacing}
                unit="em"
                min={0.4}
                max={2}
                step={0.05}
                onChange={(value) => updateSettings({ paragraphSpacing: value })}
              />
              <RangeField
                label="正文字重"
                value={settings.bodyFontWeight}
                min={350}
                max={800}
                step={25}
                onChange={(value) => updateSettings({ bodyFontWeight: value })}
              />
              <RangeField
                label="首行缩进"
                value={settings.textIndent}
                unit="em"
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => updateSettings({ textIndent: value })}
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
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>宽度模式</span>
              <div className={styles.segmentedControl}>
                {widthModeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.segmentButton} ${
                      widthMode === option.value ? styles.segmentActive : ""
                    }`}
                    onClick={() => updateSettings({ pageWidthMode: option.value })}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.grid2}>
              {widthMode === "vw" ? (
                <RangeField
                  label="内容宽度"
                  value={settings.pageWidthVw}
                  unit="vw"
                  min={60}
                  max={96}
                  step={1}
                  onChange={(value) => updateSettings({ pageWidthVw: value })}
                />
              ) : widthMode === "ch" ? (
                <RangeField
                  label="内容宽度"
                  value={settings.pageWidthCh}
                  unit="ch"
                  min={40}
                  max={120}
                  step={1}
                  onChange={(value) => updateSettings({ pageWidthCh: value })}
                />
              ) : (
                <RangeField
                  label="内容宽度"
                  value={settings.pageWidth}
                  unit="px"
                  min={400}
                  max={1200}
                  step={10}
                  onChange={(value) => updateSettings({ pageWidth: value })}
                />
              )}
              <RangeField
                label="页边距"
                value={settings.readingPadding}
                unit="px"
                min={8}
                max={120}
                step={2}
                onChange={(value) => updateSettings({ readingPadding: value })}
              />
            </div>
            <p className={styles.apiKeyHint}>
              {approxCharsPerLine
                ? `估算约 ${approxCharsPerLine} 字/行；移动端自动收紧以避免超宽。`
                : "移动端自动收紧以避免超宽。"}
            </p>
          </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>语音朗读</div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>TTS 提供商</span>
            <div className={styles.segmentedControl}>
              {ttsProviderOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.segmentButton} ${
                    settings.ttsProvider === option.value ? styles.segmentActive : ""
                  }`}
                  onClick={() => updateSettings({ ttsProvider: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {settings.ttsProvider === "azure" ? (
            <>
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
            </>
          ) : (
            <>
              <div className={styles.fieldColumn}>
                <label className={styles.fieldLabel}>ElevenLabs API Key</label>
                <div className={styles.apiKeyWrapper}>
                  <input
                    type={showElevenApiKey ? "text" : "password"}
                    className={styles.apiKeyInput}
                    value={settings.elevenApiKey}
                    onChange={(e) => updateSettings({ elevenApiKey: e.target.value })}
                    placeholder="xi-api-key"
                  />
                  <button
                    type="button"
                    className={styles.apiKeyToggle}
                    onClick={() => setShowElevenApiKey(!showElevenApiKey)}
                  >
                    {showElevenApiKey ? "隐藏" : "显示"}
                  </button>
                </div>
                <p className={styles.apiKeyHint}>
                  在{" "}
                  <a href="https://elevenlabs.io/app" target="_blank" rel="noopener noreferrer">
                    ElevenLabs 控制台
                  </a>{" "}
                  获取 API Key。建议使用静态密钥。
                </p>
              </div>

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

              <label className={styles.switchLabel}>
                <span className={styles.fieldLabel}>Speaker Boost</span>
                <input
                  type="checkbox"
                  hidden
                  checked={settings.elevenUseSpeakerBoost}
                  onChange={(e) => updateSettings({ elevenUseSpeakerBoost: e.target.checked })}
                />
                <span className={styles.switchSlider}></span>
              </label>

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
                        elevenSeed: val === "" || Number.isNaN(parsed) ? null : Math.max(0, parsed),
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
                        elevenApplyTextNormalization: e.target.value as ApplyTextNormalization,
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
                <label className={styles.switchLabel}>
                  <span className={styles.fieldLabel}>启用日志 (enable_logging)</span>
                  <input
                    type="checkbox"
                    hidden
                    checked={settings.elevenEnableLogging}
                    onChange={(e) => updateSettings({ elevenEnableLogging: e.target.checked })}
                  />
                  <span className={styles.switchSlider}></span>
                </label>

                <div className={styles.fieldColumn}>
                  <label className={styles.fieldLabel}>流式延迟优化</label>
                  <select
                    className={styles.select}
                    value={settings.elevenOptimizeStreamingLatency ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateSettings({
                        elevenOptimizeStreamingLatency:
                          val === "" ? null : Math.max(0, Math.min(4, Number(val))),
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
            </>
          )}

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
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={resetSettings}>
            恢复默认设置
          </button>
          <button
            className={styles.dangerButton}
            onClick={handleClearAllArticles}
            disabled={isClearing}
          >
            {isClearing ? "删除中..." : "清除所有文章"}
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
