"use client";

import { memo, useEffect, useRef } from "react";
import { HistogramSeries, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

function TtmSqueezeChart({ data, height = 240 }: { data: ChartData; height?: number }) {
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

    const momentum = chart.addSeries(HistogramSeries, {});
    momentum.setData(
      data.indicators.ttmSqueeze.map((p, idx, arr) => {
        const increasing = idx > 0 ? p.momentum >= arr[idx - 1].momentum : true;
        const bull = p.momentum >= 0;
        const color = bull ? (increasing ? "#86efac" : "#16a34a") : increasing ? "#fca5a5" : "#dc2626";
        return { time: p.time as Time, value: p.momentum, color };
      }),
    );

    const dots = chart.addSeries(HistogramSeries, { base: 0 });
    dots.setData(
      data.indicators.ttmSqueeze.map((p) => ({
        time: p.time as Time,
        value: p.squeezeOn ? -0.00001 : 0.00001,
        color: p.squeezeOn ? "#ef4444" : "#22c55e",
      })),
    );

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

export default memo(TtmSqueezeChart);
