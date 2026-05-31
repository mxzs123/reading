import { SENSITIVE_SETTINGS_FIELDS, type ReaderSettings } from "./types";

type SafeReaderSettings = Omit<
  ReaderSettings,
  (typeof SENSITIVE_SETTINGS_FIELDS)[number]
>;

export function removeSensitiveSettings(
  settings: Partial<ReaderSettings>
): Partial<SafeReaderSettings> {
  const safe = { ...settings } as Partial<
    Record<keyof ReaderSettings, ReaderSettings[keyof ReaderSettings]>
  >;

  for (const field of SENSITIVE_SETTINGS_FIELDS) {
    delete safe[field];
  }

  return safe as Partial<SafeReaderSettings>;
}

export function mergeSensitiveLocalSettings(
  settings: ReaderSettings,
  local: Partial<ReaderSettings> | null
): ReaderSettings {
  const merged = { ...settings };

  for (const field of SENSITIVE_SETTINGS_FIELDS) {
    if (local?.[field] !== undefined) {
      merged[field] = local[field];
    }
  }

  return merged;
}
