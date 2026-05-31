interface IntegerInputOptions {
  fallback: number;
  min: number;
  max?: number;
}

export function readIntegerInput(value: string, options: IntegerInputOptions): number {
  const parsed = Number.parseInt(value, 10);
  const next = Number.isNaN(parsed) ? options.fallback : parsed;
  const withMin = Math.max(options.min, next);
  return options.max === undefined ? withMin : Math.min(options.max, withMin);
}

export function readNullableIntegerInput(
  value: string,
  options: Omit<IntegerInputOptions, "fallback">
): number | null {
  if (value === "") return null;
  return readIntegerInput(value, { ...options, fallback: options.min });
}
