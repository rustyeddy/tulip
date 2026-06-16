<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type OpenTrade, type PlaceOrderProposal } from '../api';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { fmtPrice, fmtMoney, plClass, side, sideClass } from '../utils';

  // ── Trades list ─────────────────────────────────────────────────────────────

  let trades = $state<OpenTrade[]>([]);
  let loading = $state(true);
  let fetchError = $state('');

  // AbortController for the in-flight fetch so polling never races itself.
  let fetchAbort: AbortController | null = null;

  async function loadTrades() {
    fetchAbort?.abort();
    fetchAbort = new AbortController();
    try {
      trades = await api.trades();
      fetchError = '';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      fetchError = e instanceof Error ? e.message : 'Failed to load trades';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000);
    return () => {
      clearInterval(interval);
      fetchAbort?.abort();
    };
  });

  // ── Selected trade + side panel ───────────────────────────────────────────

  let selected = $state<OpenTrade | null>(null);
  let stopInput = $state('');
  let takeInput = $state('');

  function select(t: OpenTrade) {
    selected = t;
    stopInput = t.StopLoss > 0 ? t.StopLoss.toFixed(5) : '';
    takeInput = t.TakeProfit > 0 ? t.TakeProfit.toFixed(5) : '';
  }

  function deselect() { selected = null; }

  // ── Update stop/take ──────────────────────────────────────────────────────

  let updateLoading = $state(false);
  let updateMsg = $state('');

  async function applyStop() {
    if (!selected) return;
    updateLoading = true;
    try {
      await api.updateStop(selected.ID, parseFloat(stopInput) || 0, parseFloat(takeInput) || 0);
      updateMsg = 'Updated.';
      await loadTrades();
      setTimeout(() => { updateMsg = ''; }, 3000);
    } catch (e) {
      updateMsg = e instanceof Error ? e.message : 'Update failed';
    } finally {
      updateLoading = false;
    }
  }

  // ── Close trade ───────────────────────────────────────────────────────────

  let closeUnits = $state('');
  let showCloseConfirm = $state(false);
  let closeLoading = $state(false);
  let closeMsg = $state('');

  async function confirmClose() {
    if (!selected) return;
    closeLoading = true;
    closeMsg = '';
    try {
      await api.closeTrade(selected.ID, parseInt(closeUnits) || 0);
      closeMsg = 'Trade closed.';
      selected = null;
      await loadTrades();
      setTimeout(() => { closeMsg = ''; }, 3000);
    } catch (e) {
      closeMsg = e instanceof Error ? e.message : 'Close failed';
    } finally {
      closeLoading = false;
    }
  }

  // ── Place order ───────────────────────────────────────────────────────────

  let orderInstrument = $state('EUR_USD');
  let orderSide = $state('long');
  let orderStopPips = $state(20);
  let orderRiskPct = $state(0.1);
  let orderPreview = $state<PlaceOrderProposal | null>(null);
  let orderMsg = $state('');
  let previewLoading = $state(false);
  let placeLoading = $state(false);

  async function previewOrder() {
    previewLoading = true;
    try {
      const result = await api.placeTrade({
        instrument: orderInstrument,
        side: orderSide,
        stop_pips: orderStopPips,
        risk_pct: orderRiskPct,
        confirm: false,
      });
      orderPreview = result.Proposal;
      orderMsg = '';
    } catch (e) {
      orderMsg = e instanceof Error ? e.message : 'Preview failed';
    } finally {
      previewLoading = false;
    }
  }

  async function placeOrder() {
    placeLoading = true;
    try {
      await api.placeTrade({
        instrument: orderInstrument,
        side: orderSide,
        stop_pips: orderStopPips,
        risk_pct: orderRiskPct,
        confirm: true,
      });
      orderMsg = 'Order placed!';
      orderPreview = null;
      await loadTrades();
      setTimeout(() => { orderMsg = ''; }, 4000);
    } catch (e) {
      orderMsg = e instanceof Error ? e.message : 'Order failed';
      orderPreview = null;
    } finally {
      placeLoading = false;
    }
  }

  function cancelPreview() { orderPreview = null; orderMsg = ''; }

  // ── Formatting ────────────────────────────────────────────────────────────
  // Helpers imported from src/lib/utils.ts: fmtPrice, fmtMoney, plClass, side, sideClass
</script>

<ConfirmDialog
  bind:open={showCloseConfirm}
  title="Close trade"
  message="{closeUnits ? `Close ${closeUnits} units of` : 'Fully close'} trade {selected?.ID} ({selected?.Instrument})?"
  confirmLabel="Close trade"
  danger
  onconfirm={confirmClose}
/>

<div class="page">

  <!-- Trades table -->
  <div class="table-area">
    <h1 class="page-title">Open Trades</h1>

    {#if loading}
      <div class="card empty">Loading…</div>
    {:else if fetchError}
      <div class="card empty error">{fetchError}</div>
    {:else if trades.length === 0}
      <div class="card empty">No open trades.</div>
    {:else}
      <div class="card no-pad">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Instrument</th>
              <th>Side</th>
              <th class="right">Units</th>
              <th class="right">Entry</th>
              <th class="right">Stop</th>
              <th class="right">Take</th>
              <th class="right">Unreal P/L</th>
            </tr>
          </thead>
          <tbody>
            {#each trades as t (t.ID)}
              <tr
                class="trade-row {selected?.ID === t.ID ? 'selected' : ''}"
                onclick={() => select(t)}
              >
                <td class="mono faint small">{t.ID}</td>
                <td class="bold">{t.Instrument}</td>
                <td class="bold small {sideClass(t.Units)}">{side(t.Units)}</td>
                <td class="mono right">{Math.abs(t.Units).toLocaleString()}</td>
                <td class="mono right">{fmtPrice(t.EntryPrice)}</td>
                <td class="mono right faint">{t.StopLoss > 0 ? fmtPrice(t.StopLoss) : '—'}</td>
                <td class="mono right faint">{t.TakeProfit > 0 ? fmtPrice(t.TakeProfit) : '—'}</td>
                <td class="mono right {plClass(t.UnrealizedPL)}">{fmtMoney(t.UnrealizedPL)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Right panel: trade detail when selected, new order form otherwise -->
  <div class="side-panel">

    {#if selected}
      {@const t = selected}

      <div class="panel-header">
        <h2>Trade {t.ID}</h2>
        <button class="close-btn" onclick={deselect}>✕</button>
      </div>

      <!-- Summary -->
      <div class="card">
        <div class="detail-row">
          <span class="label">Instrument</span>
          <span class="bold">{t.Instrument}</span>
        </div>
        <div class="detail-row">
          <span class="label">Side</span>
          <span class="bold {sideClass(t.Units)}">{side(t.Units)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Units</span>
          <span class="mono">{Math.abs(t.Units).toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Entry</span>
          <span class="mono">{fmtPrice(t.EntryPrice)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Unreal P/L</span>
          <span class="mono {plClass(t.UnrealizedPL)}">{fmtMoney(t.UnrealizedPL)}</span>
        </div>
      </div>

      <!-- Update stop / take -->
      <div class="card">
        <h3 class="section-title">Update Stop / Take</h3>
        <label class="field">
          <span class="field-label">Stop price</span>
          <input bind:value={stopInput} type="number" step="0.00001" placeholder="0 = cancel" />
        </label>
        <label class="field">
          <span class="field-label">Take profit</span>
          <input bind:value={takeInput} type="number" step="0.00001" placeholder="0 = cancel" />
        </label>
        <button class="btn-primary" onclick={applyStop} disabled={updateLoading}>
          {updateLoading ? 'Updating…' : 'Apply'}
        </button>
        {#if updateMsg}
          <p class="msg {updateMsg === 'Updated.' ? 'positive' : 'negative'}">{updateMsg}</p>
        {/if}
      </div>

      <!-- Close trade -->
      <div class="card">
        <h3 class="section-title">Close Trade</h3>
        <label class="field">
          <span class="field-label">Units (empty = full close)</span>
          <input bind:value={closeUnits} type="number" min="1" placeholder="all" />
        </label>
        <button class="btn-danger" onclick={() => { showCloseConfirm = true; }} disabled={closeLoading}>
          {closeLoading ? 'Closing…' : 'Close Trade'}
        </button>
        {#if closeMsg}
          <p class="msg negative">{closeMsg}</p>
        {/if}
      </div>

    {:else}

      <!-- New order form -->
      <h2 class="panel-title">New Order</h2>

      <div class="card">
        <label class="field">
          <span class="field-label">Instrument</span>
          <input bind:value={orderInstrument} type="text" placeholder="EUR_USD" class="upper" />
        </label>

        <div class="field">
          <span class="field-label">Side</span>
          <div class="side-tabs">
            <button
              class="tab {orderSide === 'long' ? 'tab-active' : ''}"
              onclick={() => { orderSide = 'long'; orderPreview = null; }}
            >Long</button>
            <button
              class="tab {orderSide === 'short' ? 'tab-active' : ''}"
              onclick={() => { orderSide = 'short'; orderPreview = null; }}
            >Short</button>
          </div>
        </div>

        <label class="field">
          <span class="field-label">Stop (pips)</span>
          <input bind:value={orderStopPips} type="number" min="1" step="1"
                 onchange={() => { orderPreview = null; }} />
        </label>

        <label class="field">
          <span class="field-label">Risk %</span>
          <input bind:value={orderRiskPct} type="number" min="0.01" step="0.01"
                 onchange={() => { orderPreview = null; }} />
        </label>

        {#if !orderPreview}
          <button class="btn-secondary" onclick={previewOrder} disabled={previewLoading}>
            {previewLoading ? 'Loading…' : 'Preview Order'}
          </button>
        {:else}
          <div class="preview">
            <div class="detail-row">
              <span class="label">Units</span>
              <span class="mono">{Math.abs(orderPreview.Units).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Entry</span>
              <span class="mono">{orderPreview.EntryPrice.toFixed(5)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Stop</span>
              <span class="mono">{orderPreview.StopPrice.toFixed(5)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Risk $</span>
              <span class="mono">{fmtMoney(orderPreview.RiskAmount)}</span>
            </div>
            <div class="detail-row faint">
              <span class="label">Account NAV</span>
              <span class="mono">{fmtMoney(orderPreview.AccountNAV)}</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn-secondary" onclick={cancelPreview}>Cancel</button>
            <button class="btn-primary" onclick={placeOrder} disabled={placeLoading}>
              {placeLoading ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        {/if}

        {#if orderMsg}
          <p class="msg {orderMsg === 'Order placed!' ? 'positive' : 'negative'}">{orderMsg}</p>
        {/if}
      </div>

    {/if}
  </div>
</div>

<style>
  .page {
    display: flex;
    gap: 16px;
    height: 100%;
    padding: 14px;
    overflow: hidden;
  }

  /* ── Table area ─────────────────────────────────────────────────────────── */

  .table-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card.no-pad {
    padding: 0;
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

  .card.empty {
    font-size: 13px;
    color: var(--text-muted);
    padding: 20px;
    align-items: center;
  }

  .card.empty.error { color: var(--red-bright); }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  thead tr {
    border-bottom: 1px solid var(--border);
  }

  th {
    padding: 8px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  th.right { text-align: right; }

  td {
    padding: 9px 12px;
    white-space: nowrap;
  }

  td.right { text-align: right; }

  .trade-row {
    border-bottom: 1px solid var(--border-light);
    cursor: pointer;
    transition: background 0.1s;
  }

  .trade-row:hover { background: var(--bg-hover); }
  .trade-row.selected { background: var(--purple-tint); }
  .trade-row:last-child { border-bottom: none; }

  .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
  .bold { font-weight: 600; }
  .faint { color: var(--text-muted); }
  .small { font-size: 11px; }

  /* ── Side panel ─────────────────────────────────────────────────────────── */

  .side-panel {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .panel-header h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .close-btn {
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    transition: color 0.15s;
  }
  .close-btn:hover { color: var(--text-primary); }

  .section-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .detail-row.faint { color: var(--text-muted); font-size: 12px; }

  .label { color: var(--text-muted); }

  /* ── Form fields ─────────────────────────────────────────────────────────── */

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .field input, input {
    width: 100%;
    background: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--text-primary);
    transition: border-color 0.15s;
  }

  .field input:focus, input:focus {
    border-color: var(--purple-mid);
    outline: none;
  }

  input.upper { text-transform: uppercase; }

  /* ── Side tabs ───────────────────────────────────────────────────────────── */

  .side-tabs {
    display: flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .tab {
    flex: 1;
    padding: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
    text-align: center;
  }

  .tab:hover { color: var(--text-primary); }

  .tab.tab-active {
    background: var(--purple-mid);
    color: #fff;
  }

  /* ── Preview box ─────────────────────────────────────────────────────────── */

  .preview {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */

  .btn-primary, .btn-secondary, .btn-danger {
    width: 100%;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s, opacity 0.15s;
    cursor: pointer;
  }

  .btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--purple-mid);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) { background: var(--purple-strong); }

  .btn-secondary {
    background: var(--bg-hover);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--border); }

  .btn-danger {
    background: var(--red-mid);
    color: #fff;
  }
  .btn-danger:hover:not(:disabled) { background: var(--red-dark); }

  .btn-row {
    display: flex;
    gap: 8px;
  }

  .btn-row .btn-primary, .btn-row .btn-secondary {
    flex: 1;
  }

  /* ── Status messages ─────────────────────────────────────────────────────── */

  .msg {
    font-size: 12px;
    margin-top: 2px;
  }

  .positive { color: var(--green-mid); }
  .negative { color: var(--red-bright); }
</style>
