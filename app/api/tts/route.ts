import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TTSRequest {
  text: string;
  apiKey: string;
  region?: string;
  voice?: string;
}

export async function POST(request: NextRequest) {
  let body: TTSRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const {
    text,
    apiKey,
    region = "eastus",
    voice = "en-US-Ava:DragonHDLatestNeural",
  } = body;

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

  // 从语音名称中提取语言代码 (例如 "en-US-Ava:DragonHDLatestNeural" -> "en-US")
  const langMatch = voice.match(/^([a-z]{2}-[A-Z]{2})/);
  const lang = langMatch ? langMatch[1] : "en-US";

  // 构建 SSML
  const ssml = `<speak version='1.0' xml:lang='${lang}'>
  <voice name='${voice}'>${escapeXml(text)}</voice>
</speak>`;

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "BionicReader/1.0",
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

      if (response.status === 401 || response.status === 403) {
        return Response.json(
          { error: "Azure API Key 无效或无权限" },
          { status: 401 }
        );
      }

      if (response.status === 400) {
        return Response.json(
          { error: "请求格式错误，请检查语音设置" },
          { status: 400 }
        );
      }

      return Response.json(
        { error: errorText.slice(0, 300) || "TTS 服务请求失败" },
        { status: response.status }
      );
    }

    // Azure 直接返回音频二进制数据
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);

    return Response.json({
      audio: audioBase64,
      mimeType: "audio/mpeg",
    });
  } catch (error) {
    console.error("TTS 生成失败", error);
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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
