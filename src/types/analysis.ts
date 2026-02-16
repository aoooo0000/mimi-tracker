export interface AnalysisResult {
  symbol: string;
  companyName?: string;
  price: number;
  change: number;
  changeAmount?: number;
  movingAverages: {
    sma200: number;
    sma50: number;
    sma20?: number;
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
    histogramTrend?: "increasing" | "decreasing";
    bullDivergence?: boolean;
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
  volume?: {
    current: number;
    avg20: number;
    ratio: number;
  };
  adx?: {
    value: number;
    trendStrength: "strong" | "weak";
  };
  darvasBox: {
    top: number;
    bottom: number;
    formationDays: number;
    status: "inside" | "breakout" | "breakdown";
  };
  ttmSqueeze: {
    squeezeOn: boolean;
    momentum: number;
    direction: "rising" | "falling";
  };
  smc: {
    trend: "uptrend" | "downtrend" | "sideways";
    swingHigh: number;
    swingLow: number;
    higherHigh: boolean;
    higherLow: boolean;
    lowerHigh: boolean;
    lowerLow: boolean;
  };
  stopLoss: {
    darvasBottom: number;
    ema8: number;
    swingLow: number;
    recommended: number;
    riskPercent: number;
    logic: string;
  };
  mimiScore: {
    total: number;
    trend: number;
    momentum: number;
    technical: number;
    verdict: string;
    positiveSignals: string[];
    riskSignals: string[];
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
