"use client";

import { useMemo } from "react";
import { useLiveMarketRegime } from "@/hooks/useLiveMarketRegime";
import type { MarketRegime, RegimeKey } from "@/types/marketRegime";

function signed(v: number, digits = 2) {
  const text = v.toFixed(digits);
  return v > 0 ? `+${text}` : text;
}

function regimeTheme(regime: RegimeKey) {
  switch (regime) {
    case "extreme_offense":
      return { bg: "from-emerald-600/80 to-green-700/70", emoji: "🚀" };
    case "offense":
      return { bg: "from-emerald-700/70 to-teal-700/60", emoji: "🟢" };
    case "neutral":
      return { bg: "from-amber-600/70 to-yellow-700/60", emoji: "😐" };
    case "defense":
      return { bg: "from-rose-700/70 to-red-800/70", emoji: "🛡️" };
    case "crisis_buy":
      return { bg: "from-yellow-500/70 to-amber-700/70", emoji: "🏆" };
    default:
      return { bg: "from-slate-700 to-slate-800", emoji: "📊" };
  }
}

function statusLabel(status: MarketRegime["vix"]["status"]) {
  return {
    low: "低恐慌",
    moderate: "中度恐慌",
    high: "高恐慌",
    extreme: "極度恐慌",
  }[status];
}

function trendArrow(trend: MarketRegime["vix"]["trend"]) {
  return trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→";
}

function RsiGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400">RSI</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-300">{value.toFixed(1)}</p>
    </div>
  );
}

function IndexCard({ title, data }: { title: string; data: MarketRegime["spy"] }) {
  return (
    <article className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className={`text-sm ${data.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{signed(data.changePercent)}%</p>
      </div>
      <p className="text-3xl font-bold">${data.price.toFixed(2)}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className={`rounded-lg border px-2 py-1 ${data.price > data.ema8 ? "border-emerald-500 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
          8 EMA
        </div>
        <div className={`rounded-lg border px-2 py-1 ${data.price > data.sma50 ? "border-emerald-500 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
          50 SMA
        </div>
        <div className={`rounded-lg border px-2 py-1 ${data.price > data.sma200 ? "border-emerald-500 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
          200 SMA
        </div>
      </div>
      <RsiGauge value={data.rsi} />
      <div>
        <p className="mb-1 text-xs text-slate-400">布林帶位置 {data.bbPosition.toFixed(1)}%</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-violet-400" style={{ width: `${data.bbPosition}%` }} />
        </div>
      </div>
      <p className="text-xs text-slate-400">距離 200 SMA: {signed(data.distFrom200)}%</p>
    </article>
  );
}

export default function MarketRegimeDashboard() {
  const { data, loading, error } = useLiveMarketRegime();
  const theme = useMemo(() => (data ? regimeTheme(data.overall.regime) : regimeTheme("neutral")), [data]);

  if (loading && !data) return <div className="card">載入市場環境中...</div>;
  if (error && !data) return <div className="card text-rose-300">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section className={`rounded-2xl border border-slate-700 bg-gradient-to-br ${theme.bg} p-6 shadow-lg`}>
        <p className="text-sm text-slate-100/90">市場環境</p>
        <div className="mt-2 flex items-end gap-3">
          <p className="text-6xl font-black tracking-tight">{signed(data.overall.score, 0)}</p>
          <p className="pb-1 text-2xl font-bold">{theme.emoji} {data.overall.label}</p>
        </div>
        <p className="mt-3 text-sm text-slate-100/95">{data.overall.suggestion}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card space-y-3">
          <h3 className="text-lg font-semibold">VIX 恐慌指數</h3>
          <p className="text-4xl font-bold text-amber-300">{data.vix.current.toFixed(2)}</p>
          <p className="text-sm text-slate-300">MA20 {data.vix.ma20.toFixed(2)} · MA50 {data.vix.ma50.toFixed(2)}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-800 px-2 py-1">{statusLabel(data.vix.status)}</span>
            <span className="text-lg">{trendArrow(data.vix.trend)}</span>
          </div>
        </article>

        <IndexCard title="S&P 500 (SPY)" data={data.spy} />
        <IndexCard title="Nasdaq 100 (QQQ)" data={data.qqq} />
      </section>

      <section className="card">
        <h3 className="mb-3 text-lg font-semibold">評分明細</h3>
        <ul className="space-y-2 text-sm">
          {data.overall.breakdown.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <p className="font-medium text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-400">{item.note}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.score >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                {signed(item.score, 0)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">更新時間：{new Date(data.timestamp).toLocaleString("zh-TW", { hour12: false })}</p>
      </section>
    </div>
  );
}
