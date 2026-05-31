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
  SETTINGS_STORAGE_KEY,
  applySettings,
  mergeSensitiveLocalSettings,
  removeSensitiveSettings,
  sanitizeSettings,
  type ReaderSettings,
} from "@/lib/settings";
import { requestJson, requestJsonBody } from "@/lib/clientRequest";

interface SettingsContextValue {
  settings: ReaderSettings;
  updateSetting: <TKey extends keyof ReaderSettings>(
    key: TKey,
    value: ReaderSettings[TKey]
  ) => void;
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSetting = useCallback(
    <TKey extends keyof ReaderSettings>(key: TKey, value: ReaderSettings[TKey]) => {
      patchSettings({ [key]: value } as Pick<ReaderSettings, TKey>);
    },
    [patchSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const loadFromLocalStorage = useCallback((): Partial<ReaderSettings> | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const saveToLocalStorage = useCallback((value: ReaderSettings) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn("设置保存到本地失败", error);
    }
  }, []);

  const syncToCloud = useCallback(async (value: ReaderSettings) => {
    try {
      await requestJsonBody<{ success: boolean }>(
        "/api/settings",
        "PUT",
        removeSensitiveSettings(value),
        "设置云端同步失败"
      );
    } catch (error) {
      console.warn("设置云端同步失败", error);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const local = loadFromLocalStorage();
      const localSettings = local
        ? { ...DEFAULT_SETTINGS, ...local }
        : DEFAULT_SETTINGS;
      setSettings(sanitizeSettings(localSettings));

      try {
        const cloudSettings = await requestJson<Partial<ReaderSettings>>(
          "/api/settings",
          {},
          "云端设置加载失败"
        );
        const merged = mergeSensitiveLocalSettings(
          { ...DEFAULT_SETTINGS, ...cloudSettings },
          local
        );
        const sanitized = sanitizeSettings(merged);
        setSettings(sanitized);
        saveToLocalStorage(sanitized);
      } catch (error) {
        console.warn("云端设置加载失败，使用本地缓存", error);
      }

      setHydrated(true);
    }

    init();
  }, [loadFromLocalStorage, saveToLocalStorage]);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!hydrated) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveToLocalStorage(settings);
    }, 500);

    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
    }
    cloudSyncTimerRef.current = setTimeout(() => {
      syncToCloud(settings);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, [settings, hydrated, saveToLocalStorage, syncToCloud]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSetting, resetSettings, hydrated }),
    [settings, updateSetting, resetSettings, hydrated]
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

export function useSettingFieldUpdater() {
  const { updateSetting } = useSettings();
  return useCallback(
    <TKey extends keyof ReaderSettings>(key: TKey) =>
      (value: ReaderSettings[TKey]) => updateSetting(key, value),
    [updateSetting]
  );
}
