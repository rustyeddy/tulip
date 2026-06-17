<script lang="ts">
  import { api, type ReplayResult, type ReplaySignal } from '../api';
  import CandleChart from './CandleChart.svelte';

  // ── Options ───────────────────────────────────────────────────────────────

  const INSTRUMENTS = [
    'EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD',
    'AUDUSD','NZDUSD','EURGBP','EURJPY','GBPJPY','AUDJPY',
  ];

  const STRATEGIES = [
    { value: 'donchian-v6', label: 'Donchian v6' },
    { value: 'donchian-v5', label: 'Donchian v5' },
    { value: 'donchian-v4', label: 'Donchian v4' },
    { value: 'donchian-v3', label: 'Donchian v3' },
    { value: 'donchian-v2', label: 'Donchian v2' },
    { value: 'donchian',    label: 'Donchian v1' },
    { value: 'ema-cross',   label: 'EMA Cross' },
    { value: 'bb-fade',     label: 'Bollinger Fade' },
  ];

  const EXIT_STRATEGIES = [
    { value: '',           label: 'None (strategy sets stop)' },
    { value: 'chandelier', label: 'Chandelier ATR' },
  ];

  const REGIME_FILTERS = [
    { value: '',               label: 'None' },
    { value: 'weekly-ema',     label: 'Weekly EMA' },
    { value: 'atr-percentile', label: 'ATR Percentile' },
    { value: 'adx-d1',        label: 'D1 ADX' },
    { value: 'composite',     label: 'Composite' },
  ];

  // ── Form state ────────────────────────────────────────────────────────────

  const today   = new Date().toISOString().slice(0, 10);
  const sixBack = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);

  let instrument   = $state('EURUSD');
  let timeframe    = $state('H1');
  let from         = $state(sixBack);
  let to           = $state(today);
  let strategyKind = $state('donchian-v6');
  let exitKind     = $state('chandelier');
  let exitPeriod   = $state(14);
  let exitMult     = $state(3.0);
  let regimeKind   = $state('');
  let warmupBars   = $state(200);

  // ── Run state ─────────────────────────────────────────────────────────────

  let running = $state(false);
  let error   = $state('');
  let result  = $state<ReplayResult | null>(null);

  async function runReplay() {
    running = true;
    error   = '';
    result  = null;
    try {
      result = await api.replay({
        instrument,
        timeframe,
        from,
        to,
        warmup_bars: warmupBars,
        strategy: { kind: strategyKind },
        exit: exitKind
          ? { kind: exitKind, params: { period: exitPeriod, multiplier: exitMult } }
          : { kind: '' },
        regime: { kind: regimeKind },
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }

  // ── Signal summary ────────────────────────────────────────────────────────

  function summarise(sigs: ReplaySignal[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const s of sigs) counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    return counts;
  }

  let summary = $derived(result ? summarise(result.signals) : null);
  let signals = $derived<ReplaySignal[]>(result?.signals ?? []);
  let candles = $derived(result?.bars ?? []);
</script>

<div class="page">

  <!-- Controls -->
  <div class="controls">
    <h1 class="page-title">Replay</h1>

    <label class="field">
      <span class="field-label">Instrument</span>
      <select class="ctrl-select" bind:value={instrument}>
        {#each INSTRUMENTS as inst}
          <option value={inst}>{inst}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span class="field-label">Timeframe</span>
      <select class="ctrl-select" bind:value={timeframe}>
        <option value="H1">H1</option>
        <option value="D">D1</option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">From</span>
      <input type="date" class="ctrl-input" bind:value={from} />
    </label>

    <label class="field">
      <span class="field-label">To</span>
      <input type="date" class="ctrl-input" bind:value={to} />
    </label>

    <label class="field">
      <span class="field-label">Strategy</span>
      <select class="ctrl-select" bind:value={strategyKind}>
        {#each STRATEGIES as s}
          <option value={s.value}>{s.label}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span class="field-label">Exit</span>
      <select class="ctrl-select" bind:value={exitKind}>
        {#each EXIT_STRATEGIES as e}
          <option value={e.value}>{e.label}</option>
        {/each}
      </select>
    </label>

    {#if exitKind === 'chandelier'}
      <label class="field">
        <span class="field-label">ATR Period</span>
        <input type="number" class="ctrl-input narrow" bind:value={exitPeriod} min="1" max="50" />
      </label>
      <label class="field">
        <span class="field-label">Multiplier</span>
        <input type="number" class="ctrl-input narrow" bind:value={exitMult} min="0.5" max="10" step="0.5" />
      </label>
    {/if}

    <label class="field">
      <span class="field-label">Regime</span>
      <select class="ctrl-select" bind:value={regimeKind}>
        {#each REGIME_FILTERS as r}
          <option value={r.value}>{r.label}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span class="field-label">Warmup bars</span>
      <input type="number" class="ctrl-input narrow" bind:value={warmupBars} min="0" max="5000" />
    </label>

    <button class="run-btn" onclick={runReplay} disabled={running}>
      {running ? 'Running…' : '▶ Run Replay'}
    </button>
  </div>

  <!-- Error -->
  {#if error}
    <div class="error-bar">{error}</div>
  {/if}

  <!-- Signal summary -->
  {#if summary && result}
    <div class="summary-bar">
      <span class="stat">Bars: <strong>{result.bars.length}</strong></span>
      {#if summary.open}
        <span class="stat">Entries: <strong class="pos">{summary.open}</strong></span>
      {/if}
      {#if summary.close}
        <span class="stat">Exits: <strong>{summary.close}</strong></span>
      {/if}
      {#if summary.blocked}
        <span class="stat">Blocked: <strong class="amber">{summary.blocked}</strong></span>
      {/if}
      {#if summary.no_stop}
        <span class="stat">No-stop drops: <strong class="orange">{summary.no_stop}</strong></span>
      {/if}
      {#if summary.stop_update}
        <span class="stat">Stop updates: <strong class="orange">{summary.stop_update}</strong></span>
      {/if}
      <span class="stat muted">{result.strategy} · {result.instrument} · {result.from?.slice(0,10)} → {result.to?.slice(0,10)}</span>
    </div>
  {/if}

  <!-- Chart -->
  <div class="chart-area">
    {#if running}
      <div class="overlay loading">Running replay…</div>
    {:else if !result}
      <div class="overlay hint">Configure a strategy above and click Run Replay</div>
    {:else if candles.length === 0}
      <div class="overlay hint">No candle data found for {instrument} {from} → {to}</div>
    {:else}
      {#key result}
        <CandleChart {candles} {signals} />
      {/key}
    {/if}
  </div>

  <!-- Legend -->
  {#if result}
    <div class="legend">
      <span><span class="pos">▲</span> Long entry</span>
      <span><span class="neg">▼</span> Short entry</span>
      <span><span class="muted">● ✕</span> Exit</span>
      <span><span class="amber">■ ⊘</span> Regime blocked</span>
      <span><span class="orange">■</span> No-stop dropped</span>
      <span><span class="orange">— —</span> Stop trail</span>
    </div>
  {/if}

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

  /* ── Controls ────────────────────────────────────────────────────────────── */

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    align-self: center;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .field-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .ctrl-select,
  .ctrl-input {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 12px;
    padding: 5px 8px;
    transition: border-color 0.15s;
  }
  .ctrl-select:focus,
  .ctrl-input:focus { border-color: var(--purple-mid); outline: none; }

  .ctrl-input { width: 110px; }
  .ctrl-input.narrow { width: 72px; }

  .run-btn {
    padding: 6px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    background: var(--purple-mid);
    color: #fff;
    transition: background 0.15s, opacity 0.15s;
    align-self: flex-end;
    flex-shrink: 0;
  }
  .run-btn:hover:not(:disabled) { background: var(--purple-strong); }
  .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Error bar ───────────────────────────────────────────────────────────── */

  .error-bar {
    font-size: 12px;
    color: var(--red-bright);
    background: var(--red-tint);
    border: 1px solid var(--red-border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    flex-shrink: 0;
  }

  /* ── Summary bar ─────────────────────────────────────────────────────────── */

  .summary-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
    padding: 7px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .stat strong { color: var(--text-primary); font-weight: 500; }

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

  .hint    { color: var(--text-muted); }
  .loading { color: var(--text-muted); animation: pulse 1.5s ease-in-out infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  /* ── Legend ──────────────────────────────────────────────────────────────── */

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 11px;
    color: var(--text-faint);
    flex-shrink: 0;
  }

  /* ── Colour utilities ────────────────────────────────────────────────────── */

  .pos    { color: var(--green-mid); }
  .neg    { color: var(--red-bright); }
  .amber  { color: var(--amber); }
  .orange { color: #f97316; }
  .muted  { color: var(--text-muted); }
</style>
