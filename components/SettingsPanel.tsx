"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import {
  type ApplyTextNormalization,
  type AzureTTSVoice,
  type ElevenOutputFormat,
  type GeminiTTSModel,
} from "@/lib/settings";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  alignOptions,
  azureVoiceOptions,
  boldOptions,
  elevenModelOptions,
  elevenOutputFormatOptions,
  fontFamilies,
  geminiModelOptions,
  latencyOptions,
  readingModeOptions,
  textNormalizationOptions,
  themeOptions,
  ttsProviderOptions,
  widthModeOptions,
} from "@/components/settings/options";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArticlesCleared?: () => void;
}

type SettingsTab = "reading" | "typography" | "layout" | "tts";

export function SettingsPanel({ isOpen, onClose, onArticlesCleared }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings, hydrated } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showElevenApiKey, setShowElevenApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [viewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth || 0 : 0
  );

  const canConfigureTts = settings.readingMode === "audio";
  const [activeTab, setActiveTab] = useState<SettingsTab>("reading");

  const tabOptions = useMemo<ReadonlyArray<SegmentedOption<SettingsTab>>>(
    () => {
      const base: ReadonlyArray<SegmentedOption<SettingsTab>> = [
        { value: "reading", label: "阅读" },
        { value: "typography", label: "排版" },
        { value: "layout", label: "布局" },
      ];

      return canConfigureTts
        ? [...base, { value: "tts", label: "朗读" }]
        : base;
    },
    [canConfigureTts]
  );

  useEffect(() => {
    if (!canConfigureTts && activeTab === "tts") {
      setActiveTab("reading");
    }
  }, [activeTab, canConfigureTts]);

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

  const widthMode = settings.pageWidthMode ?? "px";

  const approxCharsPerLine = useMemo(() => {
    if (typeof window === "undefined" || !hydrated) return null;

    const mode = settings.pageWidthMode ?? "px";

    if (mode === "ch") {
      return Math.round(settings.pageWidthCh);
    }

    let availableWidth: number;
    if (mode === "vw") {
      const vw = Math.min(Math.max(settings.pageWidthVw, 60), 96) / 100;
      availableWidth = viewportWidth * vw;
    } else if (isMobile) {
      availableWidth = Math.min(viewportWidth * 0.94, settings.pageWidth);
    } else {
      availableWidth = settings.pageWidth;
    }

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
    viewportWidth,
    isMobile,
    settings.fontSize,
    settings.letterSpacing,
    settings.pageWidth,
    settings.pageWidthMode,
    settings.pageWidthVw,
    settings.pageWidthCh,
  ]);

  let pageWidthControl: JSX.Element;
  if (widthMode === "vw") {
    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidthVw}
        unit="vw"
        min={60}
        max={96}
        step={1}
        onChange={(value) => updateSettings({ pageWidthVw: value })}
      />
    );
  } else if (widthMode === "ch") {
    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidthCh}
        unit="ch"
        min={40}
        max={120}
        step={1}
        onChange={(value) => updateSettings({ pageWidthCh: value })}
      />
    );
  } else {
    const pageWidthMin = isMobile ? 260 : 400;
    const pageWidthMax = isMobile
      ? Math.max(pageWidthMin, Math.round(viewportWidth * 0.94) || 420)
      : 1200;

    pageWidthControl = (
      <RangeField
        label="内容宽度"
        value={settings.pageWidth}
        unit="px"
        min={pageWidthMin}
        max={pageWidthMax}
        step={isMobile ? 2 : 10}
        onChange={(value) => updateSettings({ pageWidth: value })}
      />
    );
  }

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

        <div className={styles.tabs}>
          <SegmentedControl
            value={activeTab}
            options={tabOptions}
            onChange={setActiveTab}
            layout="tabs"
          />
        </div>

        <div className={styles.scrollContent}>
          <div hidden={activeTab !== "reading"} className={styles.tabContent}>
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
                      setActiveTab("tts");
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
          </div>

          <div hidden={activeTab !== "typography"} className={styles.tabContent}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>字体与排版</div>

              <div className={styles.fieldColumn}>
                <label className={styles.fieldLabel}>字体</label>
                <select
                  className={styles.select}
                  value={settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                >
                  {fontFamilies.map((option) => (
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
                  label="段落间距"
                  value={settings.paragraphSpacing}
                  unit="em"
                  min={0.4}
                  max={2}
                  step={0.05}
                  onChange={(value) => updateSettings({ paragraphSpacing: value })}
                />
              </div>

              <details className={styles.details}>
                <summary className={styles.detailsSummary}>高级排版</summary>
                <div className={styles.detailsBody}>
                  <div className={styles.grid2}>
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
                    <SegmentedControl
                      value={settings.textAlign}
                      options={alignOptions}
                      onChange={(value) => updateSettings({ textAlign: value })}
                    />
                  </div>
                </div>
              </details>
            </section>
          </div>

          <div hidden={activeTab !== "layout"} className={styles.tabContent}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>页面布局</div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>宽度模式</span>
                <SegmentedControl
                  value={widthMode}
                  options={widthModeOptions}
                  onChange={(value) => updateSettings({ pageWidthMode: value })}
                />
              </div>

              <div className={styles.grid2}>
                {pageWidthControl}
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
                  ? `估算约 ${approxCharsPerLine} 字/行；窄屏下会受屏宽限制。`
                  : "窄屏下会受屏宽限制。"}
              </p>
            </section>
          </div>

          {canConfigureTts ? (
            <div hidden={activeTab !== "tts"} className={styles.tabContent}>
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
          ) : settings.ttsProvider === "elevenlabs" ? (
            <>
              <SecretTextField
                label="ElevenLabs API Key"
                value={settings.elevenApiKey}
                placeholder="xi-api-key"
                visible={showElevenApiKey}
                onToggleVisible={() => setShowElevenApiKey((prev) => !prev)}
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
          ) : (
            <>
              <SecretTextField
                label="Gemini API Key"
                value={settings.geminiApiKey}
                placeholder="输入您的 API Key"
                visible={showGeminiApiKey}
                onToggleVisible={() => setShowGeminiApiKey((prev) => !prev)}
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
            </div>
          ) : null}
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

type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
};

function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  layout = "auto",
}: {
  value: TValue;
  options: ReadonlyArray<SegmentedOption<TValue>>;
  onChange: (value: TValue) => void;
  layout?: "auto" | "tabs";
}) {
  const columns = useMemo(() => {
    if (layout === "tabs") return Math.min(4, Math.max(1, options.length));

    const count = options.length;
    if (count <= 1) return 1;
    if (count === 4) return 2;
    if (count === 5) return 3;
    return Math.min(3, count);
  }, [layout, options.length]);

  return (
    <div className={styles.segmentedControl} data-columns={columns}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`${styles.segmentButton} ${
            value === option.value ? styles.segmentActive : ""
          }`}
          onClick={() => onChange(option.value)}
          type="button"
          title={option.label}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SwitchField({
  label,
  checked,
  disabled,
  title,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (checked: boolean) => void;
}) {
  const isDisabled = Boolean(disabled);

  return (
    <label
      className={`${styles.switchLabel} ${
        isDisabled ? styles.switchLabelDisabled : ""
      }`}
      aria-disabled={isDisabled ? true : undefined}
      title={title}
    >
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="checkbox"
        hidden
        checked={checked}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.switchSlider}></span>
    </label>
  );
}

function SecretTextField({
  label,
  value,
  placeholder,
  visible,
  onToggleVisible,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  placeholder?: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
  hint?: ReactNode;
}) {
  return (
    <div className={styles.fieldColumn}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.apiKeyWrapper}>
        <input
          type={visible ? "text" : "password"}
          className={styles.apiKeyInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={styles.apiKeyToggle}
          onClick={onToggleVisible}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
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
