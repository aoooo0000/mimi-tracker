import type { SignalResult } from "@/types/signals";

export default function StrategySignalCards({ row }: { row: SignalResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">EMA 8/21</p>
        <p className="mt-1 text-sm text-slate-200">{row.signals.ema_cross.status}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">Volume Breakout</p>
        <p className="mt-1 text-sm text-slate-200">{row.signals.vol_breakout.entry ? "✅ 觸發" : "--"}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">3-Bar Reversal</p>
        <p className="mt-1 text-sm text-slate-200">{row.signals.bar3_reversal.entry ? "✅ 觸發" : "--"}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">RSI(14)</p>
        <p className="mt-1 text-sm text-slate-200">
          {row.signals.rsi.value.toFixed(1)} {row.signals.rsi.entry ? "(超賣)" : row.signals.rsi.exit ? "(超買)" : ""}
        </p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">BB Squeeze</p>
        <p className="mt-1 text-sm text-slate-200">{row.signals.bb_squeeze.entry ? "✅ 觸發" : "--"}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">50 SMA Pullback</p>
        <p className="mt-1 text-sm text-slate-200">{row.signals.sma50_pullback.entry ? "✅ 觸發" : "--"}</p>
      </div>
    </div>
  );
}
