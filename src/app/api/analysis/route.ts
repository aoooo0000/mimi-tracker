import { NextRequest, NextResponse } from "next/server";
import { bollinger, ema, macd, rsi, sma, toFixedNum } from "@/lib/technicals";
import type { AnalysisApiResponse, AnalysisResult } from "@/types/analysis";

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

type CacheEntry = { expiresAt: number; data: AnalysisApiResponse };

const TTL_MS = 120_000;
const analysisCache = new Map<string, CacheEntry>();

function statusFromRsi(value: number): "overbought" | "neutral" | "oversold" {
  if (value > 70) return "overbought";
  if (value < 30) return "oversold";
  return "neutral";
}

function toMacdTrend(aboveZero: boolean, goldenCross: boolean, line: number, signal: number): string {
  if (aboveZero && goldenCross) return "零軸上方金叉（最佳偏多）";
  if (aboveZero && line > signal) return "零軸上方多頭延續";
  if (!aboveZero && goldenCross) return "零軸下方金叉（反彈觀察）";
  if (!aboveZero && line < signal) return "零軸下方偏空";
  return "趨勢中性";
}

function calcStrategies(
  closes: number[],
  opens: number[],
  lows: number[],
  highs: number[],
  volumes: number[],
  rsi14: number[],
  ema8: number[],
  ema21: number[],
  sma50: number[],
  sma200: number[],
  bbUpper: number[],
  bbLower: number[],
  bbWidth: number[],
) {
  const i = closes.length - 1;
  const prev = i - 1;
  const details: string[] = [];

  const emaEntry = prev >= 0 && ema8[i] > ema21[i] && ema8[prev] <= ema21[prev];
  const emaExit = ema8[i] < ema21[i];
  if (emaEntry) details.push("🟢 EMA 8/21 黃金交叉");
  if (emaExit) details.push("🔴 EMA 8/21 空頭排列");

  const vol20 = sma(volumes, 20);
  const dayChange = prev >= 0 && closes[prev] ? (closes[i] - closes[prev]) / closes[prev] : 0;
  const volRatio = Number.isFinite(vol20[i]) && vol20[i] > 0 ? volumes[i] / vol20[i] : 0;
  const vbEntry = dayChange > 0.02 && volRatio > 2 && closes[i] > sma50[i];
  const vbExit = dayChange < -0.02 && volRatio > 1.5;
  if (vbEntry) details.push(`🟢 Volume Breakout +${toFixedNum(dayChange * 100, 1)}% / ${toFixedNum(volRatio, 1)}x`);
  if (vbExit) details.push(`🔴 放量下跌 ${toFixedNum(dayChange * 100, 1)}%`);

  const rsiNow = rsi14[i];
  const bar3Entry =
    i >= 2 &&
    closes[i] > opens[i] &&
    closes[i - 1] > opens[i - 1] &&
    closes[i - 2] > opens[i - 2] &&
    Number.isFinite(rsiNow) &&
    rsiNow < 40;
  const bar3Exit = Number.isFinite(rsiNow) && rsiNow > 60 && closes[i] < opens[i];
  if (bar3Entry) details.push("🟢 3-Bar Reversal");
  if (bar3Exit) details.push("🔴 3-Bar Reversal 出場");

  const rsiEntry = Number.isFinite(rsiNow) && rsiNow < 30;
  const rsiExit = Number.isFinite(rsiNow) && rsiNow > 50;
  if (rsiEntry) details.push(`🟢 RSI Bounce (${toFixedNum(rsiNow, 1)})`);
  if (rsiExit) details.push(`🔴 RSI > 50 (${toFixedNum(rsiNow, 1)})`);

  const widthWindow = bbWidth.slice(Math.max(0, i - 19), i + 1).filter((v) => Number.isFinite(v));
  const minWidth = widthWindow.length ? Math.min(...widthWindow) : Number.NaN;
  const bbEntry = Number.isFinite(bbWidth[i]) && Number.isFinite(minWidth) && bbWidth[i] <= minWidth && closes[i] > bbUpper[i];
  const bbExit = closes[i] < bbLower[i];
  if (bbEntry) details.push("🟢 BB Squeeze Breakout");
  if (bbExit) details.push("🔴 BB 跌破下軌");

  const regime = Number.isFinite(sma200[i]) && sma50[i] > sma200[i];
  const touch50 = Number.isFinite(sma50[i]) && Math.abs(closes[i] - sma50[i]) / sma50[i] < 0.01;
  const bounce50 = Number.isFinite(sma50[i]) && closes[i] > opens[i] && lows[i] <= sma50[i] * 1.01;
  const pbEntry = regime && touch50 && bounce50;
  const pbExit = Number.isFinite(sma50[i]) && closes[i] < sma50[i] * 0.98;
  if (pbEntry) details.push("🟢 50 SMA Pullback");
  if (pbExit) details.push("🔴 跌破 50SMA");

  const entryCount = [emaEntry, vbEntry, bar3Entry, rsiEntry, bbEntry, pbEntry].filter(Boolean).length;
  const exitCount = [emaExit, vbExit, bar3Exit, rsiExit, bbExit, pbExit].filter(Boolean).length;

  return { entryCount, exitCount, details };
}

function buildAnalysis(symbol: string, bars: FmpHistoricalBar[]): AnalysisResult {
  const ordered = [...bars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const closes = ordered.map((b) => b.close);
  const opens = ordered.map((b) => b.open);
  const highs = ordered.map((b) => b.high);
  const lows = ordered.map((b) => b.low);
  const volumes = ordered.map((b) => b.volume);

  const i = ordered.length - 1;
  const prev = i - 1;

  const sma200 = sma(closes, 200);
  const sma50 = sma(closes, 50);
  const ema21 = ema(closes, 21);
  const ema8 = ema(closes, 8);
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
  const bb = bollinger(closes, 20, 2);

  const price = closes[i] ?? 0;
  const prevClose = closes[prev] ?? price;
  const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  const maTrendScore =
    (Number.isFinite(sma200[i]) && price > sma200[i] ? 1 : -1) +
    (Number.isFinite(sma50[i]) && price > sma50[i] ? 1 : -1);
  const maGoldenCross = Number.isFinite(sma50[i]) && Number.isFinite(sma200[i]) && sma50[i] > sma200[i];

  const macdLine = macdData.line[i] ?? 0;
  const macdSignal = macdData.signal[i] ?? 0;
  const macdHist = macdData.histogram[i] ?? 0;
  const macdAboveZero = macdLine > 0;
  const macdGoldenCross = prev >= 0 && macdData.line[i] > macdData.signal[i] && macdData.line[prev] <= macdData.signal[prev];

  const bbMiddle = bb.middle[i] ?? 0;
  const bbUpper = bb.upper[i] ?? 0;
  const bbLower = bb.lower[i] ?? 0;
  const bbWidth = bbMiddle > 0 ? ((bbUpper - bbLower) / bbMiddle) * 100 : 0;
  const bbPos: AnalysisResult["bollinger"]["position"] =
    price > bbUpper ? "above_upper" : price < bbLower ? "below_lower" : price >= bbMiddle ? "upper_half" : "lower_half";
  const bbWidthWindow = bb.middle
    .map((_, idx) => {
      const m = bb.middle[idx];
      const u = bb.upper[idx];
      const l = bb.lower[idx];
      return Number.isFinite(m) && m > 0 && Number.isFinite(u) && Number.isFinite(l) ? ((u - l) / m) * 100 : Number.NaN;
    })
    .slice(Math.max(0, i - 19), i + 1)
    .filter((v) => Number.isFinite(v));
  const bbSqueeze = bbWidthWindow.length ? bbWidth <= Math.min(...bbWidthWindow) * 1.1 : false;
  const sigma = (bbUpper - bbMiddle) / 2;
  const bbZScore = sigma > 0 ? (price - bbMiddle) / sigma : 0;

  const rsiValue = rsi14[i] ?? 50;

  const stopSignals: string[] = [];
  const bottomSignals: string[] = [];

  // 1. 三天不破新低
  if (i >= 9) {
    const last3Low = Math.min(...lows.slice(i - 2, i + 1));
    const prevLow = Math.min(...lows.slice(i - 9, i - 2));
    if (last3Low >= prevLow * 0.99) stopSignals.push("三天不破新低");
  }

  // 2. 長陽 K 棒
  const body = Math.abs(closes[i] - opens[i]);
  const avgBody = opens.slice(Math.max(0, i - 19), i + 1).reduce((acc, o, idx) => {
    const k = Math.max(0, i - 19) + idx;
    return acc + Math.abs(closes[k] - opens[k]) / (o || 1);
  }, 0) / Math.min(20, i + 1);
  if (closes[i] > opens[i] && opens[i] > 0 && body / opens[i] > avgBody * 1.5) stopSignals.push("出現長陽K棒");

  // 3. 橫盤
  if (i >= 24) {
    const recent5 = closes.slice(i - 4, i + 1);
    const older20 = closes.slice(i - 24, i - 4);
    const std = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
    };
    const rv = std(recent5) / (recent5.reduce((a, b) => a + b, 0) / recent5.length);
    const ov = std(older20) / (older20.reduce((a, b) => a + b, 0) / older20.length);
    if (rv < ov * 0.7) stopSignals.push("走勢趨於橫盤");
  }

  // 4. 量增價平
  if (i >= 19) {
    const vol20 = volumes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
    const priceChange = prevClose ? Math.abs((price - prevClose) / prevClose) : 0;
    if (volumes[i] > vol20 * 1.5 && priceChange < 0.01) stopSignals.push("量增價平");
  }

  // 5. 跌破支撐後快速收回
  if (i >= 21) {
    const support = Math.min(...lows.slice(i - 20, i));
    const brokeAndRecovered = lows[i] < support * 0.99 && closes[i] > support;
    if (brokeAndRecovered) stopSignals.push("跌破支撐後快速收回");
  }

  // 6. RSI 背離（價格新低但 RSI 未新低）
  if (i >= 20) {
    const lowWindow = lows.slice(i - 20, i + 1);
    const rsiWindow = rsi14.slice(i - 20, i + 1);
    const minLow = Math.min(...lowWindow);
    const minRsi = Math.min(...rsiWindow.filter((v) => Number.isFinite(v)));
    if (lows[i] <= minLow && Number.isFinite(rsi14[i]) && rsi14[i] > minRsi) stopSignals.push("RSI 背離");
  }

  // 7. 連續縮量下跌後放量反彈
  if (i >= 4) {
    const shrinking = volumes[i - 4] > volumes[i - 3] && volumes[i - 3] > volumes[i - 2] && closes[i - 4] > closes[i - 3] && closes[i - 3] > closes[i - 2];
    const rebound = closes[i] > closes[i - 1] && volumes[i] > volumes[i - 1] * 1.5;
    if (shrinking && rebound) stopSignals.push("連續縮量下跌後放量反彈");
  }

  // Bottom signals
  if (i >= 19) {
    const vol20 = volumes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
    const pct = prevClose ? (price - prevClose) / prevClose : 0;
    if (volumes[i] > vol20 * 2 && pct > 0.03) bottomSignals.push("帶量長陽突破");
  }
  if (stopSignals.includes("RSI 背離")) bottomSignals.push("RSI底部背離");
  if (prev >= 0 && macdData.histogram[prev] < 0 && macdData.histogram[i] > 0) bottomSignals.push("MACD 柱狀體轉正");

  const strategies = calcStrategies(
    closes,
    opens,
    lows,
    highs,
    volumes,
    rsi14,
    ema8,
    ema21,
    sma50,
    sma200,
    bb.upper,
    bb.lower,
    bb.middle.map((m, idx) => {
      const u = bb.upper[idx];
      const l = bb.lower[idx];
      if (!Number.isFinite(m) || m === 0 || !Number.isFinite(u) || !Number.isFinite(l)) return Number.NaN;
      return (u - l) / m;
    }),
  );

  let score = 0;
  const reasons: string[] = [];
  if (Number.isFinite(sma200[i]) && price > sma200[i]) {
    score += 2;
    reasons.push("站上 200SMA +2");
  }
  if (Number.isFinite(sma50[i]) && price > sma50[i]) {
    score += 1;
    reasons.push("站上 50SMA +1");
  }
  if (maGoldenCross) {
    score += 1;
    reasons.push("50/200 黃金交叉 +1");
  }
  if (macdAboveZero) {
    score += 1;
    reasons.push("MACD 零軸上 +1");
  }
  if (macdGoldenCross) {
    score += 1;
    reasons.push("MACD 金叉 +1");
  }
  if (rsiValue < 30) {
    score += 1;
    reasons.push("RSI 超賣機會 +1");
  } else if (rsiValue > 70) {
    score -= 1;
    reasons.push("RSI 超買風險 -1");
  }
  if (stopSignals.length >= 5) {
    score += 2;
    reasons.push("止跌訊號 ≥5 +2");
  } else if (stopSignals.length >= 3) {
    score += 1;
    reasons.push("止跌訊號 ≥3 +1");
  }
  if (bottomSignals.length > 0) {
    score += bottomSignals.length;
    reasons.push(`底部訊號 ${bottomSignals.length} 個 +${bottomSignals.length}`);
  }
  if (strategies.entryCount > 0) {
    const add = strategies.entryCount * 0.5;
    score += add;
    reasons.push(`策略進場 ${strategies.entryCount} 個 +${add}`);
  }
  if (strategies.exitCount > 0) {
    const minus = strategies.exitCount * 0.5;
    score -= minus;
    reasons.push(`策略出場 ${strategies.exitCount} 個 -${minus}`);
  }

  const clipped = Math.max(-10, Math.min(10, score));
  const rating =
    clipped >= 6 ? "強力買入" : clipped >= 3 ? "考慮買入" : clipped >= 0 ? "中性" : clipped >= -3 ? "謹慎" : "避開";

  return {
    symbol,
    price: toFixedNum(price),
    change: toFixedNum(change),
    movingAverages: {
      sma200: toFixedNum(sma200[i]),
      sma50: toFixedNum(sma50[i]),
      ema21: toFixedNum(ema21[i]),
      ema8: toFixedNum(ema8[i]),
      priceVs200: price >= (sma200[i] ?? 0) ? "above" : "below",
      goldenCross: maGoldenCross,
      trendScore: maTrendScore,
    },
    macd: {
      line: toFixedNum(macdLine, 4),
      signal: toFixedNum(macdSignal, 4),
      histogram: toFixedNum(macdHist, 4),
      aboveZero: macdAboveZero,
      goldenCross: macdGoldenCross,
      trend: toMacdTrend(macdAboveZero, macdGoldenCross, macdLine, macdSignal),
    },
    bollinger: {
      upper: toFixedNum(bbUpper),
      middle: toFixedNum(bbMiddle),
      lower: toFixedNum(bbLower),
      width: toFixedNum(bbWidth, 2),
      position: bbPos,
      squeeze: bbSqueeze,
      zScore: toFixedNum(bbZScore, 2),
    },
    rsi: {
      value: toFixedNum(rsiValue, 2),
      status: statusFromRsi(rsiValue),
    },
    stopFalling: {
      count: stopSignals.length,
      total: 7,
      signals: stopSignals,
    },
    bottomSignals: {
      count: bottomSignals.length,
      total: 3,
      signals: bottomSignals,
    },
    strategies,
    overallScore: {
      score: toFixedNum(clipped, 1),
      rating,
      reasons,
    },
  };
}

async function fetchHistory(symbol: string, apiKey: string): Promise<FmpHistoricalBar[] | null> {
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=250&apikey=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as FmpHistoricalResponse;
  if (!Array.isArray(payload.historical)) return null;
  return payload.historical.filter(
    (b) =>
      typeof b.open === "number" &&
      typeof b.high === "number" &&
      typeof b.low === "number" &&
      typeof b.close === "number" &&
      typeof b.volume === "number",
  );
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol query parameter" }, { status: 400 });
  }

  const now = Date.now();
  const cached = analysisCache.get(symbol);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60" },
    });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FMP_API_KEY is not configured" }, { status: 500 });

  try {
    const bars = await fetchHistory(symbol, apiKey);
    if (!bars || bars.length < 60) {
      return NextResponse.json({ error: `Insufficient history for ${symbol}` }, { status: 404 });
    }

    const result = buildAnalysis(symbol, bars);
    const data: AnalysisApiResponse = { scannedAt: new Date().toISOString(), result };
    analysisCache.set(symbol, { expiresAt: now + TTL_MS, data });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analysis" }, { status: 502 });
  }
}
