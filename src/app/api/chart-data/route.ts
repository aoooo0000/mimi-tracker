import { NextRequest, NextResponse } from "next/server";
import { bollinger, ema, macd, rsi, sma, toFixedNum } from "@/lib/technicals";
import type { ChartData, ChartDataApiResponse } from "@/types/chart";

type FmpHistoricalBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type FmpHistoricalResponse = {
  historical?: FmpHistoricalBar[];
};

function asSeries<T extends { time: string }>(series: T[]): T[] {
  return series.filter((point) =>
    Object.entries(point).every(([key, value]) => (key === "time" ? typeof value === "string" : Number.isFinite(value))),
  );
}

async function fetchHistory(symbol: string, timeseries: number, apiKey: string): Promise<FmpHistoricalBar[] | null> {
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=${timeseries}&apikey=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as FmpHistoricalResponse;
  if (!Array.isArray(payload.historical)) return null;

  return payload.historical
    .filter(
      (b) =>
        typeof b.date === "string" &&
        typeof b.open === "number" &&
        typeof b.high === "number" &&
        typeof b.low === "number" &&
        typeof b.close === "number" &&
        typeof b.volume === "number",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildChartData(bars: FmpHistoricalBar[], days: number): ChartData {
  const closes = bars.map((b) => b.close);
  const sma200 = sma(closes, 200);
  const sma50 = sma(closes, 50);
  const ema21 = ema(closes, 21);
  const ema8 = ema(closes, 8);
  const macdData = macd(closes);
  const rsi14 = rsi(closes, 14);
  const bb = bollinger(closes, 20, 2);

  const start = Math.max(0, bars.length - days);
  const sliced = bars.slice(start);

  return {
    candles: sliced.map((b) => ({
      time: b.date,
      open: toFixedNum(b.open),
      high: toFixedNum(b.high),
      low: toFixedNum(b.low),
      close: toFixedNum(b.close),
      volume: Math.round(b.volume),
    })),
    indicators: {
      sma200: asSeries(sliced.map((b, idx) => ({ time: b.date, value: toFixedNum(sma200[start + idx]) }))),
      sma50: asSeries(sliced.map((b, idx) => ({ time: b.date, value: toFixedNum(sma50[start + idx]) }))),
      ema21: asSeries(sliced.map((b, idx) => ({ time: b.date, value: toFixedNum(ema21[start + idx]) }))),
      ema8: asSeries(sliced.map((b, idx) => ({ time: b.date, value: toFixedNum(ema8[start + idx]) }))),
      macd: asSeries(
        sliced.map((b, idx) => ({
          time: b.date,
          macd: toFixedNum(macdData.line[start + idx], 4),
          signal: toFixedNum(macdData.signal[start + idx], 4),
          histogram: toFixedNum(macdData.histogram[start + idx], 4),
        })),
      ),
      rsi: asSeries(sliced.map((b, idx) => ({ time: b.date, value: toFixedNum(rsi14[start + idx], 2) }))),
      bollinger: asSeries(
        sliced.map((b, idx) => ({
          time: b.date,
          upper: toFixedNum(bb.upper[start + idx]),
          middle: toFixedNum(bb.middle[start + idx]),
          lower: toFixedNum(bb.lower[start + idx]),
        })),
      ),
    },
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const days = Math.min(365, Math.max(30, Number(req.nextUrl.searchParams.get("days") ?? 120) || 120));

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol query parameter" }, { status: 400 });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FMP_API_KEY is not configured" }, { status: 500 });

  try {
    const bars = await fetchHistory(symbol, Math.max(days + 220, 350), apiKey);
    if (!bars || bars.length < 60) {
      return NextResponse.json({ error: `Insufficient history for ${symbol}` }, { status: 404 });
    }

    const data = buildChartData(bars, days);
    const payload: ChartDataApiResponse = { symbol, days, data };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 502 });
  }
}
