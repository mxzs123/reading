import { NextRequest } from "next/server";
import {
  DEFAULT_SETTINGS,
  isAllowedGeminiTtsModel,
  type GeminiTTSModel,
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
import { buildPromptedText, parseRequiredString } from "@/lib/ttsRoute";
import { audioJsonResponse } from "@/lib/ttsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TTS_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
] as const;

interface GeminiTTSRequest {
  text: string;
  apiKey: string;
  model?: GeminiTTSModel;
  voiceName?: string;
  stylePrompt?: string;
  multiSpeaker?: boolean;
  speaker1Name?: string;
  speaker1VoiceName?: string;
  speaker2Name?: string;
  speaker2VoiceName?: string;
}

export async function POST(request: NextRequest) {
  const json = await readJsonRequest<GeminiTTSRequest>(request);
  if (!json.ok) return json.response;

  const text = parseRequiredString(
    json.body.text,
    "缺少必要参数: text 或 apiKey",
    { trimValue: true }
  );
  const apiKey = parseRequiredString(
    json.body.apiKey,
    "缺少必要参数: text 或 apiKey",
    { trimValue: true }
  );

  if (!text.ok) return errorResponse(text.error, 400);
  if (!apiKey.ok) return errorResponse(apiKey.error, 400);

  const {
    model: rawModel,
    voiceName = DEFAULT_SETTINGS.geminiVoiceName,
    stylePrompt,
    multiSpeaker,
    speaker1Name,
    speaker1VoiceName,
    speaker2Name,
    speaker2VoiceName,
  } = json.body;

  const normalizedStylePrompt =
    typeof stylePrompt === "string" ? stylePrompt.trim() : "";
  const promptText = buildPromptedText(text.value, normalizedStylePrompt);

  if (promptText.length > 5000) {
    return errorResponse("提示词与文本过长，请分段生成（最大 5000 字符）", 400);
  }

  const normalizedModel = typeof rawModel === "string" ? rawModel.trim() : "";
  const selectedModel = isAllowedGeminiTtsModel(normalizedModel)
    ? normalizedModel
    : DEFAULT_SETTINGS.geminiModel;

  if (normalizedModel && selectedModel !== normalizedModel) {
    console.warn("Gemini TTS 模型不支持，使用默认模型", {
      requested: normalizedModel,
      selected: selectedModel,
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

  const useMultiSpeaker = Boolean(multiSpeaker);
  let normalizedVoiceName: (typeof ALLOWED_TTS_VOICES)[number] | null = null;
  let speechConfig: Record<string, unknown>;

  if (useMultiSpeaker) {
    const s1Raw = typeof speaker1Name === "string" ? speaker1Name.trim() : "";
    const s2Raw = typeof speaker2Name === "string" ? speaker2Name.trim() : "";
    const speaker1 = s1Raw || DEFAULT_SETTINGS.geminiSpeaker1Name;
    const speaker2 = s2Raw || DEFAULT_SETTINGS.geminiSpeaker2Name;

    if (speaker1 === speaker2) {
      return errorResponse("多角色朗读的两个角色名称不能相同", 400);
    }

    const voice1Input =
      typeof speaker1VoiceName === "string" && speaker1VoiceName.trim()
        ? speaker1VoiceName
        : DEFAULT_SETTINGS.geminiSpeaker1VoiceName;
    const voice2Input =
      typeof speaker2VoiceName === "string" && speaker2VoiceName.trim()
        ? speaker2VoiceName
        : DEFAULT_SETTINGS.geminiSpeaker2VoiceName;

    const voice1 = resolvePrebuiltVoiceName(voice1Input);
    const voice2 = resolvePrebuiltVoiceName(voice2Input);

    if (!voice1 || !voice2) {
      return errorResponse("不支持的 voiceName（示例：Kore / Puck）", 400);
    }

    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: speaker1,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice1,
              },
            },
          },
          {
            speaker: speaker2,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice2,
              },
            },
          },
        ],
      },
    };
  } else {
    normalizedVoiceName = resolvePrebuiltVoiceName(voiceName);
    if (!normalizedVoiceName) {
      return errorResponse("不支持的 voiceName（示例：Kore / Puck）", 400);
    }
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: normalizedVoiceName,
        },
      },
    };
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig,
    },
  };

  return withApiError(async () => {
    const response = await fetch(
      endpoint,
      jsonRequestInit(payload, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey.value,
          "User-Agent": "BionicReader/1.0",
        },
      })
    );

    if (!response.ok) {
      const message = await readResponseErrorMessage(
        response,
        extractGoogleApiErrorMessage
      );

      if (response.status === 401 || response.status === 403) {
        return errorResponse(
          message || "Gemini API Key 无效或无权限",
          response.status
        );
      }

      return errorResponse(message || "Gemini TTS 请求失败", response.status);
    }

    const data = (await response.json()) as unknown;
    const inline = findInlineAudio(data);
    if (!inline?.data) {
      return errorResponse(TTS_AUDIO_MISSING_ERROR, 502);
    }

    const mimeType = (inline.mimeType || "audio/pcm").split(";")[0].trim();
    const rawAudio = Buffer.from(inline.data, "base64");

    if (
      mimeType === "audio/wav" ||
      mimeType === "audio/wave" ||
      mimeType === "audio/x-wav"
    ) {
      return audioJsonResponse(rawAudio, "audio/wav");
    }

    const wav = pcm16leToWav(rawAudio, { sampleRate: 24000, channels: 1 });

    return audioJsonResponse(wav, "audio/wav");
  }, TTS_GENERATION_ERROR);
}

function resolvePrebuiltVoiceName(input: string): (typeof ALLOWED_TTS_VOICES)[number] | null {
  const trimmed = input.trim();
  const requested = trimmed || DEFAULT_SETTINGS.geminiVoiceName;

  const match = ALLOWED_TTS_VOICES.find(
    (voice) => voice.toLowerCase() === requested.toLowerCase()
  );
  return match ?? null;
}

function extractGoogleApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const maybeError = (payload as { error?: unknown }).error;
  if (!maybeError || typeof maybeError !== "object") return "";
  const message = (maybeError as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function findInlineAudio(payload: unknown): { data?: string; mimeType?: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const content = (candidates[0] as { content?: unknown })?.content;
  const parts =
    content && typeof content === "object" ? (content as { parts?: unknown }).parts : undefined;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const inlineData =
      (part as Record<string, unknown>).inlineData ??
      (part as Record<string, unknown>).inline_data;
    if (!inlineData || typeof inlineData !== "object") continue;
    const data = (inlineData as Record<string, unknown>).data;
    const mimeType =
      (inlineData as Record<string, unknown>).mimeType ??
      (inlineData as Record<string, unknown>).mime_type;
    if (typeof data === "string") {
      return {
        data,
        mimeType: typeof mimeType === "string" ? mimeType : undefined,
      };
    }
  }

  return null;
}

function pcm16leToWav(
  pcm: Uint8Array,
  options: { sampleRate: number; channels: number }
): Uint8Array {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = options.channels * bytesPerSample;
  const byteRate = options.sampleRate * blockAlign;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, options.channels, true);
  view.setUint32(24, options.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcm.byteLength, true);

  const wav = new Uint8Array(44 + pcm.byteLength);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
