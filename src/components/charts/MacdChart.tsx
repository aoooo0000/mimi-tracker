"use client";

import { memo, useEffect, useRef } from "react";
import { HistogramSeries, LineSeries, LineStyle, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

function MacdChart({ data }: { data: ChartData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      width: containerRef.current.clientWidth,
      height: 200,
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
    });

    const hist = chart.addSeries(HistogramSeries, { priceFormat: { type: "price", precision: 4, minMove: 0.0001 } });
    hist.setData(
      data.indicators.macd.map((p) => ({
        time: p.time as Time,
        value: p.histogram,
        color: p.histogram >= 0 ? "#22c55e" : "#ef4444",
      })),
    );

    const macdLine = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2 });
    const signalLine = chart.addSeries(LineSeries, { color: "#fb923c", lineWidth: 2 });
    const zeroLine = chart.addSeries(LineSeries, { color: "#64748b", lineStyle: LineStyle.Dashed, lineWidth: 1 });

    macdLine.setData(data.indicators.macd.map((p) => ({ time: p.time as Time, value: p.macd })));
    signalLine.setData(data.indicators.macd.map((p) => ({ time: p.time as Time, value: p.signal })));
    zeroLine.setData(data.indicators.macd.map((p) => ({ time: p.time as Time, value: 0 })));

    const tooltip = document.createElement("div");
    tooltip.className = "pointer-events-none absolute left-3 top-2 rounded bg-slate-950/90 px-2 py-1 text-xs text-slate-200";
    containerRef.current.appendChild(tooltip);

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(macdLine) as { value: number } | undefined;
      if (!point || !param.time) {
        tooltip.innerText = "";
        return;
      }
      tooltip.innerText = `${param.time} MACD ${point.value.toFixed(4)}`;
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
  }, [data]);

  return <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-800" />;
}

export default memo(MacdChart);
