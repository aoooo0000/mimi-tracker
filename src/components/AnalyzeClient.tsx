"use client";

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

export default function AnalyzeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromUrl = searchParams.get("symbol") ?? "";
  const [input, setInput] = useState(fromUrl);

  useEffect(() => {
    setInput(fromUrl);
  }, [fromUrl]);

  const symbols = useMemo(() => parseSymbols(fromUrl), [fromUrl]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseSymbols(input);
    if (!parsed.length) {
      router.push("/analyze");
      return;
    }
    router.push(`/analyze?symbol=${encodeURIComponent(parsed.join(","))}`);
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="mb-4 text-2xl font-bold">分析器</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入股票代號（如 NVDA, TSLA）"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-lg text-slate-100 outline-none ring-cyan-400 focus:ring"
          />
          <button
            type="submit"
            className="rounded-xl border border-cyan-500 bg-cyan-500/20 px-5 py-3 font-medium text-cyan-200 transition hover:bg-cyan-500/30"
          >
            分析
          </button>
        </form>
      </section>

      {!symbols.length && <section className="card text-sm text-slate-400">請輸入股票代號開始分析。</section>}

      {symbols.map((symbol) => (
        <section key={symbol} className="space-y-4">
          <h2 className="text-xl font-semibold text-cyan-300">{symbol}</h2>
          <SymbolAnalysisSection symbol={symbol} />
        </section>
      ))}
    </div>
  );
}
