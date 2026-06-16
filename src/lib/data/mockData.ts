/**
 * mockData.ts — placeholder data for the live trade page
 * Replace with real API/WebSocket calls when wiring up a broker.
 */

export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface PortfolioMetric {
  label: string;
  value: string;
  delta: string;
  tone: Tone;
}

export const portfolioMetrics: PortfolioMetric[] = [
  { label: 'Portfolio value', value: '$127,840', delta: '+$2,310 today', tone: 'positive' },
  { label: 'Cash available',  value: '$34,210',  delta: '26.8% of NAV',  tone: 'neutral'  },
  { label: 'Open P&L',        value: '+$1,840',  delta: '3 positions',   tone: 'positive' },
  { label: 'Day P&L',         value: '+$2,310',  delta: '+1.84%',        tone: 'positive' },
];

export type PositionSide = 'LONG' | 'SHORT';

export interface Position {
  symbol: string;
  pnl: string;
  pnlTone: Tone;
  side: PositionSide;
  qty: number;
  avgPrice: string;
}

export const openPositions: Position[] = [
  { symbol: 'NVDA', pnl: '+$842', pnlTone: 'positive', side: 'LONG',  qty: 20, avgPrice: '621.40' },
  { symbol: 'TSLA', pnl: '+$310', pnlTone: 'positive', side: 'LONG',  qty: 15, avgPrice: '248.20' },
  { symbol: 'SPY',  pnl: '-$312', pnlTone: 'negative', side: 'SHORT', qty: 10, avgPrice: '534.80' },
];

export interface SummaryRow {
  label: string;
  value: string;
  tone: 'default' | 'warning';
}

export const portfolioSummary: SummaryRow[] = [
  { label: 'NAV',          value: '$127,840', tone: 'default' },
  { label: 'Buying power', value: '$68,420',  tone: 'default' },
  { label: 'Margin used',  value: '$25,210',  tone: 'warning' },
];

export const timeframes: string[] = ['1m', '5m', '15m', '1h', '1d'];
