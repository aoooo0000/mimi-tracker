"use client";

import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";

function scoreTone(score: number) {
  if (score >= 6) return "text-emerald-300";
  if (score >= 3) return "text-cyan-300";
  if (score >= 0) return "text-slate-200";
  if (score >= -3) return "text-amber-300";
  return "text-rose-300";
}

export default function SymbolAnalysisSection({ symbol }: { symbol: string }) {
  const { analysis, loading } = useLiveAnalysis(symbol);

  return (
    <>
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">綜合評分</h2>
        {loading && <p className="text-sm text-slate-400">讀取中...</p>}
        {!loading && !analysis && <p className="text-sm text-slate-500">暫無分析資料</p>}
        {!loading && analysis && (
          <>
            <div className="mb-3 flex items-end gap-3">
              <p className={`text-3xl font-bold ${scoreTone(analysis.overallScore.score)}`}>
                {analysis.overallScore.score > 0 ? `+${analysis.overallScore.score}` : analysis.overallScore.score}
              </p>
              <p className="pb-1 text-lg text-slate-100">{analysis.overallScore.rating}</p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
              {analysis.overallScore.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {!loading && analysis && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">技術指標</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="card">
                <p className="text-sm font-medium text-cyan-300">均線系統</p>
                <p className="mt-2 text-sm text-slate-300">200: {analysis.movingAverages.sma200}</p>
                <p className="text-sm text-slate-300">50: {analysis.movingAverages.sma50}</p>
                <p className="text-sm text-slate-300">EMA21: {analysis.movingAverages.ema21}</p>
                <p className="text-sm text-slate-300">EMA8: {analysis.movingAverages.ema8}</p>
                <p className="mt-1 text-xs text-slate-400">{analysis.movingAverages.priceVs200 === "above" ? "價格在 200SMA 上" : "價格在 200SMA 下"} / {analysis.movingAverages.goldenCross ? "黃金交叉" : "未黃金交叉"}</p>
              </div>

              <div className="card">
                <p className="text-sm font-medium text-cyan-300">MACD</p>
                <p className="mt-2 text-sm text-slate-300">Line: {analysis.macd.line}</p>
                <p className="text-sm text-slate-300">Signal: {analysis.macd.signal}</p>
                <p className="text-sm text-slate-300">Hist: {analysis.macd.histogram}</p>
                <p className="mt-1 text-xs text-slate-400">{analysis.macd.aboveZero ? "零軸上方" : "零軸下方"} / {analysis.macd.goldenCross ? "金叉" : "非金叉"}</p>
              </div>

              <div className="card">
                <p className="text-sm font-medium text-cyan-300">布林帶</p>
                <p className="mt-2 text-sm text-slate-300">Upper: {analysis.bollinger.upper}</p>
                <p className="text-sm text-slate-300">Middle: {analysis.bollinger.middle}</p>
                <p className="text-sm text-slate-300">Lower: {analysis.bollinger.lower}</p>
                <p className="mt-1 text-xs text-slate-400">{analysis.bollinger.position} / Width {analysis.bollinger.width}% / {analysis.bollinger.squeeze ? "收窄" : "未收窄"}</p>
              </div>

              <div className="card">
                <p className="text-sm font-medium text-cyan-300">RSI</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{analysis.rsi.value}</p>
                <p className="text-sm text-slate-300">{analysis.rsi.status}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Mimi 訊號</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card">
                <p className="text-sm font-medium text-cyan-300">止跌訊號（{analysis.stopFalling.count}/7）</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {analysis.stopFalling.signals.length ? analysis.stopFalling.signals.map((s) => <li key={s}>{s}</li>) : <li>尚未觸發</li>}
                </ul>
              </div>
              <div className="card">
                <p className="text-sm font-medium text-cyan-300">底部訊號（{analysis.bottomSignals.count}/3）</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {analysis.bottomSignals.signals.length ? analysis.bottomSignals.signals.map((s) => <li key={s}>{s}</li>) : <li>尚未觸發</li>}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
