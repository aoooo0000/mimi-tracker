"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SignalResult, SignalsApiResponse } from "@/types/signals";

const POLL_MS = 120_000;

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort();
}

export function useLiveSignals(symbols: string[]) {
  const symbolsKey = useMemo(() => normalizeSymbols(symbols).join(","), [symbols]);
  const normalizedSymbols = useMemo(() => (symbolsKey ? symbolsKey.split(",") : []), [symbolsKey]);

  const [signals, setSignals] = useState<Record<string, SignalResult>>({});
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(normalizedSymbols.length > 0);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!normalizedSymbols.length) {
      setSignals({});
      setScannedAt(null);
      setLoading(false);
      return;
    }

    activeRef.current = true;

    async function fetchSignals() {
      try {
        const res = await fetch(`/api/signals?symbols=${normalizedSymbols.join(",")}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("signal fetch failed");

        const data = (await res.json()) as SignalsApiResponse;
        if (!activeRef.current) return;

        const next: Record<string, SignalResult> = {};
        for (const row of data.results ?? []) {
          next[row.symbol] = row;
        }

        setSignals(next);
        setScannedAt(data.scannedAt ?? null);
      } catch {
        if (!activeRef.current) return;
      } finally {
        if (activeRef.current) setLoading(false);
      }
    }

    setLoading(true);
    fetchSignals();
    const timer = setInterval(fetchSignals, POLL_MS);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [symbolsKey, normalizedSymbols]);

  return { signals, scannedAt, loading };
}
