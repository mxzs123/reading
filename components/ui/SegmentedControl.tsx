"use client";

import { useMemo } from "react";
import styles from "./form.module.css";

export type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
};

interface SegmentedControlProps<TValue extends string> {
  value: TValue;
  options: ReadonlyArray<SegmentedOption<TValue>>;
  onChange: (value: TValue) => void;
  layout?: "auto" | "tabs";
}

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  layout = "auto",
}: SegmentedControlProps<TValue>) {
  const columns = useMemo(() => {
    if (layout === "tabs") return Math.min(4, Math.max(1, options.length));

    const count = options.length;
    if (count <= 1) return 1;
    if (count === 4) return 2;
    if (count === 5) return 3;
    return Math.min(3, count);
  }, [layout, options.length]);

  return (
    <div className={styles.segmentedControl} data-columns={columns}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`${styles.segmentButton} ${
            value === option.value ? styles.segmentActive : ""
          }`}
          onClick={() => onChange(option.value)}
          type="button"
          title={option.label}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
