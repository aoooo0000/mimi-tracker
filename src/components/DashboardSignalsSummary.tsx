"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveSignals } from "@/hooks/useLiveSignals";

export default function DashboardSignalsSummary({ symbols }: { symbols: string[] }) {
  const { signals, loading } = useLiveSignals(symbols);
  const rows = useMemo(() => Object.values(signals), [signals]);

  const entryRows = useMemo(
    () => rows.filter((r) => r.entryCount > 0).sort((a, b) => b.entryCount - a.entryCount),
    [rows],
  );
  const exitRows = useMemo(() => rows.filter((r) => r.exitCount > 0), [rows]);

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">今日訊號摘要</h2>
        <Link href="/signals" className="text-sm text-cyan-300 hover:underline">查看完整掃描</Link>
      </div>

      {loading && <p className="text-sm text-slate-400">訊號讀取中...</p>}
      {!loading && (
        <>
          <p className="text-sm text-slate-300">
            今日有 <span className="font-semibold text-emerald-300">{entryRows.length}</span> 檔進場訊號 /{" "}
            <span className="font-semibold text-amber-300">{exitRows.length}</span> 檔出場訊號
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {entryRows.slice(0, 5).map((row) => (
              <Link
                key={row.symbol}
                href={`/symbols/${row.symbol}`}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 transition hover:border-cyan-600"
              >
                <p className="text-sm font-semibold text-slate-100">{row.symbol}</p>
                <p className="mt-1 text-xs text-slate-400">進場訊號 {row.entryCount}</p>
              </Link>
            ))}
            {!entryRows.length && <p className="text-sm text-slate-500">目前沒有進場訊號</p>}
          </div>
        </>
      )}
    </section>
  );
}
