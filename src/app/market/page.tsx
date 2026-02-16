import MarketRegimeDashboard from "@/components/MarketRegimeDashboard";

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold">市場環境儀表板</h1>
        <p className="mt-2 text-sm text-slate-400">整合 VIX / SPY / QQQ 與技術指標，每 120 秒自動更新。</p>
      </section>
      <MarketRegimeDashboard />
    </div>
  );
}
