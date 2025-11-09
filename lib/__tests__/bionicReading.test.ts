import { describe, expect, it } from "vitest";
import { convertToBionicReading } from "@/lib/bionicReading";

describe("convertToBionicReading", () => {
  it("应当将文本分段并生成仿生阅读 HTML", () => {
    const input = "Hello world\n\nThis is a test";
    const html = convertToBionicReading(input, { boldRatio: "medium" });

    expect(html).toContain("<p class=\"converted-paragraph\">");
    expect(html.match(/<p class="converted-paragraph">/g)).toHaveLength(2);
    expect(html).toContain("<span class=\"bionic-word\" data-word=\"Hello\"");
  });

  it("应当根据强度计算加粗部分", () => {
    const html = convertToBionicReading("reading", { boldRatio: "high" });
    const match = html.match(/<b>(.*?)<\/b>/);
    expect(match?.[1]).toBe("readi");
  });

  it("关闭仿生模式时不应包含加粗标签", () => {
    const html = convertToBionicReading("focus", {
      boldRatio: "medium",
      enableBionic: false,
    });
    expect(html).not.toContain("<b>");
    expect(html).toContain("data-word=\"focus\"");
  });
});
