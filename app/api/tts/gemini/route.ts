import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

const DEFAULT_TTS_MODEL: GeminiTTSModel = "gemini-2.5-flash-preview-tts";

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

type GeminiTTSModel = (typeof ALLOWED_TTS_MODELS)[number];

interface GeminiTTSRequest {
  text: string;
  apiKey: string;
  model?: GeminiTTSModel;
  voiceName?: string;
  languageCode?: string;
  stylePrompt?: string;
  multiSpeaker?: boolean;
  speaker1Name?: string;
  speaker1VoiceName?: string;
  speaker2Name?: string;
  speaker2VoiceName?: string;
}

export async function POST(request: NextRequest) {
  let body: GeminiTTSRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const {
    text,
    apiKey,
    model: rawModel,
    voiceName = "Kore",
    stylePrompt,
    multiSpeaker,
    speaker1Name,
    speaker1VoiceName,
    speaker2Name,
    speaker2VoiceName,
  } = body;

  if (typeof text !== "string" || typeof apiKey !== "string") {
    return Response.json({ error: "缺少必要参数: text 或 apiKey" }, { status: 400 });
  }

  const normalizedText = text.trim();
  const normalizedKey = apiKey.trim();

  if (!normalizedText || !normalizedKey) {
    return Response.json({ error: "缺少必要参数: text 或 apiKey" }, { status: 400 });
  }

  const normalizedStylePrompt =
    typeof stylePrompt === "string" ? stylePrompt.trim() : "";
  const promptText = buildTtsPrompt(normalizedText, normalizedStylePrompt);

  if (promptText.length > 5000) {
    return Response.json(
      { error: "提示词与文本过长，请分段生成（最大 5000 字符）" },
      { status: 400 }
    );
  }

  const normalizedModel = typeof rawModel === "string" ? rawModel.trim() : "";
  const selectedModel = ALLOWED_TTS_MODELS.includes(normalizedModel as GeminiTTSModel)
    ? (normalizedModel as GeminiTTSModel)
    : DEFAULT_TTS_MODEL;

  if (normalizedModel && selectedModel !== normalizedModel) {
    console.warn("Gemini TTS 模型不支持，已回退到默认模型", {
      requested: normalizedModel,
      fallback: selectedModel,
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

  const useMultiSpeaker = Boolean(multiSpeaker);
  let normalizedVoiceName: (typeof ALLOWED_TTS_VOICES)[number] | null = null;
  let speechConfig: Record<string, unknown>;
  let multiSpeakerInfo:
    | {
        speaker1: string;
        voice1: (typeof ALLOWED_TTS_VOICES)[number];
        speaker2: string;
        voice2: (typeof ALLOWED_TTS_VOICES)[number];
      }
    | null = null;

  if (useMultiSpeaker) {
    const s1Raw = typeof speaker1Name === "string" ? speaker1Name.trim() : "";
    const s2Raw = typeof speaker2Name === "string" ? speaker2Name.trim() : "";
    const speaker1 = s1Raw || "Speaker1";
    const speaker2 = s2Raw || "Speaker2";

    if (speaker1 === speaker2) {
      return Response.json({ error: "多角色朗读的两个角色名称不能相同" }, { status: 400 });
    }

    const fallbackVoiceName = typeof voiceName === "string" ? voiceName : "Kore";
    const voice1Input =
      typeof speaker1VoiceName === "string" && speaker1VoiceName.trim()
        ? speaker1VoiceName
        : fallbackVoiceName;
    const voice2Input =
      typeof speaker2VoiceName === "string" && speaker2VoiceName.trim()
        ? speaker2VoiceName
        : "Puck";

    const voice1 = resolvePrebuiltVoiceName(voice1Input);
    const voice2 = resolvePrebuiltVoiceName(voice2Input);

    if (!voice1 || !voice2) {
      return Response.json(
        { error: "不支持的 voiceName（示例：Kore / Puck）" },
        { status: 400 }
      );
    }

    multiSpeakerInfo = { speaker1, voice1, speaker2, voice2 };
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
    normalizedVoiceName =
      typeof voiceName === "string" ? resolvePrebuiltVoiceName(voiceName) : "Kore";
    if (!normalizedVoiceName) {
      return Response.json(
        { error: "不支持的 voiceName（示例：Kore / Puck）" },
        { status: 400 }
      );
    }

    // `languageCode` 在 Gemini Live API 中可用，但在 `generateContent` 的音频输出里
    // 可能会导致 400（无效字段/不支持）。这里仅通过 voiceName 控制音色，语言交由模型推断。
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

  try {
    const attempts = [
      {
        name: "camel_speech",
        payload,
      },
      {
        name: "camel_no_speech",
        payload: {
          contents: payload.contents,
          generationConfig: {
            responseModalities: ["AUDIO"],
          },
        },
      },
      {
        name: "snake_speech",
        payload: {
          contents: payload.contents,
          generation_config: {
            response_modalities: ["AUDIO"],
            speech_config: useMultiSpeaker
              ? {
                  multi_speaker_voice_config: {
                    speaker_voice_configs: [
                      {
                        speaker: multiSpeakerInfo!.speaker1,
                        voice_config: {
                          prebuilt_voice_config: {
                            voice_name: multiSpeakerInfo!.voice1,
                          },
                        },
                      },
                      {
                        speaker: multiSpeakerInfo!.speaker2,
                        voice_config: {
                          prebuilt_voice_config: {
                            voice_name: multiSpeakerInfo!.voice2,
                          },
                        },
                      },
                    ],
                  },
                }
              : {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: normalizedVoiceName,
                    },
                  },
                },
          },
        },
      },
      {
        name: "snake_no_speech",
        payload: {
          contents: payload.contents,
          generation_config: {
            response_modalities: ["AUDIO"],
          },
        },
      },
    ] as const;

    const attemptNames = attempts.map((a) => a.name);
    let lastMessage = "";

    for (const attempt of attempts) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": normalizedKey,
          "Content-Type": "application/json",
          "User-Agent": "BionicReader/1.0",
        },
        body: JSON.stringify(attempt.payload),
      });

      if (response.ok) {
        const data = (await response.json().catch(() => null)) as unknown;
        const inline = findInlineAudio(data);
        if (!inline?.data) {
          return Response.json({ error: "未收到音频数据" }, { status: 502 });
        }

        const mimeType = (inline.mimeType || "audio/pcm").split(";")[0].trim();
        const rawAudio = Buffer.from(inline.data, "base64");

        if (
          mimeType === "audio/wav" ||
          mimeType === "audio/wave" ||
          mimeType === "audio/x-wav"
        ) {
          return Response.json({
            audio: rawAudio.toString("base64"),
            mimeType: "audio/wav",
          });
        }

        const wav = pcm16leToWav(rawAudio, { sampleRate: 24000, channels: 1 });

        return Response.json({
          audio: Buffer.from(wav).toString("base64"),
          mimeType: "audio/wav",
        });
      }

      const safeMessage = await readGoogleApiErrorMessage(response);
      if (safeMessage) lastMessage = safeMessage;

      if (response.status === 401 || response.status === 403) {
        return Response.json(
          { error: lastMessage || "Gemini API Key 无效或无权限" },
          { status: response.status }
        );
      }

      if (response.status !== 400) {
        return Response.json(
          { error: lastMessage || "Gemini TTS 请求失败" },
          { status: response.status }
        );
      }
    }

    console.warn("Gemini TTS 请求失败", {
      status: 400,
      message: lastMessage || undefined,
      attempts: attemptNames,
      model: selectedModel,
      voiceName: normalizedVoiceName,
      multiSpeaker: useMultiSpeaker,
      textLength: normalizedText.length,
      promptLength: promptText.length,
    });

    return Response.json(
      {
        error: lastMessage || "请求参数无效，请检查 Gemini Key、模型或请求格式",
        attempts: attemptNames,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Gemini TTS 生成失败", error);
    return Response.json({ error: "音频生成失败，请稍后重试" }, { status: 500 });
  }
}

async function readGoogleApiErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as unknown)
    : await response.text().catch(() => "");

  if (typeof payload === "string") {
    return payload.slice(0, 300);
  }

  const extracted = extractGoogleApiErrorMessage(payload);
  if (extracted) return extracted.slice(0, 300);

  const fallback = safeJsonStringify(payload);
  return fallback.slice(0, 300);
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function resolvePrebuiltVoiceName(input: string): (typeof ALLOWED_TTS_VOICES)[number] | null {
  const trimmed = input.trim();
  if (!trimmed) return "Kore";

  const match = ALLOWED_TTS_VOICES.find(
    (voice) => voice.toLowerCase() === trimmed.toLowerCase()
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

function buildTtsPrompt(text: string, stylePrompt: string): string {
  const normalizedText = text.trim();
  if (!stylePrompt) return normalizedText;

  const normalizedPrompt = stylePrompt.trim();
  if (!normalizedPrompt) return normalizedText;

  if (normalizedPrompt.includes("{{text}}")) {
    return normalizedPrompt.split("{{text}}").join(normalizedText);
  }

  if (/[:：]$/.test(normalizedPrompt)) {
    return `${normalizedPrompt} ${normalizedText}`;
  }

  return `${normalizedPrompt}\n\n${normalizedText}`;
}
