import type { WordTiming } from "./storage";

function isWordTiming(value: unknown): value is WordTiming {
  if (!value || typeof value !== "object") return false;

  const start = (value as { start?: unknown }).start;
  const end = (value as { end?: unknown }).end;
  return (
    typeof start === "number" &&
    typeof end === "number" &&
    Number.isFinite(start) &&
    Number.isFinite(end)
  );
}

export function normalizeWordTimings(value: unknown): WordTiming[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const normalized = value
    .filter(isWordTiming)
    .filter((item) => item.end >= item.start)
    .map(({ start, end }) => ({ start, end }));

  return normalized.length ? normalized : undefined;
}

export function parseWordTimingsJson(
  value: FormDataEntryValue | null
): WordTiming[] | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isWordTiming)) {
    throw new Error("wordTimings 格式错误");
  }

  return parsed;
}
