"use client";

import { calcReturnPct } from "@/lib/calc";
import { money, pct } from "@/lib/format";
import { useQuotes } from "@/components/QuotesProvider";

interface Props {
  symbol: string;
  recommendPrice: number;
}

export default function PriceCell({ symbol, recommendPrice }: Props) {
  const { quotes, loading } = useQuotes();
  const price = quotes[symbol.toUpperCase()];

  const ret = calcReturnPct(recommendPrice, typeof price === "number" ? price : undefined);
  const color = ret === undefined ? "text-slate-400" : ret >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="space-y-1 text-right">
      <div className="text-sm text-slate-200">{loading ? "載入中..." : money(price ?? undefined)}</div>
      <div className={`text-xs font-medium ${color}`}>{loading ? "--" : pct(ret)}</div>
    </div>
  );
}
