import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";
import WebSocket from "ws";
import { errorResponse, readJsonRequest, withApiError } from "@/lib/http";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { parseTtsText } from "@/lib/ttsRoute";
import {
  audioJsonResponse,
  clampRounded,
  escapeXml,
  formatSignedUnit,
  replaceIncompatibleXmlCharacters,
  splitTextByByteLength,
} from "@/lib/ttsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH_SECONDS = 11_644_473_600;
const S_TO_100NS = 10_000_000;
const MAX_CHUNK_BYTES = 4096;
const REQUEST_TIMEOUT_MS = 45_000;
const EDGE_USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 ` +
  `Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`;

interface EdgeTtsRequest {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export async function POST(request: NextRequest): Promise<Response> {
  const json = await readJsonRequest<EdgeTtsRequest>(request);
  if (!json.ok) return json.response;

  const text = parseTtsText(json.body.text, {
    requiredError: "缺少必要参数: text",
    lengthError: "文本过长，请分段生成（最大 6000 字符）",
    maxLength: 6000,
    trimForEmpty: true,
  });
  if (!text.ok) return errorResponse(text.error, 400);

  const {
    voice = DEFAULT_SETTINGS.edgeVoice,
    rate = DEFAULT_SETTINGS.edgeRate,
    pitch = DEFAULT_SETTINGS.edgePitch,
  } = json.body;

  return withApiError(async () => {
    const options = {
      voice,
      rate: formatSignedUnit(clampRounded((rate - 1) * 100, -50, 80), "%"),
      pitch: formatSignedUnit(clampRounded(pitch, -50, 50), "Hz"),
    };
    const audioBuffers: Buffer[] = [];

    for (const chunk of splitTextByByteLength(
      replaceIncompatibleXmlCharacters(text.value),
      MAX_CHUNK_BYTES
    )) {
      audioBuffers.push(await synthesizeEdgeChunk(chunk, options));
    }

    return audioJsonResponse(Buffer.concat(audioBuffers), "audio/mpeg");
  }, "Edge TTS 生成失败，请稍后重试");
}

function synthesizeEdgeChunk(
  text: string,
  options: { voice: string; rate: string; pitch: string }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const requestId = connectId();
    const ws = new WebSocket(
      `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
        `&ConnectionId=${requestId}` +
        `&Sec-MS-GEC=${generateSecMsGec()}` +
        `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`,
      {
        host: "speech.platform.bing.com",
        origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        headers: {
          "User-Agent": EDGE_USER_AGENT,
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Cookie: `muid=${randomUUID().replaceAll("-", "").toUpperCase()};`,
        },
      }
    );

    const audioData: Buffer[] = [];
    let settled = false;
    const timeoutId = setTimeout(() => {
      settle(new Error("Edge TTS 请求超时"));
    }, REQUEST_TIMEOUT_MS);

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      ws.close();

      if (error) {
        reject(error);
        return;
      }

      const audio = Buffer.concat(audioData);
      if (audio.length === 0) {
        reject(new Error("未收到音频数据"));
        return;
      }

      resolve(audio);
    };

    ws.on("message", (rawData, isBinary) => {
      if (!isBinary) {
        const data = rawData.toString();
        if (data.includes("Path:turn.end")) {
          settle();
        }
        return;
      }

      const data = rawData as Buffer;
      const audio = readAudioPayload(data);
      if (audio.length > 0) {
        audioData.push(audio);
      }
    });

    ws.on("error", (error) => {
      settle(error instanceof Error ? error : new Error("Edge TTS 连接失败"));
    });

    ws.on("open", () => {
      ws.send(buildSpeechConfigMessage(), { compress: true }, (configError) => {
        if (configError) {
          settle(configError);
          return;
        }

        ws.send(
          buildSsmlMessage(text, options),
          { compress: true },
          (ssmlError) => {
            if (ssmlError) {
              settle(ssmlError);
            }
          }
        );
      });
    });
  });
}

function readAudioPayload(data: Buffer): Buffer {
  if (data.length < 2) return Buffer.alloc(0);

  const headerLength = data.readUInt16BE(0);
  const headerEnd = headerLength + 2;
  if (headerEnd > data.length) return Buffer.alloc(0);

  const header = data.subarray(2, headerEnd).toString("utf8");
  if (!header.includes("Path:audio")) return Buffer.alloc(0);

  return data.subarray(headerEnd + 2);
}

function buildSpeechConfigMessage(): string {
  const speechConfig = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: "false",
            wordBoundaryEnabled: "false",
          },
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
      },
    },
  };

  return (
    `X-Timestamp:${dateToString()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    `${JSON.stringify(speechConfig)}\r\n`
  );
}

function buildSsmlMessage(
  text: string,
  options: { voice: string; rate: string; pitch: string }
): string {
  const ssml =
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    `<voice name='${escapeXml(options.voice)}'>` +
    `<prosody pitch='${options.pitch}' rate='${options.rate}' volume='+0%'>` +
    `${escapeXml(text)}` +
    "</prosody>" +
    "</voice>" +
    "</speak>";

  return (
    `X-RequestId:${connectId()}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${dateToString()}Z\r\n` +
    "Path:ssml\r\n\r\n" +
    ssml
  );
}

function generateSecMsGec(): string {
  const unixSeconds = Date.now() / 1000;
  const windowsSeconds = unixSeconds + WIN_EPOCH_SECONDS;
  const roundedSeconds = windowsSeconds - (windowsSeconds % 300);
  const ticks = Math.round(roundedSeconds * S_TO_100NS);
  return createHash("sha256")
    .update(`${ticks}${TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

function dateToString(): string {
  return new Date().toString();
}

function connectId(): string {
  return randomUUID().replaceAll("-", "");
}
