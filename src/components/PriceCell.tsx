"use client";

import { useEffect, useState } from "react";
import { calcReturnPct } from "@/lib/calc";
import { money, pct } from "@/lib/format";

interface Props {
  symbol: string;
  recommendPrice: number;
}

export default function PriceCell({ symbol, recommendPrice }: Props) {
  const [price, setPrice] = useState<number>();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchQuote() {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await res.json();
        const value = data?.quoteResponse?.result?.[0]?.regularMarketPrice;
        if (typeof value === "number") setPrice(value);
      } catch {
        // ignore network/cors errors in UI fallback
      }
    }

    fetchQuote();
    const timer = setInterval(fetchQuote, 60_000);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [symbol]);

  const ret = calcReturnPct(recommendPrice, price);
  const color = ret === undefined ? "text-slate-400" : ret >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="space-y-1 text-right">
      <div className="text-sm text-slate-200">{money(price)}</div>
      <div className={`text-xs font-medium ${color}`}>{pct(ret)}</div>
    </div>
  );
}
