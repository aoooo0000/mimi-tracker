"use client";

import { useEffect, useRef, useState } from "react";
import type { ChartData, ChartDataApiResponse } from "@/types/chart";

export function useChartData(symbol: string, days = 120) {
  const normalized = symbol.trim().toUpperCase();
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!normalized);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!normalized) {
      setData(null);
      setLoading(false);
      return;
    }

    activeRef.current = true;

    async function fetchData() {
      try {
        const res = await fetch(`/api/chart-data?symbol=${normalized}&days=${days}`, { cache: "no-store" });
        if (!res.ok) throw new Error("chart-data fetch failed");
        const payload = (await res.json()) as ChartDataApiResponse;
        if (!activeRef.current) return;
        setData(payload.data);
      } finally {
        if (activeRef.current) setLoading(false);
      }
    }

    setLoading(true);
    fetchData();

    return () => {
      activeRef.current = false;
    };
  }, [normalized, days]);

  return { data, loading };
}
