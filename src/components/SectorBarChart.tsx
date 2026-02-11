"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DataPoint {
  sector: string;
  avgReturn: number;
}

export default function SectorBarChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="h-72 w-full rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="sector" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
            formatter={(v: number | string | undefined) => {
              const num = typeof v === "number" ? v : Number(v);
              return `${Number.isFinite(num) ? num.toFixed(2) : "0.00"}%`;
            }}
          />
          <Bar dataKey="avgReturn" fill="#06b6d4" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
