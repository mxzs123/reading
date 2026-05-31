"use client";

import { useState } from "react";
import { SwitchField } from "@/components/ui";
import styles from "./settingsStyles.module.css";

type SyncDirection = "local-to-cloud" | "cloud-to-local";
type SyncScope = "articles" | "settings";

interface SyncResult {
  articles: number;
  settings: number;
}

export function SyncTab() {
  const [direction, setDirection] = useState<SyncDirection>("local-to-cloud");
  const [syncArticles, setSyncArticles] = useState(true);
  const [syncSettings, setSyncSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    const scopes: SyncScope[] = [];
    if (syncArticles) scopes.push("articles");
    if (syncSettings) scopes.push("settings");

    setSyncing(true);
    setMessage("");

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, scopes }),
      });

      const data = (await response.json()) as Partial<SyncResult> & {
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error || "同步失败");
        return;
      }

      setMessage(
        `已同步 ${data.articles ?? 0} 篇文章，${data.settings ?? 0} 组设置`
      );
    } catch {
      setMessage("同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const hasScope = syncArticles || syncSettings;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>数据同步</div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>同步方向</label>
        <select
          className={styles.select}
          value={direction}
          onChange={(event) => setDirection(event.target.value as SyncDirection)}
        >
          <option value="local-to-cloud">本地到云端</option>
          <option value="cloud-to-local">云端到本地</option>
        </select>
      </div>

      <SwitchField
        label="同步文章"
        checked={syncArticles}
        onChange={setSyncArticles}
      />

      <SwitchField
        label="同步设置"
        checked={syncSettings}
        onChange={setSyncSettings}
      />

      <button
        type="button"
        className={styles.calloutButton}
        disabled={!hasScope || syncing}
        onClick={handleSync}
      >
        {syncing ? "同步中..." : "开始同步"}
      </button>

      {message ? <p className={styles.apiKeyHint}>{message}</p> : null}
    </section>
  );
}
