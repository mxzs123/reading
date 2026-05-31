type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type RequiredStringOptions = {
  trimForEmpty?: boolean;
  trimValue?: boolean;
};

type TextOptions = RequiredStringOptions & {
  maxLength: number;
  requiredError: string;
  lengthError: string;
};

export function parseRequiredString(
  value: unknown,
  error: string,
  options: RequiredStringOptions = {}
): ParseResult<string> {
  if (typeof value !== "string") return { ok: false, error };

  const checkValue =
    options.trimForEmpty || options.trimValue ? value.trim() : value;
  if (!checkValue) return { ok: false, error };

  return { ok: true, value: options.trimValue ? value.trim() : value };
}

export function parseTtsText(
  value: unknown,
  options: TextOptions
): ParseResult<string> {
  const parsed = parseRequiredString(value, options.requiredError, options);
  if (!parsed.ok) return parsed;

  if (parsed.value.length > options.maxLength) {
    return { ok: false, error: options.lengthError };
  }

  return parsed;
}

export function inferTtsMimeType(outputFormat?: string): string {
  if (!outputFormat) return "audio/mpeg";

  if (outputFormat.startsWith("mp3_")) return "audio/mpeg";
  if (outputFormat.startsWith("opus_")) return "audio/ogg";
  if (outputFormat.startsWith("pcm_")) return "audio/wav";
  if (outputFormat.startsWith("ulaw_") || outputFormat.startsWith("alaw_")) {
    return "audio/wav";
  }

  return "audio/mpeg";
}

export function buildPromptedText(text: string, stylePrompt: string): string {
  const normalizedText = text.trim();
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
