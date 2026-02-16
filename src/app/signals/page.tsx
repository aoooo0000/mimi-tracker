import SignalsDashboard from "@/components/SignalsDashboard";
import { getRecommendations } from "@/lib/recommendations";

export default async function SignalsPage() {
  const rows = await getRecommendations();
  const symbols = [...new Set(rows.map((r) => r.symbol))];

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold">即時策略訊號掃描</h1>
        <p className="mt-2 text-sm text-slate-400">每 2 分鐘自動更新，掃描全部 Mimi 推薦標的。</p>
      </section>
      <SignalsDashboard symbols={symbols} />
    </div>
  );
}
