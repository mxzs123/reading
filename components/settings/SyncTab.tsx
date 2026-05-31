"use client";

import { useState } from "react";
import { SelectField, SwitchField } from "@/components/ui";
import { useI18n } from "@/contexts/I18nContext";
import { postJson } from "@/lib/clientRequest";
import { SettingsHint, SettingsSection } from "./SettingsLayout";
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
      const data = await postJson<Partial<SyncResult>>(
        "/api/sync",
        { direction, scopes },
        t("settings.sync.failed")
      );

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
    <SettingsSection title={t("settings.sync.section")}>
      <SelectField
        label={t("settings.sync.direction")}
        value={direction}
        options={[
          { value: "local-to-cloud", label: t("settings.sync.localToCloud") },
          { value: "cloud-to-local", label: t("settings.sync.cloudToLocal") },
        ] as const}
        onChange={setDirection}
      />

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

      {message ? <SettingsHint>{message}</SettingsHint> : null}
    </SettingsSection>
  );
}
