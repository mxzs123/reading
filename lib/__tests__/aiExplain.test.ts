import { describe, expect, it } from "vitest";
import {
  buildAiExplainTarget,
  clampAiContextChars,
  normalizeAiExplainText,
} from "../aiExplain";

describe("aiExplain helpers", () => {
  it("normalizes selected text whitespace", () => {
    expect(normalizeAiExplainText("  hello\n   world  ")).toBe("hello world");
  });

  it("builds paragraph-adjacent context", () => {
    const article = [
      "Before context sentence.",
      "The quick brown fox jumps over the lazy dog.",
      "After context sentence.",
    ].join("\n\n");

    const target = buildAiExplainTarget(
      article,
      "The quick brown fox jumps over the lazy dog.",
      "quick",
      100
    );

    expect(target).toEqual({
      text: "quick",
      paragraphText: "The quick brown fox jumps over the lazy dog.",
      beforeContext: "Before context sentence.",
      afterContext: "After context sentence.",
    });
  });

  it("returns empty adjacent context when paragraph cannot be located", () => {
    const target = buildAiExplainTarget(
      "A different article",
      "A missing paragraph",
      "missing",
      100
    );

    expect(target.beforeContext).toBe("");
    expect(target.afterContext).toBe("");
  });

  it("clamps context length", () => {
    expect(clampAiContextChars(20)).toBe(300);
    expect(clampAiContextChars(5000)).toBe(4000);
  });
});
