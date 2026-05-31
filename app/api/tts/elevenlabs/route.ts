import { NextRequest } from "next/server";
import {
  DEFAULT_SETTINGS,
  type ApplyTextNormalization,
} from "@/lib/settings";
import {
  TTS_AUDIO_MISSING_ERROR,
  TTS_GENERATION_ERROR,
  errorResponse,
  jsonRequestInit,
  readJsonRequest,
  readResponseErrorMessage,
  withApiError,
} from "@/lib/http";
import { ENGLISH_WORD_REGEX } from "@/lib/englishWords";
import { audioJsonResponse } from "@/lib/ttsServer";
import {
  inferTtsMimeType,
  parseRequiredString,
  parseTtsText,
} from "@/lib/ttsRoute";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ElevenLabsRequest {
  text: string;
  apiKey: string;
  voiceId: string;
  modelId?: string;
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
}

type WordTiming = { start: number; end: number };

type ElevenLabsAlignment = {
  characters?: string[] | string;
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
};

type ElevenLabsWithTimestampsResponse = {
  audio_base64?: string;
  alignment?: ElevenLabsAlignment | null;
  normalized_alignment?: ElevenLabsAlignment | null;
};

export async function POST(request: NextRequest): Promise<Response> {
  const json = await readJsonRequest<ElevenLabsRequest>(request);
  if (!json.ok) return json.response;

  const text = parseTtsText(json.body.text, {
    requiredError: "缺少必要参数: text/apiKey/voiceId",
    lengthError: "文本过长，请分段生成（最大 5000 字符）",
    maxLength: 5000,
  });
  const apiKey = parseRequiredString(
    json.body.apiKey,
    "缺少必要参数: text/apiKey/voiceId"
  );
  const voiceId = parseRequiredString(
    json.body.voiceId,
    "缺少必要参数: text/apiKey/voiceId"
  );

  if (!text.ok) return errorResponse(text.error, 400);
  if (!apiKey.ok) return errorResponse(apiKey.error, 400);
  if (!voiceId.ok) return errorResponse(voiceId.error, 400);

  const {
    modelId = DEFAULT_SETTINGS.elevenModelId,
    languageCode,
    outputFormat = DEFAULT_SETTINGS.elevenOutputFormat,
    stability,
    similarityBoost,
    style,
    useSpeakerBoost,
    speed,
    seed = DEFAULT_SETTINGS.elevenSeed,
    applyTextNormalization = DEFAULT_SETTINGS.elevenApplyTextNormalization,
    enableLogging = DEFAULT_SETTINGS.elevenEnableLogging,
    optimizeStreamingLatency = DEFAULT_SETTINGS.elevenOptimizeStreamingLatency,
  } = json.body;

  const query = new URLSearchParams();
  if (outputFormat) query.set("output_format", outputFormat);
  if (enableLogging === false) query.set("enable_logging", "false");
  if (
    optimizeStreamingLatency !== null &&
    optimizeStreamingLatency !== undefined &&
    !Number.isNaN(optimizeStreamingLatency)
  ) {
    query.set("optimize_streaming_latency", String(optimizeStreamingLatency));
  }

  const voiceSettings: Record<string, number | boolean> = {};
  if (typeof stability === "number") voiceSettings.stability = stability;
  if (typeof similarityBoost === "number") {
    voiceSettings.similarity_boost = similarityBoost;
  }
  if (typeof style === "number") voiceSettings.style = style;
  if (typeof speed === "number") voiceSettings.speed = speed;
  if (typeof useSpeakerBoost === "boolean") {
    voiceSettings.use_speaker_boost = useSpeakerBoost;
  }

  const payload: Record<string, unknown> = {
    text: text.value,
    model_id: modelId,
    language_code: languageCode || null,
    seed: seed ?? null,
    apply_text_normalization: applyTextNormalization,
  };

  if (Object.keys(voiceSettings).length > 0) {
    payload.voice_settings = voiceSettings;
  }

  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId.value
  )}/with-timestamps${query.toString() ? `?${query.toString()}` : ""}`;

  return withApiError(async () => {
    const response = await fetch(
      endpoint,
      jsonRequestInit(payload, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey.value,
          Accept: "application/json",
        },
      })
    );

    if (!response.ok) {
      const errorText = await readResponseErrorMessage(response);

      if (response.status === 401 || response.status === 403) {
        return errorResponse("ElevenLabs API Key 无效或无权限", response.status);
      }

      if (response.status === 422) {
        return errorResponse("请求参数无效，请检查模型、音色或格式设置", 422);
      }

      return errorResponse(
        errorText || "ElevenLabs TTS 请求失败",
        response.status
      );
    }

    const data = (await response.json()) as ElevenLabsWithTimestampsResponse;
    const audioBase64 = data.audio_base64;
    if (!audioBase64) {
      return errorResponse(TTS_AUDIO_MISSING_ERROR, 502);
    }

    const alignment = data?.alignment ?? data?.normalized_alignment ?? null;
    const wordTimings = buildWordTimings(text.value, alignment);

    return audioJsonResponse(audioBase64, inferTtsMimeType(outputFormat), {
      wordTimings,
    });
  }, TTS_GENERATION_ERROR);
}

function buildWordTimings(
  text: string,
  alignment: ElevenLabsAlignment | null
): WordTiming[] | undefined {
  if (!alignment) return undefined;

  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (!starts || !ends || starts.length === 0 || ends.length === 0) {
    return undefined;
  }

  const limit = Math.min(text.length, starts.length, ends.length);
  if (limit <= 0) return undefined;

  const timings: WordTiming[] = [];

  for (const match of text.matchAll(ENGLISH_WORD_REGEX)) {
    const index = match.index;
    if (index === undefined) continue;

    const startIndex = index;
    const endIndex = startIndex + match[0].length;
    if (startIndex >= limit) continue;

    const rangeEnd = Math.min(endIndex, limit);

    let wordStart = Number.POSITIVE_INFINITY;
    let wordEnd = Number.NEGATIVE_INFINITY;

    for (let i = startIndex; i < rangeEnd; i += 1) {
      const start = starts[i];
      const end = ends[i];
      if (Number.isFinite(start)) {
        wordStart = Math.min(wordStart, start);
        wordEnd = Math.max(wordEnd, Number.isFinite(end) ? end : start);
      }
    }

    if (
      !Number.isFinite(wordStart) ||
      !Number.isFinite(wordEnd) ||
      wordEnd < wordStart
    ) {
      continue;
    }

    timings.push({ start: wordStart, end: wordEnd });
  }

  return timings.length ? timings : undefined;
}
