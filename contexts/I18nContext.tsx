"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isLocale,
  localeLabels,
  translate,
  type Locale,
  type TFunction,
} from "@/lib/i18n";

const I18N_STORAGE_KEY = "bionicReaderLocale";
const DEFAULT_LOCALE: Locale = "zh-CN";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(I18N_STORAGE_KEY);
  if (isLocale(stored)) return stored;

  return DEFAULT_LOCALE;
}

interface I18nContextValue {
  locale: Locale;
  localeLabels: typeof localeLabels;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.title = translate(locale, "app.title");
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(I18N_STORAGE_KEY, locale);
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback<TFunction>(
    (key, values) => translate(locale, key, values),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, localeLabels, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
