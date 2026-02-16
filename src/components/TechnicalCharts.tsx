"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { useChartData } from "@/hooks/useChartData";

const CandlestickChart = dynamic(() => import("@/components/charts/CandlestickChart"), { ssr: false });
const MacdChart = dynamic(() => import("@/components/charts/MacdChart"), { ssr: false });
const RsiChart = dynamic(() => import("@/components/charts/RsiChart"), { ssr: false });
const BollingerChart = dynamic(() => import("@/components/charts/BollingerChart"), { ssr: false });

function TechnicalCharts({ symbol, days = 120 }: { symbol: string; days?: number }) {
  const { data, loading } = useChartData(symbol, days);

  if (loading) {
    return <div className="card text-sm text-slate-400">圖表資料讀取中...</div>;
  }

  if (!data) {
    return <div className="card text-sm text-slate-500">暫無圖表資料</div>;
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">技術分析圖表</h2>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-slate-300">K 線 + 均線 (SMA200 / SMA50 / EMA21 / EMA8)</p>
          <CandlestickChart data={data} />
        </div>
        <div>
          <p className="mb-2 text-sm text-slate-300">MACD</p>
          <MacdChart data={data} />
        </div>
        <div>
          <p className="mb-2 text-sm text-slate-300">RSI</p>
          <RsiChart data={data} />
        </div>
        <div>
          <p className="mb-2 text-sm text-slate-300">布林帶</p>
          <BollingerChart data={data} />
        </div>
      </div>
    </section>
  );
}

export default memo(TechnicalCharts);
