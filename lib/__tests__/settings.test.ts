import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeSensitiveLocalSettings,
  removeSensitiveSettings,
  sanitizeSettings,
  type ReaderSettings,
} from "@/lib/settings";

describe("settings helpers", () => {
  it("migrates old reading defaults to current reading defaults", () => {
    const sanitized = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      boldRatio: "medium",
      fontSize: 18.75,
      lineHeight: 1.7,
      pageWidth: 720,
      readingPadding: 44,
    });

    expect(sanitized.boldRatio).toBe(DEFAULT_SETTINGS.boldRatio);
    expect(sanitized.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(sanitized.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
    expect(sanitized.pageWidth).toBe(DEFAULT_SETTINGS.pageWidth);
    expect(sanitized.readingPadding).toBe(DEFAULT_SETTINGS.readingPadding);
  });

  it("normalizes constrained model and spacing settings", () => {
    const sanitized = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      deepseekModel: "legacy-deepseek" as ReaderSettings["deepseekModel"],
      geminiModel: "legacy-gemini" as ReaderSettings["geminiModel"],
      letterSpacing: 0.2,
    });

    expect(sanitized.deepseekModel).toBe(DEFAULT_SETTINGS.deepseekModel);
    expect(sanitized.geminiModel).toBe(DEFAULT_SETTINGS.geminiModel);
    expect(sanitized.letterSpacing).toBe(0);
  });

  it("keeps sensitive local settings when cloud settings are merged", () => {
    const merged = mergeSensitiveLocalSettings(
      {
        ...DEFAULT_SETTINGS,
        azureApiKey: "",
        deepseekApiKey: "",
      },
      {
        azureApiKey: "local-azure",
        deepseekApiKey: "local-deepseek",
      }
    );

    expect(merged.azureApiKey).toBe("local-azure");
    expect(merged.deepseekApiKey).toBe("local-deepseek");
  });

  it("removes sensitive values before settings sync", () => {
    const safe = removeSensitiveSettings({
      azureApiKey: "secret",
      deepseekApiKey: "secret",
      fontSize: 20,
    });

    expect(safe).toEqual({ fontSize: 20 });
  });
});
