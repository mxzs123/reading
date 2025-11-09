"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  ReaderSettings,
  SETTINGS_STORAGE_KEY,
  applySettings,
  mergeSettings,
} from "@/lib/settings";

interface SettingsContextValue {
  settings: ReaderSettings;
  updateSettings: (patch: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => mergeSettings(prev, patch));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ReaderSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.warn("设置加载失败", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const persistSettings = useCallback((value: ReaderSettings) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn("设置保存失败", error);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistSettings(settings);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [persistSettings, settings, hydrated]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings, hydrated }),
    [settings, updateSettings, resetSettings, hydrated]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings 必须在 SettingsProvider 内使用");
  }
  return context;
}
