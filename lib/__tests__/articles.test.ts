import { describe, expect, it } from "vitest";
import {
  getArticlePreview,
  getArticleStats,
  getArticleTitle,
  hasArticleWordTimings,
} from "@/lib/articles";
import type { Article } from "@/lib/storage";

function article(patch: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    title: "",
    text: "First paragraph.\n\nSecond paragraph has two words.",
    createdAt: 1,
    updatedAt: 2,
    ...patch,
  };
}

describe("article display helpers", () => {
  it("builds compact previews and fallback titles", () => {
    expect(getArticlePreview("  one\n two   three  ")).toBe("one two three");
    expect(getArticleTitle(article({ text: "Untitled text" }))).toBe("Untitled text");
    expect(getArticleTitle(article({ title: "Named" }))).toBe("Named");
  });

  it("counts words and paragraphs for article metadata", () => {
    expect(getArticleStats(article())).toEqual({ words: 7, paragraphs: 2 });
    expect(getArticleStats(article({ text: "   " }))).toEqual({ words: 0, paragraphs: 0 });
  });

  it("detects stored word timing data", () => {
    expect(hasArticleWordTimings(article())).toBe(false);
    expect(
      hasArticleWordTimings(
        article({
          segmentWordTimings: {
            "segment-1": [{ start: 0, end: 0.4 }],
          },
        })
      )
    ).toBe(true);
  });
});
