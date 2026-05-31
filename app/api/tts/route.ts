import { NextRequest } from "next/server";
import {
  TTS_GENERATION_ERROR,
  errorResponse,
  readJsonRequest,
  readResponseErrorMessage,
  withApiError,
} from "@/lib/http";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { parseRequiredString, parseTtsText } from "@/lib/ttsRoute";
import {
  audioJsonResponse,
  clampRounded,
  escapeXml,
  formatSignedUnit,
} from "@/lib/ttsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TTSRequest {
  text: string;
  apiKey: string;
  region?: string;
  voice?: string;
  rate?: number;
  volume?: number;
  pauseMs?: number;
}

export async function POST(request: NextRequest): Promise<Response> {
  const json = await readJsonRequest<TTSRequest>(request);
  if (!json.ok) return json.response;

  const text = parseTtsText(json.body.text, {
    requiredError: "缺少必要参数: text 或 apiKey",
    lengthError: "文本过长，请分段生成（最大 5000 字符）",
    maxLength: 5000,
  });
  const apiKey = parseRequiredString(
    json.body.apiKey,
    "缺少必要参数: text 或 apiKey"
  );

  if (!text.ok) return errorResponse(text.error, 400);
  if (!apiKey.ok) return errorResponse(apiKey.error, 400);

  const {
    region = DEFAULT_SETTINGS.azureRegion,
    voice = DEFAULT_SETTINGS.azureVoice,
    rate = DEFAULT_SETTINGS.ttsRate,
    volume = DEFAULT_SETTINGS.ttsVolume,
    pauseMs = DEFAULT_SETTINGS.ttsPauseMs,
  } = json.body;

  const langMatch = voice.match(/^([a-z]{2}-[A-Z]{2})/);
  const lang = langMatch ? langMatch[1] : "en-US";

  const ratePercent = clampRounded((rate - 1) * 100, -50, 50);
  const volumeDb = clampRounded((volume - 1) * 12, -20, 6);
  const normalizedPause = clampRounded(pauseMs, 0, 2000);

  const rateAttr = formatSignedUnit(ratePercent, "%");
  const volumeAttr =
    volumeDb === 0 ? "default" : formatSignedUnit(volumeDb, "dB");

  const ssml = `<speak version='1.0' xml:lang='${lang}'>
  <voice name='${voice}'>
    <prosody rate='${rateAttr}' volume='${volumeAttr}'>
      ${escapeXml(text.value)}
    </prosody>
    <break time='${normalizedPause}ms'/>
  </voice>
</speak>`;

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  return withApiError(async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey.value,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "BionicReader/1.0",
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await readResponseErrorMessage(response);

      if (response.status === 401 || response.status === 403) {
        return errorResponse("Azure API Key 无效或无权限", 401);
      }

      if (response.status === 400) {
        return errorResponse("请求格式错误，请检查语音设置", 400);
      }

      return errorResponse(errorText || "TTS 服务请求失败", response.status);
    }

    return audioJsonResponse(await response.arrayBuffer(), "audio/mpeg");
  }, TTS_GENERATION_ERROR);
}
