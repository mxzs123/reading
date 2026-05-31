import type {
  ApplyTextNormalization,
  EdgeTTSVoice,
  GeminiTTSModel,
  ReaderSettings,
  TTSProvider,
} from "./types";

type EdgeTtsGenerationParams = {
  provider: "edge";
  voice: EdgeTTSVoice;
  rate: number;
  pitch: number;
};

type AzureTtsGenerationParams = {
  provider: "azure";
  apiKey: string;
  region: string;
  voice: string;
  rate: number;
  volume: number;
  pauseMs: number;
};

type ElevenLabsTtsGenerationParams = {
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

type GeminiTtsGenerationParams = {
  provider: "gemini";
  apiKey: string;
  model: GeminiTTSModel;
  voiceName: string;
  stylePrompt?: string;
  multiSpeaker?: boolean;
  speaker1Name?: string;
  speaker1VoiceName?: string;
  speaker2Name?: string;
  speaker2VoiceName?: string;
};

export type TtsGenerationParams =
  | EdgeTtsGenerationParams
  | AzureTtsGenerationParams
  | ElevenLabsTtsGenerationParams
  | GeminiTtsGenerationParams;

type ProviderParams<TProvider extends TTSProvider> = Extract<
  TtsGenerationParams,
  { provider: TProvider }
>;

const TTS_PARAM_BUILDERS = {
  azure: (settings) => ({
    provider: "azure",
    apiKey: settings.azureApiKey,
    region: settings.azureRegion,
    voice: settings.azureVoice,
    rate: settings.ttsRate,
    volume: settings.ttsVolume,
    pauseMs: settings.ttsPauseMs,
  }),
  edge: (settings) => ({
    provider: "edge",
    voice: settings.edgeVoice,
    rate: settings.edgeRate,
    pitch: settings.edgePitch,
  }),
  elevenlabs: (settings) => ({
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
  }),
  gemini: (settings) => ({
    provider: "gemini",
    apiKey: settings.geminiApiKey,
    model: settings.geminiModel,
    voiceName: settings.geminiVoiceName,
    stylePrompt: settings.geminiStylePrompt,
    multiSpeaker: settings.geminiUseMultiSpeaker,
    speaker1Name: settings.geminiSpeaker1Name,
    speaker1VoiceName: settings.geminiSpeaker1VoiceName,
    speaker2Name: settings.geminiSpeaker2Name,
    speaker2VoiceName: settings.geminiSpeaker2VoiceName,
  }),
} satisfies {
  [TProvider in TTSProvider]: (
    settings: ReaderSettings
  ) => ProviderParams<TProvider>;
};

export function buildTtsGenerationParams(
  settings: ReaderSettings
): TtsGenerationParams {
  return TTS_PARAM_BUILDERS[settings.ttsProvider](settings);
}
