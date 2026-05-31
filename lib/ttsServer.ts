import { Buffer } from "node:buffer";

type AudioJsonPayload = string | ArrayBuffer | Uint8Array;

export function audioJsonResponse(
  audio: AudioJsonPayload,
  mimeType: string,
  extra: Record<string, unknown> = {}
): Response {
  const audioBase64 =
    typeof audio === "string"
      ? audio
      : Buffer.from(audio instanceof ArrayBuffer ? new Uint8Array(audio) : audio).toString("base64");
  return Response.json({ audio: audioBase64, mimeType, ...extra });
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function clampRounded(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function formatSignedUnit(value: number, unit: string): string {
  return `${value >= 0 ? "+" : ""}${value}${unit}`;
}

export function splitTextByByteLength(text: string, byteLength: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of text.trim().split(/(\s+)/)) {
    if (!part) continue;

    const next = current + part;
    if (current && Buffer.byteLength(next, "utf8") > byteLength) {
      chunks.push(current.trim());
      current = part.trimStart();
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function replaceIncompatibleXmlCharacters(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}
