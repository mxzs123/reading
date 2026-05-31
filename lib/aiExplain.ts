import type { DeepSeekModel } from "./settings/types";

export interface AiExplainTarget {
  text: string;
  paragraphText: string;
  beforeContext: string;
  afterContext: string;
}

export interface AiExplainConfig {
  apiKey: string;
  model: DeepSeekModel;
  maxTokens: number;
}

export interface AiExplainRequestBody extends AiExplainTarget, AiExplainConfig {}

export function normalizeAiExplainText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function clampAiContextChars(value: number): number {
  return Math.max(300, Math.min(4000, Math.round(value)));
}

export function clampAiMaxTokens(value: number): number {
  return Math.max(200, Math.min(2000, Math.round(value)));
}

export function buildAiExplainTarget(
  articleText: string,
  paragraphText: string,
  selectedText: string,
  contextChars: number
): AiExplainTarget {
  const safeContextChars = clampAiContextChars(contextChars);
  const cleanSelectedText = normalizeAiExplainText(selectedText);
  const cleanParagraphText = paragraphText.trim();
  const paragraphStart = articleText.indexOf(paragraphText);

  if (paragraphStart < 0) {
    return {
      text: cleanSelectedText,
      paragraphText: cleanParagraphText,
      beforeContext: "",
      afterContext: "",
    };
  }

  const paragraphEnd = paragraphStart + paragraphText.length;
  const beforeStart = Math.max(0, paragraphStart - safeContextChars);
  const afterEnd = Math.min(articleText.length, paragraphEnd + safeContextChars);

  return {
    text: cleanSelectedText,
    paragraphText: cleanParagraphText,
    beforeContext: articleText.slice(beforeStart, paragraphStart).trim(),
    afterContext: articleText.slice(paragraphEnd, afterEnd).trim(),
  };
}
