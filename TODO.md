# Tulip — TODO

Items ported from trader/ui that still need to be implemented.

## High Priority

- [ ] **Trades page** (`src/routes/trades/+page.svelte`)
  - Full open trades list with sortable columns
  - Trade selection with side panel
  - Update stop loss / take profit
  - Close trade with ConfirmDialog
  - New order form with preview (units, risk amount, entry/stop)
  - Place order confirmation

- [ ] **Backtests page** (`src/routes/backtests/+page.svelte`)
  - List view with filter (instrument, strategy) and sort (9 metrics)
  - Detail panel with trade-by-trade breakdown and pagination (25/page)
  - Side-by-side comparison mode
  - Run new backtest panel (textarea config input)
  - Export backtest as .org file

- [ ] **Charts page** (`src/routes/charts/+page.svelte`)
  - Backtest selector dropdown
  - Interactive candle chart using lightweight-charts
  - Trade entry/exit markers with P/L labels
  - Stats bar (Balance, Net P/L, Return %, Trades, Win Rate, R:R, Max DD)
  - Loading and error states

- [ ] **Replay page** (`src/routes/replay/+page.svelte`)
  - Form: instrument, timeframe, date range, strategy (8 options), exit strategy,
    regime filter (5 options), warmup bars
  - Run button with loading state
  - Signal summary (Entries, Exits, Blocked, No-stop drops, Stop updates)
  - Candle chart with replay signal markers and legend

## Medium Priority

- [ ] **ConfirmDialog component** (`src/lib/components/ConfirmDialog.svelte`)
  - Reusable modal with title, message, confirmLabel, danger flag
  - Keyboard: Escape to cancel, Enter to confirm
  - Backdrop click to dismiss

- [ ] **EquitySparkline component** (`src/lib/components/EquitySparkline.svelte`)
  - SVG sparkline for rolling NAV history
  - Dynamic color (green/red based on trend)
  - Gradient fill

- [ ] **Upgrade PriceChart** to use lightweight-charts
  - Trade entry/exit markers
  - Signal markers (blocked, no_stop, stop_update)
  - Stop loss trail line
  - Crosshair mode

- [ ] **Wire LiveTradePage to real API** (replace mock data)
  - Use `api.account()` for account summary
  - Use `api.trades()` for open positions
  - Use `sseStore` for live account/NAV streaming (`/api/v1/stream/account`)
  - Use `sseLog` for transaction event log (`/api/v1/stream/events`)
  - Add equity sparkline with rolling NAV history

## Lower Priority

- [ ] Implement Strategy editor page (currently placeholder)
- [ ] Implement Data management page (currently placeholder)
- [ ] Implement Account settings page (currently placeholder)
- [ ] Implement Admin panel page (currently placeholder)
- [ ] Centralize format utilities (`fmtPrice`, `fmtMoney`, `plClass`, `side`, `sideClass`)
