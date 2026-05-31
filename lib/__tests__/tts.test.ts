import { describe, expect, it } from "vitest";
import {
  buildTtsRequest,
  getTtsConfigError,
  normalizeWordTimings,
} from "@/lib/tts";
import type { TtsGenerationParams } from "@/lib/settings";

describe("tts client helpers", () => {
  it("builds Edge requests", () => {
    const params: TtsGenerationParams = {
      provider: "edge",
      voice: "en-US-EmmaMultilingualNeural",
      rate: 1.1,
      pitch: 5,
    };

    expect(buildTtsRequest("Hello", params)).toEqual({
      endpoint: "/api/tts/edge",
      body: {
        text: "Hello",
        voice: "en-US-EmmaMultilingualNeural",
        rate: 1.1,
        pitch: 5,
      },
    });
  });

  it("builds Azure requests", () => {
    const params: TtsGenerationParams = {
      provider: "azure",
      apiKey: "azure-key",
      region: "eastus",
      voice: "en-US-JennyNeural",
      rate: 1,
      volume: 1,
      pauseMs: 400,
    };

    expect(buildTtsRequest("Hello", params)).toEqual({
      endpoint: "/api/tts",
      body: {
        text: "Hello",
        apiKey: "azure-key",
        region: "eastus",
        voice: "en-US-JennyNeural",
        rate: 1,
        volume: 1,
        pauseMs: 400,
      },
    });
  });

  it("builds ElevenLabs requests with normalized optional fields", () => {
    const params: TtsGenerationParams = {
      provider: "elevenlabs",
      apiKey: "eleven-key",
      voiceId: "voice-id",
      modelId: "eleven_multilingual_v2",
      seed: undefined,
    };

    expect(buildTtsRequest("Hello", params)).toMatchObject({
      endpoint: "/api/tts/elevenlabs",
      body: {
        text: "Hello",
        apiKey: "eleven-key",
        voiceId: "voice-id",
        modelId: "eleven_multilingual_v2",
        seed: null,
      },
    });
  });

  it("returns provider configuration errors", () => {
    expect(
      getTtsConfigError({
        provider: "gemini",
        apiKey: "",
        model: "gemini-2.5-flash-preview-tts",
        voiceName: "Kore",
      })
    ).toBe("请先在设置中填入 Gemini API Key");

    expect(
      getTtsConfigError({
        provider: "elevenlabs",
        apiKey: "eleven-key",
        voiceId: "",
        modelId: "eleven_multilingual_v2",
      })
    ).toBe("请先填写 ElevenLabs Voice ID");
  });

  it("keeps valid word timing entries", () => {
    expect(
      normalizeWordTimings([
        { start: 0, end: 0.3 },
        { start: "bad", end: 0.5 },
        { start: 0.8, end: 0.7 },
        { start: 1, end: 1.4 },
      ])
    ).toEqual([
      { start: 0, end: 0.3 },
      { start: 1, end: 1.4 },
    ]);
  });
});
