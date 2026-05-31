"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/contexts/I18nContext";
import styles from "./form.module.css";

interface SecretTextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
}

export function SecretTextField({
  label,
  value,
  placeholder,
  onChange,
  hint,
}: SecretTextFieldProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.fieldColumn}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.apiKeyWrapper}>
        <input
          type={visible ? "text" : "password"}
          className={styles.apiKeyInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={styles.apiKeyToggle}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? t("common.hide") : t("common.show")}
        </button>
      </div>
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
  );
}
