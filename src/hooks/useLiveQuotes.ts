"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const POLL_MS = 60_000;

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort();
}

export function useLiveQuotes(symbols: string[]) {
  // Stabilize the symbols array by comparing serialized values
  const symbolsKey = useMemo(() => {
    const normalized = normalizeSymbols(symbols);
    return normalized.join(",");
  }, [symbols]);

  const normalizedSymbols = useMemo(() => (symbolsKey ? symbolsKey.split(",") : []), [symbolsKey]);

  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState<boolean>(normalizedSymbols.length > 0);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!normalizedSymbols.length) {
      setQuotes({});
      setLoading(false);
      return;
    }

    activeRef.current = true;

    async function fetchQuotes() {
      try {
        const res = await fetch(`/api/quotes?symbols=${normalizedSymbols.join(",")}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("quote fetch failed");
        const data = (await res.json()) as Record<string, number | null>;
        if (!activeRef.current) return;
        setQuotes(data);
      } catch {
        if (!activeRef.current) return;
      } finally {
        if (activeRef.current) setLoading(false);
      }
    }

    setLoading(true);
    fetchQuotes();
    const timer = setInterval(fetchQuotes, POLL_MS);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [symbolsKey]); // depend on stable string key

  return { quotes, loading };
}
