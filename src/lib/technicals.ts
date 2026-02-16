export function toFixedNum(input: number, digits = 2): number {
  if (!Number.isFinite(input)) return 0;
  return Number(input.toFixed(digits));
}

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  if (values.length < period) return out;

  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  out[period - 1] = seed / period;

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }

  return out;
}

export function stddev(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  for (let i = period - 1; i < values.length; i += 1) {
    const window = values.slice(i - period + 1, i + 1);
    const avg = window.reduce((acc, v) => acc + v, 0) / period;
    const variance = window.reduce((acc, v) => acc + (v - avg) ** 2, 0) / period;
    out[i] = Math.sqrt(variance);
  }
  return out;
}

export function rsi(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(Number.NaN);
  if (values.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, i) =>
    Number.isFinite(fastEma[i]) && Number.isFinite(slowEma[i]) ? fastEma[i] - slowEma[i] : Number.NaN,
  );

  const signal = ema(
    line.map((v) => (Number.isFinite(v) ? v : 0)),
    signalPeriod,
  );

  const histogram = line.map((v, i) => (Number.isFinite(v) && Number.isFinite(signal[i]) ? v - signal[i] : Number.NaN));
  return { line, signal, histogram };
}

export function bollinger(values: number[], period = 20, stdMul = 2) {
  const middle = sma(values, period);
  const sd = stddev(values, period);
  const upper = middle.map((m, i) => (Number.isFinite(m) && Number.isFinite(sd[i]) ? m + sd[i] * stdMul : Number.NaN));
  const lower = middle.map((m, i) => (Number.isFinite(m) && Number.isFinite(sd[i]) ? m - sd[i] * stdMul : Number.NaN));
  return { upper, middle, lower };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const tr = highs.map((high, i) => {
    if (i === 0) return high - lows[i];
    return Math.max(high - lows[i], Math.abs(high - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  });

  const out = new Array<number>(highs.length).fill(Number.NaN);
  if (tr.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += tr[i];
  out[period - 1] = sum / period;
  for (let i = period; i < tr.length; i += 1) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

export function adx(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const len = highs.length;
  const plusDm = new Array<number>(len).fill(0);
  const minusDm = new Array<number>(len).fill(0);

  for (let i = 1; i < len; i += 1) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  const tr = atr(highs, lows, closes, 1);
  const smooth = (arr: number[]) => {
    const out = new Array<number>(len).fill(Number.NaN);
    if (len < period) return out;
    let acc = 0;
    for (let i = 1; i <= period; i += 1) acc += arr[i] ?? 0;
    out[period] = acc;
    for (let i = period + 1; i < len; i += 1) out[i] = out[i - 1] - out[i - 1] / period + (arr[i] ?? 0);
    return out;
  };

  const smoothTr = smooth(tr);
  const smoothPlus = smooth(plusDm);
  const smoothMinus = smooth(minusDm);

  const dx = new Array<number>(len).fill(Number.NaN);
  for (let i = period; i < len; i += 1) {
    if (!Number.isFinite(smoothTr[i]) || smoothTr[i] === 0) continue;
    const plusDi = (100 * (smoothPlus[i] ?? 0)) / smoothTr[i];
    const minusDi = (100 * (smoothMinus[i] ?? 0)) / smoothTr[i];
    const denom = plusDi + minusDi;
    dx[i] = denom === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / denom;
  }

  const adxOut = new Array<number>(len).fill(Number.NaN);
  if (len <= period * 2) return adxOut;
  let first = 0;
  for (let i = period; i < period * 2; i += 1) first += Number.isFinite(dx[i]) ? dx[i] : 0;
  adxOut[period * 2 - 1] = first / period;

  for (let i = period * 2; i < len; i += 1) {
    adxOut[i] = ((adxOut[i - 1] ?? 0) * (period - 1) + (Number.isFinite(dx[i]) ? dx[i] : 0)) / period;
  }
  return adxOut;
}

export function linregSlope(values: number[]): number {
  const n = values.length;
  if (!n) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i + 1;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (!denom) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
