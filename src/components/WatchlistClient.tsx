"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import type { AnalysisApiResponse, AnalysisResult } from "@/types/analysis";

type WatchlistRow = {
  symbol: string;
  analysis: AnalysisResult | null;
  loading: boolean;
};

type FilterTab = "all" | "entry" | "watch" | "warn" | "squeeze";

const TABS: { key: FilterTab; label: string; emoji: string; color: string; activeColor: string }[] = [
  { key: "all", label: "全部", emoji: "📊", color: "text-slate-300", activeColor: "bg-blue-500/20 border-blue-500 text-blue-300" },
  { key: "entry", label: "可進場", emoji: "🟢", color: "text-slate-300", activeColor: "bg-emerald-500/20 border-emerald-500 text-emerald-300" },
  { key: "watch", label: "建議觀察", emoji: "🟡", color: "text-slate-300", activeColor: "bg-yellow-500/20 border-yellow-500 text-yellow-300" },
  { key: "warn", label: "警示", emoji: "⚠️", color: "text-slate-300", activeColor: "bg-red-500/20 border-red-500 text-red-300" },
  { key: "squeeze", label: "Squeeze ON", emoji: "💎", color: "text-slate-300", activeColor: "bg-purple-500/20 border-purple-500 text-purple-300" },
];

function trendLabel(smc?: AnalysisResult["smc"]) {
  if (!smc) return { text: "—", color: "text-slate-400" };
  if (smc.trend === "uptrend") return { text: "↗ Bull", color: "text-emerald-400" };
  if (smc.trend === "downtrend") return { text: "↘ Bear", color: "text-red-400" };
  return { text: "→ Range", color: "text-slate-400" };
}

function macdInfo(a: AnalysisResult) {
  const up = a.macd.histogram > 0;
  const tags: string[] = [];
  if (a.macd.goldenCross) tags.push("🟢金叉");
  if ((a.mimiScore as any)?.positiveSignals?.includes("MACD 牛背離")) tags.push("MACD牛背離");
  if ((a.mimiScore as any)?.positiveSignals?.includes("MACD 多方動能")) tags.push("MACD多方動能");
  return { arrow: up ? "▲" : "▼", arrowColor: up ? "text-emerald-400" : "text-red-400", tags };
}

function signalTags(a: AnalysisResult): { text: string; color: string }[] {
  const tags: { text: string; color: string }[] = [];
  if (a.movingAverages.priceVs200 === "above") tags.push({ text: "站上 200MA", color: "bg-blue-500/20 text-blue-300" });
  else tags.push({ text: "跌破 200MA", color: "bg-red-500/20 text-red-300" });
  if (a.macd.goldenCross) tags.push({ text: "MACD金叉", color: "bg-emerald-500/20 text-emerald-300" });
  if ((a.mimiScore as any)?.positiveSignals?.includes("MACD 牛背離")) tags.push({ text: "MACD牛背離", color: "bg-emerald-500/20 text-emerald-300" });
  if (a.rsi.status === "oversold") tags.push({ text: "RSI超賣", color: "bg-yellow-500/20 text-yellow-300" });
  if (a.ttmSqueeze?.squeezeOn) tags.push({ text: "Squeeze ON", color: "bg-purple-500/20 text-purple-300" });
  return tags.slice(0, 2);
}

function getScore(a: AnalysisResult | null): number {
  if (!a) return 0;
  return (a.mimiScore as any)?.total ?? a.overallScore.score * 10;
}

export default function WatchlistClient() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [rows, setRows] = useState<Map<string, WatchlistRow>>(new Map());
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  // Init
  useEffect(() => {
    setSymbols(getWatchlist());
  }, []);

  // Fetch analysis for each symbol
  const fetchAnalysis = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/analysis?symbol=${sym}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as AnalysisApiResponse;
      return data.result;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!symbols.length) return;
    symbols.forEach((sym) => {
      setRows((prev) => {
        const next = new Map(prev);
        if (!next.has(sym)) next.set(sym, { symbol: sym, analysis: null, loading: true });
        return next;
      });
      fetchAnalysis(sym).then((analysis) => {
        setRows((prev) => {
          const next = new Map(prev);
          next.set(sym, { symbol: sym, analysis, loading: false });
          return next;
        });
      });
    });
  }, [symbols, fetchAnalysis]);

  // Refresh every 120s
  useEffect(() => {
    if (!symbols.length) return;
    const timer = setInterval(() => {
      symbols.forEach((sym) => {
        fetchAnalysis(sym).then((analysis) => {
          setRows((prev) => {
            const next = new Map(prev);
            next.set(sym, { symbol: sym, analysis, loading: false });
            return next;
          });
        });
      });
    }, 120_000);
    return () => clearInterval(timer);
  }, [symbols, fetchAnalysis]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    const updated = addToWatchlist(sym);
    setSymbols(updated);
    setInput("");
  };

  const handleRemove = (sym: string) => {
    const updated = removeFromWatchlist(sym);
    setSymbols(updated);
    setRows((prev) => {
      const next = new Map(prev);
      next.delete(sym);
      return next;
    });
  };

  const allRows = useMemo(() => symbols.map((s) => rows.get(s)).filter(Boolean) as WatchlistRow[], [symbols, rows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (!r.analysis) return tab === "all";
      const score = getScore(r.analysis);
      switch (tab) {
        case "entry": return score >= 60;
        case "watch": return score >= 40 && score < 60;
        case "warn": return score < 40;
        case "squeeze": return r.analysis.ttmSqueeze?.squeezeOn === true;
        default: return true;
      }
    });
  }, [allRows, tab]);

  const counts = useMemo(() => ({
    all: allRows.length,
    entry: allRows.filter((r) => r.analysis && getScore(r.analysis) >= 60).length,
    watch: allRows.filter((r) => r.analysis && getScore(r.analysis) >= 40 && getScore(r.analysis) < 60).length,
    warn: allRows.filter((r) => r.analysis && getScore(r.analysis) < 40).length,
    squeeze: allRows.filter((r) => r.analysis?.ttmSqueeze?.squeezeOn === true).length,
  }), [allRows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card">
        <p className="text-xs font-medium tracking-widest text-slate-500 uppercase">Watchlist</p>
        <h1 className="mt-1 text-2xl font-bold">追蹤清單</h1>
        <p className="mt-2 text-sm text-slate-400">
          根據 Mimi 框架進階分析（含 MACD、布林帶、Darvas Box、TTM Squeeze、SMC）
        </p>
      </section>

      {/* Add */}
      <section className="card">
        <p className="mb-3 text-sm font-medium text-slate-300">📌 新增股票到追蹤清單</p>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入股票代號（例：NVDA）"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-xl border border-cyan-500 bg-cyan-500/20 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/30"
          >
            + 新增
          </button>
        </form>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              tab === t.key ? t.activeColor : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            {t.emoji} {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="card overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_0.8fr_1.2fr_0.7fr_0.8fr_1.5fr_0.4fr] gap-2 border-b border-slate-700/50 pb-2 text-xs font-medium text-slate-500">
            <span>股票</span>
            <span>價格</span>
            <span>漲跌</span>
            <span>評分</span>
            <span>趨勢</span>
            <span>MACD</span>
            <span>RSI</span>
            <span>Squeeze</span>
            <span>訊號</span>
            <span></span>
          </div>

          {/* Rows */}
          {filtered.map((row) => {
            const a = row.analysis;
            const score = getScore(a);
            const scoreColor = score >= 60 ? "text-emerald-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
            const trend = trendLabel(a?.smc);
            const macd = a ? macdInfo(a) : null;
            const tags = a ? signalTags(a) : [];

            return (
              <Link
                key={row.symbol}
                href={`/analyze?symbol=${row.symbol}`}
                className="grid grid-cols-[2fr_1fr_1fr_0.7fr_0.8fr_1.2fr_0.7fr_0.8fr_1.5fr_0.4fr] gap-2 items-center border-b border-slate-800/50 py-3 text-sm transition hover:bg-slate-800/30"
              >
                <div>
                  <p className="font-semibold text-slate-100">{row.symbol}</p>
                  <p className="text-xs text-slate-500 truncate">{row.loading ? "載入中..." : (a as any)?.companyName ?? ""}</p>
                </div>
                <span className="text-slate-200">{a ? `$${a.price.toFixed(2)}` : "—"}</span>
                <span className={a && a.change >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {a ? `${a.change >= 0 ? "+" : ""}${a.change.toFixed(2)}%` : "—"}
                </span>
                <span className={`font-semibold ${scoreColor}`}>{a ? score : "—"}</span>
                <span className={trend.color}>{trend.text}</span>
                <div className="flex items-center gap-1.5">
                  {macd && (
                    <>
                      <span className={macd.arrowColor}>{macd.arrow}</span>
                      {macd.tags.map((t) => (
                        <span key={t} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">{t}</span>
                      ))}
                    </>
                  )}
                  {!macd && "—"}
                </div>
                <span className="text-slate-300">{a ? a.rsi.value.toFixed(0) : "—"}</span>
                <span className={a?.ttmSqueeze?.squeezeOn ? "font-medium text-red-400" : "text-slate-500"}>
                  {a?.ttmSqueeze?.squeezeOn ? "On" : "Off"}
                </span>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span key={t.text} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.color}`}>{t.text}</span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(row.symbol); }}
                  className="text-slate-600 transition hover:text-red-400"
                >
                  🗑️
                </button>
              </Link>
            );
          })}

          {!filtered.length && (
            <p className="py-6 text-center text-sm text-slate-500">沒有符合條件的股票</p>
          )}
        </div>
      </section>
    </div>
  );
}
