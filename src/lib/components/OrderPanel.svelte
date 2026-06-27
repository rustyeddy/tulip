<script lang="ts">
  import type { Snippet } from 'svelte';
  import { orderState } from '../stores/order.svelte';
  import { api } from '../api';

  interface Props {
    children?: Snippet;
    accountId: string;
    nav?: number;
  }

  let { children, accountId, nav = 0 }: Props = $props();

  let busy  = $state(false);
  let toast = $state<{ message: string; tone: 'long' | 'short' | 'error' } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout>;

  let riskDollar = $derived(
    nav > 0 ? (nav * orderState.risk_pct / 100) : 0
  );

  async function fireOrder(side: 'long' | 'short'): Promise<void> {
    if (!accountId || busy) return;
    busy = true;
    clearTimeout(toastTimer);
    toast = null;
    try {
      await api.placeTrade(accountId, {
        instrument: orderState.instrument,
        side,
        risk_pct: orderState.risk_pct,
        stop_pips: orderState.stop_pips,
        confirm: true,
      });
      toast = { message: `${side === 'long' ? 'Long' : 'Short'} ${orderState.instrument} — order placed`, tone: side };
    } catch (e) {
      toast = { message: e instanceof Error ? e.message : 'Order failed', tone: 'error' };
    } finally {
      busy = false;
      toastTimer = setTimeout(() => (toast = null), 4000);
    }
  }
</script>

<aside class="order-panel" aria-label="Order entry">
  <div class="panel-section">
    <h2 class="panel-title">Order entry</h2>

    <label class="field-label" for="order-instrument">Instrument</label>
    <div class="input-row">
      <i class="ti ti-search" aria-hidden="true"></i>
      <input
        id="order-instrument"
        type="text"
        class="instrument-input"
        bind:value={orderState.instrument}
        placeholder="EUR_USD"
        aria-label="Instrument"
      />
    </div>

    <label class="field-label" for="order-risk">Risk %</label>
    <div class="input-row">
      <i class="ti ti-percentage" aria-hidden="true"></i>
      <span class="input-display">Account risk</span>
      <input
        id="order-risk"
        type="number"
        class="inline-number"
        bind:value={orderState.risk_pct}
        step="0.1"
        min="0.1"
        max="5"
        aria-label="Risk percent"
      />
    </div>

    <label class="field-label" for="order-stop">Stop pips</label>
    <div class="input-row sl-row">
      <i class="ti ti-shield-x" aria-hidden="true"></i>
      <span class="input-display">Stop distance</span>
      <input
        id="order-stop"
        type="number"
        class="inline-number"
        bind:value={orderState.stop_pips}
        step="1"
        min="1"
        aria-label="Stop pips"
      />
    </div>

    {#if nav > 0}
      <div class="rr-box">
        <span class="rr-label">Risk $</span>
        <span class="rr-value negative">${riskDollar.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
      </div>
    {/if}
  </div>

  <div class="action-buttons">
    <button class="go-long" onclick={() => fireOrder('long')} disabled={busy || !accountId}>
      <i class="ti ti-trending-up" aria-hidden="true"></i>
      Long
    </button>
    <button class="go-short" onclick={() => fireOrder('short')} disabled={busy || !accountId}>
      <i class="ti ti-trending-down" aria-hidden="true"></i>
      Short
    </button>
  </div>

  {@render children?.()}
</aside>

{#if toast}
  <div class="toast" class:long={toast.tone === 'long'} class:short={toast.tone === 'short'} class:error={toast.tone === 'error'}>
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
    font-size: 11px;
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

  .instrument-input {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
    text-transform: uppercase;
    background: none;
    border: none;
    outline: none;
  }

  .instrument-input::placeholder { color: var(--text-faint); }

  .inline-number {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    width: 60px;
    text-align: right;
    background: none;
    border: none;
    outline: none;
  }

  .sl-row {
    background: var(--red-tint);
    border-color: var(--red-border);
  }
  .sl-row > i { color: var(--red-mid); }
  .sl-row .inline-number { color: var(--red-bright); }

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
  .rr-value { font-size: 14px; font-weight: 500; }
  .negative { color: var(--red-bright); }

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

  .go-long:disabled, .go-short:disabled { opacity: 0.4; cursor: not-allowed; }
  .go-long:not(:disabled):hover, .go-short:not(:disabled):hover { opacity: 0.85; }
  .go-long:not(:disabled):active, .go-short:not(:disabled):active { transform: scale(0.98); }

  .go-long {
    background: var(--green-tint);
    color: var(--green-bright);
    border: 0.5px solid var(--green-dark);
  }

  .go-short {
    background: var(--red-tint);
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
    max-width: 80vw;
    text-align: center;
  }

  .toast.long  { background: var(--green-tint); color: var(--green-bright); border: 0.5px solid var(--green-dark); }
  .toast.short { background: var(--red-tint);   color: var(--red-bright);   border: 0.5px solid var(--red-dark); }
  .toast.error { background: var(--bg-card);    color: var(--amber);        border: 0.5px solid var(--amber); }
</style>
