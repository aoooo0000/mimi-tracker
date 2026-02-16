import { NextRequest, NextResponse } from "next/server";
import { adx, atr, bollinger, ema, linregSlope, macd, rsi, sma, toFixedNum } from "@/lib/technicals";
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

function calcDarvas(highs: number[], lows: number[], close: number) {
  const lookback = Math.min(252, highs.length);
  const start = highs.length - lookback;
  const top = Math.max(...highs.slice(start));
  const bottom = Math.min(...lows.slice(start));
  let formationDays = 1;
  for (let i = highs.length - 1; i >= start; i -= 1) {
    if (highs[i] > top * 0.995 || lows[i] < bottom * 1.005) formationDays += 1;
    else break;
  }

  const status: AnalysisResult["darvasBox"]["status"] = close > top ? "breakout" : close < bottom ? "breakdown" : "inside";
  return { top, bottom, formationDays, status };
}

function calcTtm(closes: number[], highs: number[], lows: number[]) {
  const bb = bollinger(closes, 20, 2);
  const ema20 = ema(closes, 20);
  const atr20 = atr(highs, lows, closes, 20);

  const series = closes.map((_, i) => {
    const kMid = ema20[i];
    const kAtr = atr20[i] * 1.5;
    const squeezeOn =
      Number.isFinite(bb.upper[i]) &&
      Number.isFinite(bb.lower[i]) &&
      Number.isFinite(kMid) &&
      Number.isFinite(kAtr) &&
      bb.upper[i] < kMid + kAtr &&
      bb.lower[i] > kMid - kAtr;

    const window = closes
      .slice(Math.max(0, i - 19), i + 1)
      .map((_, idx) => {
        const j = Math.max(0, i - 19) + idx;
        const mid = Number.isFinite(bb.middle[j]) && Number.isFinite(ema20[j]) ? (bb.middle[j] + ema20[j]) / 2 : Number.NaN;
        return Number.isFinite(mid) ? closes[j] - mid : Number.NaN;
      })
      .filter((v) => Number.isFinite(v));

    const momentum = window.length >= 5 ? linregSlope(window) : 0;
    return { squeezeOn, momentum };
  });

  const i = closes.length - 1;
  const prev = i - 1;
  return {
    squeezeOn: series[i]?.squeezeOn ?? false,
    momentum: series[i]?.momentum ?? 0,
    direction: (series[i]?.momentum ?? 0) >= (series[prev]?.momentum ?? 0) ? "rising" : "falling",
  } as AnalysisResult["ttmSqueeze"];
}

function detectSwing(highs: number[], lows: number[], lookAround = 5) {
  const swingHighs: { index: number; value: number }[] = [];
  const swingLows: { index: number; value: number }[] = [];
  for (let i = lookAround; i < highs.length - lookAround; i += 1) {
    const leftHigh = highs.slice(i - lookAround, i);
    const rightHigh = highs.slice(i + 1, i + lookAround + 1);
    if (highs[i] >= Math.max(...leftHigh, ...rightHigh)) swingHighs.push({ index: i, value: highs[i] });

    const leftLow = lows.slice(i - lookAround, i);
    const rightLow = lows.slice(i + 1, i + lookAround + 1);
    if (lows[i] <= Math.min(...leftLow, ...rightLow)) swingLows.push({ index: i, value: lows[i] });
  }
  return { swingHighs, swingLows };
}

function calcSmc(highs: number[], lows: number[]) {
  const { swingHighs, swingLows } = detectSwing(highs, lows, 5);
  const lastHigh = swingHighs.at(-1)?.value ?? highs.at(-1) ?? 0;
  const prevHigh = swingHighs.at(-2)?.value ?? lastHigh;
  const lastLow = swingLows.at(-1)?.value ?? lows.at(-1) ?? 0;
  const prevLow = swingLows.at(-2)?.value ?? lastLow;

  const higherHigh = lastHigh > prevHigh;
  const higherLow = lastLow > prevLow;
  const lowerHigh = lastHigh < prevHigh;
  const lowerLow = lastLow < prevLow;

  const trend: AnalysisResult["smc"]["trend"] = higherHigh && higherLow ? "uptrend" : lowerHigh && lowerLow ? "downtrend" : "sideways";

  return { trend, swingHigh: lastHigh, swingLow: lastLow, higherHigh, higherLow, lowerHigh, lowerLow };
}

function calcMimiScore(input: {
  price: number;
  sma200: number;
  sma50: number;
  ema8: number;
  ema21: number;
  smcTrend: AnalysisResult["smc"]["trend"];
  macdHist: number;
  macdLine: number;
  rsiValue: number;
  ttm: AnalysisResult["ttmSqueeze"];
  volRatio: number;
  bbPos: AnalysisResult["bollinger"]["position"];
  darvasStatus: AnalysisResult["darvasBox"]["status"];
  bottomSignals: string[];
  stopSignals: string[];
}) {
  let trend = 50;
  let momentum = 50;
  let technical = 50;
  const positiveSignals: string[] = [];
  const riskSignals: string[] = [];

  if (input.price > input.sma200) {
    trend += 15;
    positiveSignals.push("站上 200MA");
  } else {
    trend -= 20;
    riskSignals.push("跌破 200MA");
  }
  if (input.price > input.sma50) trend += 10;
  else trend -= 10;

  if (input.ema8 > input.ema21) {
    trend += 12;
    positiveSignals.push("EMA 多頭排列");
  } else {
    trend -= 12;
    riskSignals.push("EMA 死叉");
  }

  if (input.smcTrend === "uptrend") {
    trend += 13;
    positiveSignals.push("上升趨勢結構");
  }
  if (input.smcTrend === "downtrend") {
    trend -= 15;
    riskSignals.push("下降趨勢結構");
  }

  if (input.macdLine > 0) momentum += 10;
  if (input.macdHist > 0) {
    momentum += 10;
    positiveSignals.push("MACD 多方動能");
  } else momentum -= 10;

  if (input.rsiValue < 35) {
    momentum += 6;
    positiveSignals.push("RSI 低檔");
  }
  if (input.rsiValue > 70) {
    momentum -= 8;
    riskSignals.push("RSI 過熱");
  }

  if (!input.ttm.squeezeOn && input.ttm.direction === "rising") momentum += 8;
  if (input.volRatio > 1.2) momentum += 6;

  if (input.bbPos === "upper_half") technical += 8;
  if (input.bbPos === "below_lower") technical -= 10;

  if (input.darvasStatus === "breakout") {
    technical += 12;
    positiveSignals.push("Darvas 突破");
  }
  if (input.darvasStatus === "breakdown") {
    technical -= 15;
    riskSignals.push("Darvas 跌破");
  }

  technical += Math.min(10, input.stopSignals.length * 2);
  technical += Math.min(8, input.bottomSignals.length * 2);

  trend = Math.max(0, Math.min(100, trend));
  momentum = Math.max(0, Math.min(100, momentum));
  technical = Math.max(0, Math.min(100, technical));

  const total = Math.round(trend * 0.4 + momentum * 0.3 + technical * 0.3);
  const verdict = total >= 75 ? "強力買入" : total >= 60 ? "偏多觀察" : total >= 45 ? "持有觀察" : total >= 30 ? "謹慎" : "避開";
  return { total, trend, momentum, technical, verdict, positiveSignals, riskSignals };
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
  const sma20 = sma(closes, 20);
  const ema21 = ema(closes, 21);
  const ema8 = ema(closes, 8);
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
  const bb = bollinger(closes, 20, 2);
  const adx14 = adx(highs, lows, closes, 14);

  const price = closes[i] ?? 0;
  const prevClose = closes[prev] ?? price;
  const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const changeAmount = price - prevClose;

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
  const vol20 = sma(volumes, 20);
  const volRatio = Number.isFinite(vol20[i]) && vol20[i] > 0 ? volumes[i] / vol20[i] : 0;

  const darvasBox = calcDarvas(highs, lows, price);
  const ttmSqueeze = calcTtm(closes, highs, lows);
  const smc = calcSmc(highs, lows);

  const stopSignals: string[] = [];
  const bottomSignals: string[] = [];

  if (i >= 9) {
    const last3Low = Math.min(...lows.slice(i - 2, i + 1));
    const prevLow = Math.min(...lows.slice(i - 9, i - 2));
    if (last3Low >= prevLow * 0.99) stopSignals.push("三天不破新低");
  }

  const body = Math.abs(closes[i] - opens[i]);
  const avgBody =
    opens.slice(Math.max(0, i - 19), i + 1).reduce((acc, o, idx) => {
      const k = Math.max(0, i - 19) + idx;
      return acc + Math.abs(closes[k] - opens[k]) / (o || 1);
    }, 0) / Math.min(20, i + 1);
  if (closes[i] > opens[i] && opens[i] > 0 && body / opens[i] > avgBody * 1.5) stopSignals.push("出現長陽K棒");

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

  if (i >= 19) {
    const vv = volumes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
    const priceChange = prevClose ? Math.abs((price - prevClose) / prevClose) : 0;
    if (volumes[i] > vv * 1.5 && priceChange < 0.01) stopSignals.push("量增價平");
  }

  if (i >= 21) {
    const support = Math.min(...lows.slice(i - 20, i));
    const brokeAndRecovered = lows[i] < support * 0.99 && closes[i] > support;
    if (brokeAndRecovered) stopSignals.push("跌破支撐後快速收回");
  }

  if (i >= 20) {
    const lowWindow = lows.slice(i - 20, i + 1);
    const rsiWindow = rsi14.slice(i - 20, i + 1).filter((v) => Number.isFinite(v));
    const minLow = Math.min(...lowWindow);
    const minRsi = rsiWindow.length ? Math.min(...rsiWindow) : rsi14[i];
    if (lows[i] <= minLow && Number.isFinite(rsi14[i]) && rsi14[i] > minRsi) stopSignals.push("RSI 背離");
  }

  if (i >= 4) {
    const shrinking =
      volumes[i - 4] > volumes[i - 3] &&
      volumes[i - 3] > volumes[i - 2] &&
      closes[i - 4] > closes[i - 3] &&
      closes[i - 3] > closes[i - 2];
    const rebound = closes[i] > closes[i - 1] && volumes[i] > volumes[i - 1] * 1.5;
    if (shrinking && rebound) stopSignals.push("連續縮量下跌後放量反彈");
  }

  if (i >= 19) {
    const vv = volumes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
    const pct = prevClose ? (price - prevClose) / prevClose : 0;
    if (volumes[i] > vv * 2 && pct > 0.03) bottomSignals.push("帶量長陽突破");
  }
  if (stopSignals.includes("RSI 背離")) bottomSignals.push("RSI底部背離");
  if (prev >= 0 && macdData.histogram[prev] < 0 && macdData.histogram[i] > 0) bottomSignals.push("MACD 柱狀體轉正");

  const stopLossDarvas = darvasBox.bottom * 0.98;
  const stopLossEma8 = ema8[i] * 0.97;
  const stopLossSwing = smc.swingLow * 0.98;
  const candidates = [stopLossDarvas, stopLossEma8, stopLossSwing]
    .filter((v) => Number.isFinite(v) && v > 0 && v < price)
    .sort((a, b) => b - a);
  const recommendedStop = candidates[0] ?? stopLossEma8;
  const riskPercent = price > 0 ? ((price - recommendedStop) / price) * 100 : 0;

  const mimiScore = calcMimiScore({
    price,
    sma200: sma200[i] ?? 0,
    sma50: sma50[i] ?? 0,
    ema8: ema8[i] ?? 0,
    ema21: ema21[i] ?? 0,
    smcTrend: smc.trend,
    macdHist,
    macdLine,
    rsiValue,
    ttm: ttmSqueeze,
    volRatio,
    bbPos,
    darvasStatus: darvasBox.status,
    bottomSignals,
    stopSignals,
  });

  const clipped = Math.max(-10, Math.min(10, (mimiScore.total - 50) / 5));
  const rating =
    clipped >= 6 ? "強力買入" : clipped >= 3 ? "考慮買入" : clipped >= 0 ? "中性" : clipped >= -3 ? "謹慎" : "避開";

  return {
    symbol,
    price: toFixedNum(price),
    change: toFixedNum(change),
    changeAmount: toFixedNum(changeAmount),
    movingAverages: {
      sma200: toFixedNum(sma200[i]),
      sma50: toFixedNum(sma50[i]),
      sma20: toFixedNum(sma20[i]),
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
      histogramTrend: macdHist >= (macdData.histogram[prev] ?? macdHist) ? "increasing" : "decreasing",
      bullDivergence: stopSignals.includes("RSI 背離"),
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
    volume: {
      current: Math.round(volumes[i] ?? 0),
      avg20: Math.round(vol20[i] ?? 0),
      ratio: toFixedNum(volRatio, 2),
    },
    adx: {
      value: toFixedNum(adx14[i] ?? 0, 2),
      trendStrength: (adx14[i] ?? 0) >= 25 ? "strong" : "weak",
    },
    darvasBox: {
      top: toFixedNum(darvasBox.top),
      bottom: toFixedNum(darvasBox.bottom),
      formationDays: darvasBox.formationDays,
      status: darvasBox.status,
    },
    ttmSqueeze: {
      squeezeOn: ttmSqueeze.squeezeOn,
      momentum: toFixedNum(ttmSqueeze.momentum, 5),
      direction: ttmSqueeze.direction,
    },
    smc: {
      trend: smc.trend,
      swingHigh: toFixedNum(smc.swingHigh),
      swingLow: toFixedNum(smc.swingLow),
      higherHigh: smc.higherHigh,
      higherLow: smc.higherLow,
      lowerHigh: smc.lowerHigh,
      lowerLow: smc.lowerLow,
    },
    stopLoss: {
      darvasBottom: toFixedNum(stopLossDarvas),
      ema8: toFixedNum(stopLossEma8),
      swingLow: toFixedNum(stopLossSwing),
      recommended: toFixedNum(recommendedStop),
      riskPercent: toFixedNum(riskPercent, 2),
      logic: "選擇距離現價最近且位於現價下方的合理支撐位，避免停損過深。",
    },
    mimiScore,
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
    strategies: {
      entryCount: 0,
      exitCount: 0,
      details: [],
    },
    overallScore: {
      score: toFixedNum(clipped, 1),
      rating,
      reasons: [
        `趨勢分 ${mimiScore.trend}`,
        `動能分 ${mimiScore.momentum}`,
        `技術分 ${mimiScore.technical}`,
        `總分 ${mimiScore.total}`,
      ],
    },
  };
}

async function fetchHistory(symbol: string, apiKey: string): Promise<FmpHistoricalBar[] | null> {
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=400&apikey=${apiKey}`;
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
