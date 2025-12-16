export type Theme = "sepia" | "white" | "dark" | "oled";
export type TextAlign = "left" | "right" | "center" | "justify";
export type AzureRegion = "eastus2";
export type AzureTTSVoice =
  | "en-US-Ava:DragonHDLatestNeural"
  | "en-US-JennyNeural"
  | "en-US-GuyNeural"
  | "en-GB-SoniaNeural";

export type GeminiTTSModel =
  | "gemini-2.5-flash-preview-tts"
  | "gemini-2.5-pro-preview-tts";

export type TTSProvider = "azure" | "elevenlabs" | "gemini";
export type ApplyTextNormalization = "auto" | "on" | "off";

export type ElevenOutputFormat =
  | "mp3_22050_32"
  | "mp3_24000_48"
  | "mp3_44100_32"
  | "mp3_44100_64"
  | "mp3_44100_96"
  | "mp3_44100_128"
  | "mp3_44100_192"
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_32000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000"
  | "alaw_8000"
  | "opus_48000_32"
  | "opus_48000_64"
  | "opus_48000_96"
  | "opus_48000_128"
  | "opus_48000_192";

export interface ElevenVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

export type PageWidthMode = "px" | "vw" | "ch";
export type BoldRatio = "off" | "low" | "medium" | "high" | "custom";

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  boldRatio: BoldRatio;
  customBoldRatio: number;
  bionicWeight: number;
  bodyFontWeight: number;
  fontFamily: string;
  theme: Theme;
  pageWidthMode: PageWidthMode;
  pageWidth: number;
  pageWidthVw: number;
  pageWidthCh: number;
  readingPadding: number;
  textIndent: number;
  textAlign: TextAlign;
  // TTS 提供商
  ttsProvider: TTSProvider;
  // Azure TTS 设置
  azureApiKey: string;
  azureRegion: AzureRegion;
  azureVoice: AzureTTSVoice;
  // ElevenLabs TTS 设置
  elevenApiKey: string;
  elevenVoiceId: string;
  elevenModelId: string;
  elevenLanguageCode: string;
  elevenOutputFormat: ElevenOutputFormat;
  elevenStability: number;
  elevenSimilarityBoost: number;
  elevenStyle: number;
  elevenUseSpeakerBoost: boolean;
  elevenSpeed: number;
  elevenSeed: number | null;
  elevenApplyTextNormalization: ApplyTextNormalization;
  elevenEnableLogging: boolean;
  elevenOptimizeStreamingLatency: number | null;
  // Gemini TTS 设置
  geminiApiKey: string;
  geminiModel: GeminiTTSModel;
  geminiVoiceName: string;
  geminiLanguageCode: string;
  // 播放设置
  autoPlayNext: boolean;
  ttsConcurrency: number;
  ttsRate: number;
  ttsVolume: number;
  ttsPauseMs: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18.5,
  lineHeight: 1.58,
  letterSpacing: 0.012,
  paragraphSpacing: 1.05,
  boldRatio: "medium",
  customBoldRatio: 0.45,
  bionicWeight: 600,
  bodyFontWeight: 400,
  fontFamily: "Georgia, 'Times New Roman', serif",
  theme: "sepia",
  pageWidthMode: "px",
  pageWidth: 680,
  pageWidthVw: 92,
  pageWidthCh: 72,
  readingPadding: 36,
  textIndent: 0,
  textAlign: "left",
  // TTS 默认提供商
  ttsProvider: "azure",
  // Azure TTS 默认设置
  azureApiKey: "",
  azureRegion: "eastus2",
  azureVoice: "en-US-Ava:DragonHDLatestNeural",
  // ElevenLabs TTS 默认设置
  elevenApiKey: "",
  elevenVoiceId: "EXAVITQu4vr4xnSDxMaL",
  elevenModelId: "eleven_v3",
  elevenLanguageCode: "en",
  elevenOutputFormat: "mp3_44100_128",
  elevenStability: 0.5,
  elevenSimilarityBoost: 0.75,
  elevenStyle: 0,
  elevenUseSpeakerBoost: true,
  elevenSpeed: 1,
  elevenSeed: null,
  elevenApplyTextNormalization: "auto",
  elevenEnableLogging: true,
  elevenOptimizeStreamingLatency: null,
  // Gemini TTS 默认设置
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash-preview-tts",
  geminiVoiceName: "Kore",
  geminiLanguageCode: "en-US",
  // 播放设置
  autoPlayNext: true,
  ttsConcurrency: 4,
  ttsRate: 1,
  ttsVolume: 1,
  ttsPauseMs: 400,
};

export const SETTINGS_STORAGE_KEY = "bionicReaderSettings";

const THEME_CLASS_MAP: Record<Theme, string | null> = {
  sepia: null,
  white: "theme-white",
  dark: "theme-dark",
  oled: "theme-oled",
};

/**
 * 将设置应用到 CSS 变量与主题类
 */
export function applySettings(settings: ReaderSettings): void {
  if (typeof document === "undefined") return;

  const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  const fontSizePx = clampNumber(settings.fontSize, 14, isMobile ? 26 : 30);
  const lineHeight = clampNumber(settings.lineHeight, 1.2, 2.4);
  const letterSpacingEm = clampNumber(settings.letterSpacing, -0.05, 0.12);
  const paragraphSpacingEm = clampNumber(settings.paragraphSpacing, 0.4, 2.0);
  const pageWidthPx = clampNumber(settings.pageWidth, 400, 1200);
  const pageWidthVw = clampNumber(settings.pageWidthVw, 60, 96);
  const pageWidthCh = clampNumber(settings.pageWidthCh, 40, 120);
  const readingPaddingPx = clampNumber(
    settings.readingPadding,
    isMobile ? 8 : 12,
    isMobile ? 60 : 120
  );
  const textIndentEm = clampNumber(settings.textIndent ?? 0, 0, 2);
  const bodyFontWeight = clampNumber(settings.bodyFontWeight ?? 400, 300, 800);
  const bionicWeight = clampNumber(settings.bionicWeight ?? 600, 400, 850);
  const pageWidthMode: PageWidthMode =
    settings.pageWidthMode ?? "px";

  const responsiveFontSize = isMobile
    ? `clamp(15px, calc(${fontSizePx}px + 0.7vw), 26px)`
    : `clamp(17px, calc(${fontSizePx}px + 0.4vw), 30px)`;

  let responsivePageWidth: string;
  if (pageWidthMode === "vw") {
    const vwValue = isMobile ? Math.min(pageWidthVw, 94) : pageWidthVw;
    responsivePageWidth = `${vwValue}vw`;
  } else if (pageWidthMode === "ch") {
    const chValue = isMobile ? Math.min(pageWidthCh, 92) : pageWidthCh;
    responsivePageWidth = `${chValue}ch`;
  } else {
    responsivePageWidth = isMobile
      ? "92vw"
      : `clamp(400px, 82vw, ${pageWidthPx}px)`;
  }

  const root = document.documentElement;

  root.style.setProperty("--font-size", responsiveFontSize);
  root.style.setProperty("--line-height", `${lineHeight}`);
  root.style.setProperty("--letter-spacing", `${letterSpacingEm}em`);
  root.style.setProperty(
    "--paragraph-spacing",
    `${paragraphSpacingEm}em`
  );
  root.style.setProperty("--font-family", settings.fontFamily);
  root.style.setProperty("--page-width", responsivePageWidth);
  root.style.setProperty(
    "--reading-padding",
    `${Math.max(readingPaddingPx, 0)}px`
  );
  root.style.setProperty("--text-align", settings.textAlign);
  root.style.setProperty("--text-indent", `${textIndentEm}em`);
  root.style.setProperty("--body-font-weight", `${bodyFontWeight}`);
  root.style.setProperty("--bionic-weight", `${bionicWeight}`);

  if (typeof document !== "undefined") {
    const { body } = document;
    if (!body) return;

    body.classList.remove("theme-white", "theme-dark", "theme-oled");

    const themeClass = THEME_CLASS_MAP[settings.theme];
    if (themeClass) {
      body.classList.add(themeClass);
    }
  }
}

export function mergeSettings(
  base: ReaderSettings,
  patch: Partial<ReaderSettings>
): ReaderSettings {
  return { ...base, ...patch };
}
