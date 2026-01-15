"use client";

import { useMemo } from "react";
import styles from "./form.module.css";

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: RangeFieldProps) {
  const clampedValue = useMemo(
    () => Math.min(max, Math.max(min, value)),
    [max, min, value]
  );

  const displayValue = useMemo(() => {
    const numValue = Number(clampedValue);
    if (Math.abs(step) >= 1) {
      return Math.round(numValue);
    }
    return parseFloat(numValue.toFixed(2));
  }, [clampedValue, step]);

  return (
    <div className={styles.rangeContainer}>
      <div className={styles.rangeHeader}>
        <span className={styles.rangeLabel}>{label}</span>
        <span className={styles.rangeValue}>
          {displayValue}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedValue}
        className={styles.rangeInput}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
