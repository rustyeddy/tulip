<script lang="ts">
  import type { Snippet } from 'svelte';
  import { orderState, riskReward, riskDollar } from '../stores/order.svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  interface Toast {
    message: string;
    type: 'long' | 'short';
  }

  let toast = $state<Toast | null>(null);
  let toastTimer: ReturnType<typeof setTimeout>;

  function fireOrder(type: 'long' | 'short'): void {
    const qty = orderState.qty;
    const entry = orderState.entry.toFixed(2);
    const sl = orderState.stopLoss.toFixed(2);
    const label = type === 'long' ? 'Long' : 'Short';

    clearTimeout(toastTimer);
    toast = { message: `${label} ${qty} ${orderState.symbol} @ $${entry}  |  SL $${sl}`, type };
    toastTimer = setTimeout(() => (toast = null), 3000);
  }
</script>

<aside class="order-panel" aria-label="Order entry">
  <div class="panel-section">
    <h2 class="panel-title">Order entry</h2>

    <label class="field-label" for="order-symbol">Symbol</label>
    <div class="input-row">
      <i class="ti ti-search" aria-hidden="true"></i>
      <span class="input-display">{orderState.symbol}</span>
      <span class="input-value">${orderState.symbolPrice.toFixed(2)}</span>
    </div>

    <label class="field-label" for="order-qty">Quantity</label>
    <div class="input-row">
      <i class="ti ti-stack-2" aria-hidden="true"></i>
      <span class="input-display">Shares</span>
      <input
        id="order-qty"
        type="number"
        class="inline-number"
        bind:value={orderState.qty}
        min="1"
        aria-label="Quantity"
      />
    </div>

    <label class="field-label" for="order-entry">Entry price</label>
    <div class="input-row entry-row">
      <i class="ti ti-arrow-up-right" aria-hidden="true"></i>
      <span class="input-display">Limit</span>
      <input
        id="order-entry"
        type="number"
        class="inline-number"
        bind:value={orderState.entry}
        step="0.01"
        aria-label="Entry price"
      />
    </div>

    <label class="field-label" for="order-sl">Stop loss</label>
    <div class="input-row sl-row">
      <i class="ti ti-shield-x" aria-hidden="true"></i>
      <span class="input-display">Hard stop</span>
      <input
        id="order-sl"
        type="number"
        class="inline-number"
        bind:value={orderState.stopLoss}
        step="0.01"
        aria-label="Stop loss price"
      />
    </div>

    <label class="field-label" for="order-tp">Take profit</label>
    <div class="input-row tp-row">
      <i class="ti ti-target" aria-hidden="true"></i>
      <span class="input-display">Target</span>
      <input
        id="order-tp"
        type="number"
        class="inline-number"
        bind:value={orderState.takeProfit}
        step="0.01"
        aria-label="Take profit price"
      />
    </div>

    <div class="rr-box">
      <span class="rr-label">Risk / reward</span>
      <span class="rr-value">1 : {riskReward.value}</span>
    </div>
    <div class="rr-box">
      <span class="rr-label">Risk $</span>
      <span class="rr-value negative">${riskDollar.value.toLocaleString()}</span>
    </div>
  </div>

  <div class="action-buttons">
    <button class="go-long" onclick={() => fireOrder('long')}>
      <i class="ti ti-trending-up" aria-hidden="true"></i>
      Long
    </button>
    <button class="go-short" onclick={() => fireOrder('short')}>
      <i class="ti ti-trending-down" aria-hidden="true"></i>
      Short
    </button>
  </div>

  {@render children?.()}
</aside>

{#if toast}
  <div class="toast" class:long={toast.type === 'long'} class:short={toast.type === 'short'}>
    {toast.message}
  </div>
{/if}

<style>
  .order-panel {
    width: var(--order-w);
    min-width: var(--order-w);
    background: var(--bg-sidebar);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .panel-section {
    padding: 12px 12px 14px;
    border-bottom: 0.5px solid var(--border);
  }

  .panel-title {
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-hint);
    display: block;
    margin-bottom: 4px;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-card);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 6px 10px;
    margin-bottom: 8px;
  }

  .input-row > i {
    font-size: 14px;
    color: var(--text-hint);
    flex-shrink: 0;
  }

  .input-display {
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
  }

  .input-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .inline-number {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    width: 60px;
    text-align: right;
  }

  .entry-row {
    background: #0A1F18;
    border-color: var(--green-border);
  }
  .entry-row > i { color: var(--green-mid); }
  .entry-row .inline-number { color: var(--green-bright); }

  .sl-row {
    background: var(--red-tint);
    border-color: var(--red-border);
  }
  .sl-row > i { color: var(--red-mid); }
  .sl-row .inline-number { color: var(--red-bright); }

  .tp-row {
    background: #111A16;
    border-color: var(--green-border);
  }
  .tp-row > i { color: var(--green-dark); }
  .tp-row .inline-number { color: var(--green-bright); }

  .rr-box {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .rr-label { font-size: 11px; color: var(--text-hint); }
  .rr-value { font-size: 14px; font-weight: 500; color: var(--purple-bright); }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 0.5px solid var(--border);
    flex-shrink: 0;
  }

  .go-long, .go-short {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 9px 8px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.1s;
  }

  .go-long:hover, .go-short:hover { opacity: 0.85; }
  .go-long:active, .go-short:active { transform: scale(0.98); }

  .go-long {
    background: #0F3328;
    color: var(--green-bright);
    border: 0.5px solid var(--green-dark);
  }

  .go-short {
    background: #280F0F;
    color: var(--red-bright);
    border: 0.5px solid var(--red-dark);
  }

  .go-long i, .go-short i { font-size: 13px; }

  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
  }

  .toast.long {
    background: #0F3328;
    color: #5DCAA5;
    border: 0.5px solid #0F6E56;
  }

  .toast.short {
    background: #280F0F;
    color: #F09595;
    border: 0.5px solid #791F1F;
  }
</style>
