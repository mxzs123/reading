export type Theme = "sepia" | "white" | "dark";
export type TextAlign = "left" | "right" | "center" | "justify";
export type AzureRegion = "eastus2";
export type AzureTTSVoice =
  | "en-US-Ava:DragonHDLatestNeural"
  | "en-US-JennyNeural"
  | "en-US-GuyNeural"
  | "en-GB-SoniaNeural";

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  boldRatio: "low" | "medium" | "high";
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
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 20,
  lineHeight: 1.75,
  letterSpacing: 0,
  paragraphSpacing: 1.8,
  boldRatio: "low",
  fontFamily: "Charter, 'Bitstream Charter', Georgia, serif",
  theme: "sepia",
  pageWidth: 680,
  readingPadding: 40,
  textAlign: "left",
  // Azure TTS 默认设置
  azureApiKey: "",
  azureRegion: "eastus2",
  azureVoice: "en-US-Ava:DragonHDLatestNeural",
  // 播放设置
  autoPlayNext: true,
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

  const root = document.documentElement;

  root.style.setProperty("--font-size", `${settings.fontSize}px`);
  root.style.setProperty("--line-height", `${settings.lineHeight}`);
  root.style.setProperty(
    "--letter-spacing",
    `${settings.letterSpacing}em`
  );
  root.style.setProperty(
    "--paragraph-spacing",
    `${settings.paragraphSpacing}em`
  );
  root.style.setProperty("--font-family", settings.fontFamily);
  root.style.setProperty("--page-width", `${settings.pageWidth}px`);
  root.style.setProperty(
    "--reading-padding",
    `${Math.max(settings.readingPadding, 0)}px`
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
