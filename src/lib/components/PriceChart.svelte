<script lang="ts">
  import { onMount } from 'svelte';
  import { orderState } from '../stores/order.svelte';
  import { api, type CandleBar } from '../api';

  let canvasEl:    HTMLCanvasElement | undefined;
  let containerEl: HTMLDivElement    | undefined;

  const TFS = ['M1', 'H1', 'H4', 'D1'] as const;
  type TF = typeof TFS[number];

  let activeTf  = $state<TF>('H1');
  let candles   = $state<CandleBar[]>([]);
  let loading   = $state(false);
  let fetchErr  = $state('');

  // ── Colours (dark-theme Railscasts palette) ───────────────────────────────
  const C = {
    grid:        '#2D2A27',
    axis:        '#6A6560',
    candleUp:    '#8AAA40',
    candleDn:    '#DA4939',
    line:        '#CC7833',
    currentDot:  '#CC7833',
    currentRing: '#E8A855',
  } as const;

  const PAD = { top: 20, right: 72, bottom: 32, left: 8 } as const;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function lookbackFrom(tf: TF): string {
    const now = new Date();
    const ms = {
      M1: 4   * 60 * 60 * 1000,
      H1: 7   * 24 * 60 * 60 * 1000,
      H4: 60  * 24 * 60 * 60 * 1000,
      D1: 730 * 24 * 60 * 60 * 1000,
    }[tf];
    return new Date(now.getTime() - ms).toISOString().slice(0, 10);
  }

  function timeLabel(unix: number, tf: TF): string {
    const d = new Date(unix * 1000);
    if (tf === 'D1') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (tf === 'M1') return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
           ' ' + String(d.getHours()).padStart(2, '0') + 'h';
  }

  function priceToY(price: number, minP: number, range: number, innerH: number): number {
    return PAD.top + ((maxP(minP, range) - price) / range) * innerH;
  }
  function maxP(minP: number, range: number) { return minP + range; }

  // ── Draw ──────────────────────────────────────────────────────────────────

  function draw(): void {
    if (!canvasEl || !candles.length) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const W = canvasEl.width;
    const H = canvasEl.height;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const prices = candles.flatMap(c => [c.high, c.low]);
    const minP   = Math.min(...prices);
    const range  = Math.max(...prices) - minP || 0.0001;
    const pToY   = (p: number) => PAD.top + ((minP + range - p) / range) * innerH;

    const n      = candles.length;
    const gap    = innerW / n;
    const wid    = Math.max(2, gap * 0.6);

    // Grid + price axis
    const gridLines = 5;
    ctx.font = '10px -apple-system, sans-serif';
    for (let i = 0; i <= gridLines; i++) {
      const p = minP + (range * i / gridLines);
      const y = pToY(p);
      ctx.beginPath();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.5;
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.fillStyle = C.axis;
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(5), W - PAD.right + 4, y + 3);
    }

    // Time axis
    const timeStep = Math.max(1, Math.ceil(n / 6));
    ctx.fillStyle = C.axis;
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i += timeStep) {
      const x = PAD.left + i * gap + gap / 2;
      ctx.fillText(timeLabel(candles[i].time, activeTf), x, H - PAD.bottom + 14);
    }

    // Candles
    for (let i = 0; i < n; i++) {
      const c  = candles[i];
      const x  = PAD.left + i * gap + gap / 2;
      const up = c.close >= c.open;
      const color    = up ? C.candleUp : C.candleDn;
      const bodyTop  = pToY(Math.max(c.open, c.close));
      const bodyBot  = pToY(Math.min(c.open, c.close));
      const bodyH    = Math.max(1, bodyBot - bodyTop);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pToY(c.high));
      ctx.lineTo(x, pToY(c.low));
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(x - wid / 2, bodyTop, wid, bodyH);
    }

    // Close-price line overlay
    ctx.beginPath();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    for (let i = 0; i < n; i++) {
      const x = PAD.left + i * gap + gap / 2;
      const y = pToY(candles[i].close);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current price dot
    const last = candles[n - 1];
    const cx   = PAD.left + (n - 1) * gap + gap / 2;
    const cy   = pToY(last.close);
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle   = C.currentDot;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = C.currentRing;
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Last price label
    ctx.fillStyle   = C.line;
    ctx.textAlign   = 'left';
    ctx.font        = 'bold 10px -apple-system, sans-serif';
    ctx.fillText(last.close.toFixed(5), W - PAD.right + 4, cy + 3);
  }

  function resize(): void {
    if (!canvasEl || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvasEl.width  = rect.width  * dpr;
    canvasEl.height = rect.height * dpr;
    canvasEl.style.width  = rect.width  + 'px';
    canvasEl.style.height = rect.height + 'px';
    canvasEl.getContext('2d')?.scale(dpr, dpr);
    draw();
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  let fetchTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchCandles(): Promise<void> {
    const instr = orderState.instrument.trim().toUpperCase();
    if (!instr) return;
    loading = true;
    fetchErr = '';
    try {
      candles = await api.candles(instr, activeTf, lookbackFrom(activeTf));
    } catch (e) {
      fetchErr = e instanceof Error ? e.message : 'Failed to load candles';
      candles = [];
    } finally {
      loading = false;
    }
  }

  // Debounce on instrument typing; immediate on timeframe switch.
  $effect(() => {
    const _instr = orderState.instrument;
    const _tf    = activeTf;
    if (fetchTimer) clearTimeout(fetchTimer);
    fetchTimer = setTimeout(fetchCandles, 400);
    return () => { if (fetchTimer) clearTimeout(fetchTimer); };
  });

  // Redraw whenever candles change.
  $effect(() => { candles; draw(); });

  function selectTf(tf: TF): void {
    activeTf = tf;
  }

  export function refresh(): void { fetchCandles(); }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    // Auto-refresh: every 60s for M1, every 5min for H1+
    refreshInterval = setInterval(() => {
      const ms = activeTf === 'M1' ? 60_000 : 5 * 60_000;
      if (!fetchTimer) fetchCandles();
    }, 60_000);
    return () => {
      window.removeEventListener('resize', resize);
      if (refreshInterval) clearInterval(refreshInterval);
      if (fetchTimer) clearTimeout(fetchTimer);
    };
  });
</script>

<div class="chart-card">
  <div class="chart-header">
    <i class="ti ti-chart-candle" aria-hidden="true"></i>
    <input
      type="text"
      class="symbol-input"
      bind:value={orderState.instrument}
      aria-label="Instrument"
      placeholder="EUR_USD"
    />
    {#if candles.length > 0}
      <span class="last-price">{candles[candles.length - 1].close.toFixed(5)}</span>
    {/if}
    {#if loading}
      <span class="status-label">Loading…</span>
    {:else if fetchErr}
      <span class="status-label error" title={fetchErr}>Error</span>
    {:else if candles.length > 0}
      <span class="status-label muted">{candles.length} bars</span>
    {/if}
    <div class="timeframe-pills" role="group" aria-label="Timeframe">
      {#each TFS as tf}
        <button class="tf-pill" class:active={activeTf === tf} onclick={() => selectTf(tf)}>
          {tf}
        </button>
      {/each}
    </div>
  </div>

  <div class="chart-area" bind:this={containerEl}>
    {#if !loading && candles.length === 0 && !fetchErr}
      <div class="chart-empty">Enter an instrument above to load candles.</div>
    {:else if !loading && fetchErr}
      <div class="chart-empty error">{fetchErr}</div>
    {/if}
    <canvas bind:this={canvasEl} aria-label="{orderState.instrument} {activeTf} chart"></canvas>
  </div>
</div>

<style>
  .chart-card {
    flex: 1;
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .chart-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 0.5px solid var(--border);
    flex-shrink: 0;
  }

  .chart-header > i {
    font-size: 16px;
    color: var(--text-hint);
    flex-shrink: 0;
  }

  .symbol-input {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    width: 80px;
    text-transform: uppercase;
    background: none;
    border: none;
    outline: none;
  }

  .symbol-input::placeholder { color: var(--text-faint); }

  .last-price {
    font-size: 14px;
    font-weight: 500;
    color: var(--purple-bright);
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .status-label {
    font-size: 11px;
    color: var(--text-faint);
  }
  .status-label.error { color: var(--red-mid); }
  .status-label.muted { color: var(--text-faint); }

  .timeframe-pills {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }

  .tf-pill {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    color: var(--text-faint);
    transition: background 0.1s, color 0.1s;
  }

  .tf-pill:hover {
    background: var(--bg-hover);
    color: var(--text-muted);
  }

  .tf-pill.active {
    background: var(--purple-tint);
    color: var(--purple-bright);
  }

  .chart-area {
    flex: 1;
    min-height: 0;
    position: relative;
    padding: 10px 0 0;
  }

  .chart-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text-faint);
  }
  .chart-empty.error { color: var(--red-mid); }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
