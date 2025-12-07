export type Token = { type: "word"; value: string } | { type: "text"; value: string };

const WORD_REGEX = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export function buildParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized.trim()) return [];

  return normalized
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function buildParagraphKey(paragraphs: string[]): string {
  if (!paragraphs.length) return "paragraphs-empty";
  const hashBase = paragraphs.join("|");
  let hash = 0;
  for (let i = 0; i < hashBase.length; i += 1) {
    hash = (hash * 31 + hashBase.charCodeAt(i)) >>> 0;
  }
  return `paragraphs-${paragraphs.length}-${hash}`;
}

export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  if (!content) return tokens;

  let lastIndex = 0;
  content.replace(WORD_REGEX, (match, offset) => {
    if (offset > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, offset) });
    }
    tokens.push({ type: "word", value: match });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}

export function renderBionicWord(
  word: string,
  ratio: "off" | "low" | "medium" | "high"
) {
  if (ratio === "off") {
    return { lead: "", tail: word };
  }

  const map: Record<"low" | "medium" | "high", number> = {
    low: 0.3,
    medium: 0.45,
    high: 0.6,
  };
  const boldCount = Math.min(
    Math.max(Math.ceil(word.length * map[ratio]), 1),
    word.length
  );
  const lead = word.slice(0, boldCount);
  const tail = word.slice(boldCount);
  return { lead, tail };
}

export function base64ToAudioBlob(base64: string, mimeType: string = "audio/mpeg"): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
