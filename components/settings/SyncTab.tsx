"use client";

import { useState } from "react";
import { SwitchField } from "@/components/ui";
import { useI18n } from "@/contexts/I18nContext";
import styles from "./settingsStyles.module.css";

type SyncDirection = "local-to-cloud" | "cloud-to-local";
type SyncScope = "articles" | "settings";

interface SyncResult {
  articles: number;
  settings: number;
}

export function SyncTab() {
  const { t } = useI18n();
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

      const data = (await response.json()) as Partial<SyncResult>;

      if (!response.ok) {
        setMessage(t("settings.sync.failed"));
        return;
      }

      setMessage(
        t("settings.sync.success", {
          articles: data.articles ?? 0,
          settings: data.settings ?? 0,
        })
      );
    } catch {
      setMessage(t("settings.sync.failed"));
    } finally {
      setSyncing(false);
    }
  };

  const hasScope = syncArticles || syncSettings;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>{t("settings.sync.section")}</div>

      <div className={styles.fieldColumn}>
        <label className={styles.fieldLabel}>{t("settings.sync.direction")}</label>
        <select
          className={styles.select}
          value={direction}
          onChange={(event) => setDirection(event.target.value as SyncDirection)}
        >
          <option value="local-to-cloud">{t("settings.sync.localToCloud")}</option>
          <option value="cloud-to-local">{t("settings.sync.cloudToLocal")}</option>
        </select>
      </div>

      <SwitchField
        label={t("settings.sync.articles")}
        checked={syncArticles}
        onChange={setSyncArticles}
      />

      <SwitchField
        label={t("settings.sync.settings")}
        checked={syncSettings}
        onChange={setSyncSettings}
      />

      <button
        type="button"
        className={styles.calloutButton}
        disabled={!hasScope || syncing}
        onClick={handleSync}
      >
        {syncing ? t("settings.sync.syncing") : t("settings.sync.start")}
      </button>

      {message ? <p className={styles.apiKeyHint}>{message}</p> : null}
    </section>
  );
}
