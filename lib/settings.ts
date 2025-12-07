export type Theme = "sepia" | "white" | "dark";
export type TextAlign = "left" | "right" | "center" | "justify";
export type AzureRegion = "eastus2";
export type AzureTTSVoice =
  | "en-US-Ava:DragonHDLatestNeural"
  | "en-US-JennyNeural"
  | "en-US-GuyNeural"
  | "en-GB-SoniaNeural";

export type BoldRatio = "off" | "low" | "medium" | "high";

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  boldRatio: BoldRatio;
  fontFamily: string;
  theme: Theme;
  pageWidth: number;
  readingPadding: number;
  textAlign: TextAlign;
  // Azure TTS 设置
  azureApiKey: string;
  azureRegion: AzureRegion;
  azureVoice: AzureTTSVoice;
  // 播放设置
  autoPlayNext: boolean;
  ttsConcurrency: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18.5,
  lineHeight: 1.58,
  letterSpacing: 0.012,
  paragraphSpacing: 1.05,
  boldRatio: "medium",
  fontFamily: "Georgia, 'Times New Roman', serif",
  theme: "sepia",
  pageWidth: 680,
  readingPadding: 36,
  textAlign: "left",
  // Azure TTS 默认设置
  azureApiKey: "",
  azureRegion: "eastus2",
  azureVoice: "en-US-Ava:DragonHDLatestNeural",
  // 播放设置
  autoPlayNext: true,
  ttsConcurrency: 4,
};

export const SETTINGS_STORAGE_KEY = "bionicReaderSettings";

const THEME_CLASS_MAP: Record<Theme, string | null> = {
  sepia: null,
  white: "theme-white",
  dark: "theme-dark",
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

  const fontSizePx = clampNumber(settings.fontSize, 16, isMobile ? 22 : 24);
  const lineHeight = clampNumber(settings.lineHeight, 1.4, 1.85);
  const letterSpacingEm = clampNumber(settings.letterSpacing, -0.02, 0.06);
  const paragraphSpacingEm = clampNumber(settings.paragraphSpacing, 0.8, 1.3);
  const pageWidthPx = clampNumber(settings.pageWidth, 560, 840);
  const readingPaddingPx = clampNumber(
    settings.readingPadding,
    isMobile ? 12 : 16,
    isMobile ? 32 : 80
  );

  const responsiveFontSize = isMobile
    ? `clamp(16px, calc(${fontSizePx}px + 0.6vw), 22px)`
    : `clamp(17px, calc(${fontSizePx}px + 0.35vw), 24px)`;

  const responsivePageWidth = isMobile
    ? "92vw"
    : `clamp(560px, 72vw, ${pageWidthPx}px)`;

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

  if (typeof document !== "undefined") {
    const { body } = document;
    if (!body) return;

    body.classList.remove("theme-white", "theme-dark");

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
