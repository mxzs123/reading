export type BoldRatio = "low" | "medium" | "high";

export interface BionicOptions {
  boldRatio?: BoldRatio;
  enableBionic?: boolean;
}

const BOLD_RATIO_MAP: Record<BoldRatio, number> = {
  low: 0.3,
  medium: 0.45,
  high: 0.6,
};

const DEFAULT_OPTIONS: Required<BionicOptions> = {
  boldRatio: "medium",
  enableBionic: true,
};

/**
 * 将纯文本转换为仿生阅读 HTML
 */
export function convertToBionicReading(
  text: string,
  options: BionicOptions = {}
): string {
  const merged = { ...DEFAULT_OPTIONS, ...options };

  if (!text.trim()) {
    return "";
  }

  const paragraphs = text.split(/\n+/);

  return paragraphs
    .map((paragraph) => {
      if (!paragraph.trim()) {
        return "";
      }

      const convertedParagraph = convertParagraph(paragraph, merged);
      return `<p class="converted-paragraph">${convertedParagraph}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function convertParagraph(
  paragraph: string,
  options: Required<BionicOptions>
): string {
  const wordPattern = /\b([a-zA-Z]+(?:['\-][a-zA-Z]+)*)\b/g;

  return paragraph.replace(wordPattern, (match) => {
    return convertWord(match, options);
  });
}

function convertWord(word: string, options: Required<BionicOptions>): string {
  const length = word.length;
  if (!length) {
    return escapeHtml(word);
  }

  const ratio = BOLD_RATIO_MAP[options.boldRatio] ?? BOLD_RATIO_MAP.medium;
  let boldCount = Math.ceil(length * ratio);
  boldCount = Math.min(Math.max(boldCount, 1), length);

  const boldPart = word.substring(0, boldCount);
  const normalPart = word.substring(boldCount);

  const boldHtml = escapeHtml(boldPart);
  const normalHtml = escapeHtml(normalPart);

  const content = options.enableBionic
    ? `<b>${boldHtml}</b>${normalHtml}`
    : `${boldHtml}${normalHtml}`;

  return `<span class="bionic-word" data-word="${escapeAttribute(
    word
  )}" role="button" tabindex="0">${content}</span>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
