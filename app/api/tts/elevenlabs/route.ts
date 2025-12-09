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

export async function POST(request: NextRequest) {
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
  )}${query.toString() ? `?${query.toString()}` : ""}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

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

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const mimeType = response.headers.get("content-type") || "audio/mpeg";

    return Response.json({
      audio: audioBase64,
      mimeType,
    });
  } catch (error) {
    console.error("ElevenLabs TTS 生成失败", error);
    return Response.json({ error: "音频生成失败，请稍后重试" }, { status: 500 });
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

