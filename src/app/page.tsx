import Link from "next/link";
import PriceCell from "@/components/PriceCell";
import { getRecommendations } from "@/lib/recommendations";

export default async function DashboardPage() {
  const rows = await getRecommendations();

  const validRows = rows.filter((r) => r.recommendPrice != null && r.recommendPrice > 0);
  const hitRate = validRows.length ? (validRows.filter((r) => (r.currentPrice ?? r.recommendPrice!) > r.recommendPrice!).length / validRows.length) * 100 : 0;
  const avgReturn = validRows.length
    ? validRows.reduce((sum, r) => sum + (((r.currentPrice ?? r.recommendPrice!) - r.recommendPrice!) / r.recommendPrice!) * 100, 0) / validRows.length
    : 0;

  const ranked = [...validRows].sort(
    (a, b) => ((b.currentPrice ?? b.recommendPrice!) - b.recommendPrice!) / b.recommendPrice! - ((a.currentPrice ?? a.recommendPrice!) - a.recommendPrice!) / a.recommendPrice!,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-400">推薦總數</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div>
        <div className="card"><p className="text-sm text-slate-400">整體命中率</p><p className="mt-1 text-2xl font-semibold text-cyan-300">{hitRate.toFixed(1)}%</p></div>
        <div className="card"><p className="text-sm text-slate-400">平均報酬率</p><p className={`mt-1 text-2xl font-semibold ${avgReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{avgReturn.toFixed(2)}%</p></div>
        <div className="card"><p className="text-sm text-slate-400">追蹤板塊</p><p className="mt-1 text-2xl font-semibold">{new Set(rows.map((r) => r.sector)).size}</p></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">最佳推薦 Top 5</h2>
          <ul className="space-y-2 text-sm">
            {ranked.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                <Link href={`/symbols/${r.symbol}`} className="hover:text-cyan-300">{r.symbol} · {r.name}</Link>
                <PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice} />
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">最差推薦 Top 5</h2>
          <ul className="space-y-2 text-sm">
            {ranked.slice(-5).reverse().map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                <Link href={`/symbols/${r.symbol}`} className="hover:text-cyan-300">{r.symbol} · {r.name}</Link>
                <PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近推薦</h2>
          <Link href="/performance" className="text-sm text-cyan-300 hover:underline">查看完整排行</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2">日期</th><th className="py-2">標的</th><th className="py-2">板塊</th><th className="py-2">推薦價</th><th className="py-2 text-right">現價/報酬</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="py-2 text-slate-300">{r.recommendDate}</td>
                  <td className="py-2"><Link href={`/symbols/${r.symbol}`} className="text-slate-100 hover:text-cyan-300">{r.symbol} - {r.name}</Link></td>
                  <td className="py-2 text-slate-300">{r.sector}</td>
                  <td className="py-2 text-slate-300">${r.recommendPrice?.toFixed(2) ?? "--"}</td>
                  <td className="py-2"><PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
