const STORAGE_KEY = "mimi-watchlist";

export const DEFAULT_LIST = ["AAPL", "NVDA", "TSLA", "MSFT", "AMD", "GOOG", "META", "AMZN", "AVGO", "PLTR"];

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function safeParse(stored: string | null): string[] {
  if (!stored) return DEFAULT_LIST;
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_LIST;
    const list = parsed
      .map((value) => (typeof value === "string" ? normalizeSymbol(value) : ""))
      .filter(Boolean);
    return list.length ? Array.from(new Set(list)) : DEFAULT_LIST;
  } catch {
    return DEFAULT_LIST;
  }
}

export function getWatchlist(): string[] {
  if (typeof window === "undefined") return DEFAULT_LIST;
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function addToWatchlist(symbol: string): string[] {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return getWatchlist();

  const current = getWatchlist();
  const next = current.includes(normalized) ? current : [...current, normalized];

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function removeFromWatchlist(symbol: string): string[] {
  const normalized = normalizeSymbol(symbol);
  const current = getWatchlist();
  const next = current.filter((item) => item !== normalized);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}
