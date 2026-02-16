import { NextRequest, NextResponse } from "next/server";
import type { SignalResult, SignalsApiResponse } from "@/types/signals";
import { bollinger, ema, rsi, sma, toFixedNum } from "@/lib/technicals";

type FmpHistoricalBar = {
  date: string;
  open: number;
  close: number;
  volume: number;
};

type FmpHistoricalResponse = {
  historical?: FmpHistoricalBar[];
};

type CacheEntry = {
  expiresAt: number;
  data: SignalsApiResponse;
};

const TTL_MS = 120_000;
const BATCH_SIZE = 10;
const signalsCache = new Map<string, CacheEntry>();

function normalizeSymbols(input: string | null): string[] {
  if (!input) return [];
  return [...new Set(input.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

function buildSignalResult(symbol: string, bars: FmpHistoricalBar[]): SignalResult {
  const ordered = [...bars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const closes = ordered.map((b) => b.close);
  const opens = ordered.map((b) => b.open);
  const volumes = ordered.map((b) => b.volume);

  const ema8 = ema(closes, 8);
  const ema21 = ema(closes, 21);
  const sma20Vol = sma(volumes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);

  const { upper: bbUpper, middle: bbMid, lower: bbLower } = bollinger(closes, 20, 2);
  const bbWidth = bbMid.map((m, i) => {
    if (!Number.isFinite(m) || m === 0 || !Number.isFinite(bbUpper[i]) || !Number.isFinite(bbLower[i])) return Number.NaN;
    return (bbUpper[i] - bbLower[i]) / m;
  });

  const i = ordered.length - 1;
  const prev = i - 1;

  const price = closes[i] ?? 0;
  const prevClose = closes[prev] ?? price;
  const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const rsiValue = rsi14[i] ?? Number.NaN;

  const emaBullish = Number.isFinite(ema8[i]) && Number.isFinite(ema21[i]) ? ema8[i] > ema21[i] : false;
  const emaCrossEntry =
    prev >= 0 &&
    Number.isFinite(ema8[prev]) &&
    Number.isFinite(ema21[prev]) &&
    Number.isFinite(ema8[i]) &&
    Number.isFinite(ema21[i]) &&
    ema8[prev] <= ema21[prev] &&
    ema8[i] > ema21[i];

  const volBreakout =
    change > 2 &&
    Number.isFinite(sma20Vol[i]) &&
    volumes[i] > sma20Vol[i] * 2 &&
    Number.isFinite(sma50[i]) &&
    price > sma50[i];

  const bar3Reversal =
    i >= 2 &&
    closes[i] > opens[i] &&
    closes[i - 1] > opens[i - 1] &&
    closes[i - 2] > opens[i - 2] &&
    Number.isFinite(rsiValue) &&
    rsiValue < 40;

  const rsiEntry = Number.isFinite(rsiValue) && rsiValue < 30;
  const rsiExit = Number.isFinite(rsiValue) && rsiValue > 70;

  const squeezeWindow = bbWidth.slice(Math.max(0, i - 19), i + 1).filter((v) => Number.isFinite(v));
  const minWidth = squeezeWindow.length ? Math.min(...squeezeWindow) : Number.NaN;
  const bbSqueeze =
    Number.isFinite(bbWidth[i]) &&
    Number.isFinite(minWidth) &&
    Math.abs(bbWidth[i] - minWidth) < 1e-12 &&
    Number.isFinite(bbUpper[i]) &&
    price > bbUpper[i];

  const sma50Pullback =
    i >= 1 &&
    Number.isFinite(sma50[i]) &&
    Number.isFinite(sma200[i]) &&
    sma50[i] > sma200[i] &&
    closes[prev] <= sma50[prev] * 1.01 &&
    price > closes[prev] &&
    price > sma50[i];

  const entryCount = [emaCrossEntry, volBreakout, bar3Reversal, rsiEntry, bbSqueeze, sma50Pullback].filter(Boolean).length;
  const exitCount = [rsiExit, !emaBullish].filter(Boolean).length;

  return {
    symbol,
    price: toFixedNum(price),
    change: toFixedNum(change),
    signals: {
      ema_cross: {
        entry: emaCrossEntry,
        bullish: emaBullish,
        status: emaBullish ? "EMA8 > EMA21" : "EMA8 <= EMA21",
      },
      vol_breakout: { entry: volBreakout },
      bar3_reversal: { entry: bar3Reversal },
      rsi: {
        value: toFixedNum(rsiValue),
        entry: rsiEntry,
        exit: rsiExit,
      },
      bb_squeeze: { entry: bbSqueeze },
      sma50_pullback: { entry: sma50Pullback },
    },
    entryCount,
    exitCount,
    trend: emaBullish ? "BULL" : "BEAR",
  };
}

async function fetchHistory(symbol: string, apiKey: string): Promise<FmpHistoricalBar[] | null> {
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=120&apikey=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const payload = (await response.json()) as FmpHistoricalResponse;
  if (!Array.isArray(payload.historical)) return null;

  return payload.historical
    .filter((bar) => typeof bar.close === "number" && typeof bar.open === "number" && typeof bar.volume === "number")
    .slice(0, 120);
}

export async function GET(req: NextRequest) {
  const symbols = normalizeSymbols(req.nextUrl.searchParams.get("symbols"));

  if (!symbols.length) {
    return NextResponse.json({ error: "Missing symbols query parameter" }, { status: 400 });
  }

  const cacheKey = symbols.slice().sort().join(",");
  const now = Date.now();
  const cached = signalsCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
      },
    });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const results: SignalResult[] = [];

    for (let offset = 0; offset < symbols.length; offset += BATCH_SIZE) {
      const batch = symbols.slice(offset, offset + BATCH_SIZE);
      const histories = await Promise.all(batch.map((symbol) => fetchHistory(symbol, apiKey)));

      for (let index = 0; index < batch.length; index += 1) {
        const symbol = batch[index];
        const bars = histories[index];
        if (!bars || bars.length < 30) continue;
        results.push(buildSignalResult(symbol, bars));
      }
    }

    const data: SignalsApiResponse = {
      scannedAt: new Date().toISOString(),
      results,
    };

    signalsCache.set(cacheKey, { expiresAt: now + TTL_MS, data });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 502 });
  }
}
