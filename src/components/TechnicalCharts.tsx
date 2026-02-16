"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { useChartData } from "@/hooks/useChartData";

const CandlestickChart = dynamic(() => import("@/components/charts/CandlestickChart"), { ssr: false });
const MacdChart = dynamic(() => import("@/components/charts/MacdChart"), { ssr: false });
const RsiChart = dynamic(() => import("@/components/charts/RsiChart"), { ssr: false });
const TtmSqueezeChart = dynamic(() => import("@/components/charts/TtmSqueezeChart"), { ssr: false });

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1 text-xs transition ${
        active ? "border-cyan-400 bg-cyan-500/20 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function TechnicalCharts({ symbol, days = 180 }: { symbol: string; days?: number }) {
  const { data, loading } = useChartData(symbol, days);
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showDarvas, setShowDarvas] = useState(true);
  const [showVolume, setShowVolume] = useState(false);

  if (loading) {
    return <div className="card text-sm text-slate-400">圖表資料讀取中...</div>;
  }

  if (!data) {
    return <div className="card text-sm text-slate-500">暫無圖表資料</div>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">技術分析圖表</h2>

      <div className="flex flex-wrap gap-2">
        <Toggle active={showMA} onClick={() => setShowMA((v) => !v)} label="均線" />
        <Toggle active={showBollinger} onClick={() => setShowBollinger((v) => !v)} label="布林帶" />
        <Toggle active={showDarvas} onClick={() => setShowDarvas((v) => !v)} label="Darvas Box" />
        <Toggle active={showVolume} onClick={() => setShowVolume((v) => !v)} label="成交量" />
      </div>

      <CandlestickChart
        data={data}
        height={520}
        showMA={showMA}
        showBollinger={showBollinger}
        showDarvas={showDarvas}
        showVolume={showVolume}
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <div>
          <p className="mb-2 text-xs text-slate-300">MACD (12,26,9)</p>
          <MacdChart data={data} height={220} />
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-300">RSI (14)</p>
          <RsiChart data={data} height={220} />
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-300">TTM Squeeze</p>
          <TtmSqueezeChart data={data} height={220} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
        <p>💡 MACD 柱狀圖顏色：綠色系=多方，紅色系=空方；淺色=動能增加，深色=動能減少</p>
        <p className="mt-1">💡 TTM Squeeze：紅點=Squeeze ON，綠點=OFF</p>
        <p className="mt-1">💡 Darvas Box：綠色虛線=箱頂，紅色虛線=箱底</p>
      </div>
    </section>
  );
}

export default memo(TechnicalCharts);
