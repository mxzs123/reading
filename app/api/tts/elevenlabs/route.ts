import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ApplyTextNormalization = "auto" | "on" | "off";

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

const WORD_REGEX = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export async function POST(request: NextRequest): Promise<Response> {
  let body: ElevenLabsRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const {
    text,
    apiKey,
    voiceId,
    modelId = "eleven_flash_v2_5",
    languageCode,
    outputFormat = "mp3_44100_128",
    stability,
    similarityBoost,
    style,
    useSpeakerBoost,
    speed,
    seed = null,
    applyTextNormalization = "auto",
    enableLogging = true,
    optimizeStreamingLatency = null,
  } = body;

  if (!text || !apiKey || !voiceId) {
    return Response.json({ error: "缺少必要参数: text/apiKey/voiceId" }, { status: 400 });
  }

  if (text.length > 5000) {
    return Response.json({ error: "文本过长，请分段生成（最大 5000 字符）" }, { status: 400 });
  }

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
  if (typeof similarityBoost === "number") voiceSettings.similarity_boost = similarityBoost;
  if (typeof style === "number") voiceSettings.style = style;
  if (typeof speed === "number") voiceSettings.speed = speed;
  if (typeof useSpeakerBoost === "boolean") voiceSettings.use_speaker_boost = useSpeakerBoost;

  const payload: Record<string, unknown> = {
    text,
    model_id: modelId,
    language_code: languageCode || null,
    seed: seed ?? null,
    apply_text_normalization: applyTextNormalization,
  };

  if (Object.keys(voiceSettings).length > 0) {
    payload.voice_settings = voiceSettings;
  }

  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}/with-timestamps${query.toString() ? `?${query.toString()}` : ""}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      const errorText = contentType.includes("application/json")
        ? JSON.stringify(await response.json().catch(() => ({})))
        : await response.text().catch(() => "");

      if (response.status === 401 || response.status === 403) {
        return Response.json({ error: "ElevenLabs API Key 无效或无权限" }, { status: response.status });
      }

      if (response.status === 422) {
        return Response.json({ error: "请求参数无效，请检查模型、音色或格式设置" }, { status: 422 });
      }

      return Response.json(
        { error: errorText.slice(0, 300) || "ElevenLabs TTS 请求失败" },
        { status: response.status }
      );
    }

    const data = (await response.json().catch(() => null)) as ElevenLabsWithTimestampsResponse | null;
    const audioBase64 = data?.audio_base64;
    if (!audioBase64) {
      return Response.json({ error: "未收到音频数据" }, { status: 502 });
    }

    const alignment = data?.alignment ?? data?.normalized_alignment ?? null;
    const wordTimings = buildWordTimings(text, alignment);

    return Response.json({
      audio: audioBase64,
      mimeType: inferMimeType(outputFormat),
      wordTimings,
    });
  } catch (error) {
    console.error("ElevenLabs TTS 生成失败", error);
    return Response.json({ error: "音频生成失败，请稍后重试" }, { status: 500 });
  }
}

function inferMimeType(outputFormat?: string): string {
  if (!outputFormat) return "audio/mpeg";

  if (outputFormat.startsWith("mp3_")) return "audio/mpeg";
  if (outputFormat.startsWith("opus_")) return "audio/ogg";
  if (outputFormat.startsWith("pcm_")) return "audio/wav";
  if (outputFormat.startsWith("ulaw_") || outputFormat.startsWith("alaw_")) return "audio/wav";

  return "audio/mpeg";
}

function buildWordTimings(text: string, alignment: ElevenLabsAlignment | null): WordTiming[] | undefined {
  if (!alignment) return undefined;

  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (!starts || !ends || starts.length === 0 || ends.length === 0) {
    return undefined;
  }

  const limit = Math.min(text.length, starts.length, ends.length);
  if (limit <= 0) return undefined;

  const timings: WordTiming[] = [];

  for (const match of text.matchAll(WORD_REGEX)) {
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

    if (!Number.isFinite(wordStart) || !Number.isFinite(wordEnd) || wordEnd < wordStart) {
      continue;
    }

    timings.push({ start: wordStart, end: wordEnd });
  }

  return timings.length ? timings : undefined;
}

