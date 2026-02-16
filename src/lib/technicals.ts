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
