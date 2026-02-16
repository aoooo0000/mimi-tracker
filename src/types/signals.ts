export interface SignalResult {
  symbol: string;
  price: number;
  change: number;
  signals: {
    ema_cross: { entry: boolean; bullish: boolean; status: string };
    vol_breakout: { entry: boolean };
    bar3_reversal: { entry: boolean };
    rsi: { value: number; entry: boolean; exit: boolean };
    bb_squeeze: { entry: boolean };
    sma50_pullback: { entry: boolean };
  };
  entryCount: number;
  exitCount: number;
  trend: "BULL" | "BEAR";
}

export interface SignalsApiResponse {
  scannedAt: string;
  results: SignalResult[];
}
