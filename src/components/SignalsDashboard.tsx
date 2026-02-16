"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useLiveSignals } from "@/hooks/useLiveSignals";
import type { SignalResult } from "@/types/signals";
import SymbolAnalysisSection from "@/components/SymbolAnalysisSection";

const REFRESH_SEC = 120;

type SortMode = "entry_desc" | "entry_asc";
type TrendFilter = "ALL" | "BULL" | "BEAR";

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}`;
}

function signalTags(row: SignalResult): string[] {
  const tags: string[] = [];
  if (row.signals.ema_cross.entry) tags.push("EMA8/21 交叉");
  if (row.signals.vol_breakout.entry) tags.push("量能突破");
  if (row.signals.bar3_reversal.entry) tags.push("3 Bar 反轉");
  if (row.signals.rsi.entry) tags.push("RSI 超賣");
  if (row.signals.bb_squeeze.entry) tags.push("BB Squeeze");
  if (row.signals.sma50_pullback.entry) tags.push("50SMA 回踩");
  if (!tags.length) tags.push("--");
  return tags;
}

export default function SignalsDashboard({ symbols }: { symbols: string[] }) {
  const { signals, scannedAt, loading } = useLiveSignals(symbols);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SEC);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("entry_desc");
  const [onlyRsiOversold, setOnlyRsiOversold] = useState(false);
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("ALL");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setSecondsLeft(REFRESH_SEC);
  }, [loading, scannedAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(() => Object.values(signals), [signals]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toUpperCase();
    return rows.filter((row) => {
      if (q && !row.symbol.includes(q)) return false;
      if (onlyRsiOversold && !row.signals.rsi.entry) return false;
      if (trendFilter !== "ALL" && row.trend !== trendFilter) return false;
      return true;
    });
  }, [rows, search, onlyRsiOversold, trendFilter]);

  const entryRows = useMemo(() => {
    const base = filteredRows.filter((r) => r.entryCount > 0);
    base.sort((a, b) => (sortMode === "entry_desc" ? b.entryCount - a.entryCount : a.entryCount - b.entryCount));
    return base;
  }, [filteredRows, sortMode]);

  const exitRows = useMemo(
    () => filteredRows.filter((r) => r.signals.rsi.exit || !r.signals.ema_cross.bullish),
    [filteredRows],
  );

  const totalEntrySignals = useMemo(() => rows.reduce((acc, row) => acc + row.entryCount, 0), [rows]);
  const totalExitSignals = useMemo(() => rows.reduce((acc, row) => acc + row.exitCount, 0), [rows]);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-400">進場訊號數</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{totalEntrySignals}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">出場訊號數</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{totalExitSignals}</p>
        </div>
        <div className="card sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-slate-400">掃描標的數</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{rows.length}</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">篩選器</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋 symbol，例如 AAPL"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 placeholder:text-slate-500 focus:ring-1"
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 focus:ring-1"
          >
            <option value="entry_desc">訊號數：高 → 低</option>
            <option value="entry_asc">訊號數：低 → 高</option>
          </select>
          <select
            value={trendFilter}
            onChange={(e) => setTrendFilter(e.target.value as TrendFilter)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 focus:ring-1"
          >
            <option value="ALL">趨勢：全部</option>
            <option value="BULL">趨勢：BULL</option>
            <option value="BEAR">趨勢：BEAR</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={onlyRsiOversold}
              onChange={(e) => setOnlyRsiOversold(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            只看 RSI 超賣
          </label>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold">進場訊號</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Symbol</th>
              <th className="py-2">Price</th>
              <th className="py-2">RSI</th>
              <th className="py-2">Trend</th>
              <th className="py-2">訊號數</th>
              <th className="py-2">訊號詳情</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {entryRows.map((row) => (
              <Fragment key={row.symbol}>
                <tr className="border-t border-slate-800">
                  <td className="py-2 font-medium text-slate-100">🟢 {row.symbol}</td>
                  <td className="py-2 text-slate-300">{fmtPrice(row.price)}</td>
                  <td className="py-2 text-slate-300">{row.signals.rsi.value.toFixed(1)}</td>
                  <td className={`py-2 ${row.trend === "BULL" ? "text-emerald-300" : "text-rose-300"}`}>{row.trend}</td>
                  <td className="py-2 text-cyan-300">{row.entryCount}</td>
                  <td className="py-2 text-slate-300">{signalTags(row).join(" · ")}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.symbol)}
                        className="rounded-md border border-cyan-700 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30"
                      >
                        {expandedSymbol === row.symbol ? "收合分析" : "分析"}
                      </button>
                      <Link href={`/analyze?symbol=${row.symbol}`} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
                        前往 /analyze
                      </Link>
                    </div>
                  </td>
                </tr>
                {expandedSymbol === row.symbol && (
                  <tr className="border-t border-slate-800/60">
                    <td colSpan={7} className="bg-slate-950/40 p-3">
                      <SymbolAnalysisSection symbol={row.symbol} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!entryRows.length && (
              <tr>
                <td colSpan={7} className="py-3 text-slate-500">目前沒有符合篩選條件的進場訊號</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold">出場訊號</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Symbol</th>
              <th className="py-2">Price</th>
              <th className="py-2">RSI</th>
              <th className="py-2">條件</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {exitRows.map((row) => (
              <Fragment key={`${row.symbol}-exit`}>
                <tr className="border-t border-slate-800">
                  <td className="py-2 font-medium text-slate-100">{row.symbol}</td>
                  <td className="py-2 text-slate-300">{fmtPrice(row.price)}</td>
                  <td className="py-2 text-slate-300">{row.signals.rsi.value.toFixed(1)}</td>
                  <td className="py-2 text-amber-300">
                    {[row.signals.rsi.exit ? "RSI>70" : null, !row.signals.ema_cross.bullish ? "EMA 空頭" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(row.symbol)}
                      className="rounded-md border border-cyan-700 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30"
                    >
                      {expandedSymbol === row.symbol ? "收合分析" : "分析"}
                    </button>
                  </td>
                </tr>
                {expandedSymbol === row.symbol && (
                  <tr className="border-t border-slate-800/60">
                    <td colSpan={5} className="bg-slate-950/40 p-3">
                      <SymbolAnalysisSection symbol={row.symbol} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!exitRows.length && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">目前沒有符合篩選條件的出場訊號</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="text-xs text-slate-400">
        <p>掃描時間：{scannedAt ? new Date(scannedAt).toLocaleString("zh-TW", { hour12: false }) : "--"}</p>
        <p className="mt-1">自動更新倒計時：{secondsLeft}s</p>
      </section>
    </div>
  );
}
