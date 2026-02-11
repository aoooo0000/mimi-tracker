export function pct(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function money(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `$${value.toFixed(2)}`;
}

export function safe(value?: number | null, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(decimals);
}

export function date(value: string) {
  return new Date(value).toLocaleDateString("zh-TW");
}
