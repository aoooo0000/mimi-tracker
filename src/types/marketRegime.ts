export type RegimeKey = "extreme_offense" | "offense" | "neutral" | "defense" | "crisis_buy";

export interface MarketRegimeIndex {
  price: number;
  changePercent: number;
  ema8: number;
  sma50: number;
  sma200: number;
  rsi: number;
  bbPosition: number;
  trend: "bull" | "bear";
  lifelineStatus: "above_ema8" | "below_ema8";
  distFrom200: number;
}

export interface MarketRegime {
  timestamp: string;
  vix: {
    current: number;
    ma20: number;
    ma50: number;
    status: "low" | "moderate" | "high" | "extreme";
    trend: "rising" | "falling" | "stable";
  };
  spy: MarketRegimeIndex;
  qqq: MarketRegimeIndex;
  overall: {
    score: number;
    regime: RegimeKey;
    label: string;
    suggestion: string;
    breakdown: Array<{
      key: string;
      label: string;
      score: number;
      note: string;
    }>;
  };
}

export interface MarketRegimeApiResponse {
  data: MarketRegime;
}
