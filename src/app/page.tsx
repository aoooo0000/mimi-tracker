import Link from "next/link";
import PriceCell from "@/components/PriceCell";
import { QuotesProvider } from "@/components/QuotesProvider";
import StatsCards from "@/components/StatsCards";
import TopRanking from "@/components/TopRanking";
import { getRecommendations } from "@/lib/recommendations";

export default async function DashboardPage() {
  const rows = await getRecommendations();

  // Deduplicate: keep only the latest recommendation per symbol
  const latestBySymbol = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.recommendPrice != null && r.recommendPrice > 0 && !latestBySymbol.has(r.symbol)) {
      latestBySymbol.set(r.symbol, r); // rows already sorted by date desc
    }
  }
  const uniqueRows = [...latestBySymbol.values()];

  // Collect all unique symbols for batch fetching
  const allSymbols = [...new Set(rows.map((r) => r.symbol))];

  // Prepare serializable data for TopRanking
  const rankingRows = uniqueRows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    recommendPrice: r.recommendPrice ?? 0,
  }));

  // Prepare serializable data for StatsCards
  const statsRows = uniqueRows.map((r) => ({
    symbol: r.symbol,
    recommendPrice: r.recommendPrice ?? 0,
    sector: r.sector,
  }));

  return (
    <QuotesProvider symbols={allSymbols}>
      <div className="space-y-6">
        <StatsCards rows={statsRows} />

        <section className="grid gap-6 lg:grid-cols-2">
          <TopRanking rows={rankingRows} title="最佳推薦 Top 5" best={true} />
          <TopRanking rows={rankingRows} title="最差推薦 Top 5" best={false} />
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
                {uniqueRows.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{r.recommendDate}</td>
                    <td className="py-2"><Link href={`/symbols/${r.symbol}`} className="text-slate-100 hover:text-cyan-300">{r.symbol} - {r.name}</Link></td>
                    <td className="py-2 text-slate-300">{r.sector}</td>
                    <td className="py-2 text-slate-300">${r.recommendPrice?.toFixed(2) ?? "--"}</td>
                    <td className="py-2"><PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice ?? 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </QuotesProvider>
  );
}
