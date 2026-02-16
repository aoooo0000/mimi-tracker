"use client";

import { memo, useEffect, useRef } from "react";
import { CandlestickSeries, HistogramSeries, LineSeries, LineStyle, createChart, type Time } from "lightweight-charts";
import type { ChartData } from "@/types/chart";

interface Props {
  data: ChartData;
  height?: number;
  showMA?: boolean;
  showBollinger?: boolean;
  showDarvas?: boolean;
  showVolume?: boolean;
}

function CandlestickChart({
  data,
  height = 460,
  showMA = true,
  showBollinger = false,
  showDarvas = true,
  showVolume = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#cbd5e1" },
      width: containerRef.current.clientWidth,
      height,
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

    if (showMA) {
      const sma200 = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2 });
      const sma50 = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2 });
      const sma20 = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 1 });
      const ema21 = chart.addSeries(LineSeries, { color: "#fb923c", lineWidth: 2 });
      const ema8 = chart.addSeries(LineSeries, { color: "#22d3ee", lineWidth: 2 });
      sma200.setData(data.indicators.sma200.map((p) => ({ ...p, time: p.time as Time })));
      sma50.setData(data.indicators.sma50.map((p) => ({ ...p, time: p.time as Time })));
      sma20.setData(data.indicators.sma20.map((p) => ({ ...p, time: p.time as Time })));
      ema21.setData(data.indicators.ema21.map((p) => ({ ...p, time: p.time as Time })));
      ema8.setData(data.indicators.ema8.map((p) => ({ ...p, time: p.time as Time })));
    }

    if (showBollinger) {
      const upper = chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1 });
      const middle = chart.addSeries(LineSeries, { color: "#e2e8f0", lineWidth: 1, lineStyle: LineStyle.Dotted });
      const lower = chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1 });
      upper.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.upper })));
      middle.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.middle })));
      lower.setData(data.indicators.bollinger.map((p) => ({ time: p.time as Time, value: p.lower })));
    }

    if (showDarvas) {
      const top = chart.addSeries(LineSeries, { color: "#4ade80", lineWidth: 1, lineStyle: LineStyle.Dashed });
      const bottom = chart.addSeries(LineSeries, { color: "#f87171", lineWidth: 1, lineStyle: LineStyle.Dashed });
      top.setData(data.candles.map((c) => ({ time: c.time as Time, value: data.indicators.darvas.top })));
      bottom.setData(data.candles.map((c) => ({ time: c.time as Time, value: data.indicators.darvas.bottom })));
    }

    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#64748b",
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
      volumeSeries.setData(
        data.candles.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
        })),
      );
    }

    const onResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [data, height, showMA, showBollinger, showDarvas, showVolume]);

  return <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-800" />;
}

export default memo(CandlestickChart);
