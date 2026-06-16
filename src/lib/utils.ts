/**
 * utils.ts — shared formatting and display helpers
 *
 * Centralised here so TradesPage and any future pages share one source of
 * truth instead of repeating the same small functions.
 */

/** Format a forex price to 5 decimal places. */
export function fmtPrice(n: number): string {
  return n.toFixed(5);
}

/** Format a number as a USD currency string. */
export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

/** CSS class name for a positive / negative P&L value. */
export function plClass(n: number): string {
  return n >= 0 ? 'positive' : 'negative';
}

/** Human-readable side label from a units value (positive = long). */
export function side(units: number): string {
  return units > 0 ? 'LONG' : 'SHORT';
}

/** CSS class name for a trade side. */
export function sideClass(units: number): string {
  return units > 0 ? 'positive' : 'negative';
}
