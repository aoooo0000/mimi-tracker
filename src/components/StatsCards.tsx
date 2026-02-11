"use client";

import { useQuotes } from "@/components/QuotesProvider";

interface Row {
  symbol: string;
  recommendPrice: number;
  sector: string;
}

export default function StatsCards({ rows }: { rows: Row[] }) {
  const { quotes, loading } = useQuotes();

  const validRows = rows.filter((r) => r.recommendPrice > 0);

  // Calculate using live quotes
  let hitCount = 0;
  let totalReturn = 0;
  let counted = 0;

  for (const r of validRows) {
    const price = quotes[r.symbol.toUpperCase()];
    if (typeof price !== "number" || price === 0) continue;
    counted++;
    const ret = ((price - r.recommendPrice) / r.recommendPrice) * 100;
    totalReturn += ret;
    if (price > r.recommendPrice) hitCount++;
  }

  const hitRate = counted > 0 ? (hitCount / counted) * 100 : 0;
  const avgReturn = counted > 0 ? totalReturn / counted : 0;
  const sectorCount = new Set(rows.map((r) => r.sector)).size;

  const display = loading ? "—" : undefined;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card">
        <p className="text-sm text-slate-400">追蹤標的</p>
        <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-400">整體命中率</p>
        <p className="mt-1 text-2xl font-semibold text-cyan-300">
          {display ?? `${hitRate.toFixed(1)}%`}
        </p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-400">平均報酬率</p>
        <p className={`mt-1 text-2xl font-semibold ${avgReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {display ?? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`}
        </p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-400">追蹤板塊</p>
        <p className="mt-1 text-2xl font-semibold">{sectorCount}</p>
      </div>
    </section>
  );
}
