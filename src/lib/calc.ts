export function calcReturnPct(recommendPrice: number, currentPrice?: number) {
  if (!currentPrice || recommendPrice <= 0) return undefined;
  return ((currentPrice - recommendPrice) / recommendPrice) * 100;
}
