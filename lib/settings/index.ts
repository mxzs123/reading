// Types
export type {
  Theme,
  TextAlign,
  ReadingMode,
  AzureRegion,
  AzureTTSVoice,
  EdgeTTSVoice,
  GeminiTTSModel,
  DeepSeekModel,
  TTSProvider,
  ApplyTextNormalization,
  ElevenOutputFormat,
  ElevenVoiceSettings,
  PageWidthMode,
  BoldRatio,
  ReaderSettings,
  ReaderAppearanceSettings,
  ReaderTypographySettings,
  ReaderLayoutSettings,
} from "./types";

export {
  ALLOWED_GEMINI_TTS_MODELS,
  ALLOWED_DEEPSEEK_MODELS,
  isAllowedGeminiTtsModel,
  isAllowedDeepSeekModel,
  SENSITIVE_SETTINGS_FIELDS,
} from "./types";

// Defaults
export { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, mergeSettings } from "./defaults";

// Apply
export { applySettings } from "./apply";

// TTS Params
export type {
  AzureTtsGenerationParams,
  EdgeTtsGenerationParams,
  ElevenLabsTtsGenerationParams,
  GeminiTtsGenerationParams,
  TtsGenerationParams,
} from "./ttsParams";

export { buildTtsGenerationParams } from "./ttsParams";
