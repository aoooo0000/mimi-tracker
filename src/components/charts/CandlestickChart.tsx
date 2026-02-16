"use client";

import { memo, useEffect, useRef } from "react";
import { CandlestickSeries, LineSeries, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

function CandlestickChart({ data }: { data: ChartData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      width: containerRef.current.clientWidth,
      height: 400,
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155" },
      crosshair: { mode: 0 },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeries.setData(data.candles.map((c) => ({ ...c, time: c.time as Time })));

    const sma200 = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2 });
    const sma50 = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2 });
    const ema21 = chart.addSeries(LineSeries, { color: "#fb923c", lineWidth: 2 });
    const ema8 = chart.addSeries(LineSeries, { color: "#22d3ee", lineWidth: 2 });
    sma200.setData(data.indicators.sma200.map((p) => ({ ...p, time: p.time as Time })));
    sma50.setData(data.indicators.sma50.map((p) => ({ ...p, time: p.time as Time })));
    ema21.setData(data.indicators.ema21.map((p) => ({ ...p, time: p.time as Time })));
    ema8.setData(data.indicators.ema8.map((p) => ({ ...p, time: p.time as Time })));

    const legend = document.createElement("div");
    legend.className = "pointer-events-none absolute right-3 top-3 rounded bg-slate-900/90 px-2 py-1 text-xs text-slate-200";
    containerRef.current.appendChild(legend);

    const setLegend = (time?: Time) => {
      const getLast = (series: { time: string; value: number }[]) => {
        if (!time) return series.at(-1)?.value;
        const exact = series.find((s) => s.time === time);
        return exact?.value ?? series.at(-1)?.value;
      };
      legend.innerText = `SMA200 ${getLast(data.indicators.sma200)?.toFixed(2) ?? "--"} · SMA50 ${getLast(data.indicators.sma50)?.toFixed(2) ?? "--"} · EMA21 ${getLast(data.indicators.ema21)?.toFixed(2) ?? "--"} · EMA8 ${getLast(data.indicators.ema8)?.toFixed(2) ?? "--"}`;
    };

    setLegend();

    const tooltip = document.createElement("div");
    tooltip.className = "pointer-events-none absolute left-3 top-3 rounded bg-slate-950/90 px-2 py-1 text-xs text-slate-200";
    containerRef.current.appendChild(tooltip);

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      const time = param.time as Time | undefined;
      setLegend(time);
      if (!point || !time) {
        tooltip.innerText = "";
        return;
      }
      tooltip.innerText = `${time} O:${point.open.toFixed(2)} H:${point.high.toFixed(2)} L:${point.low.toFixed(2)} C:${point.close.toFixed(2)}`;
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

export default memo(CandlestickChart);
