export interface AnalysisResult {
  symbol: string;
  price: number;
  change: number;
  movingAverages: {
    sma200: number;
    sma50: number;
    ema21: number;
    ema8: number;
    priceVs200: "above" | "below";
    goldenCross: boolean;
    trendScore: number;
  };
  macd: {
    line: number;
    signal: number;
    histogram: number;
    aboveZero: boolean;
    goldenCross: boolean;
    trend: string;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    width: number;
    position: "above_upper" | "upper_half" | "lower_half" | "below_lower";
    squeeze: boolean;
    zScore: number;
  };
  rsi: {
    value: number;
    status: "overbought" | "neutral" | "oversold";
  };
  stopFalling: {
    count: number;
    total: number;
    signals: string[];
  };
  bottomSignals: {
    count: number;
    total: number;
    signals: string[];
  };
  strategies: {
    entryCount: number;
    exitCount: number;
    details: string[];
  };
  overallScore: {
    score: number;
    rating: string;
    reasons: string[];
  };
}

export interface AnalysisApiResponse {
  scannedAt: string;
  result: AnalysisResult;
}
