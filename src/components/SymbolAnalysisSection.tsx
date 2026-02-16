"use client";

import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import TechnicalCharts from "@/components/TechnicalCharts";

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="#334155" strokeWidth="10" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform="rotate(-90 50 50)"
          strokeLinecap="round"
        />
      </svg>
      <p className="-mt-16 text-xl font-semibold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Tag({ text, tone = "green" }: { text: string; tone?: "green" | "red" | "orange" }) {
  const klass = tone === "green" ? "bg-emerald-500/15 text-emerald-200 border-emerald-600/40" : tone === "orange" ? "bg-amber-500/15 text-amber-200 border-amber-600/40" : "bg-rose-500/15 text-rose-200 border-rose-600/40";
  return <span className={`rounded-full border px-2 py-1 text-xs ${klass}`}>{text}</span>;
}

function statTrend(t: "uptrend" | "downtrend" | "sideways") {
  if (t === "uptrend") return "🟢 上升趨勢";
  if (t === "downtrend") return "🔴 下降趨勢";
  return "🟡 盤整";
}

export default function SymbolAnalysisSection({ symbol, companyName }: { symbol: string; companyName?: string }) {
  const { analysis, loading } = useLiveAnalysis(symbol);

  if (loading) return <section className="card text-sm text-slate-400">讀取中...</section>;
  if (!analysis) return <section className="card text-sm text-slate-500">暫無分析資料</section>;

  const statusTag = analysis.movingAverages.priceVs200 === "below" ? "跌破 200MA 生命線" : "站上 200MA";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700 bg-[#0f172a] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{analysis.symbol}</h1>
              <span className={`rounded-full px-2 py-1 text-xs ${analysis.movingAverages.priceVs200 === "below" ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>{statusTag}</span>
            </div>
            <p className="text-sm text-slate-400">{companyName ?? analysis.companyName ?? "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold">${analysis.price}</p>
            <p className={`${analysis.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {analysis.change >= 0 ? "+" : ""}
              {analysis.change}% ({analysis.changeAmount && analysis.changeAmount >= 0 ? "+" : ""}
              {analysis.changeAmount})
            </p>
          </div>
        </div>
      </section>

      <TechnicalCharts symbol={symbol} />

      <section className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <h2 className="mb-3 text-lg font-semibold">Mimi 框架綜合評分</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Gauge label="總分" value={analysis.mimiScore.total} color="#38bdf8" />
          <Gauge label="趨勢" value={analysis.mimiScore.trend} color="#4ade80" />
          <Gauge label="動能" value={analysis.mimiScore.momentum} color="#f59e0b" />
          <Gauge label="技術" value={analysis.mimiScore.technical} color="#a78bfa" />
        </div>
        <p className="mt-2 text-sm text-slate-200">判斷：{analysis.mimiScore.verdict}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {analysis.mimiScore.positiveSignals.map((s) => (
            <Tag key={`p-${s}`} text={s} tone="green" />
          ))}
          {analysis.mimiScore.riskSignals.map((s) => (
            <Tag key={`r-${s}`} text={s} tone={s.includes("EMA") ? "orange" : "red"} />
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">均線分析</h3>
          <p className="text-sm">8 EMA: {analysis.movingAverages.ema8}</p>
          <p className="text-sm">價格: {analysis.price}</p>
          <p className="text-sm">8EMA 偏離: {(((analysis.price - analysis.movingAverages.ema8) / analysis.movingAverages.ema8) * 100).toFixed(2)}%</p>
          <p className="text-sm">50 MA: {analysis.movingAverages.sma50}</p>
          <p className="text-sm">200 MA: {analysis.movingAverages.sma200}</p>
          <p className="text-xs">EMA 交叉：{analysis.movingAverages.ema8 > analysis.movingAverages.ema21 ? "🟢金叉" : "🔴死叉"}</p>
        </article>

        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">MACD 動能</h3>
          <p className="text-sm">MACD 線: {analysis.macd.line}</p>
          <p className="text-sm">零軸: {analysis.macd.aboveZero ? "🟢上方" : "🔴下方"}</p>
          <p className="text-sm">交叉: {analysis.macd.goldenCross ? "🟢金叉" : "🔴未金叉"}</p>
          <p className="text-sm">柱狀圖趨勢: {analysis.macd.histogramTrend === "increasing" ? "增強" : "減弱"}</p>
          <p className="text-sm">牛背離: {analysis.macd.bullDivergence ? "✓" : "○"}</p>
        </article>

        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">RSI & 量能</h3>
          <p className="text-sm">RSI: {analysis.rsi.value}（{analysis.rsi.status === "oversold" ? "超賣" : analysis.rsi.status === "overbought" ? "超買" : "正常"}）</p>
          <div className="mt-2 h-2 rounded-full bg-slate-700">
            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, analysis.rsi.value))}%` }} />
          </div>
          <p className="mt-2 text-sm">成交量: {analysis.volume?.current ?? 0}</p>
          <p className="text-sm">量比: {analysis.volume?.ratio ?? 0}x</p>
        </article>

        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">布林帶</h3>
          <p className="text-sm">上軌: {analysis.bollinger.upper}</p>
          <p className="text-sm">中軌: {analysis.bollinger.middle}</p>
          <p className="text-sm">下軌: {analysis.bollinger.lower}</p>
          <p className="text-sm">Z-Score: {analysis.bollinger.zScore}σ</p>
          <p className="text-sm">帶寬: {analysis.bollinger.width}%</p>
        </article>

        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">Darvas Box</h3>
          <p className="text-sm">箱頂: {analysis.darvasBox.top}</p>
          <p className="text-sm">箱底: {analysis.darvasBox.bottom}</p>
          <p className="text-sm">形成天數: {analysis.darvasBox.formationDays}</p>
          <p className="text-sm">狀態: {analysis.darvasBox.status === "inside" ? "箱內整理" : analysis.darvasBox.status === "breakout" ? "突破" : "跌破"}</p>
        </article>

        <article className="card bg-gradient-to-br from-slate-900/80 to-slate-950/80">
          <h3 className="text-sm font-semibold text-cyan-300">TTM Squeeze</h3>
          <p className="text-sm">Squeeze: {analysis.ttmSqueeze.squeezeOn ? "ON" : "OFF"}</p>
          <p className="text-sm">動能值: {analysis.ttmSqueeze.momentum}</p>
          <p className="text-sm">方向: {analysis.ttmSqueeze.direction === "rising" ? "上升" : "下降"}</p>
          <p className="text-sm">ADX(14): {analysis.adx?.value ?? 0}（{analysis.adx?.trendStrength === "strong" ? "強" : "弱"}）</p>
        </article>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">市場結構 SMC</h2>
        <p>{statTrend(analysis.smc.trend)}</p>
        <p className="text-sm">Swing High: {analysis.smc.swingHigh}</p>
        <p className="text-sm">Swing Low: {analysis.smc.swingLow}</p>
        <div className="mt-1 grid grid-cols-2 gap-1 text-sm md:grid-cols-4">
          <p>Higher High: {analysis.smc.higherHigh ? "✓" : "○"}</p>
          <p>Higher Low: {analysis.smc.higherLow ? "✓" : "○"}</p>
          <p>Lower High: {analysis.smc.lowerHigh ? "✓" : "○"}</p>
          <p>Lower Low: {analysis.smc.lowerLow ? "✓" : "○"}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">停損建議</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <p>Darvas Box 底 -2%: {analysis.stopLoss.darvasBottom}</p>
          <p>8 EMA 下方 -3%: {analysis.stopLoss.ema8}</p>
          <p>Swing Low 下方 -2%: {analysis.stopLoss.swingLow}</p>
          <p className="rounded-lg border border-orange-500/40 bg-gradient-to-r from-orange-500/25 to-rose-500/25 px-2 py-1 font-semibold text-orange-100">建議停損: {analysis.stopLoss.recommended}</p>
        </div>
        <p className="mt-2 text-sm text-rose-200">風險百分比: {analysis.stopLoss.riskPercent}%</p>
        <p className="mt-2 text-xs text-slate-400">💡 停損邏輯：{analysis.stopLoss.logic}</p>
      </section>
    </div>
  );
}
