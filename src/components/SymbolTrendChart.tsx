"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  time: string;
  close: number;
}

export default function SymbolTrendChart({ symbol }: { symbol: string }) {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const closes: number[] = result?.indicators?.quote?.[0]?.close || [];

        const formatted = timestamps
          .map((ts, i) => ({
            time: new Date(ts * 1000).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
            close: closes[i],
          }))
          .filter((d) => typeof d.close === "number");

        setPoints(formatted);
      } catch {
        setPoints([]);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [symbol]);

  if (!points.length) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">無法取得價格走勢資料</div>;
  }

  return (
    <div className="h-72 w-full rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
            formatter={(v: number | string | undefined) => {
              const num = typeof v === "number" ? v : Number(v);
              return `$${Number.isFinite(num) ? num.toFixed(2) : "0.00"}`;
            }}
          />
          <Line type="monotone" dataKey="close" stroke="#22d3ee" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
