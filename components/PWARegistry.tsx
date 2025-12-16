"use client";

import { useEffect } from "react";

export function PWARegistry() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 开发环境禁用/清理 SW，避免缓存旧的客户端 JS 导致 hydration mismatch。
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(() => {
          if (!("caches" in window)) return;
          return window.caches
            .keys()
            .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))));
        })
        .catch(() => {
          /* 静默失败即可 */
        });
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // 立即尝试获取最新的 SW，避免旧缓存残留
          registration.update().catch(() => {
            /* 静默失败即可 */
          });
        })
        .catch((error) => console.error("Service worker registration failed", error));
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
