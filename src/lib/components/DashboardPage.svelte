<script lang="ts">
  import { onMount } from 'svelte';
  import { sseStore, sseLog, type SSEStatus } from '../sse';
  import { api, type AccountSummary, type OpenTrade, type Transaction } from '../api';
  import EquitySparkline from './EquitySparkline.svelte';

  // ── Formatting ────────────────────────────────────────────────────────────

  const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  function money(n: number)  { return moneyFmt.format(n); }
  function price(n: number)  { return n.toFixed(5); }
  function plCls(n: number)  { return n >= 0 ? 'pos' : 'neg'; }
  function sideCls(u: number){ return u > 0 ? 'pos' : 'neg'; }

  // ── SSE: account stream ───────────────────────────────────────────────────

  const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const { data: accountStore, status: accountStatusStore } =
    sseStore<AccountSummary>(`${BASE}/api/v1/stream/account`, 'account');

  let account       = $state<AccountSummary | null>(null);
  let accountStatus = $state<SSEStatus>('connecting');
  let navHistory    = $state<number[]>([]);

  // ── SSE: transaction event log ────────────────────────────────────────────

  const eventsStore = sseLog<Transaction>(`${BASE}/api/v1/stream/events`, 'transaction', 50);
  let events = $state<Transaction[]>([]);

  // ── Health check ──────────────────────────────────────────────────────────

  let healthy = $state<boolean | null>(null);

  async function checkHealth() {
    try {
      await api.health();
      healthy = true;
    } catch {
      healthy = false;
    }
  }

  // ── Polled data ───────────────────────────────────────────────────────────

  let openTrades    = $state<OpenTrade[]>([]);
  let tradesLoading = $state(true);
  let transactions  = $state<Transaction[]>([]);
  let txLoading     = $state(true);

  let tradesAbort: AbortController | null = null;
  let lastTxId = 0;

  async function loadTrades() {
    tradesAbort?.abort();
    tradesAbort = new AbortController();
    try {
      openTrades = await api.trades(tradesAbort.signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    } finally { tradesLoading = false; }
  }

  async function loadTransactions() {
    try {
      const res = await api.transactions(lastTxId);
      const incoming = res.transactions ?? [];
      if (incoming.length > 0) {
        transactions.unshift(...incoming);
        if (transactions.length > 200) transactions.length = 200;
        lastTxId = res.last_transaction_id;
      }
    } catch { /* backend may be offline */ }
    finally { txLoading = false; }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  let closedTrades = $derived(
    transactions
      .filter(t => t.Type === 'ORDER_FILL' && t.PL !== 0)
      .slice(0, 10)
  );

  let dailyPL = $derived(
    closedTrades
      .filter(t => new Date(t.Time).toDateString() === new Date().toDateString())
      .reduce((sum, t) => sum + t.PL, 0)
  );

  let dotCls = $derived(
    healthy === false            ? 'dot-err' :
    accountStatus === 'open'    ? 'dot-ok'  :
    accountStatus === 'error'   ? 'dot-err' :
                                  'dot-wait'
  );

  let statusLabel = $derived(
    healthy === false            ? 'API unreachable' :
    accountStatus === 'open'    ? 'Live'             :
    accountStatus === 'connecting' ? 'Connecting…'   :
                                  'No stream'
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  onMount(() => {
    checkHealth();
    loadTrades();
    loadTransactions();

    const healthInterval = setInterval(checkHealth, 10_000);
    const tradesInterval = setInterval(loadTrades,  5_000);
    const txInterval     = setInterval(loadTransactions, 30_000);

    const unsubAccount = accountStore.subscribe(v => {
      account = v;
      if (v) navHistory = [...navHistory, v.NAV].slice(-120);
    });
    const unsubStatus = accountStatusStore.subscribe(v => { accountStatus = v; });
    const unsubEvents = eventsStore.subscribe(v => { events = v; });

    return () => {
      clearInterval(healthInterval);
      clearInterval(tradesInterval);
      clearInterval(txInterval);
      tradesAbort?.abort();
      unsubAccount();
      unsubStatus();
      unsubEvents();
    };
  });
</script>

<div class="page">

  <!-- Header -->
  <div class="header-row">
    <h1 class="page-title">Dashboard</h1>
    <span class="status-pill">
      <span class="dot {dotCls}"></span>
      <span class="muted">{statusLabel}</span>
    </span>
  </div>

  <!-- Account metric cards -->
  {#if account}
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Balance</span>
        <span class="metric-value mono">{money(account.Balance)}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">NAV</span>
        <span class="metric-value mono">{money(account.NAV)}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Unrealized P/L</span>
        <span class="metric-value mono {plCls(account.UnrealizedPL)}">{money(account.UnrealizedPL)}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Free Margin</span>
        <span class="metric-value mono">{money(account.MarginAvail)}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Daily P/L</span>
        <span class="metric-value mono {plCls(dailyPL)}">{money(dailyPL)}</span>
      </div>
    </div>

    <!-- NAV sparkline -->
    <div class="card sparkline-card">
      <span class="metric-label">NAV — session</span>
      <EquitySparkline values={navHistory} height={56} />
    </div>
  {:else}
    <div class="card empty muted">
      {accountStatus === 'connecting'
        ? 'Connecting to account stream…'
        : 'Start trader with a valid token to enable live data.'}
    </div>
  {/if}

  <!-- Three-column lower section -->
  <div class="lower-grid">

    <!-- Open trades -->
    <div class="lower-col">
      <div class="col-header">
        <span class="col-title">Open Trades</span>
      </div>
      {#if tradesLoading}
        <div class="card empty muted">Loading…</div>
      {:else if openTrades.length === 0}
        <div class="card empty muted">No open trades.</div>
      {:else}
        <div class="card no-pad">
          <table>
            <thead>
              <tr>
                <th class="left">Instr</th>
                <th class="right">Units</th>
                <th class="right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {#each openTrades as t (t.ID)}
                <tr class="trow">
                  <td class="bold">{t.Instrument}</td>
                  <td class="mono right {sideCls(t.Units)}">{t.Units.toLocaleString()}</td>
                  <td class="mono right {plCls(t.UnrealizedPL)}">{money(t.UnrealizedPL)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Recent closed trades -->
    <div class="lower-col">
      <div class="col-header">
        <span class="col-title">Recent Closed</span>
      </div>
      {#if txLoading}
        <div class="card empty muted">Loading…</div>
      {:else if closedTrades.length === 0}
        <div class="card empty muted">No closed trades yet.</div>
      {:else}
        <div class="card no-pad">
          <table>
            <thead>
              <tr>
                <th class="left">Instr</th>
                <th class="right">Price</th>
                <th class="right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {#each closedTrades as t (t.ID)}
                <tr class="trow">
                  <td class="bold">{t.Instrument || '—'}</td>
                  <td class="mono right">{price(t.Price)}</td>
                  <td class="mono right {plCls(t.PL)}">{money(t.PL)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Live event log -->
    <div class="lower-col">
      <div class="col-header">
        <span class="col-title">Live Events</span>
        {#if events.length > 0}
          <span class="muted small">({events.length})</span>
        {/if}
      </div>
      {#if events.length === 0}
        <div class="card empty muted">Waiting for broker events…</div>
      {:else}
        <div class="card no-pad event-log">
          <table>
            <tbody>
              {#each events as ev (ev.ID)}
                <tr class="trow">
                  <td class="mono muted small nowrap">{new Date(ev.Time).toLocaleTimeString()}</td>
                  <td class="small truncate type-cell">{ev.Type}</td>
                  <td class="mono small">{ev.Instrument || '—'}</td>
                  <td class="mono right small {ev.PL !== 0 ? plCls(ev.PL) : 'muted'}">
                    {ev.PL !== 0 ? money(ev.PL) : ''}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    padding: 14px;
    overflow-y: auto;
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-ok   { background: var(--green-mid); }
  .dot-err  { background: var(--red-mid); }
  .dot-wait { background: var(--text-faint); animation: pulse 1.5s ease-in-out infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  /* ── Metrics ─────────────────────────────────────────────────────────────── */

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    flex-shrink: 0;
  }

  @media (max-width: 900px) {
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-label { font-size: 13px; color: var(--text-muted); }
  .metric-value { font-size: 26px; font-weight: 500; color: var(--text-primary); }

  /* ── Sparkline card ──────────────────────────────────────────────────────── */

  .sparkline-card {
    flex-shrink: 0;
    gap: 6px;
  }

  /* ── Lower grid ──────────────────────────────────────────────────────────── */

  .lower-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    flex: 1;
    min-height: 0;
  }

  @media (max-width: 900px) {
    .lower-grid { grid-template-columns: 1fr; }
  }

  .lower-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
  }

  .col-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-shrink: 0;
  }

  .col-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Cards ───────────────────────────────────────────────────────────────── */

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card.no-pad  { padding: 0; overflow: auto; flex: 1; min-height: 0; }
  .card.empty   { font-size: 13px; padding: 16px; align-items: center; }
  .event-log    { max-height: 220px; overflow-y: auto; }

  /* ── Table ───────────────────────────────────────────────────────────────── */

  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead tr { border-bottom: 1px solid var(--border); }

  th {
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    white-space: nowrap;
  }
  th.left  { text-align: left; }
  th.right { text-align: right; }

  td { padding: 6px 10px; }
  td.right { text-align: right; }

  .trow { border-bottom: 1px solid var(--border-light); }
  .trow:last-child { border-bottom: none; }

  .type-cell { max-width: 6rem; overflow: hidden; text-overflow: ellipsis; }

  /* ── Utilities ───────────────────────────────────────────────────────────── */

  .mono    { font-family: 'SF Mono', 'Fira Code', monospace; }
  .bold    { font-weight: 600; }
  .small   { font-size: 13px; }
  .muted   { color: var(--text-muted); }
  .nowrap  { white-space: nowrap; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pos     { color: var(--green-mid); }
  .neg     { color: var(--red-bright); }
</style>
