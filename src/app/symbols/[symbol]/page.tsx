import { notFound } from "next/navigation";
import PriceCell from "@/components/PriceCell";
import { QuotesProvider } from "@/components/QuotesProvider";
import SymbolTrendChart from "@/components/SymbolTrendChart";
import SymbolSignalsSection from "@/components/SymbolSignalsSection";
import SymbolAnalysisSection from "@/components/SymbolAnalysisSection";
import SymbolQuickSummaryCard from "@/components/SymbolQuickSummaryCard";
import { getRecommendations } from "@/lib/recommendations";

export default async function SymbolDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const rows = await getRecommendations();
  const filtered = rows.filter((r) => r.symbol.toLowerCase() === symbol.toLowerCase());

  if (!filtered.length) return notFound();

  const meta = filtered[0];

  return (
    <QuotesProvider symbols={[meta.symbol]}>
      <div className="space-y-6">
        <section className="card">
          <h1 className="text-2xl font-bold">{meta.symbol} · {meta.name}</h1>
          <p className="mt-2 text-sm text-slate-400">板塊：{meta.sector}｜來源追蹤筆數：{filtered.length}</p>
          <div className="mt-3 max-w-xs rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">即時報價 / 相對推薦價</p>
            <div className="mt-2">
              <PriceCell symbol={meta.symbol} recommendPrice={meta.recommendPrice ?? 0} />
            </div>
          </div>
        </section>

        <SymbolQuickSummaryCard symbol={meta.symbol} />

        <SymbolAnalysisSection symbol={meta.symbol} />

        <SymbolSignalsSection symbol={meta.symbol} />

        <section>
          <h2 className="mb-3 text-lg font-semibold">1 個月價格走勢</h2>
          <SymbolTrendChart symbol={meta.symbol} />
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">推薦紀錄時間軸</h2>
          <div className="space-y-4">
            {filtered.map((r) => (
              <article key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-300">{r.recommendDate} · {r.source}</div>
                  <PriceCell symbol={r.symbol} recommendPrice={r.recommendPrice} />
                </div>
                <p className="text-sm text-slate-200">推薦價：${r.recommendPrice?.toFixed(2) ?? "--"} {r.targetPrice ? `｜目標價：$${r.targetPrice?.toFixed(2) ?? "--"}` : ""}</p>
                <p className="mt-2 text-sm text-slate-300">{r.reason}</p>
                <p className="mt-2 text-xs text-slate-400">文章：{r.articleTitle}（{r.articleDate}） · Notion ID: {r.notionPageId}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </QuotesProvider>
  );
}
