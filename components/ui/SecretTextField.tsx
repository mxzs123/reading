"use client";

import type { ReactNode } from "react";
import styles from "./form.module.css";

interface SecretTextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
  hint?: ReactNode;
}

export function SecretTextField({
  label,
  value,
  placeholder,
  visible,
  onToggleVisible,
  onChange,
  hint,
}: SecretTextFieldProps) {
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
          onClick={onToggleVisible}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
  );
}
