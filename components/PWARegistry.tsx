"use client";

import { useEffect } from "react";

export function PWARegistry() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
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
