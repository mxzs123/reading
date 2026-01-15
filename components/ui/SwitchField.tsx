"use client";

import styles from "./form.module.css";

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (checked: boolean) => void;
}

export function SwitchField({
  label,
  checked,
  disabled,
  title,
  onChange,
}: SwitchFieldProps) {
  const isDisabled = Boolean(disabled);

  return (
    <label
      className={`${styles.switchLabel} ${
        isDisabled ? styles.switchLabelDisabled : ""
      }`}
      aria-disabled={isDisabled ? true : undefined}
      title={title}
    >
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="checkbox"
        hidden
        checked={checked}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.switchSlider}></span>
    </label>
  );
}
