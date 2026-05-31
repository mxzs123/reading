import { postJsonResponse } from "./clientRequest";
import { base64ToAudioBlob } from "./paragraphs";
import { DEFAULT_SETTINGS, type TtsGenerationParams } from "./settings";
import { normalizeWordTimings } from "./wordTimings";
import type { WordTiming } from "./storage";

export { normalizeWordTimings } from "./wordTimings";

export interface TtsRequestConfig {
  endpoint: string;
  body: Record<string, unknown>;
}

export interface GeneratedTtsAudio {
  blob: Blob;
  wordTimings?: WordTiming[];
}

type TtsBodyKey<TParams extends TtsGenerationParams> = Exclude<keyof TParams, "provider">;

export function getTtsConfigError(params: TtsGenerationParams): string | null {
  if (params.provider === "edge") {
    return null;
  }

  if (params.provider === "azure") {
    return requiredConfigError(params, [["apiKey", "请先在设置中填入 Azure API Key"]]);
  }

  if (params.provider === "gemini") {
    return requiredConfigError(params, [["apiKey", "请先在设置中填入 Gemini API Key"]]);
  }

  return requiredConfigError(params, [
    ["apiKey", "请先在设置中填入 ElevenLabs API Key"],
    ["voiceId", "请先填写 ElevenLabs Voice ID"],
  ]);
}

export function buildTtsRequest(text: string, params: TtsGenerationParams): TtsRequestConfig {
  if (params.provider === "edge") {
    return buildProviderRequest("/api/tts/edge", text, params, ["voice", "rate", "pitch"]);
  }

  if (params.provider === "azure") {
    return buildProviderRequest("/api/tts", text, params, [
      "apiKey",
      "region",
      "voice",
      "rate",
      "volume",
      "pauseMs",
    ]);
  }

  if (params.provider === "elevenlabs") {
    return buildProviderRequest(
      "/api/tts/elevenlabs",
      text,
      params,
      [
        "apiKey",
        "voiceId",
        "modelId",
        "languageCode",
        "outputFormat",
        "stability",
        "similarityBoost",
        "style",
        "useSpeakerBoost",
        "speed",
        "seed",
        "applyTextNormalization",
        "enableLogging",
        "optimizeStreamingLatency",
      ],
      { seed: params.seed ?? null }
    );
  }

  return buildProviderRequest(
    "/api/tts/gemini",
    text,
    params,
    [
      "apiKey",
      "model",
      "voiceName",
      "stylePrompt",
      "multiSpeaker",
      "speaker1Name",
      "speaker1VoiceName",
      "speaker2Name",
      "speaker2VoiceName",
    ],
    { voiceName: params.voiceName || DEFAULT_SETTINGS.geminiVoiceName }
  );
}

function requiredConfigError<TParams extends TtsGenerationParams>(
  params: TParams,
  fields: ReadonlyArray<readonly [TtsBodyKey<TParams>, string]>
): string | null {
  const missing = fields.find(([key]) => !params[key]);
  return missing?.[1] ?? null;
}

function buildProviderRequest<TParams extends TtsGenerationParams>(
  endpoint: string,
  text: string,
  params: TParams,
  keys: ReadonlyArray<TtsBodyKey<TParams>>,
  overrides: Record<string, unknown> = {}
): TtsRequestConfig {
  const body: Record<string, unknown> = { text };
  for (const key of keys) {
    body[String(key)] = params[key];
  }
  return { endpoint, body: { ...body, ...overrides } };
}

export async function generateTtsAudio(
  text: string,
  params: TtsGenerationParams,
  options: { signal?: AbortSignal } = {}
): Promise<GeneratedTtsAudio> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("段落内容为空，无法生成音频");
  }

  const configError = getTtsConfigError(params);
  if (configError) {
    throw new Error(configError);
  }

  const { endpoint, body } = buildTtsRequest(trimmedText, params);

  const response = await postJsonResponse(endpoint, body, "生成失败", {
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  const audioBase64 = (data as { audio?: string }).audio;
  const mimeType = (data as { mimeType?: string }).mimeType || "audio/mpeg";
  const wordTimings = normalizeWordTimings((data as { wordTimings?: unknown }).wordTimings);

  if (!audioBase64) {
    throw new Error("未收到音频数据");
  }

  return {
    blob: base64ToAudioBlob(audioBase64, mimeType),
    wordTimings,
  };
}
