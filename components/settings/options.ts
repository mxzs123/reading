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
  labelKey: TranslationKey;
};

export function translateOptions<const TOptions extends ReadonlyArray<LocalizedOption<string | number>>>(
  options: TOptions,
  t: TFunction
): Array<{ value: TOptions[number]["value"]; label: string }> {
  return options.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
}

export const readingModeOptions = [
  { value: "pure", labelKey: "options.readingMode.pure" },
  { value: "audio", labelKey: "options.readingMode.audio" },
] as const satisfies readonly LocalizedOption<ReadingMode>[];

export const boldOptions = [
  { value: "off", labelKey: "options.bold.off" },
  { value: "low", labelKey: "options.bold.low" },
  { value: "medium", labelKey: "options.bold.medium" },
  { value: "high", labelKey: "options.bold.high" },
  { value: "custom", labelKey: "options.bold.custom" },
] as const satisfies readonly LocalizedOption<BoldRatio>[];

export const themeOptions = [
  { value: "sepia", labelKey: "options.theme.sepia" },
  { value: "white", labelKey: "options.theme.white" },
  { value: "dark", labelKey: "options.theme.dark" },
  { value: "oled", labelKey: "options.theme.oled" },
] as const satisfies readonly LocalizedOption<Theme>[];

export const alignOptions = [
  { value: "left", labelKey: "options.align.left" },
  { value: "center", labelKey: "options.align.center" },
  { value: "right", labelKey: "options.align.right" },
  { value: "justify", labelKey: "options.align.justify" },
] as const satisfies readonly LocalizedOption<TextAlign>[];

export const widthModeOptions = [
  { value: "px", labelKey: "options.width.px" },
  { value: "vw", labelKey: "options.width.vw" },
  { value: "ch", labelKey: "options.width.ch" },
] as const satisfies readonly LocalizedOption<PageWidthMode>[];

export const azureVoiceOptions = [
  { value: "en-US-Ava:DragonHDLatestNeural", labelKey: "options.voice.avaDragon" },
  { value: "en-US-JennyNeural", labelKey: "options.voice.jenny" },
  { value: "en-US-GuyNeural", labelKey: "options.voice.guy" },
  { value: "en-GB-SoniaNeural", labelKey: "options.voice.sonia" },
] as const satisfies readonly LocalizedOption<AzureTTSVoice>[];

export const edgeVoiceOptions = [
  { value: "en-US-EmmaMultilingualNeural", labelKey: "options.voice.emmaMulti" },
  { value: "en-US-AvaMultilingualNeural", labelKey: "options.voice.avaMulti" },
  { value: "en-US-JennyNeural", labelKey: "options.voice.jenny" },
  { value: "en-US-GuyNeural", labelKey: "options.voice.guy" },
  { value: "en-GB-SoniaNeural", labelKey: "options.voice.sonia" },
] as const satisfies readonly LocalizedOption<EdgeTTSVoice>[];

export const ttsProviderOptions = [
  { value: "edge", labelKey: "options.provider.edge" },
  { value: "azure", labelKey: "options.provider.azure" },
  { value: "elevenlabs", labelKey: "options.provider.elevenlabs" },
  { value: "gemini", labelKey: "options.provider.gemini" },
] as const satisfies readonly LocalizedOption<TTSProvider>[];

export const geminiModelOptions = [
  { value: "gemini-2.5-flash-preview-tts", labelKey: "options.model.geminiFlash" },
  { value: "gemini-2.5-pro-preview-tts", labelKey: "options.model.geminiPro" },
] as const satisfies readonly LocalizedOption<GeminiTTSModel>[];

export const deepseekModelOptions = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
] as const satisfies readonly { value: DeepSeekModel; label: string }[];

export const elevenModelOptions = [
  { value: "eleven_v3", labelKey: "options.model.elevenV3" },
  { value: "eleven_turbo_v2_5", labelKey: "options.model.elevenTurbo" },
  { value: "eleven_flash_v2_5", labelKey: "options.model.elevenFlash" },
  { value: "eleven_multilingual_v2", labelKey: "options.model.elevenMultilingual" },
] as const satisfies readonly LocalizedOption<string>[];

export const elevenOutputFormatOptions = [
  { value: "mp3_44100_128", labelKey: "options.output.mp3_44100_128" },
  { value: "mp3_44100_192", labelKey: "options.output.mp3_44100_192" },
  { value: "mp3_24000_48", labelKey: "options.output.mp3_24000_48" },
  { value: "opus_48000_128", labelKey: "options.output.opus_48000_128" },
  { value: "pcm_24000", labelKey: "options.output.pcm_24000" },
  { value: "ulaw_8000", labelKey: "options.output.ulaw" },
] as const satisfies readonly LocalizedOption<ElevenOutputFormat>[];

export const textNormalizationOptions = [
  { value: "auto", labelKey: "options.normalization.auto" },
  { value: "on", labelKey: "options.normalization.on" },
  { value: "off", labelKey: "options.normalization.off" },
] as const satisfies readonly LocalizedOption<ApplyTextNormalization>[];

export const latencyOptions = [
  { value: "", labelKey: "options.latency.default" },
  { value: 0, labelKey: "options.latency.0" },
  { value: 1, labelKey: "options.latency.1" },
  { value: 2, labelKey: "options.latency.2" },
  { value: 3, labelKey: "options.latency.3" },
  { value: 4, labelKey: "options.latency.4" },
] as const satisfies readonly LocalizedOption<number | "">[];

export const fontFamilies = [
  {
    value: "Charter, \"Bitstream Charter\", \"TsangerJinKai\", \"Tsanger JinKai\", \"Iowan Old Style\", \"Source Serif 4\", \"Noto Serif\", \"Songti SC\", \"Yu Mincho\", Georgia, serif",
    labelKey: "options.font.charter",
  },
  {
    value: "\"Source Serif 4\", \"Noto Serif\", \"Iowan Old Style\", \"Songti SC\", \"Yu Mincho\", Georgia, serif",
    labelKey: "options.font.sourceSerif",
  },
  {
    value: "\"Lora\", \"Source Serif 4\", \"Noto Serif\", Georgia, serif",
    labelKey: "options.font.lora",
  },
  {
    value: "\"Newsreader\", \"Source Serif 4\", \"Noto Serif\", Georgia, serif",
    labelKey: "options.font.newsreader",
  },
  {
    value: "\"Noto Serif\", \"Source Serif 4\", \"Songti SC\", \"Yu Mincho\", Georgia, serif",
    labelKey: "options.font.notoSerif",
  },
  {
    value: "\"Literata\", \"Source Serif 4\", \"Noto Serif\", Georgia, serif",
    labelKey: "options.font.literata",
  },
] as const satisfies readonly LocalizedOption<string>[];
