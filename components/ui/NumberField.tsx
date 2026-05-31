"use client";

import type { ReactNode } from "react";
import { readIntegerInput, readNullableIntegerInput } from "./numberInput";
import styles from "./form.module.css";

interface NumberFieldProps {
  label: string;
  value: number | null;
  min: number;
  max?: number;
  fallback?: number;
  placeholder?: string;
  hint?: ReactNode;
  allowEmpty?: boolean;
  onChange: (value: number | null) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  fallback = min,
  placeholder,
  hint,
  allowEmpty,
  onChange,
}: NumberFieldProps) {
  return (
    <div className={styles.fieldColumn}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        className={styles.apiKeyInput}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            allowEmpty
              ? readNullableIntegerInput(event.target.value, { min, max })
              : readIntegerInput(event.target.value, { fallback, min, max })
          )
        }
      />
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
  );
}
