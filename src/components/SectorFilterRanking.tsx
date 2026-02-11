"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Recommendation } from "@/types/recommendation";

interface Props {
  rows: Array<Recommendation & { returnPct: number }>;
  sectors: string[];
}

export default function SectorFilterRanking({ rows, sectors }: Props) {
  const [sector, setSector] = useState<string>("全部");

  const display = useMemo(() => {
    const filtered = sector === "全部" ? rows : rows.filter((r) => r.sector === sector);
    return filtered.sort((a, b) => b.returnPct - a.returnPct);
  }, [rows, sector]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">按報酬率排序</h2>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
        >
          <option value="全部">全部板塊</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">標的</th>
              <th className="py-2">板塊</th>
              <th className="py-2 text-right">報酬率</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 text-slate-200">
                <td className="py-2"><Link className="hover:text-cyan-300" href={`/symbols/${r.symbol}`}>{r.symbol} - {r.name}</Link></td>
                <td className="py-2">{r.sector}</td>
                <td className={`py-2 text-right ${r.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(r.returnPct?.toFixed(2) ?? "--")}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
