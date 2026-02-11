"use client";

import Link from "next/link";
import { useQuotes } from "@/components/QuotesProvider";
import PriceCell from "@/components/PriceCell";

interface Row {
  id: string;
  symbol: string;
  name: string;
  recommendPrice: number;
}

export default function TopRanking({ rows, title, best }: { rows: Row[]; title: string; best: boolean }) {
  const { quotes, loading } = useQuotes();

  const ranked = [...rows]
    .map((r) => {
      const price = quotes[r.symbol.toUpperCase()];
      const ret = typeof price === "number" && price > 0 ? ((price - r.recommendPrice) / r.recommendPrice) * 100 : null;
      return { ...r, ret };
    })
    .filter((r) => r.ret !== null)
    .sort((a, b) => best ? b.ret! - a.ret! : a.ret! - b.ret!)
    .slice(0, 5);

  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {loading ? (
        <p className="text-sm text-slate-400">載入報價中...</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {ranked.map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
              <Link href={`/symbols/${r.symbol}`} className="hover:text-cyan-300">{r.symbol} · {r.name}</Link>
              <PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
