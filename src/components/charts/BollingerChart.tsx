"use client";

import { memo, useEffect, useRef } from "react";
import { AreaSeries, LineSeries, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

function BollingerChart({ data, height = 240 }: { data: ChartData; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
    });

    const upperArea = chart.addSeries(AreaSeries, {
      lineColor: "#60a5fa",
      topColor: "rgba(56,189,248,0.00)",
      bottomColor: "rgba(56,189,248,0.12)",
      lineWidth: 1,
    });
    const lowerArea = chart.addSeries(AreaSeries, {
      lineColor: "#34d399",
      topColor: "rgba(56,189,248,0.12)",
      bottomColor: "rgba(56,189,248,0.00)",
      lineWidth: 1,
    });
    const upperLine = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 1 });
    const middleLine = chart.addSeries(LineSeries, { color: "#fbbf24", lineWidth: 1 });
    const priceLine = chart.addSeries(LineSeries, { color: "#e2e8f0", lineWidth: 2 });

    upperArea.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.upper })));
    lowerArea.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.lower })));
    upperLine.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.upper })));
    middleLine.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.middle })));
    priceLine.setData(data.candles.map((c) => ({ time: c.time as Time, value: c.close })));

    const tooltip = document.createElement("div");
    tooltip.className = "pointer-events-none absolute left-3 top-2 rounded bg-slate-950/90 px-2 py-1 text-xs text-slate-200";
    containerRef.current.appendChild(tooltip);

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(priceLine) as { value: number } | undefined;
      if (!point || !param.time) {
        tooltip.innerText = "";
        return;
      }
      tooltip.innerText = `${param.time} Price ${point.value.toFixed(2)}`;
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

export default memo(BollingerChart);
