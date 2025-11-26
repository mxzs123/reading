import { NextRequest } from "next/server";

export const runtime = "edge";

const GEMINI_TTS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

// Gemini TTS 音频参数
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

interface TTSRequest {
  text: string;
  apiKey: string;
  voice?: string;
}

interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data: string;
          mimeType: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export async function POST(request: NextRequest) {
  let body: TTSRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { text, apiKey: rawApiKey, voice = "Kore" } = body;

  // 清理 API Key 中的空白字符，避免复制粘贴时带入的空格导致验证失败
  const apiKey = rawApiKey?.trim();

  if (!text || !apiKey) {
    return Response.json(
      { error: "缺少必要参数: text 或 apiKey" },
      { status: 400 }
    );
  }

  if (text.length > 5000) {
    return Response.json(
      { error: "文本过长，请分段生成（最大 5000 字符）" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(GEMINI_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
        model: "gemini-2.5-flash-preview-tts",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as GeminiTTSResponse).error?.message || "TTS 服务请求失败";

      if (response.status === 401 || response.status === 403) {
        return Response.json(
          { error: "API Key 无效或无权限" },
          { status: 401 }
        );
      }

      return Response.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = (await response.json()) as GeminiTTSResponse;

    const audioData =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      return Response.json({ error: "未收到音频数据" }, { status: 500 });
    }

    // 将 base64 PCM 转换为 WAV 格式
    const pcmBuffer = base64ToArrayBuffer(audioData);
    const wavBuffer = pcmToWav(pcmBuffer);
    const wavBase64 = arrayBufferToBase64(wavBuffer);

    return Response.json({
      audio: wavBase64,
      mimeType: "audio/wav",
    });
  } catch (error) {
    console.error("TTS 生成失败", error);
    return Response.json({ error: "音频生成失败，请稍后重试" }, { status: 500 });
  }
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将 PCM 数据转换为 WAV 格式
 */
function pcmToWav(pcmBuffer: ArrayBuffer): ArrayBuffer {
  const pcmData = new Uint8Array(pcmBuffer);
  const wavHeaderSize = 44;
  const wavBuffer = new ArrayBuffer(wavHeaderSize + pcmData.length);
  const view = new DataView(wavBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), true); // ByteRate
  view.setUint16(32, NUM_CHANNELS * (BITS_PER_SAMPLE / 8), true); // BlockAlign
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length, true);

  // Write PCM data
  const wavData = new Uint8Array(wavBuffer);
  wavData.set(pcmData, wavHeaderSize);

  return wavBuffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
