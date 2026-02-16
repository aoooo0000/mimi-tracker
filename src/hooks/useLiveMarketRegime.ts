"use client";

import { useEffect, useState } from "react";
import type { MarketRegime } from "@/types/marketRegime";

const POLL_MS = 120_000;

export function useLiveMarketRegime() {
  const [data, setData] = useState<MarketRegime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const res = await fetch("/api/market-regime", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const payload = (await res.json()) as { data: MarketRegime };
        if (!active) return;
        setData(payload.data);
        setError(null);
      } catch {
        if (!active) return;
        setError("市場資料讀取失敗");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();
    const timer = setInterval(fetchData, POLL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return { data, loading, error };
}
