export interface NumberSummary {
  count: number;
  total: number;
  average: number | null;
}

export function summarizeNumbers(values: readonly number[]): NumberSummary {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError('Values must be finite numbers');
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total)) throw new RangeError('Total exceeds the finite number range');
  return { count: values.length, total, average: values.length ? total / values.length : null };
}
