import { base64ToAudioBlob } from "./paragraphs";
import type { TtsGenerationParams } from "./settings";
import type { WordTiming } from "./storage";

export interface TtsRequestConfig {
  endpoint: string;
  body: Record<string, unknown>;
}

export interface GeneratedTtsAudio {
  blob: Blob;
  wordTimings?: WordTiming[];
}

export function getTtsConfigError(params: TtsGenerationParams): string | null {
  if (params.provider === "edge") {
    return null;
  }

  if (params.provider === "azure") {
    return params.apiKey ? null : "请先在设置中填入 Azure API Key";
  }

  if (params.provider === "gemini") {
    return params.apiKey ? null : "请先在设置中填入 Gemini API Key";
  }

  if (!params.apiKey) {
    return "请先在设置中填入 ElevenLabs API Key";
  }

  if (!params.voiceId) {
    return "请先填写 ElevenLabs Voice ID";
  }

  return null;
}

export function buildTtsRequest(text: string, params: TtsGenerationParams): TtsRequestConfig {
  if (params.provider === "edge") {
    return {
      endpoint: "/api/tts/edge",
      body: {
        text,
        voice: params.voice,
        rate: params.rate,
        pitch: params.pitch,
      },
    };
  }

  if (params.provider === "azure") {
    return {
      endpoint: "/api/tts",
      body: {
        text,
        apiKey: params.apiKey,
        region: params.region,
        voice: params.voice,
        rate: params.rate,
        volume: params.volume,
        pauseMs: params.pauseMs,
      },
    };
  }

  if (params.provider === "elevenlabs") {
    return {
      endpoint: "/api/tts/elevenlabs",
      body: {
        text,
        apiKey: params.apiKey,
        voiceId: params.voiceId,
        modelId: params.modelId,
        languageCode: params.languageCode,
        outputFormat: params.outputFormat,
        stability: params.stability,
        similarityBoost: params.similarityBoost,
        style: params.style,
        useSpeakerBoost: params.useSpeakerBoost,
        speed: params.speed,
        seed: params.seed ?? null,
        applyTextNormalization: params.applyTextNormalization,
        enableLogging: params.enableLogging,
        optimizeStreamingLatency: params.optimizeStreamingLatency,
      },
    };
  }

  return {
    endpoint: "/api/tts/gemini",
    body: {
      text,
      apiKey: params.apiKey,
      model: params.model,
      voiceName: params.voiceName || "Kore",
      languageCode: params.languageCode,
      stylePrompt: params.stylePrompt,
      multiSpeaker: params.multiSpeaker,
      speaker1Name: params.speaker1Name,
      speaker1VoiceName: params.speaker1VoiceName,
      speaker2Name: params.speaker2Name,
      speaker2VoiceName: params.speaker2VoiceName,
    },
  };
}

export function normalizeWordTimings(value: unknown): WordTiming[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const normalized: WordTiming[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const start = (item as { start?: unknown }).start;
    const end = (item as { end?: unknown }).end;
    if (typeof start !== "number" || typeof end !== "number") return;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    if (end < start) return;
    normalized.push({ start, end });
  });

  return normalized.length ? normalized : undefined;
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const errorMessage = (data as { error?: string }).error || "生成失败";
    console.warn("TTS 请求失败", {
      endpoint,
      status: response.status,
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }

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
