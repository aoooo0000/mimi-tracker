"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SymbolAnalysisSection from "@/components/SymbolAnalysisSection";

function parseSymbols(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

const HOT_SYMBOLS = ["NVDA", "AAPL", "MSFT", "TSLA", "AMD", "GOOG", "META", "AMZN", "AVGO", "PLTR"];

const FEATURE_CARDS = [
  { icon: "📊", title: "K線圖表", line1: "互動式K線圖", line2: "均線疊加顯示" },
  { icon: "📈", title: "MACD 分析", line1: "三關鍵判讀", line2: "金叉/死叉/背離" },
  { icon: "📦", title: "Darvas Box", line1: "箱型突破策略", line2: "支撐壓力視覺化" },
  { icon: "⚡", title: "TTM Squeeze", line1: "動能壓縮偵測", line2: "突破訊號預警" },
  { icon: "🎯", title: "綜合評分", line1: "趨勢+動能+技術", line2: "0-100 量化評分" },
  { icon: "🛡️", title: "智慧停損", line1: "多種停損建議", line2: "風險計算" },
];

const FRAMEWORK_STEPS = [
  {
    number: "1",
    numberClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    title: "趨勢判斷",
    lines: ["200MA 生命線", "50MA 季線", "SMC 市場結構"],
  },
  {
    number: "2",
    numberClass: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    title: "動能分析",
    lines: ["MACD 三關鍵", "TTM Squeeze", "RSI 超買超賣"],
  },
  {
    number: "3",
    numberClass: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    title: "進場訊號",
    lines: ["Darvas 箱型突破", "EMA 金叉", "量價配合"],
  },
  {
    number: "4",
    numberClass: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    title: "風控管理",
    lines: ["智慧停損建議", "風險百分比計算", "綜合評分系統"],
  },
];

export default function AnalyzeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromUrl = searchParams.get("symbol") ?? "";
  const [input, setInput] = useState(fromUrl);

  useEffect(() => {
    setInput(fromUrl);
  }, [fromUrl]);

  const symbols = useMemo(() => parseSymbols(fromUrl), [fromUrl]);

  const navigateToSymbol = (value: string) => {
    const parsed = parseSymbols(value);
    if (!parsed.length) {
      router.push("/analyze");
      return;
    }
    router.push(`/analyze?symbol=${encodeURIComponent(parsed.join(","))}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigateToSymbol(input);
  };

  const showHomepage = !symbols.length;

  return (
    <div className="space-y-8 bg-[#0a0e1a] text-center">
      {showHomepage && (
        <div className="mx-auto max-w-7xl space-y-12 py-6 sm:space-y-16">
          <section className="space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-4xl text-white shadow-lg shadow-blue-500/20">
              📈
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Mimi 股票分析器</h1>
              <p className="text-base text-slate-400 sm:text-lg">基於 Mimi 框架的專業技術分析工具</p>
              <p className="text-sm font-medium text-cyan-300 sm:text-base">K 線圖表 • MACD • Darvas Box • TTM Squeeze • SMC</p>
            </div>
          </section>

          <section className="mx-auto max-w-3xl">
            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-12 w-full items-center rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 text-slate-300">
                <span className="mr-2 text-lg">🔍</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="輸入股票代碼（如 NVDA、AAPL）"
                  className="w-full bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 font-semibold text-white transition hover:opacity-90"
              >
                分析 →
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">🔥 熱門股票</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {HOT_SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => navigateToSymbol(symbol)}
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  {symbol}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-2xl font-bold text-white">🎯 全方位技術分析</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {FEATURE_CARDS.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-center"
                >
                  <div className="mb-3 text-3xl">{feature.icon}</div>
                  <h3 className="mb-2 text-base font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.line1}</p>
                  <p className="text-sm text-slate-400">{feature.line2}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-bold text-white">📊 Mimi 框架分析流程</h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {FRAMEWORK_STEPS.map((step) => (
                <article key={step.number} className="space-y-3 text-center">
                  <div
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-base font-bold ${step.numberClass}`}
                  >
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <div className="space-y-1 text-sm text-slate-400">
                    {step.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4 pb-4">
            <Link
              href="/signals"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 text-base font-bold text-white transition hover:opacity-90"
            >
              開始使用 Watchlist →
            </Link>
            <p className="text-sm text-slate-400">已預設 10 檔熱門股票，可自由新增/移除</p>
          </section>
        </div>
      )}

      {symbols.map((symbol) => (
        <section key={symbol} className="space-y-4 text-left">
          <h2 className="text-xl font-semibold text-cyan-300">{symbol}</h2>
          <SymbolAnalysisSection symbol={symbol} />
        </section>
      ))}
    </div>
  );
}
