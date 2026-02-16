import { NextResponse } from "next/server";
import { bollinger, ema, rsi, sma, toFixedNum } from "@/lib/technicals";
import type { MarketRegime, MarketRegimeApiResponse } from "@/types/marketRegime";

type FmpQuote = {
  symbol: string;
  price: number;
  changesPercentage?: number;
};

type FmpHistoricalBar = {
  date: string;
  close: number;
};

type FmpHistoricalResponse = {
  historical?: FmpHistoricalBar[];
};

type CacheEntry = {
  expiresAt: number;
  data: MarketRegimeApiResponse;
};

const TTL_MS = 120_000;
const cache = new Map<string, CacheEntry>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildStatus(vix: number): MarketRegime["vix"]["status"] {
  if (vix < 15) return "low";
  if (vix < 20) return "moderate";
  if (vix < 30) return "high";
  return "extreme";
}

function buildTrend(current: number, ma20: number): MarketRegime["vix"]["trend"] {
  const diff = current - ma20;
  if (Math.abs(diff) < 0.2) return "stable";
  return diff > 0 ? "rising" : "falling";
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function fetchQuotes(apiKey: string): Promise<Record<string, FmpQuote>> {
  const payload = await fetchJson<FmpQuote[]>(
    `https://financialmodelingprep.com/api/v3/quote/SPY,QQQ?apikey=${apiKey}`,
  );

  if (!Array.isArray(payload)) return {};
  return payload.reduce<Record<string, FmpQuote>>((acc, item) => {
    if (item?.symbol && typeof item.price === "number") acc[item.symbol] = item;
    return acc;
  }, {});
}

async function fetchHistory(symbol: string, apiKey: string, timeseries = 250): Promise<number[] | null> {
  const payload = await fetchJson<FmpHistoricalResponse>(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=${timeseries}&apikey=${apiKey}`,
  );

  if (!Array.isArray(payload?.historical)) return null;

  return payload.historical
    .filter((bar) => typeof bar.close === "number")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((bar) => bar.close);
}

async function fetchVixQuote(apiKey: string): Promise<number | null> {
  const candidates = ["%5EVIX", "VIXY"];

  for (const ticker of candidates) {
    const payload = await fetchJson<FmpQuote[]>(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`);
    if (Array.isArray(payload) && payload[0] && typeof payload[0].price === "number") {
      return payload[0].price;
    }
  }

  return null;
}

async function fetchVixHistory(apiKey: string): Promise<number[] | null> {
  const candidates = ["%5EVIX", "VIXY"];

  for (const ticker of candidates) {
    const closes = await fetchHistory(ticker, apiKey, 250);
    if (closes && closes.length >= 50) return closes;
  }

  return null;
}

function buildIndexMetrics(price: number, changePercent: number, closes: number[]): MarketRegime["spy"] {
  const ema8Arr = ema(closes, 8);
  const sma50Arr = sma(closes, 50);
  const sma200Arr = sma(closes, 200);
  const rsi14Arr = rsi(closes, 14);
  const bb = bollinger(closes, 20, 2);

  const i = closes.length - 1;
  const ema8 = ema8Arr[i];
  const sma50v = sma50Arr[i];
  const sma200v = sma200Arr[i];
  const rsi14 = rsi14Arr[i];
  const upper = bb.upper[i];
  const lower = bb.lower[i];

  const bbPosition = Number.isFinite(upper) && Number.isFinite(lower) && upper !== lower
    ? clamp(((price - lower) / (upper - lower)) * 100, 0, 100)
    : 50;

  const distFrom200 = Number.isFinite(sma200v) && sma200v !== 0 ? ((price - sma200v) / sma200v) * 100 : 0;

  return {
    price: toFixedNum(price),
    changePercent: toFixedNum(changePercent),
    ema8: toFixedNum(Number.isFinite(ema8) ? ema8 : price),
    sma50: toFixedNum(Number.isFinite(sma50v) ? sma50v : price),
    sma200: toFixedNum(Number.isFinite(sma200v) ? sma200v : price),
    rsi: toFixedNum(Number.isFinite(rsi14) ? rsi14 : 50),
    bbPosition: toFixedNum(bbPosition),
    trend: Number.isFinite(sma200v) && price > sma200v ? "bull" : "bear",
    lifelineStatus: Number.isFinite(ema8) && price >= ema8 ? "above_ema8" : "below_ema8",
    distFrom200: toFixedNum(distFrom200),
  };
}

function scoreMarketRegime(data: Omit<MarketRegime, "overall" | "timestamp">): MarketRegime["overall"] {
  const breakdown: MarketRegime["overall"]["breakdown"] = [];
  let score = 0;

  let vixScore = 0;
  if (data.vix.current < 15) vixScore = 1;
  else if (data.vix.current < 20) vixScore = 0;
  else if (data.vix.current < 25) vixScore = -1;
  else if (data.vix.current < 30) vixScore = -2;
  else vixScore = 2;
  score += vixScore;
  breakdown.push({ key: "vix", label: "VIX 風險分", score: vixScore, note: `VIX ${data.vix.current}` });

  const trendScore = (name: "SPY" | "QQQ", x: MarketRegime["spy"]) => {
    let s = 0;
    if (x.price > x.sma200) s += 2;
    if (x.price > x.sma50) s += 1;
    if (x.price > x.ema8) s += 1;
    score += s;
    breakdown.push({ key: `${name.toLowerCase()}_trend`, label: `${name} 趨勢分`, score: s, note: `P:${x.price} / EMA8:${x.ema8} / SMA50:${x.sma50} / SMA200:${x.sma200}` });
  };

  trendScore("SPY", data.spy);
  trendScore("QQQ", data.qqq);

  const rsiScore = (name: "SPY" | "QQQ", value: number) => {
    let s = 0;
    if (value < 30) s = 1;
    else if (value > 70) s = -1;
    score += s;
    breakdown.push({ key: `${name.toLowerCase()}_rsi`, label: `${name} RSI 分`, score: s, note: `RSI ${value}` });
  };

  rsiScore("SPY", data.spy.rsi);
  rsiScore("QQQ", data.qqq.rsi);

  const bbScore = (name: "SPY" | "QQQ", value: number) => {
    const s = value < 20 ? 1 : 0;
    score += s;
    breakdown.push({ key: `${name.toLowerCase()}_bb`, label: `${name} 布林帶分`, score: s, note: `BB 位置 ${value}%` });
  };

  bbScore("SPY", data.spy.bbPosition);
  bbScore("QQQ", data.qqq.bbPosition);

  score = clamp(score, -10, 10);

  const panicBottom = data.vix.current > 30 && (data.spy.rsi < 30 || data.qqq.rsi < 30);

  if (score >= 7) {
    return { score, regime: "extreme_offense", label: "極度進攻", suggestion: "全力加碼，優先布局強勢標的。", breakdown };
  }
  if (score >= 4) {
    return { score, regime: "offense", label: "進攻", suggestion: "積極買入，分批提高曝險。", breakdown };
  }
  if (score >= 1) {
    return { score, regime: "neutral", label: "中性", suggestion: "維持部位，等待更明確方向。", breakdown };
  }
  if (score <= -3 || panicBottom) {
    return {
      score,
      regime: "crisis_buy",
      label: "危機入市",
      suggestion: panicBottom ? "恐慌區間可分批承接，嚴控資金與風險。" : "市場極弱，僅考慮超跌分批策略。",
      breakdown,
    };
  }
  return { score, regime: "defense", label: "防禦", suggestion: "降低槓桿與倉位，保留現金。", breakdown };
}

export async function GET() {
  const now = Date.now();
  const cacheKey = "market-regime";
  const cached = cache.get(cacheKey);

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
    const [quotes, spyCloses, qqqCloses, vixCurrent, vixCloses] = await Promise.all([
      fetchQuotes(apiKey),
      fetchHistory("SPY", apiKey, 250),
      fetchHistory("QQQ", apiKey, 250),
      fetchVixQuote(apiKey),
      fetchVixHistory(apiKey),
    ]);

    if (!quotes.SPY || !quotes.QQQ || !spyCloses || !qqqCloses || spyCloses.length < 200 || qqqCloses.length < 200) {
      return NextResponse.json({ error: "Insufficient market data" }, { status: 502 });
    }

    const vixSeries = vixCloses && vixCloses.length >= 50 ? vixCloses : new Array(50).fill(vixCurrent ?? 20);
    const vixNow = typeof vixCurrent === "number" ? vixCurrent : vixSeries[vixSeries.length - 1] ?? 20;

    const vixMa20 = sma(vixSeries, 20).at(-1) ?? vixNow;
    const vixMa50 = sma(vixSeries, 50).at(-1) ?? vixNow;

    const raw = {
      vix: {
        current: toFixedNum(vixNow),
        ma20: toFixedNum(Number.isFinite(vixMa20) ? vixMa20 : vixNow),
        ma50: toFixedNum(Number.isFinite(vixMa50) ? vixMa50 : vixNow),
        status: buildStatus(vixNow),
        trend: buildTrend(vixNow, Number.isFinite(vixMa20) ? vixMa20 : vixNow),
      },
      spy: buildIndexMetrics(quotes.SPY.price, quotes.SPY.changesPercentage ?? 0, spyCloses),
      qqq: buildIndexMetrics(quotes.QQQ.price, quotes.QQQ.changesPercentage ?? 0, qqqCloses),
    };

    const data: MarketRegime = {
      timestamp: new Date().toISOString(),
      ...raw,
      overall: scoreMarketRegime(raw),
    };

    const payload: MarketRegimeApiResponse = { data };
    cache.set(cacheKey, { expiresAt: now + TTL_MS, data: payload });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to build market regime" }, { status: 502 });
  }
}
