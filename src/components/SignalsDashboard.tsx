"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveSignals } from "@/hooks/useLiveSignals";
import type { SignalResult } from "@/types/signals";

const REFRESH_SEC = 120;

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

  const entryRows = useMemo(
    () => rows.filter((r) => r.entryCount > 0).sort((a, b) => b.entryCount - a.entryCount),
    [rows],
  );

  const exitRows = useMemo(
    () => rows.filter((r) => r.signals.rsi.exit || !r.signals.ema_cross.bullish),
    [rows],
  );

  const totalEntrySignals = useMemo(() => rows.reduce((acc, row) => acc + row.entryCount, 0), [rows]);
  const totalExitSignals = useMemo(() => rows.reduce((acc, row) => acc + row.exitCount, 0), [rows]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-400">進場訊號數</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{totalEntrySignals}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">出場訊號數</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{totalExitSignals}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">掃描標的數</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{rows.length}</p>
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
            </tr>
          </thead>
          <tbody>
            {entryRows.map((row) => (
              <tr key={row.symbol} className="border-t border-slate-800">
                <td className="py-2 font-medium text-slate-100">🟢 {row.symbol}</td>
                <td className="py-2 text-slate-300">{fmtPrice(row.price)}</td>
                <td className="py-2 text-slate-300">{row.signals.rsi.value.toFixed(1)}</td>
                <td className={`py-2 ${row.trend === "BULL" ? "text-emerald-300" : "text-rose-300"}`}>{row.trend}</td>
                <td className="py-2 text-cyan-300">{row.entryCount}</td>
                <td className="py-2 text-slate-300">{signalTags(row).join(" · ")}</td>
              </tr>
            ))}
            {!entryRows.length && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-500">目前沒有進場訊號</td>
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
            </tr>
          </thead>
          <tbody>
            {exitRows.map((row) => (
              <tr key={row.symbol} className="border-t border-slate-800">
                <td className="py-2 font-medium text-slate-100">{row.symbol}</td>
                <td className="py-2 text-slate-300">{fmtPrice(row.price)}</td>
                <td className="py-2 text-slate-300">{row.signals.rsi.value.toFixed(1)}</td>
                <td className="py-2 text-amber-300">
                  {[row.signals.rsi.exit ? "RSI>70" : null, !row.signals.ema_cross.bullish ? "EMA 空頭" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
              </tr>
            ))}
            {!exitRows.length && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-500">目前沒有出場訊號</td>
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
