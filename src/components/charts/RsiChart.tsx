"use client";

import { memo, useEffect, useRef } from "react";
import { AreaSeries, LineSeries, LineStyle, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

function RsiChart({ data, height = 240 }: { data: ChartData; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: "#334155", scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: "#334155" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
    });

    const overboughtBg = chart.addSeries(AreaSeries, {
      lineColor: "rgba(0,0,0,0)",
      topColor: "rgba(239,68,68,0.18)",
      bottomColor: "rgba(239,68,68,0.18)",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    overboughtBg.setData(data.indicators.rsi.map((p) => ({ time: p.time as Time, value: 100 })));

    const oversoldBg = chart.addSeries(AreaSeries, {
      lineColor: "rgba(0,0,0,0)",
      topColor: "rgba(34,197,94,0.18)",
      bottomColor: "rgba(34,197,94,0.18)",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    oversoldBg.setData(data.indicators.rsi.map((p) => ({ time: p.time as Time, value: 30 })));

    const rsiLine = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2 });
    const line70 = chart.addSeries(LineSeries, { color: "#f87171", lineStyle: LineStyle.Dashed, lineWidth: 1 });
    const line30 = chart.addSeries(LineSeries, { color: "#4ade80", lineStyle: LineStyle.Dashed, lineWidth: 1 });
    rsiLine.setData(data.indicators.rsi.map((p) => ({ time: p.time as Time, value: p.value })));
    line70.setData(data.indicators.rsi.map((p) => ({ time: p.time as Time, value: 70 })));
    line30.setData(data.indicators.rsi.map((p) => ({ time: p.time as Time, value: 30 })));

    chart.priceScale("right").applyOptions({ autoScale: false, mode: 0 });

    const tooltip = document.createElement("div");
    tooltip.className = "pointer-events-none absolute left-3 top-2 rounded bg-slate-950/90 px-2 py-1 text-xs text-slate-200";
    containerRef.current.appendChild(tooltip);

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(rsiLine) as { value: number } | undefined;
      if (!point || !param.time) {
        tooltip.innerText = "";
        return;
      }
      tooltip.innerText = `${param.time} RSI ${point.value.toFixed(2)}`;
    });

    const onResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [data, height]);

  return <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-800" />;
}

export default memo(RsiChart);
