"use client";

import { useEffect, useMemo, useState } from "react";

const POLL_MS = 60_000;

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort();
}

export function useLiveQuotes(symbols: string[]) {
  const normalizedSymbols = useMemo(() => normalizeSymbols(symbols), [symbols]);
  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState<boolean>(normalizedSymbols.length > 0);

  useEffect(() => {
    if (!normalizedSymbols.length) {
      setQuotes({});
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchQuotes() {
      try {
        const res = await fetch(`/api/quotes?symbols=${normalizedSymbols.join(",")}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("quote fetch failed");
        const data = (await res.json()) as Record<string, number | null>;
        if (!active) return;
        setQuotes(data);
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    fetchQuotes();
    const timer = setInterval(fetchQuotes, POLL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [normalizedSymbols]);

  return { quotes, loading };
}
