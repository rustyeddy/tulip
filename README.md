# Tulip — trader platform front end

Svelte 5 + TypeScript + Vite. Dark-themed trading UI backed by the trader daemon REST/SSE API.

## Implemented pages

| Nav key | Status | Description |
|---|---|---|
| `dashboard` | ✅ | Live account status, NAV sparkline, daily P/L, open trades, recent closed trades, SSE event log |
| `live-trade` | ✅ | Portfolio summary, price chart with entry/SL/TP levels, order panel |
| `trades` | ✅ | Open trades table, update stop/take, close trade, new order form |
| `chart` | ✅ | Pick any backtest → candlestick chart with trade entry/exit markers and stats bar |
| `backtests` | ✅ | Sortable backtest list, detail panel, paginated trade list, A/B compare, run panel, `.org` download |
| `replay` | ✅ | Strategy replay: instrument/TF/date/strategy/exit/regime controls → candlestick chart with signal overlays |
| `strategies` | 🔲 | Placeholder |
| `data` | 🔲 | Placeholder |
| `account` | 🔲 | Placeholder |
| `admin` | 🔲 | Placeholder |

## Structure

```
tulip/
├── index.html                       # Vite entry HTML
├── vite.config.js                   # dev server + build config (base path aware)
├── tsconfig.json                    # strict TS config, extends @tsconfig/svelte
├── package.json
├── scripts/
│   └── build.sh                     # CI-friendly build wrapper (used by trader's pull step)
└── src/
    ├── main.ts                      # Svelte mount point
    ├── vite-env.d.ts                # Vite client type reference
    ├── app.css                      # design tokens, resets, Tabler icons import
    ├── App.svelte                   # shell: Sidebar + Topbar + page router
    └── lib/
        ├── stores/
        │   ├── nav.svelte.ts        # current page, account switcher ($state)
        │   └── order.svelte.ts      # order form state + derived R/R, risk $
        ├── data/
        │   ├── mockData.ts          # portfolio metrics, positions, summary
        │   └── candles.ts           # synthetic OHLC generator
        └── components/
            ├── Sidebar.svelte
            ├── Topbar.svelte
            ├── MetricCard.svelte
            ├── PriceChart.svelte       # canvas candlesticks + entry/SL/TP lines (live trade)
            ├── CandleChart.svelte      # lightweight-charts OHLC with trade/signal markers
            ├── OrderPanel.svelte
            ├── PositionsList.svelte
            ├── PortfolioSummary.svelte
            ├── ConfirmDialog.svelte
            ├── LiveTradePage.svelte
            ├── TradesPage.svelte       # open trades + order management
            ├── ChartsPage.svelte       # backtest chart viewer
            ├── BacktestsPage.svelte    # backtest list, detail, compare, run
            ├── ReplayPage.svelte       # strategy replay with signal overlay chart
            ├── DashboardPage.svelte    # live account + SSE event log + trades summary
            ├── EquitySparkline.svelte  # SVG NAV history sparkline with gradient fill
            └── PlaceholderPage.svelte
```

Every `.svelte` file uses `<script lang="ts">`. Store files use the `.svelte.ts` extension (Svelte 5's convention for `.ts` modules that use runes like `$state` outside of components).

## Key dependencies

| Package | Purpose |
|---|---|
| `svelte@^5` | UI framework (runes mode) |
| `vite` + `@sveltejs/vite-plugin-svelte` | Dev server and bundler |
| `lightweight-charts@^5` | Professional OHLC candlestick charting (used by `CandleChart`) |
| `@tabler/icons-webfont` | Icon set (loaded via CDN in `app.css`) |

## Local development

```bash
npm install
npm run dev
```

Opens a Vite dev server with hot module replacement at `http://localhost:5173`. Edits to any `.svelte` file or store hot-swap in the browser without a full reload.

## Building

Three build targets:

```bash
npm run build         # standalone build, base path "/" → dist/
npm run build:embed   # embed build, base path "/ui/"   → dist/
npm run preview       # serve the last build locally to sanity-check it
npm run check         # svelte-check — type-check all .ts and .svelte files
```

`build:embed` exists because once Tulip's assets live inside trader's binary, they're typically served from a sub-path (e.g. `http://localhost:PORT/ui/...`) rather than the domain root. The base path is what Vite stamps into `index.html`'s `<script src>` / `<link href>` tags and into every internal asset reference, so set it to wherever trader will actually mount the UI:

```bash
TULIP_BASE_PATH=/some/other/path/ npm run build
```

### scripts/build.sh

A thin wrapper intended for trader's CI to call directly after checking out a pinned Tulip ref:

```bash
./scripts/build.sh           # → dist/, base path "/"
./scripts/build.sh --embed   # → dist/, base path "/ui/"
```

It runs `npm ci` (reproducible install from the lockfile), cleans any previous `dist/`, and builds. Trader's build step copies `dist/` into its own embed-assets directory before compiling the binary.

## Integration with trader (pull model)

Trader pulls Tulip rather than Tulip pushing into trader:

1. Trader pins a Tulip version/tag/commit (submodule, release artifact, or package — whichever trader's build already uses for other deps).
2. Trader's build invokes `scripts/build.sh --embed` (or `npm run build:embed`) against that pinned ref.
3. Trader copies the resulting `dist/` into its embed directory and compiles the binary as usual.

This keeps Tulip's release cadence independent of trader's, and a bad Tulip build is fixed by reverting trader's version pin rather than coordinating a revert across both repos.

## State management

Svelte 5 runes (`$state`, derived values via getters) replace the vanilla-JS globals from the prior HTML/CSS/JS version:

- `nav.svelte.ts` — `navState.currentPage` drives routing; `navigateTo()` updates it and the URL hash. Exports a `PageKey` type and `NavPage`/`NavSection` interfaces.
- `order.svelte.ts` — `orderState: OrderState` holds symbol/qty/entry/stopLoss/takeProfit; `riskReward.value` and `riskDollar.value` are derived getters consumed by `OrderPanel` and `PriceChart`. Because `PriceChart` reads the same `orderState`, the chart's dashed entry/SL/TP lines update live as the order form is edited — no manual wiring between components.

## Types

Shared domain types live alongside the data/state they describe rather than in a separate `types.ts` barrel, so they're easy to find:

- `Tone`, `PortfolioMetric`, `Position`, `PositionSide`, `SummaryRow` — `src/lib/data/mockData.ts`
- `Candle` — `src/lib/data/candles.ts`
- `OrderState` — `src/lib/stores/order.svelte.ts`
- `NavPage`, `NavSection`, `PageKey` — `src/lib/stores/nav.svelte.ts`

Component props are typed with a local `interface Props` and destructured via `let { ... }: Props = $props()`. Component instance refs (e.g. `LiveTradePage`'s reference to `PriceChart`, or `App`'s reference to `LiveTradePage`) use `ReturnType<typeof ComponentName>` rather than `any`, so calling an exported component method (`chartRef.refresh()`, `liveTradeRef.refreshChart()`) is fully type-checked.

`npm run check` runs `svelte-check` against `tsconfig.json` in strict mode and should report zero errors before merging changes.

## Replacing mock data

- `src/lib/data/mockData.ts` — swap for real portfolio/position API responses.
- `src/lib/data/candles.ts` — swap `generateCandles()` for a broker WebSocket feed or REST poll.
- `orderState.symbolPrice` (`order.svelte.ts`) — wire to a live quote stream.

## Colour tokens

All colours are CSS custom properties in `src/app.css` (`:root`), so retheming is a single-file edit.
