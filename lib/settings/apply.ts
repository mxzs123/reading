import type { PageWidthMode, ReaderSettings, Theme } from "./types";

const THEME_CLASS_MAP: Record<Theme, string | null> = {
  sepia: null,
  white: "theme-white",
  dark: "theme-dark",
  oled: "theme-oled",
};

export function applySettings(settings: ReaderSettings): void {
  if (typeof document === "undefined") return;

  const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  const fontSizePx = clampNumber(settings.fontSize, 14, 30);
  const lineHeight = clampNumber(settings.lineHeight, 1.2, 2.4);
  const letterSpacingEm = clampNumber(settings.letterSpacing, -0.05, 0.12);
  const paragraphSpacingEm = clampNumber(settings.paragraphSpacing, 0.4, 2.0);
  const pageWidthMinPx = isMobile ? 260 : 400;
  const pageWidthPx = clampNumber(settings.pageWidth, pageWidthMinPx, 1200);
  const pageWidthVw = clampNumber(settings.pageWidthVw, 60, 96);
  const pageWidthCh = clampNumber(settings.pageWidthCh, 40, 120);
  const readingPaddingPx = clampNumber(settings.readingPadding, 8, 120);
  const textIndentEm = clampNumber(settings.textIndent ?? 0, 0, 2);
  const bodyFontWeight = clampNumber(settings.bodyFontWeight ?? 400, 300, 800);
  const bionicWeight = clampNumber(settings.bionicWeight ?? 600, 400, 850);
  const pageWidthMode: PageWidthMode = settings.pageWidthMode ?? "px";

  const responsiveFontSize = isMobile
    ? `clamp(15px, calc(${fontSizePx}px + 0.7vw), 30px)`
    : `clamp(17px, calc(${fontSizePx}px + 0.4vw), 30px)`;

  let responsivePageWidth: string;
  if (pageWidthMode === "vw") {
    responsivePageWidth = `${pageWidthVw}vw`;
  } else if (pageWidthMode === "ch") {
    responsivePageWidth = `${pageWidthCh}ch`;
  } else {
    responsivePageWidth = isMobile
      ? `min(${pageWidthPx}px, 94vw)`
      : `clamp(400px, 82vw, ${pageWidthPx}px)`;
  }

  const root = document.documentElement;

  root.style.setProperty("--font-size", responsiveFontSize);
  root.style.setProperty("--line-height", `${lineHeight}`);
  root.style.setProperty("--letter-spacing", `${letterSpacingEm}em`);
  root.style.setProperty("--paragraph-spacing", `${paragraphSpacingEm}em`);
  root.style.setProperty("--font-family", settings.fontFamily);
  root.style.setProperty("--page-width", responsivePageWidth);
  root.style.setProperty("--reading-padding", `${Math.max(readingPaddingPx, 0)}px`);
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
