import { DEFAULT_SETTINGS } from "./defaults";
import {
  isAllowedDeepSeekModel,
  isAllowedGeminiTtsModel,
  type ReaderSettings,
} from "./types";

type LegacyRule<TKey extends keyof ReaderSettings = keyof ReaderSettings> = {
  key: TKey;
  values: ReadonlySet<ReaderSettings[TKey]>;
};

const LEGACY_READING_DEFAULTS: ReadonlyArray<LegacyRule> = [
  { key: "boldRatio", values: new Set<ReaderSettings["boldRatio"]>(["medium"]) },
  { key: "customBoldRatio", values: new Set([0.45]) },
  { key: "bionicWeight", values: new Set([600, 560, 520]) },
  { key: "fontSize", values: new Set([18.5, 18.75, 19]) },
  { key: "lineHeight", values: new Set([1.58, 1.7, 1.78, 1.82]) },
  { key: "pageWidth", values: new Set([680, 700, 720]) },
  { key: "paragraphSpacing", values: new Set([1.05, 1.28, 1.4, 1.55]) },
  { key: "readingPadding", values: new Set([36, 44, 52]) },
  { key: "pageWidthVw", values: new Set([92]) },
  { key: "pageWidthCh", values: new Set([68, 72]) },
  {
    key: "fontFamily",
    values: new Set([
      "\"Source Serif 4\", \"Noto Serif\", \"Iowan Old Style\", \"Songti SC\", \"Yu Mincho\", Georgia, serif",
      "\"Literata\", Georgia, \"Times New Roman\", serif",
      "Georgia, 'Times New Roman', serif",
      "'Times New Roman', Georgia, serif",
      "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
      "Arial, 'Helvetica Neue', Helvetica, sans-serif",
      "Verdana, Geneva, sans-serif",
      "Tahoma, Geneva, sans-serif",
      "'Trebuchet MS', Helvetica, sans-serif",
      "'Courier New', Courier, monospace",
    ]),
  },
];

export function sanitizeSettings(value: ReaderSettings): ReaderSettings {
  const migrated = migrateLegacyReadingDefaults(value);
  const geminiModel = isAllowedGeminiTtsModel(migrated.geminiModel)
    ? migrated.geminiModel
    : DEFAULT_SETTINGS.geminiModel;
  const deepseekModel = isAllowedDeepSeekModel(migrated.deepseekModel)
    ? migrated.deepseekModel
    : DEFAULT_SETTINGS.deepseekModel;

  return { ...migrated, geminiModel, deepseekModel, letterSpacing: 0 };
}

function migrateLegacyReadingDefaults(value: ReaderSettings): ReaderSettings {
  return LEGACY_READING_DEFAULTS.reduce(
    (settings, rule) => restoreDefaultForLegacyValue(settings, rule),
    value
  );
}

function restoreDefaultForLegacyValue<TKey extends keyof ReaderSettings>(
  settings: ReaderSettings,
  rule: LegacyRule<TKey>
): ReaderSettings {
  return rule.values.has(settings[rule.key])
    ? { ...settings, [rule.key]: DEFAULT_SETTINGS[rule.key] }
    : settings;
}
