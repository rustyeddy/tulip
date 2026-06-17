<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type BacktestSummary, type BacktestReportTrade, type CandleBar } from '../api';
  import CandleChart from './CandleChart.svelte';

  // ── Backtest list ────────────────────────────────────────────────────────────

  let summaries  = $state<BacktestSummary[]>([]);
  let listError  = $state('');
  let listLoading = $state(true);

  onMount(async () => {
    try {
      const res = await api.backtestList();
      summaries = res.summaries ?? [];
    } catch (e) {
      listError = e instanceof Error ? e.message : 'Failed to load backtests';
    } finally {
      listLoading = false;
    }
  });

  // ── Selected backtest ────────────────────────────────────────────────────────

  let selectedName = $state('');
  let detail       = $state<BacktestSummary | null>(null);
  let candles      = $state<CandleBar[]>([]);
  let trades       = $state<BacktestReportTrade[]>([]);
  let dataLoading  = $state(false);
  let dataError    = $state('');

  async function loadSelected(name: string) {
    if (!name) {
      detail  = null;
      candles = [];
      trades  = [];
      return;
    }
    dataLoading = true;
    dataError   = '';
    try {
      const [det, cands] = await Promise.all([
        api.backtestGet(name),
        api.backtestCandles(name),
      ]);
      detail  = det;
      candles = cands.bars ?? [];
      trades  = det.trade_details ?? [];
    } catch (e) {
      dataError = e instanceof Error ? e.message : 'Failed to load chart data';
      detail    = null;
      candles   = [];
      trades    = [];
    } finally {
      dataLoading = false;
    }
  }

  function onSelect(e: Event) {
    selectedName = (e.target as HTMLSelectElement).value;
    loadSelected(selectedName);
  }
</script>

<div class="page">

  <!-- Selector row -->
  <div class="selector-row">
    <h1 class="page-title">Charts</h1>

    {#if listLoading}
      <span class="hint">Loading…</span>
    {:else if listError}
      <span class="err">{listError}</span>
    {:else}
      <select class="bt-select" value={selectedName} onchange={onSelect}>
        <option value="">— select a backtest —</option>
        {#each summaries as s}
          <option value={s.name}>
            {s.instrument} · {s.strategy} · {s.start?.slice(0, 10)} → {s.end?.slice(0, 10)}
            ({s.trades} trades, {s.win_rate?.toFixed(1)}% WR)
          </option>
        {/each}
      </select>
    {/if}

    {#if selectedName && dataLoading}
      <span class="hint loading">Loading data…</span>
    {/if}
  </div>

  <!-- Stats bar -->
  {#if detail && selectedName}
    <div class="stats-bar">
      <span class="stat">Balance: <strong>${detail.end_balance?.toFixed(2)}</strong></span>
      <span class="stat">Net P/L:
        <strong class="{detail.net_pl >= 0 ? 'pos' : 'neg'}">${detail.net_pl?.toFixed(2)}</strong>
      </span>
      <span class="stat">Return:
        <strong class="{detail.return_pct >= 0 ? 'pos' : 'neg'}">{detail.return_pct?.toFixed(2)}%</strong>
      </span>
      <span class="stat">Trades: <strong>{detail.trades}</strong></span>
      <span class="stat">Win rate: <strong>{detail.win_rate?.toFixed(1)}%</strong></span>
      <span class="stat">R:R: <strong>{detail.rr?.toFixed(2)}</strong></span>
      <span class="stat">Max DD: <strong class="neg">${detail.max_drawdown?.toFixed(2)}</strong></span>
    </div>
  {/if}

  <!-- Chart area -->
  <div class="chart-area">
    {#if !selectedName}
      <div class="overlay hint">Select a backtest above to view its chart</div>
    {:else if dataLoading}
      <div class="overlay hint loading">Loading chart data…</div>
    {:else if dataError}
      <div class="overlay err">{dataError}</div>
    {:else if candles.length === 0}
      <div class="overlay hint">No candle data found for this backtest period</div>
    {:else}
      {#key selectedName}
        <CandleChart {candles} {trades} />
      {/key}
    {/if}
  </div>

</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    padding: 14px;
    overflow: hidden;
  }

  /* ── Selector row ─────────────────────────────────────────────────────────── */

  .selector-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .bt-select {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 13px;
    padding: 5px 10px;
    min-width: 26rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .bt-select:focus {
    border-color: var(--purple-mid);
    outline: none;
  }

  /* ── Stats bar ────────────────────────────────────────────────────────────── */

  .stats-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
    padding: 8px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .stat strong {
    color: var(--text-primary);
    font-weight: 500;
  }

  .pos { color: var(--green-mid); }
  .neg { color: var(--red-bright); }

  /* ── Chart area ───────────────────────────────────────────────────────────── */

  .chart-area {
    position: relative;
    flex: 1;
    min-height: 0;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: #0f172a;
    border: 1px solid var(--border);
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .hint { color: var(--text-muted); }
  .loading { animation: pulse 1.5s ease-in-out infinite; }
  .err { color: var(--red-bright); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
</style>
