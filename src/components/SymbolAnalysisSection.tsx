"use client";

import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import TechnicalCharts from "@/components/TechnicalCharts";

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatCompactVolume(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}

function deviationPct(price: number, base: number) {
  if (!base) return 0;
  return ((price - base) / base) * 100;
}

function deviationClass(v: number) {
  if (v >= 1) return "text-emerald-300";
  if (v <= -1) return "text-rose-300";
  return "text-slate-300";
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="44" textAnchor="middle" className="fill-white text-2xl font-bold">
          {value}
        </text>
      </svg>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Tag({ text, tone }: { text: string; tone: "green" | "orange" | "red" | "slate" }) {
  const klass =
    tone === "green"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : tone === "orange"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : tone === "red"
          ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
          : "border-slate-600/60 bg-slate-700/50 text-slate-200";
  return <span className={`rounded-full border px-3 py-1 text-xs ${klass}`}>{text}</span>;
}

function trendText(t: "uptrend" | "downtrend" | "sideways") {
  if (t === "uptrend") return "🟢 上升";
  if (t === "downtrend") return "🔴 下降";
  return "🟡 盤整";
}

function rsiLabel(status: "oversold" | "neutral" | "overbought") {
  if (status === "oversold") return "超賣";
  if (status === "overbought") return "超買";
  return "正常";
}

function InfoRow({ label, value, valueClass = "text-slate-100" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/80 py-1.5 text-sm last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function SymbolAnalysisSection({ symbol, companyName }: { symbol: string; companyName?: string }) {
  const { analysis, loading } = useLiveAnalysis(symbol);

  if (loading) return <section className="card text-sm text-slate-400">讀取中...</section>;
  if (!analysis) return <section className="card text-sm text-slate-500">暫無分析資料</section>;

  const emaCrossDead = analysis.movingAverages.ema8 <= analysis.movingAverages.ema21;
  const verdict = analysis.mimiScore.verdict;
  const trend = analysis.smc.trend;

  const ema8Dev = deviationPct(analysis.price, analysis.movingAverages.ema8);
  const sma50Dev = deviationPct(analysis.price, analysis.movingAverages.sma50);
  const sma200Dev = deviationPct(analysis.price, analysis.movingAverages.sma200);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{analysis.symbol}</h1>
              <span className={`rounded-full px-2 py-1 text-xs ${emaCrossDead ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                {emaCrossDead ? "EMA 死叉" : "EMA 金叉"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{companyName ?? analysis.companyName ?? "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-semibold">{formatPrice(analysis.price)}</p>
            <p className={`mt-1 text-sm ${analysis.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {analysis.change >= 0 ? "+" : ""}
              {analysis.change.toFixed(2)}% ({(analysis.changeAmount ?? 0) >= 0 ? "+" : ""}${(analysis.changeAmount ?? 0).toFixed(2)})
            </p>
          </div>
        </div>
      </section>

      <TechnicalCharts symbol={symbol} />

      <section className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
        <h2 className="mb-4 text-lg font-semibold">❤️ Mimi 框架綜合評分</h2>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          <Gauge label="總分" value={analysis.mimiScore.total} color="#f59e0b" />
          <Gauge label="趨勢" value={analysis.mimiScore.trend} color="#38bdf8" />
          <Gauge label="動能" value={analysis.mimiScore.momentum} color="#6366f1" />
          <Gauge label="技術" value={analysis.mimiScore.technical} color="#a855f7" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-semibold">😊 持有觀察</h3>
          <p className="text-sm text-slate-300">判斷：{verdict}</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs text-slate-400">✅ 正面訊號</p>
            <div className="flex flex-wrap gap-2">
              {analysis.mimiScore.positiveSignals.length ? (
                analysis.mimiScore.positiveSignals.map((s) => <Tag key={`pos-${s}`} text={s} tone="green" />)
              ) : (
                <Tag text="暫無" tone="slate" />
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">⚠️ 風險因素</p>
            <div className="flex flex-wrap gap-2">
              {analysis.mimiScore.riskSignals.length ? (
                analysis.mimiScore.riskSignals.map((s) => (
                  <Tag key={`risk-${s}`} text={s} tone={s.includes("EMA") ? "orange" : "red"} />
                ))
              ) : (
                <Tag text="暫無" tone="slate" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">↗️ 均線分析</h3>
          <InfoRow
            label="8 EMA (抱單線)"
            value={`${formatPrice(analysis.movingAverages.ema8)}  ${ema8Dev >= 0 ? "+" : ""}${ema8Dev.toFixed(1)}%`}
            valueClass={deviationClass(ema8Dev)}
          />
          <InfoRow
            label="50 MA (季線)"
            value={`${formatPrice(analysis.movingAverages.sma50)}  ${sma50Dev >= 0 ? "+" : ""}${sma50Dev.toFixed(1)}%`}
            valueClass={deviationClass(sma50Dev)}
          />
          <InfoRow
            label="200 MA (生命線)"
            value={`${formatPrice(analysis.movingAverages.sma200)}  ${sma200Dev >= 0 ? "+" : ""}${sma200Dev.toFixed(1)}%`}
            valueClass={deviationClass(sma200Dev)}
          />
          <InfoRow label="EMA 交叉" value={emaCrossDead ? "🔴 死叉" : "🟢 金叉"} valueClass={emaCrossDead ? "text-rose-300" : "text-emerald-300"} />
        </article>

        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">⚡ MACD 動能</h3>
          <InfoRow label="MACD 線" value={analysis.macd.line.toFixed(4)} />
          <InfoRow label="零軸位置" value={analysis.macd.aboveZero ? "🟢 上方" : "🔴 下方"} valueClass={analysis.macd.aboveZero ? "text-emerald-300" : "text-rose-300"} />
          <InfoRow label="交叉狀態" value={analysis.macd.goldenCross ? "🟢 金叉" : "—"} valueClass={analysis.macd.goldenCross ? "text-emerald-300" : "text-slate-400"} />
          <InfoRow label="柱狀圖" value={analysis.macd.histogramTrend === "increasing" ? "📈 放大" : "📉 收斂"} valueClass={analysis.macd.histogramTrend === "increasing" ? "text-emerald-300" : "text-amber-200"} />
          {analysis.macd.bullDivergence ? (
            <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-200">⚡ 牛背離</div>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">📊 RSI & 量能</h3>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-400">RSI (14)</span>
            <span className="text-slate-200">
              {analysis.rsi.value.toFixed(1)} - {rsiLabel(analysis.rsi.status)}
            </span>
          </div>
          <div className="mb-3 h-2 rounded-full bg-slate-700">
            <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.max(0, analysis.rsi.value))}%` }} />
          </div>
          <InfoRow label="成交量" value={formatCompactVolume(analysis.volume?.current ?? 0)} />
          <InfoRow
            label="量比"
            value={`${(analysis.volume?.ratio ?? 0).toFixed(1)}x ${
              (analysis.volume?.ratio ?? 0) >= 1.2 ? "(偏強)" : (analysis.volume?.ratio ?? 0) < 0.8 ? "(偏弱)" : "(正常)"
            }`}
          />
        </article>

        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">☁️ 布林帶</h3>
          <InfoRow label="上軌" value={formatPrice(analysis.bollinger.upper)} />
          <InfoRow label="中軌 (20MA)" value={formatPrice(analysis.bollinger.middle)} />
          <InfoRow label="下軌" value={formatPrice(analysis.bollinger.lower)} />
          <InfoRow label="Z-Score" value={`${analysis.bollinger.zScore.toFixed(2)}σ`} />
          <InfoRow label="帶寬" value={`${analysis.bollinger.width.toFixed(1)}%`} />
          {analysis.bollinger.squeeze ? (
            <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200">💚 帶寬收窄（可能突破）</div>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">📦 Darvas Box</h3>
          <InfoRow label="箱頂" value={formatPrice(analysis.darvasBox.top)} />
          <InfoRow label="箱底" value={formatPrice(analysis.darvasBox.bottom)} />
          <InfoRow label="形成天數" value={`${analysis.darvasBox.formationDays} 天`} />
          <InfoRow
            label="狀態"
            value={analysis.darvasBox.status === "inside" ? "📦 箱內整理" : analysis.darvasBox.status === "breakout" ? "🚀 向上突破" : "⚠️ 向下跌破"}
            valueClass={analysis.darvasBox.status === "breakout" ? "text-emerald-300" : analysis.darvasBox.status === "breakdown" ? "text-rose-300" : "text-amber-200"}
          />
        </article>

        <article className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">⚡ TTM Squeeze</h3>
          <InfoRow
            label="Squeeze"
            value={analysis.ttmSqueeze.squeezeOn ? "🔴 ON" : "🟢 OFF"}
            valueClass={analysis.ttmSqueeze.squeezeOn ? "text-rose-300" : "text-emerald-300"}
          />
          <InfoRow label="動能值" value={analysis.ttmSqueeze.momentum.toFixed(3)} />
          <InfoRow label="方向" value={analysis.ttmSqueeze.direction === "rising" ? "📈 上升" : "📉 下降"} valueClass={analysis.ttmSqueeze.direction === "rising" ? "text-emerald-300" : "text-rose-300"} />
          <InfoRow
            label="ADX(14)"
            value={`${(analysis.adx?.value ?? 0).toFixed(2)}（${analysis.adx?.trendStrength === "strong" ? "強" : "弱"}）`}
            valueClass={analysis.adx?.trendStrength === "strong" ? "text-emerald-300" : "text-amber-200"}
          />
        </article>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
        <h2 className="mb-3 text-lg font-semibold">🏛️ 市場結構 (SMC)</h2>
        <div className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]">
          <div className="text-slate-400">趨勢結構</div>
          <div className="font-medium text-slate-100">{trendText(trend)}</div>
          <div />

          <div className="text-slate-400">Swing High</div>
          <div className="font-medium text-slate-100">{formatPrice(analysis.smc.swingHigh)}</div>
          <div className="flex flex-wrap gap-2">
            <Tag text={`${analysis.smc.higherHigh ? "✓" : "○"} Higher High`} tone="slate" />
            <Tag text={`${analysis.smc.higherLow ? "✓" : "○"} Higher Low`} tone="slate" />
          </div>

          <div className="text-slate-400">Swing Low</div>
          <div className="font-medium text-slate-100">{formatPrice(analysis.smc.swingLow)}</div>
          <div className="flex flex-wrap gap-2">
            <Tag text={`${analysis.smc.lowerHigh ? "✓" : "○"} Lower High`} tone="orange" />
            <Tag text={`${analysis.smc.lowerLow ? "✓" : "○"} Lower Low`} tone="red" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-[#111827] p-4">
        <h2 className="mb-3 text-lg font-semibold">🛡️ 停損建議</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">Darvas Box 底</p>
            <p className="mt-1 text-xl font-semibold">{formatPrice(analysis.stopLoss.darvasBottom)}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">8 EMA 下方</p>
            <p className="mt-1 text-xl font-semibold">{formatPrice(analysis.stopLoss.ema8)}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">Swing Low 下方</p>
            <p className="mt-1 text-xl font-semibold">{formatPrice(analysis.stopLoss.swingLow)}</p>
          </div>
          <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-amber-500/20 to-red-500/20 p-3">
            <p className="text-xs text-slate-200">建議停損</p>
            <p className="mt-1 text-xl font-bold text-white">{formatPrice(analysis.stopLoss.recommended)}</p>
            <p className="mt-1 inline-block rounded-md bg-rose-500/30 px-2 py-0.5 text-xs text-rose-100">風險 {analysis.stopLoss.riskPercent.toFixed(1)}%</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">💡 {analysis.stopLoss.logic}</p>
      </section>
    </div>
  );
}
