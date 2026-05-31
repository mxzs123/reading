import type {
  ApplyTextNormalization,
  AzureTTSVoice,
  BoldRatio,
  DeepSeekModel,
  EdgeTTSVoice,
  ElevenOutputFormat,
  GeminiTTSModel,
  PageWidthMode,
  ReadingMode,
  TextAlign,
  Theme,
  TTSProvider,
} from "@/lib/settings";
import type { TFunction, TranslationKey } from "@/lib/i18n";

type LocalizedOption<TValue extends string | number> = {
  value: TValue;
  label: string;
  labelKey: TranslationKey;
};

export function translateOptions<TValue extends string | number>(
  options: ReadonlyArray<LocalizedOption<TValue>>,
  t: TFunction
): Array<{ value: TValue; label: string }> {
  return options.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
}

export const readingModeOptions = [
  { value: "pure", label: "纯净", labelKey: "options.readingMode.pure" },
  { value: "audio", label: "音频", labelKey: "options.readingMode.audio" },
] as const satisfies readonly LocalizedOption<ReadingMode>[];

export const boldOptions = [
  { value: "off", label: "关闭", labelKey: "options.bold.off" },
  { value: "low", label: "低", labelKey: "options.bold.low" },
  { value: "medium", label: "中", labelKey: "options.bold.medium" },
  { value: "high", label: "高", labelKey: "options.bold.high" },
  { value: "custom", label: "自定义", labelKey: "options.bold.custom" },
] as const satisfies readonly LocalizedOption<BoldRatio>[];

export const themeOptions = [
  { value: "sepia", label: "米色", labelKey: "options.theme.sepia" },
  { value: "white", label: "纯白", labelKey: "options.theme.white" },
  { value: "dark", label: "深色", labelKey: "options.theme.dark" },
  { value: "oled", label: "纯黑", labelKey: "options.theme.oled" },
] as const satisfies readonly LocalizedOption<Theme>[];

export const alignOptions = [
  { value: "left", label: "左", labelKey: "options.align.left" },
  { value: "center", label: "中", labelKey: "options.align.center" },
  { value: "right", label: "右", labelKey: "options.align.right" },
  { value: "justify", label: "两端", labelKey: "options.align.justify" },
] as const satisfies readonly LocalizedOption<TextAlign>[];

export const widthModeOptions = [
  { value: "px", label: "像素", labelKey: "options.width.px" },
  { value: "vw", label: "视口", labelKey: "options.width.vw" },
  { value: "ch", label: "字符", labelKey: "options.width.ch" },
] as const satisfies readonly LocalizedOption<PageWidthMode>[];

export const azureVoiceOptions = [
  { value: "en-US-Ava:DragonHDLatestNeural", label: "Ava Dragon HD (女声)", labelKey: "options.voice.avaDragon" },
  { value: "en-US-JennyNeural", label: "Jenny (女声)", labelKey: "options.voice.jenny" },
  { value: "en-US-GuyNeural", label: "Guy (男声)", labelKey: "options.voice.guy" },
  { value: "en-GB-SoniaNeural", label: "Sonia (英式女声)", labelKey: "options.voice.sonia" },
] as const satisfies readonly LocalizedOption<AzureTTSVoice>[];

export const edgeVoiceOptions = [
  { value: "en-US-EmmaMultilingualNeural", label: "Emma Multilingual (女声)", labelKey: "options.voice.emmaMulti" },
  { value: "en-US-AvaMultilingualNeural", label: "Ava Multilingual (女声)", labelKey: "options.voice.avaMulti" },
  { value: "en-US-JennyNeural", label: "Jenny (女声)", labelKey: "options.voice.jenny" },
  { value: "en-US-GuyNeural", label: "Guy (男声)", labelKey: "options.voice.guy" },
  { value: "en-GB-SoniaNeural", label: "Sonia (英式女声)", labelKey: "options.voice.sonia" },
] as const satisfies readonly LocalizedOption<EdgeTTSVoice>[];

export const ttsProviderOptions = [
  { value: "edge", label: "Edge 免费档", labelKey: "options.provider.edge" },
  { value: "azure", label: "Azure", labelKey: "options.provider.azure" },
  { value: "elevenlabs", label: "ElevenLabs", labelKey: "options.provider.elevenlabs" },
  { value: "gemini", label: "Gemini", labelKey: "options.provider.gemini" },
] as const satisfies readonly LocalizedOption<TTSProvider>[];

export const geminiModelOptions = [
  { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS（低延迟）", labelKey: "options.model.geminiFlash" },
  { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS（高质量）", labelKey: "options.model.geminiPro" },
] as const satisfies readonly LocalizedOption<GeminiTTSModel>[];

export const deepseekModelOptions = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
] as const satisfies readonly { value: DeepSeekModel; label: string }[];

export const elevenModelOptions = [
  { value: "eleven_v3", label: "Eleven v3（高质量，适合情感/长文本）", labelKey: "options.model.elevenV3" },
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5（高质量均衡）", labelKey: "options.model.elevenTurbo" },
  { value: "eleven_flash_v2_5", label: "Flash v2.5（低延迟）", labelKey: "options.model.elevenFlash" },
  { value: "eleven_multilingual_v2", label: "Multilingual v2（多语种高质量）", labelKey: "options.model.elevenMultilingual" },
] as const;

export const elevenOutputFormatOptions = [
  { value: "mp3_44100_128", label: "MP3 44.1kHz 128kbps", labelKey: "options.output.mp3_44100_128" },
  { value: "mp3_44100_192", label: "MP3 44.1kHz 192kbps", labelKey: "options.output.mp3_44100_192" },
  { value: "mp3_24000_48", label: "MP3 24kHz 48kbps", labelKey: "options.output.mp3_24000_48" },
  { value: "opus_48000_128", label: "Opus 48kHz 128kbps", labelKey: "options.output.opus_48000_128" },
  { value: "pcm_24000", label: "PCM 24kHz", labelKey: "options.output.pcm_24000" },
  { value: "ulaw_8000", label: "μ-law 8kHz（Twilio 常用）", labelKey: "options.output.ulaw" },
] as const satisfies readonly LocalizedOption<ElevenOutputFormat>[];

export const textNormalizationOptions = [
  { value: "auto", label: "自动", labelKey: "options.normalization.auto" },
  { value: "on", label: "开启", labelKey: "options.normalization.on" },
  { value: "off", label: "关闭", labelKey: "options.normalization.off" },
] as const satisfies readonly LocalizedOption<ApplyTextNormalization>[];

export const latencyOptions = [
  { value: "", label: "默认", labelKey: "options.latency.default" },
  { value: 0, label: "0 - 无优化", labelKey: "options.latency.0" },
  { value: 1, label: "1 - 低延迟优化", labelKey: "options.latency.1" },
  { value: 2, label: "2 - 中等优化", labelKey: "options.latency.2" },
  { value: 3, label: "3 - 强化优化", labelKey: "options.latency.3" },
  { value: 4, label: "4 - 最低延迟（关闭正则化）", labelKey: "options.latency.4" },
] as const satisfies readonly LocalizedOption<number | "">[];

export const fontFamilies = [
  {
    value: "Georgia, 'Times New Roman', serif",
    label: "Georgia（衬线，推荐）",
    labelKey: "options.font.georgia",
  },
  {
    value: "'Times New Roman', Georgia, serif",
    label: "Times New Roman（衬线）",
    labelKey: "options.font.times",
  },
  {
    value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    label: "Palatino（衬线）",
    labelKey: "options.font.palatino",
  },
  {
    value: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    label: "Arial / Helvetica（无衬线）",
    labelKey: "options.font.arial",
  },
  {
    value: "Verdana, Geneva, sans-serif",
    label: "Verdana（无衬线）",
    labelKey: "options.font.verdana",
  },
  {
    value: "Tahoma, Geneva, sans-serif",
    label: "Tahoma（无衬线）",
    labelKey: "options.font.tahoma",
  },
  {
    value: "'Trebuchet MS', Helvetica, sans-serif",
    label: "Trebuchet MS（无衬线）",
    labelKey: "options.font.trebuchet",
  },
  {
    value: "'Courier New', Courier, monospace",
    label: "Courier New（等宽）",
    labelKey: "options.font.courier",
  },
] as const;
