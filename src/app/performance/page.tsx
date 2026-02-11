import { getRecommendations } from "@/lib/recommendations";
import SectorFilterRanking from "@/components/SectorFilterRanking";

export default async function PerformancePage() {
  const rows = await getRecommendations();

  const withReturns = rows.map((r) => ({
    ...r,
    returnPct: r.recommendPrice != null && r.recommendPrice > 0
      ? (((r.currentPrice ?? r.recommendPrice) - r.recommendPrice) / r.recommendPrice) * 100
      : 0,
  }));

  const groupedBySymbol = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    acc[row.symbol] = acc[row.symbol] ?? [];
    acc[row.symbol].push(row);
    return acc;
  }, {});

  const byCountMap = Object.values(groupedBySymbol).map((items) => ({
    symbol: items?.[0]?.symbol ?? "",
    name: items?.[0]?.name ?? "",
    count: items?.length ?? 0,
  }));

  const sectors = [...new Set(rows.map((r) => r.sector))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">績效排行</h1>
      <SectorFilterRanking rows={withReturns} sectors={sectors} />

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">按推薦次數排序</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2">Symbol</th>
                <th className="py-2">Name</th>
                <th className="py-2 text-right">推薦次數</th>
              </tr>
            </thead>
            <tbody>
              {byCountMap
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <tr key={row.symbol} className="border-t border-slate-800">
                    <td className="py-2 text-slate-100">{row.symbol}</td>
                    <td className="py-2 text-slate-300">{row.name}</td>
                    <td className="py-2 text-right text-cyan-300">{row.count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
