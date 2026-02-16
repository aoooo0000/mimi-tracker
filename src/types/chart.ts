export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartPoint {
  time: string;
  value: number;
}

export interface ChartData {
  candles: ChartCandle[];
  indicators: {
    sma200: ChartPoint[];
    sma50: ChartPoint[];
    sma20: ChartPoint[];
    ema21: ChartPoint[];
    ema8: ChartPoint[];
    macd: { time: string; macd: number; signal: number; histogram: number }[];
    rsi: ChartPoint[];
    ttmSqueeze: { time: string; squeezeOn: number; momentum: number }[];
    bollinger: { time: string; upper: number; middle: number; lower: number }[];
    darvas: { top: number; bottom: number };
  };
}

export interface ChartDataApiResponse {
  symbol: string;
  days: number;
  data: ChartData;
}
