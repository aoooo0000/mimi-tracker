import Link from "next/link";
import SectorBarChart from "@/components/SectorBarChart";
import { getRecommendations } from "@/lib/recommendations";

export default async function SectorsPage() {
  const rows = await getRecommendations();
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    acc[row.sector] = acc[row.sector] ?? [];
    acc[row.sector].push(row);
    return acc;
  }, {});

  const sectors = Object.entries(grouped).map(([sector, items]) => {
    const returns = items.filter((r) => r.recommendPrice != null && r.recommendPrice > 0).map((r) => (((r.currentPrice ?? r.recommendPrice!) - r.recommendPrice!) / r.recommendPrice!) * 100);
    const hitRate = returns.length ? (returns.filter((n) => n > 0).length / returns.length) * 100 : 0;
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    return { sector, items, hitRate, avgReturn };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">按板塊/產業分類</h1>
      <SectorBarChart data={sectors.map((s) => ({ sector: s.sector, avgReturn: s.avgReturn }))} />

      <div className="grid gap-4 lg:grid-cols-2">
        {sectors.map((s) => (
          <section key={s.sector} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{s.sector}</h2>
              <div className="text-sm text-slate-400">命中率 {s.hitRate?.toFixed(1) ?? "0"}% · 平均 {s.avgReturn?.toFixed(2) ?? "0"}%</div>
            </div>
            <ul className="space-y-2 text-sm">
              {s.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <Link href={`/symbols/${item.symbol}`} className="hover:text-cyan-300">{item.symbol} · {item.name}</Link>
                  <span className="text-slate-300">推薦價 ${item.recommendPrice?.toFixed(2) ?? "--"}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
