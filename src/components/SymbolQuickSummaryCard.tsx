"use client";

import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";

function getVerdict(score: number) {
  if (score >= 6) return "強力買入";
  if (score >= 2) return "偏多留意";
  if (score >= -1) return "中性觀望";
  return "暫時避開";
}

function scoreColor(score: number) {
  if (score >= 6) return "text-emerald-300";
  if (score >= 2) return "text-cyan-300";
  if (score >= -1) return "text-slate-200";
  return "text-rose-300";
}

export default function SymbolQuickSummaryCard({ symbol }: { symbol: string }) {
  const { analysis, loading } = useLiveAnalysis(symbol);

  return (
    <section className="card">
      <h2 className="text-lg font-semibold">快速摘要</h2>
      {loading && <p className="mt-2 text-sm text-slate-400">分析讀取中...</p>}
      {!loading && !analysis && <p className="mt-2 text-sm text-slate-500">暫無分析資料</p>}
      {!loading && analysis && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <p className={`text-3xl font-bold ${scoreColor(analysis.overallScore.score)}`}>
            {analysis.overallScore.score > 0 ? `+${analysis.overallScore.score}` : analysis.overallScore.score}
          </p>
          <p className="pb-1 text-lg text-slate-100">{getVerdict(analysis.overallScore.score)} · {analysis.overallScore.rating}</p>
        </div>
      )}
    </section>
  );
}
