"use client";

import type { ReactNode } from "react";
import styles from "./form.module.css";

interface SelectOption<TValue extends string | number> {
  value: TValue;
  label: string;
}

interface SelectFieldProps<TValue extends string | number> {
  label: string;
  value: TValue;
  options: readonly SelectOption<TValue>[];
  onChange: (value: TValue) => void;
  hint?: ReactNode;
}

export function SelectField<TValue extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectFieldProps<TValue>) {
  return (
    <div className={styles.fieldColumn}>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        className={styles.select}
        value={String(value)}
        onChange={(event) => {
          const selected = options.find(
            (option) => String(option.value) === event.target.value
          );
          if (selected) onChange(selected.value);
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className={styles.apiKeyHint}>{hint}</p> : null}
    </div>
  );
}
