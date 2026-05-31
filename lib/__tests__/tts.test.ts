import { describe, expect, it } from "vitest";
import {
  buildTtsRequest,
  getTtsConfigError,
  normalizeWordTimings,
} from "@/lib/tts";
import {
  clampRounded,
  escapeXml,
  formatSignedUnit,
  splitTextByByteLength,
} from "@/lib/ttsServer";
import {
  buildPromptedText,
  inferTtsMimeType,
  parseRequiredString,
  parseTtsText,
} from "@/lib/ttsRoute";
import {
  buildTtsGenerationParams,
  DEFAULT_SETTINGS,
  type TtsGenerationParams,
} from "@/lib/settings";

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

  it("builds provider params from settings", () => {
    expect(
      buildTtsGenerationParams({
        ...DEFAULT_SETTINGS,
        ttsProvider: "gemini",
        geminiApiKey: "gemini-key",
        geminiVoiceName: "Puck",
        geminiUseMultiSpeaker: true,
      })
    ).toMatchObject({
      provider: "gemini",
      apiKey: "gemini-key",
      voiceName: "Puck",
      multiSpeaker: true,
    });

    expect(
      buildTtsGenerationParams({
        ...DEFAULT_SETTINGS,
        ttsProvider: "edge",
        edgeVoice: "en-US-AvaMultilingualNeural",
        edgePitch: 10,
      })
    ).toEqual({
      provider: "edge",
      voice: "en-US-AvaMultilingualNeural",
      rate: DEFAULT_SETTINGS.edgeRate,
      pitch: 10,
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

  it("formats SSML helper values", () => {
    expect(escapeXml(`Tom & "Jerry" <cat>`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;cat&gt;"
    );
    expect(clampRounded(82.4, -50, 80)).toBe(80);
    expect(formatSignedUnit(12, "%")).toBe("+12%");
    expect(formatSignedUnit(-4, "Hz")).toBe("-4Hz");
  });

  it("splits text by byte length", () => {
    expect(splitTextByByteLength("one two three", 8)).toEqual([
      "one two",
      "three",
    ]);
  });

  it("parses required TTS request strings", () => {
    expect(parseRequiredString(" key ", "missing", { trimValue: true })).toEqual(
      { ok: true, value: "key" }
    );
    expect(
      parseTtsText("   ", {
        requiredError: "missing text",
        lengthError: "too long",
        maxLength: 10,
        trimForEmpty: true,
      })
    ).toEqual({ ok: false, error: "missing text" });
    expect(
      parseTtsText("hello world", {
        requiredError: "missing text",
        lengthError: "too long",
        maxLength: 5,
      })
    ).toEqual({ ok: false, error: "too long" });
  });

  it("maps TTS output formats to mime types", () => {
    expect(inferTtsMimeType("mp3_44100_128")).toBe("audio/mpeg");
    expect(inferTtsMimeType("opus_48000_128")).toBe("audio/ogg");
    expect(inferTtsMimeType("pcm_24000")).toBe("audio/wav");
    expect(inferTtsMimeType("unknown")).toBe("audio/mpeg");
  });

  it("builds prompted Gemini text", () => {
    expect(buildPromptedText(" Hello ", "Say softly:")).toBe(
      "Say softly: Hello"
    );
    expect(buildPromptedText("Hello", "Read {{text}} slowly")).toBe(
      "Read Hello slowly"
    );
    expect(buildPromptedText("Hello", "Whisper")).toBe("Whisper\n\nHello");
  });
});
