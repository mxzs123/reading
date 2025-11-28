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

// 敏感字段只存本地，不同步云端
const LOCAL_ONLY_FIELDS = ["azureApiKey"] as const;

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => mergeSettings(prev, patch));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // 从 localStorage 加载
  const loadFromLocalStorage = useCallback((): Partial<ReaderSettings> | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // 保存到 localStorage
  const saveToLocalStorage = useCallback((value: ReaderSettings) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn("设置保存到本地失败", error);
    }
  }, []);

  // 同步到云端（不含敏感字段）
  const syncToCloud = useCallback(async (value: ReaderSettings) => {
    try {
      // 移除敏感字段
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { azureApiKey: _azureApiKey, ...cloudSettings } = value;

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudSettings),
      });
    } catch (error) {
      console.warn("设置云端同步失败", error);
    }
  }, []);

  // 初始化：先从 localStorage 快速加载，再从云端同步
  useEffect(() => {
    async function init() {
      // 1. 先从 localStorage 快速加载
      const local = loadFromLocalStorage();
      const localSettings = local
        ? { ...DEFAULT_SETTINGS, ...local }
        : DEFAULT_SETTINGS;
      setSettings(localSettings);

      // 2. 尝试从云端同步
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const cloudSettings = await response.json();
          // 合并：云端设置 + 本地敏感字段
          const merged = {
            ...DEFAULT_SETTINGS,
            ...cloudSettings,
          };
          // 保留本地的敏感字段
          for (const field of LOCAL_ONLY_FIELDS) {
            if (local?.[field] !== undefined) {
              merged[field] = local[field];
            }
          }
          setSettings(merged);
          // 更新本地缓存
          saveToLocalStorage(merged);
        }
      } catch (error) {
        console.warn("云端设置加载失败，使用本地缓存", error);
      }

      setHydrated(true);
    }

    init();
  }, [loadFromLocalStorage, saveToLocalStorage]);

  // 应用设置到 CSS
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  // 设置变更时保存（本地 + 云端）
  useEffect(() => {
    if (!hydrated) return;

    // 本地保存（防抖 500ms）
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveToLocalStorage(settings);
    }, 500);

    // 云端同步（防抖 1000ms，避免频繁请求）
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
