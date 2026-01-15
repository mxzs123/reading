import type {
  ApplyTextNormalization,
  GeminiTTSModel,
  ReaderSettings,
} from "./types";

export type AzureTtsGenerationParams = {
  provider: "azure";
  apiKey: string;
  region: string;
  voice: string;
  rate: number;
  volume: number;
  pauseMs: number;
};

export type ElevenLabsTtsGenerationParams = {
  provider: "elevenlabs";
  apiKey: string;
  voiceId: string;
  modelId: string;
  languageCode?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
  seed?: number | null;
  applyTextNormalization?: ApplyTextNormalization;
  enableLogging?: boolean;
  optimizeStreamingLatency?: number | null;
};

export type GeminiTtsGenerationParams = {
  provider: "gemini";
  apiKey: string;
  model: GeminiTTSModel;
  voiceName: string;
  languageCode?: string;
  stylePrompt?: string;
  multiSpeaker?: boolean;
  speaker1Name?: string;
  speaker1VoiceName?: string;
  speaker2Name?: string;
  speaker2VoiceName?: string;
};

export type TtsGenerationParams =
  | AzureTtsGenerationParams
  | ElevenLabsTtsGenerationParams
  | GeminiTtsGenerationParams;

export function buildTtsGenerationParams(
  settings: ReaderSettings
): TtsGenerationParams {
  if (settings.ttsProvider === "elevenlabs") {
    return {
      provider: "elevenlabs",
      apiKey: settings.elevenApiKey,
      voiceId: settings.elevenVoiceId,
      modelId: settings.elevenModelId,
      languageCode: settings.elevenLanguageCode,
      outputFormat: settings.elevenOutputFormat,
      stability: settings.elevenStability,
      similarityBoost: settings.elevenSimilarityBoost,
      style: settings.elevenStyle,
      useSpeakerBoost: settings.elevenUseSpeakerBoost,
      speed: settings.elevenSpeed,
      seed: settings.elevenSeed,
      applyTextNormalization: settings.elevenApplyTextNormalization,
      enableLogging: settings.elevenEnableLogging,
      optimizeStreamingLatency: settings.elevenOptimizeStreamingLatency,
    };
  }

  if (settings.ttsProvider === "gemini") {
    return {
      provider: "gemini",
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel,
      voiceName: settings.geminiVoiceName,
      languageCode: settings.geminiLanguageCode,
      stylePrompt: settings.geminiStylePrompt,
      multiSpeaker: settings.geminiUseMultiSpeaker,
      speaker1Name: settings.geminiSpeaker1Name,
      speaker1VoiceName: settings.geminiSpeaker1VoiceName,
      speaker2Name: settings.geminiSpeaker2Name,
      speaker2VoiceName: settings.geminiSpeaker2VoiceName,
    };
  }

  return {
    provider: "azure",
    apiKey: settings.azureApiKey,
    region: settings.azureRegion,
    voice: settings.azureVoice,
    rate: settings.ttsRate,
    volume: settings.ttsVolume,
    pauseMs: settings.ttsPauseMs,
  };
}
