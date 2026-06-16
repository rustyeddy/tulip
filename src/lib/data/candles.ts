/**
 * candles.ts — synthetic OHLC candle generator
 * Replace with a real broker feed (REST poll or WebSocket) in production.
 */

export interface Candle {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function generateCandles(n = 26, startPrice = 209.0): Candle[] {
  const data: Candle[] = [];
  let price = startPrice;
  const open = new Date();
  open.setHours(9, 30, 0, 0);

  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.46) * 1.2;
    const o = price;
    const c = Math.max(200, price + change);
    const h = Math.max(o, c) + Math.random() * 0.6;
    const l = Math.min(o, c) - Math.random() * 0.6;
    const t = new Date(open.getTime() + i * 15 * 60 * 1000);
    data.push({ time: t, open: o, high: h, low: l, close: c });
    price = c;
  }
  return data;
}
