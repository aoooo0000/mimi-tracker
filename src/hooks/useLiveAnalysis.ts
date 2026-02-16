"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisApiResponse, AnalysisResult } from "@/types/analysis";

const POLL_MS = 120_000;

export function useLiveAnalysis(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!normalized);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!normalized) {
      setAnalysis(null);
      setScannedAt(null);
      setLoading(false);
      return;
    }

    activeRef.current = true;

    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analysis?symbol=${normalized}`, { cache: "no-store" });
        if (!res.ok) throw new Error("analysis fetch failed");
        const data = (await res.json()) as AnalysisApiResponse;
        if (!activeRef.current) return;
        setAnalysis(data.result);
        setScannedAt(data.scannedAt ?? null);
      } catch {
        if (!activeRef.current) return;
      } finally {
        if (activeRef.current) setLoading(false);
      }
    }

    setLoading(true);
    fetchAnalysis();
    const timer = setInterval(fetchAnalysis, POLL_MS);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [normalized]);

  return { analysis, scannedAt, loading };
}
