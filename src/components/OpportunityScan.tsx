"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveSignals } from "@/hooks/useLiveSignals";

export default function OpportunityScan({ symbols }: { symbols: string[] }) {
  const { signals, loading } = useLiveSignals(symbols);

  const top = useMemo(() => {
    return Object.values(signals)
      .sort((a, b) => b.entryCount - a.entryCount || a.exitCount - b.exitCount)
      .slice(0, 5);
  }, [signals]);

  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">🔥 機會掃描</h2>
      {loading && <p className="text-sm text-slate-400">掃描中...</p>}
      {!loading && !top.length && <p className="text-sm text-slate-500">暫無可用資料</p>}
      {!!top.length && (
        <div className="space-y-2">
          {top.map((row, idx) => (
            <div key={row.symbol} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
              <div>
                <p className="text-slate-100">#{idx + 1} <Link href={`/symbols/${row.symbol}`} className="hover:text-cyan-300">{row.symbol}</Link></p>
                <p className="text-xs text-slate-400">進場 {row.entryCount} / 出場 {row.exitCount}</p>
              </div>
              <p className={`${row.entryCount >= 3 ? "text-emerald-300" : "text-cyan-300"}`}>{row.trend}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
