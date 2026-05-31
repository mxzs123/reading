"use client";

import type { ReactNode } from "react";
import styles from "./form.module.css";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  rows = 4,
}: TextFieldProps) {
  return (
    <div className={styles.fieldColumn}>
      <label className={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.apiKeyInput}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          type="text"
          className={styles.apiKeyInput}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
  );
}
