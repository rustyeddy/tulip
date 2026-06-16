<script lang="ts">
  import { onMount } from 'svelte';
  import { orderState } from '../stores/order.svelte';
  import { generateCandles, type Candle } from '../data/candles';
  import { timeframes } from '../data/mockData';

  let canvasEl: HTMLCanvasElement | undefined;
  let containerEl: HTMLDivElement | undefined;
  let activeTf = $state('15m');
  let candles = $state<Candle[]>(generateCandles(26));

  const COLORS = {
    grid:        '#1E2028',
    axis:        '#4A4E5C',
    candleUp:    '#1D9E75',
    candleDn:    '#E24B4A',
    line:        '#534AB7',
    entryLine:   '#1D9E75',
    entryLabel:  '#5DCAA5',
    slLine:      '#E24B4A',
    slLabel:     '#F09595',
    tpLine:      '#0F6E56',
    tpLabel:     '#5DCAA5',
    currentDot:  '#534AB7',
    currentRing: '#AFA9EC',
  } as const;

  const PADDING = { top: 20, right: 80, bottom: 32, left: 10 } as const;

  function priceToY(price: number, minP: number, maxP: number, height: number): number {
    const range = maxP - minP || 1;
    return PADDING.top + ((maxP - price) / range) * height;
  }

  function draw(): void {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const W = canvasEl.width;
    const H = canvasEl.height;
    const innerW = W - PADDING.left - PADDING.right;
    const innerH = H - PADDING.top - PADDING.bottom;

    ctx.clearRect(0, 0, W, H);
    if (!candles.length) return;

    const prices = candles.flatMap((c) => [c.high, c.low]);
    const allPrices = [...prices, orderState.entry, orderState.stopLoss, orderState.takeProfit];
    const minP = Math.min(...allPrices) - 0.5;
    const maxP = Math.max(...allPrices) + 0.5;

    const n = candles.length;
    const candleW = Math.max(4, (innerW / n) * 0.6);
    const gap = innerW / n;

    // Grid + price axis
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const p = minP + ((maxP - minP) * i) / gridCount;
      const y = priceToY(p, minP, maxP, innerH);
      ctx.beginPath();
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(W - PADDING.right, y);
      ctx.stroke();

      ctx.fillStyle = COLORS.axis;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('$' + p.toFixed(2), W - PADDING.right + 4, y + 3);
    }

    // Time axis
    ctx.fillStyle = COLORS.axis;
    ctx.textAlign = 'center';
    const timeStep = Math.ceil(n / 5);
    for (let i = 0; i < n; i += timeStep) {
      const x = PADDING.left + i * gap + gap / 2;
      const y = H - PADDING.bottom + 14;
      const t = candles[i].time;
      ctx.fillText(t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0'), x, y);
    }

    // Candles
    candles.forEach((c, i) => {
      const x = PADDING.left + i * gap + gap / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? COLORS.candleUp : COLORS.candleDn;
      const bodyTop = priceToY(Math.max(c.open, c.close), minP, maxP, innerH);
      const bodyBot = priceToY(Math.min(c.open, c.close), minP, maxP, innerH);
      const bodyH = Math.max(1, bodyBot - bodyTop);
      const wickTop = priceToY(c.high, minP, maxP, innerH);
      const wickBot = priceToY(c.low, minP, maxP, innerH);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.moveTo(x, wickTop);
      ctx.lineTo(x, wickBot);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // Close-price overlay line
    ctx.beginPath();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    candles.forEach((c, i) => {
      const x = PADDING.left + i * gap + gap / 2;
      const y = priceToY(c.close, minP, maxP, innerH);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Entry / SL / TP dashed levels
    function drawLevel(price: number, lineColor: string, labelColor: string, label: string): void {
      if (!ctx) return;
      const y = priceToY(price, minP, maxP, innerH);
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(W - PADDING.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = labelColor;
      ctx.textAlign = 'left';
      ctx.fillText(label + ' $' + price.toFixed(2), W - PADDING.right + 4, y + 3);
    }

    drawLevel(orderState.entry, COLORS.entryLine, COLORS.entryLabel, 'Entry');
    drawLevel(orderState.stopLoss, COLORS.slLine, COLORS.slLabel, 'SL');
    drawLevel(orderState.takeProfit, COLORS.tpLine, COLORS.tpLabel, 'TP');

    // Current price dot
    const last = candles[candles.length - 1];
    const cx = PADDING.left + (n - 1) * gap + gap / 2;
    const cy = priceToY(last.close, minP, maxP, innerH);
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.currentDot;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.currentRing;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function resize(): void {
    if (!canvasEl || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    canvasEl.style.width = rect.width + 'px';
    canvasEl.style.height = rect.height + 'px';
    canvasEl.getContext('2d')?.scale(dpr, dpr);
    draw();
  }

  function selectTimeframe(tf: string): void {
    activeTf = tf;
    candles = generateCandles(26);
  }

  export function refresh(): void {
    candles = generateCandles(26);
  }

  // Redraw whenever order levels or candle data change
  $effect(() => {
    orderState.entry;
    orderState.stopLoss;
    orderState.takeProfit;
    candles;
    draw();
  });

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  });
</script>

<div class="chart-card">
  <div class="chart-header">
    <i class="ti ti-search" aria-hidden="true"></i>
    <input
      type="text"
      class="symbol-input"
      bind:value={orderState.symbol}
      aria-label="Symbol search"
      placeholder="Symbol…"
    />
    <span class="current-price">
      ${orderState.symbolPrice.toFixed(2)}
      <span class="price-change positive">+1.2%</span>
    </span>
    <div class="timeframe-pills" role="group" aria-label="Timeframe">
      {#each timeframes as tf}
        <button class="tf-pill" class:active={activeTf === tf} onclick={() => selectTimeframe(tf)}>
          {tf}
        </button>
      {/each}
    </div>
  </div>
  <div class="chart-area" bind:this={containerEl}>
    <canvas bind:this={canvasEl} aria-label="{orderState.symbol} intraday chart"></canvas>
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
    font-size: 15px;
    color: var(--text-hint);
  }

  .symbol-input {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    width: 70px;
    text-transform: uppercase;
  }

  .symbol-input::placeholder { color: var(--text-faint); }

  .current-price {
    font-size: 13px;
    color: var(--purple-bright);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .price-change { font-size: 12px; }

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
    padding: 10px 14px 0;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
