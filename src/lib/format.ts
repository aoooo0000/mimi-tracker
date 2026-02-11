export function pct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function money(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return `$${value.toFixed(2)}`;
}

export function date(value: string) {
  return new Date(value).toLocaleDateString("zh-TW");
}
