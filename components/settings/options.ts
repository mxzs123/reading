import type {
  ApplyTextNormalization,
  AzureTTSVoice,
  BoldRatio,
  ElevenOutputFormat,
  GeminiTTSModel,
  PageWidthMode,
  ReadingMode,
  TextAlign,
  Theme,
  TTSProvider,
} from "@/lib/settings";

export const readingModeOptions = [
  { value: "pure", label: "纯净阅读" },
  { value: "audio", label: "音频播放" },
] as const satisfies readonly { value: ReadingMode; label: string }[];

export const boldOptions = [
  { value: "off", label: "关闭" },
  { value: "low", label: "低 " },
  { value: "medium", label: "中 " },
  { value: "high", label: "高 " },
  { value: "custom", label: "自定义" },
] as const satisfies readonly { value: BoldRatio; label: string }[];

export const themeOptions = [
  { value: "sepia", label: "米色" },
  { value: "white", label: "纯白" },
  { value: "dark", label: "深色" },
  { value: "oled", label: "纯黑" },
] as const satisfies readonly { value: Theme; label: string }[];

export const alignOptions = [
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" },
  { value: "justify", label: "两端对齐" },
] as const satisfies readonly { value: TextAlign; label: string }[];

export const widthModeOptions = [
  { value: "px", label: "固定像素" },
  { value: "vw", label: "视口百分比" },
  { value: "ch", label: "按字符数" },
] as const satisfies readonly { value: PageWidthMode; label: string }[];

export const azureVoiceOptions = [
  { value: "en-US-Ava:DragonHDLatestNeural", label: "Ava Dragon HD (女声)" },
  { value: "en-US-JennyNeural", label: "Jenny (女声)" },
  { value: "en-US-GuyNeural", label: "Guy (男声)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (英式女声)" },
] as const satisfies readonly { value: AzureTTSVoice; label: string }[];

export const ttsProviderOptions = [
  { value: "azure", label: "Azure Speech" },
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "gemini", label: "Google Gemini" },
] as const satisfies readonly { value: TTSProvider; label: string }[];

export const geminiModelOptions = [
  { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS（低延迟）" },
  { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS（高质量）" },
] as const satisfies readonly { value: GeminiTTSModel; label: string }[];

export const elevenModelOptions = [
  { value: "eleven_v3", label: "Eleven v3（高质量，适合情感/长文本）" },
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5（高质量均衡）" },
  { value: "eleven_flash_v2_5", label: "Flash v2.5（低延迟）" },
  { value: "eleven_multilingual_v2", label: "Multilingual v2（多语种高质量）" },
] as const;

export const elevenOutputFormatOptions = [
  { value: "mp3_44100_128", label: "MP3 44.1kHz 128kbps" },
  { value: "mp3_44100_192", label: "MP3 44.1kHz 192kbps" },
  { value: "mp3_24000_48", label: "MP3 24kHz 48kbps" },
  { value: "opus_48000_128", label: "Opus 48kHz 128kbps" },
  { value: "pcm_24000", label: "PCM 24kHz" },
  { value: "ulaw_8000", label: "μ-law 8kHz（Twilio 常用）" },
] as const satisfies readonly { value: ElevenOutputFormat; label: string }[];

export const textNormalizationOptions = [
  { value: "auto", label: "自动" },
  { value: "on", label: "开启" },
  { value: "off", label: "关闭" },
] as const satisfies readonly { value: ApplyTextNormalization; label: string }[];

export const latencyOptions = [
  { value: "", label: "默认" },
  { value: 0, label: "0 - 无优化" },
  { value: 1, label: "1 - 低延迟优化" },
  { value: 2, label: "2 - 中等优化" },
  { value: 3, label: "3 - 强化优化" },
  { value: 4, label: "4 - 最低延迟（关闭正则化）" },
] as const satisfies readonly { value: number | ""; label: string }[];

export const fontFamilies = [
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
] as const;
