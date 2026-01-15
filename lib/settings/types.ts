export type Theme = "sepia" | "white" | "dark" | "oled";
export type TextAlign = "left" | "right" | "center" | "justify";
export type ReadingMode = "pure" | "audio";
export type AzureRegion = "eastus2";
export type AzureTTSVoice =
  | "en-US-Ava:DragonHDLatestNeural"
  | "en-US-JennyNeural"
  | "en-US-GuyNeural"
  | "en-GB-SoniaNeural";

export const ALLOWED_GEMINI_TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

export type GeminiTTSModel = (typeof ALLOWED_GEMINI_TTS_MODELS)[number];

export function isAllowedGeminiTtsModel(
  value: unknown
): value is GeminiTTSModel {
  return (
    typeof value === "string" &&
    (ALLOWED_GEMINI_TTS_MODELS as readonly string[]).includes(value)
  );
}

export type TTSProvider = "azure" | "elevenlabs" | "gemini";
export type ApplyTextNormalization = "auto" | "on" | "off";

export type ElevenOutputFormat =
  | "mp3_22050_32"
  | "mp3_24000_48"
  | "mp3_44100_32"
  | "mp3_44100_64"
  | "mp3_44100_96"
  | "mp3_44100_128"
  | "mp3_44100_192"
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_32000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000"
  | "alaw_8000"
  | "opus_48000_32"
  | "opus_48000_64"
  | "opus_48000_96"
  | "opus_48000_128"
  | "opus_48000_192";

export interface ElevenVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

export type PageWidthMode = "px" | "vw" | "ch";
export type BoldRatio = "off" | "low" | "medium" | "high" | "custom";

export const SENSITIVE_SETTINGS_FIELDS = [
  "azureApiKey",
  "elevenApiKey",
  "geminiApiKey",
] as const;

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  boldRatio: BoldRatio;
  customBoldRatio: number;
  bionicWeight: number;
  bodyFontWeight: number;
  fontFamily: string;
  theme: Theme;
  pageWidthMode: PageWidthMode;
  pageWidth: number;
  pageWidthVw: number;
  pageWidthCh: number;
  readingPadding: number;
  textIndent: number;
  textAlign: TextAlign;
  ttsProvider: TTSProvider;
  azureApiKey: string;
  azureRegion: AzureRegion;
  azureVoice: AzureTTSVoice;
  elevenApiKey: string;
  elevenVoiceId: string;
  elevenModelId: string;
  elevenLanguageCode: string;
  elevenOutputFormat: ElevenOutputFormat;
  elevenStability: number;
  elevenSimilarityBoost: number;
  elevenStyle: number;
  elevenUseSpeakerBoost: boolean;
  elevenSpeed: number;
  elevenSeed: number | null;
  elevenApplyTextNormalization: ApplyTextNormalization;
  elevenEnableLogging: boolean;
  elevenOptimizeStreamingLatency: number | null;
  elevenWordSyncHighlight: boolean;
  geminiApiKey: string;
  geminiModel: GeminiTTSModel;
  geminiVoiceName: string;
  geminiLanguageCode: string;
  geminiStylePrompt: string;
  geminiUseMultiSpeaker: boolean;
  geminiSpeaker1Name: string;
  geminiSpeaker1VoiceName: string;
  geminiSpeaker2Name: string;
  geminiSpeaker2VoiceName: string;
  autoPlayNext: boolean;
  ttsConcurrency: number;
  ttsRate: number;
  ttsVolume: number;
  ttsPauseMs: number;
  readingMode: ReadingMode;
}

export type ReaderAppearanceSettings = Pick<
  ReaderSettings,
  "theme" | "boldRatio" | "customBoldRatio" | "bionicWeight"
>;

export type ReaderTypographySettings = Pick<
  ReaderSettings,
  | "fontFamily"
  | "fontSize"
  | "lineHeight"
  | "letterSpacing"
  | "paragraphSpacing"
  | "bodyFontWeight"
  | "textIndent"
  | "textAlign"
>;

export type ReaderLayoutSettings = Pick<
  ReaderSettings,
  | "pageWidthMode"
  | "pageWidth"
  | "pageWidthVw"
  | "pageWidthCh"
  | "readingPadding"
>;
