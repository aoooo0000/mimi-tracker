import SignalsDashboard from "@/components/SignalsDashboard";
import { getRecommendations } from "@/lib/recommendations";

export default async function SignalsPage() {
  const rows = await getRecommendations();
  const symbols = [...new Set(rows.map((r) => r.symbol))].slice(0, 50);

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold">即時策略訊號掃描</h1>
        <p className="mt-2 text-sm text-slate-400">每 2 分鐘更新一次，僅在此頁面執行掃描以節省 FMP API 配額。</p>
      </section>
      <SignalsDashboard symbols={symbols} />
    </div>
  );
}
