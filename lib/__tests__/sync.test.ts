import { describe, expect, it } from "vitest";
import { parseSyncOptions } from "@/lib/dataStore/sync";

describe("sync helpers", () => {
  it("parses sync options", () => {
    expect(
      parseSyncOptions({
        direction: "local-to-cloud",
        scopes: ["articles", "settings", "articles"],
        articleIds: [" a ", "", "b", "a"],
      })
    ).toEqual({
      ok: true,
      options: {
        direction: "local-to-cloud",
        scopes: ["articles", "settings"],
        articleIds: ["a", "b"],
      },
    });
  });

  it("rejects invalid directions", () => {
    expect(parseSyncOptions({ direction: "bad", scopes: ["articles"] })).toEqual(
      { ok: false, error: "同步方向无效" }
    );
  });

  it("rejects invalid scopes", () => {
    expect(
      parseSyncOptions({ direction: "cloud-to-local", scopes: ["articles", "bad"] })
    ).toEqual({ ok: false, error: "同步范围无效" });
  });

  it("rejects invalid article ids", () => {
    expect(
      parseSyncOptions({
        direction: "cloud-to-local",
        scopes: ["articles"],
        articleIds: ["article-1", 2],
      })
    ).toEqual({ ok: false, error: "文章 ID 无效" });
  });
});
