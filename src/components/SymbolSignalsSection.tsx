"use client";

import { useLiveSignals } from "@/hooks/useLiveSignals";
import StrategySignalCards from "@/components/StrategySignalCards";

export default function SymbolSignalsSection({ symbol }: { symbol: string }) {
  const { signals, loading } = useLiveSignals([symbol]);
  const row = signals[symbol.toUpperCase()];

  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">策略訊號</h2>
      {loading && <p className="text-sm text-slate-400">讀取中...</p>}
      {!loading && !row && <p className="text-sm text-slate-500">暫無訊號資料</p>}
      {!loading && row && <StrategySignalCards row={row} />}
    </section>
  );
}
