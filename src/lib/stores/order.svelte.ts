/**
 * order.svelte.ts — order entry state
 *
 * Holds the live order form values and derives risk/reward +
 * risk-dollar figures reactively. Imported by OrderPanel and
 * PriceChart so the chart's level lines always match the form.
 */

export interface OrderState {
  symbol: string;
  symbolPrice: number;
  qty: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

export const orderState = $state<OrderState>({
  symbol: 'AAPL',
  symbolPrice: 214.32,
  qty: 50,
  entry: 211.50,
  stopLoss: 208.00,
  takeProfit: 219.00,
});

export const riskReward = {
  get value(): string {
    const risk = Math.abs(orderState.entry - orderState.stopLoss);
    const reward = Math.abs(orderState.takeProfit - orderState.entry);
    if (!risk) return '—';
    return (reward / risk).toFixed(1);
  },
};

export const riskDollar = {
  get value(): number {
    const risk = Math.abs(orderState.entry - orderState.stopLoss);
    return Math.round(risk * (orderState.qty || 0));
  },
};

export function setSymbol(symbol: string): void {
  orderState.symbol = symbol.toUpperCase().trim();
}
