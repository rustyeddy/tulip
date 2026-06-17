<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type BacktestSummary, type BacktestReportTrade } from '../api';

  const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

  // ── Formatting helpers ────────────────────────────────────────────────────

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  function money(n: number)     { return fmt.format(n); }
  function pct(n: number)       { return n.toFixed(1) + '%'; }
  function price(n: number)     { return n.toFixed(5); }
  function shortDate(s: string) { return s ? s.slice(0, 10) : '—'; }
  function plCls(n: number)     { return n >= 0 ? 'pos' : 'neg'; }

  // ── Load backtest list ────────────────────────────────────────────────────

  let allSummaries = $state<BacktestSummary[]>([]);
  let listLoading  = $state(true);
  let listError    = $state('');

  onMount(async () => {
    try {
      const res = await api.backtestList();
      allSummaries = res.summaries ?? [];
    } catch (e) {
      listError = e instanceof Error ? e.message : 'Failed to load backtests';
    } finally {
      listLoading = false;
    }
  });

  // ── Filters + sort ────────────────────────────────────────────────────────

  let filterInstrument = $state('');
  let filterStrategy   = $state('');
  let sortKey          = $state<keyof BacktestSummary>('name');
  let sortAsc          = $state(true);

  const COLS: [keyof BacktestSummary, string][] = [
    ['name',         'Name'],
    ['instrument',   'Instr'],
    ['timeframe',    'TF'],
    ['trades',       'Trades'],
    ['win_rate',     'Win%'],
    ['return_pct',   'Return'],
    ['net_pl',       'Net P/L'],
    ['max_drawdown', 'Drawdown'],
    ['rr',           'RR'],
  ];

  let sorted = $derived.by(() => {
    const fi = filterInstrument.toLowerCase();
    const fs = filterStrategy.toLowerCase();
    const filtered = allSummaries.filter(s =>
      (!fi || s.instrument.toLowerCase().includes(fi)) &&
      (!fs || s.strategy.toLowerCase().includes(fs))
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? (av as number) - (bv as number)
        : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  });

  function setSort(key: keyof BacktestSummary) {
    if (sortKey === key) { sortAsc = !sortAsc; } else { sortKey = key; sortAsc = false; }
  }

  function sortIcon(key: keyof BacktestSummary) {
    if (sortKey !== key) return '↕';
    return sortAsc ? '↑' : '↓';
  }

  function sortState(key: keyof BacktestSummary) {
    if (sortKey !== key) return 'none';
    return sortAsc ? 'ascending' : 'descending';
  }

  function activateOnKey(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  let selectedName  = $state('');
  let detail        = $state<BacktestSummary | null>(null);
  let detailLoading = $state(false);
  let detailError   = $state('');
  let detailRequestId = 0;

  let tradesPage = $state(0);
  const PAGE_SIZE = 25;
  let trades     = $derived<BacktestReportTrade[]>(detail?.trade_details ?? []);
  let totalPages = $derived(Math.ceil(trades.length / PAGE_SIZE));
  let tradePage  = $derived(trades.slice(tradesPage * PAGE_SIZE, (tradesPage + 1) * PAGE_SIZE));

  function clearDetail() {
    detailRequestId += 1;
    selectedName  = '';
    detail        = null;
    detailError   = '';
    detailLoading = false;
    tradesPage    = 0;
  }

  async function selectRow(name: string) {
    const nextSelectedName = selectedName === name ? '' : name;
    const requestId = ++detailRequestId;

    selectedName  = nextSelectedName;
    tradesPage    = 0;
    detailError   = '';
    detail        = null;

    if (!nextSelectedName) {
      detailLoading = false;
      return;
    }

    detailLoading = true;

    try {
      const nextDetail = await api.backtestGet(nextSelectedName);
      if (requestId !== detailRequestId) return;
      detail = nextDetail;
    } catch (e) {
      if (requestId !== detailRequestId) return;
      detailError = e instanceof Error ? e.message : 'Failed to load detail';
    } finally {
      if (requestId !== detailRequestId) return;
      detailLoading = false;
    }
  }

  // ── Compare mode ──────────────────────────────────────────────────────────

  let showCompare = $state(false);
  let compareA    = $state('');
  let compareB    = $state('');
  let cmpDataA    = $state<BacktestSummary | null>(null);
  let cmpDataB    = $state<BacktestSummary | null>(null);
  let cmpLoading  = $state(false);
  let cmpError    = $state('');
  let compareRequestId = 0;

  async function loadCompare() {
    const requestId = ++compareRequestId;

    cmpDataA = null;
    cmpDataB = null;
    cmpError = '';

    if (!compareA || !compareB) {
      cmpLoading = false;
      return;
    }

    cmpLoading = true;
    try {
      const [nextA, nextB] = await Promise.all([
        api.backtestGet(compareA),
        api.backtestGet(compareB),
      ]);
      if (requestId !== compareRequestId) return;
      cmpDataA = nextA;
      cmpDataB = nextB;
    } catch (e) {
      if (requestId !== compareRequestId) return;
      cmpError = e instanceof Error ? e.message : 'Failed to load comparison';
    } finally {
      if (requestId !== compareRequestId) return;
      cmpLoading = false;
    }
  }

  function onCompareAChange(e: Event) {
    compareA = (e.target as HTMLSelectElement).value;
    loadCompare();
  }
  function onCompareBChange(e: Event) {
    compareB = (e.target as HTMLSelectElement).value;
    loadCompare();
  }

  function reportHref(name: string) {
    return `${API_BASE}/api/v1/backtests/${encodeURIComponent(name)}/org`;
  }

  const CMP_ROWS: [string, (s: BacktestSummary) => string][] = [
    ['Strategy',     s => s.strategy],
    ['Instrument',   s => s.instrument],
    ['Period',       s => `${shortDate(s.start)} → ${shortDate(s.end)}`],
    ['Trades',       s => String(s.trades)],
    ['Win Rate',     s => pct(s.win_rate)],
    ['Return',       s => pct(s.return_pct)],
    ['Net P/L',      s => money(s.net_pl)],
    ['Max Drawdown', s => money(s.max_drawdown)],
    ['RR',           s => s.rr.toFixed(2)],
    ['Stop',         s => s.stop || '—'],
  ];

  // ── Run panel ─────────────────────────────────────────────────────────────

  let runInput   = $state('testdata/configs/eurusd-h1-2024-ema-cross.yml');
  let runLoading = $state(false);
  let runError   = $state('');
  let runResults = $state<BacktestSummary[]>([]);

  async function runBacktest() {
    const paths = runInput.split('\n').map(s => s.trim()).filter(Boolean);
    if (!paths.length) return;
    runLoading = true;
    runError   = '';
    runResults = [];
    try {
      const res = await api.runBacktest(paths);
      runResults = res.summaries ?? [];
      const list = await api.backtestList();
      allSummaries = list.summaries ?? [];
    } catch (e) {
      runError = e instanceof Error ? e.message : 'Run failed';
    } finally {
      runLoading = false;
    }
  }
</script>

<div class="page">

  <!-- Header -->
  <div class="header-row">
    <h1 class="page-title">Backtests</h1>
    <button
      class="btn-toggle {showCompare ? 'active' : ''}"
      onclick={() => { showCompare = !showCompare; }}
    >Compare</button>
  </div>

  <!-- Compare panel -->
  {#if showCompare}
    <div class="card compare-panel">
      <h2 class="section-title">Side-by-Side Comparison</h2>
      <div class="compare-selects">
        <div class="field">
          <span class="field-label">Report A</span>
          <select class="bt-select" value={compareA} onchange={onCompareAChange}>
            <option value="">— select —</option>
            {#each sorted as s}<option value={s.name}>{s.name}</option>{/each}
          </select>
        </div>
        <div class="field">
          <span class="field-label">Report B</span>
          <select class="bt-select" value={compareB} onchange={onCompareBChange}>
            <option value="">— select —</option>
            {#each sorted as s}<option value={s.name}>{s.name}</option>{/each}
          </select>
        </div>
      </div>

      {#if cmpLoading}
        <p class="hint">Loading…</p>
      {:else if cmpError}
        <p class="err small">{cmpError}</p>
      {:else if cmpDataA && cmpDataB}
        <table class="cmp-table">
          <thead>
            <tr>
              <th class="left">Metric</th>
              <th class="right">{compareA}</th>
              <th class="right">{compareB}</th>
            </tr>
          </thead>
          <tbody>
            {#each CMP_ROWS as [label, fn]}
              <tr>
                <td class="muted small">{label}</td>
                <td class="mono right">{fn(cmpDataA)}</td>
                <td class="mono right">{fn(cmpDataB)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}

  <!-- Filters -->
  <div class="filter-row">
    <label class="field">
      <span class="field-label">Instrument</span>
      <input bind:value={filterInstrument} placeholder="e.g. EUR_USD" class="filter-input" />
    </label>
    <label class="field">
      <span class="field-label">Strategy</span>
      <input bind:value={filterStrategy} placeholder="e.g. EMA" class="filter-input" />
    </label>
    <span class="hint result-count">{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
  </div>

  <!-- List + detail -->
  <div class="body-row">

    <!-- Table -->
    <div class="table-wrap">
      {#if listLoading}
        <div class="card empty">Loading…</div>
      {:else if listError}
        <div class="card empty err">{listError}</div>
      {:else if sorted.length === 0}
        <div class="card empty">No backtests found.</div>
      {:else}
        <div class="card no-pad">
          <table>
            <thead>
              <tr>
                {#each COLS as [key, label]}
                  <th
                    class="{key === 'name' ? 'left' : 'right'} sortable"
                    aria-sort={sortState(key)}
                  >
                    <button class="sort-button" type="button" onclick={() => setSort(key)}>
                      {label} <span class="sort-icon">{sortIcon(key)}</span>
                    </button>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each sorted as s (s.name)}
                <tr
                  class="bt-row {selectedName === s.name ? 'selected' : ''}"
                  tabindex="0"
                  aria-selected={selectedName === s.name}
                  onclick={() => selectRow(s.name)}
                  onkeydown={(event) => activateOnKey(event, () => selectRow(s.name))}
                >
                  <td class="mono small muted name-cell">{s.name}</td>
                  <td class="bold">{s.instrument}</td>
                  <td class="muted">{s.timeframe}</td>
                  <td class="mono right">{s.trades}</td>
                  <td class="mono right">{pct(s.win_rate)}</td>
                  <td class="mono right {plCls(s.return_pct)}">{pct(s.return_pct)}</td>
                  <td class="mono right {plCls(s.net_pl)}">{money(s.net_pl)}</td>
                  <td class="mono right neg">{money(s.max_drawdown)}</td>
                  <td class="mono right">{s.rr.toFixed(2)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Detail panel -->
    {#if selectedName}
      <div class="detail-panel">

        <div class="detail-header">
          <span class="detail-name mono small">{selectedName}</span>
          <button class="close-btn" onclick={clearDetail}>✕</button>
        </div>

        {#if detailLoading}
          <p class="hint">Loading…</p>
        {:else if detailError}
          <p class="err small">{detailError}</p>
        {:else if detail}

          <div class="mini-grid">
            <div class="mini-card"><span class="mini-label">Strategy</span><span class="mini-val">{detail.strategy}</span></div>
            <div class="mini-card"><span class="mini-label">Instrument</span><span class="mini-val">{detail.instrument}</span></div>
            <div class="mini-card"><span class="mini-label">Period</span><span class="mini-val">{shortDate(detail.start)} → {shortDate(detail.end)}</span></div>
            <div class="mini-card"><span class="mini-label">Stop</span><span class="mini-val">{detail.stop || '—'}</span></div>
          </div>

          <div class="mini-grid">
            <div class="mini-card"><span class="mini-label">Trades</span><span class="mini-val mono">{detail.trades}</span></div>
            <div class="mini-card"><span class="mini-label">Win Rate</span><span class="mini-val mono {plCls(detail.win_rate - 50)}">{pct(detail.win_rate)}</span></div>
            <div class="mini-card"><span class="mini-label">Return</span><span class="mini-val mono {plCls(detail.return_pct)}">{pct(detail.return_pct)}</span></div>
            <div class="mini-card"><span class="mini-label">Net P/L</span><span class="mini-val mono {plCls(detail.net_pl)}">{money(detail.net_pl)}</span></div>
            <div class="mini-card"><span class="mini-label">Drawdown</span><span class="mini-val mono neg">{money(detail.max_drawdown)}</span></div>
            <div class="mini-card"><span class="mini-label">RR</span><span class="mini-val mono">{detail.rr.toFixed(2)}</span></div>
            <div class="mini-card"><span class="mini-label">Avg Winner</span><span class="mini-val mono pos">{money(detail.avg_winner)}</span></div>
            <div class="mini-card"><span class="mini-label">Avg Loser</span><span class="mini-val mono neg">{money(detail.avg_loser)}</span></div>
          </div>

          <a
            href={reportHref(detail.name)}
            download={`${detail.name}.org`}
            class="download-link"
          >Download .org report</a>

          {#if trades.length > 0}
            <div class="trade-section">
              <div class="trade-header">
                <span class="muted small">Trades ({trades.length})</span>
                {#if totalPages > 1}
                  <span class="muted small">page {tradesPage + 1}/{totalPages}</span>
                {/if}
              </div>
              <div class="card no-pad">
                <table>
                  <thead>
                    <tr>
                      <th class="left">Side</th>
                      <th class="right">Entry</th>
                      <th class="right">Exit</th>
                      <th class="right">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each tradePage as t (t.id)}
                      <tr>
                        <td class="small uppercase {t.side === 'long' ? 'pos' : 'neg'}">{t.side}</td>
                        <td class="mono right small">{price(t.open_price)}</td>
                        <td class="mono right small">{price(t.close_price)}</td>
                        <td class="mono right small {plCls(t.pnl)}">{money(t.pnl)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              {#if totalPages > 1}
                <div class="page-btns">
                  <button
                    class="page-btn"
                    disabled={tradesPage === 0}
                    onclick={() => { tradesPage = Math.max(0, tradesPage - 1); }}
                  >← Prev</button>
                  <button
                    class="page-btn"
                    disabled={tradesPage >= totalPages - 1}
                    onclick={() => { tradesPage = Math.min(totalPages - 1, tradesPage + 1); }}
                  >Next →</button>
                </div>
              {/if}
            </div>
          {/if}

        {/if}
      </div>
    {/if}

  </div>

  <!-- Run panel -->
  <details class="card run-panel">
    <summary class="run-summary">Run new backtest</summary>
    <div class="run-body">
      <textarea
        bind:value={runInput}
        rows="3"
        placeholder="One config path per line"
        class="run-input"
      ></textarea>
      <button class="btn-primary" onclick={runBacktest} disabled={runLoading}>
        {runLoading ? 'Running…' : 'Run'}
      </button>
      {#if runError}<p class="err small">{runError}</p>{/if}
      {#if runResults.length > 0}
        <div class="run-results">
          {#each runResults as s (s.name)}
            <div class="run-result-card">
              <span class="bold small">{s.name}</span>
              <span class="muted small">{s.trades} trades · {pct(s.win_rate)} win · {pct(s.return_pct)} return · {money(s.net_pl)} P/L</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </details>

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

  .btn-toggle {
    font-size: 13px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .btn-toggle:hover { color: var(--text-primary); }
  .btn-toggle.active {
    background: var(--purple-tint);
    border-color: var(--purple-mid);
    color: var(--purple-bright);
  }

  /* ── Compare panel ───────────────────────────────────────────────────────── */

  .compare-panel { flex-shrink: 0; }

  .compare-selects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cmp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .cmp-table th, .cmp-table td { padding: 5px 8px; border-bottom: 1px solid var(--border-light); }
  .cmp-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 500; }
  .cmp-table th.left  { text-align: left; }
  .cmp-table th.right { text-align: right; }
  .cmp-table td.right { text-align: right; }

  /* ── Filters ─────────────────────────────────────────────────────────────── */

  .filter-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-shrink: 0;
  }

  .result-count { padding-bottom: 2px; }

  .filter-input {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 12px;
    padding: 5px 8px;
    width: 130px;
    transition: border-color 0.15s;
  }
  .filter-input:focus { border-color: var(--purple-mid); outline: none; }

  /* ── Body ────────────────────────────────────────────────────────────────── */

  .body-row {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .table-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Cards ───────────────────────────────────────────────────────────────── */

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card.no-pad { padding: 0; overflow: auto; flex: 1; min-height: 0; }
  .card.empty  { font-size: 13px; color: var(--text-muted); padding: 20px; align-items: center; }
  .card.empty.err { color: var(--red-bright); }

  /* ── Table ───────────────────────────────────────────────────────────────── */

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { border-bottom: 1px solid var(--border); }

  th {
    padding: 7px 10px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    white-space: nowrap;
    user-select: none;
  }
  th.sortable { cursor: pointer; }
  th.sortable:hover { color: var(--text-primary); }
  th.left  { text-align: left; }
  th.right { text-align: right; }

  .sort-button {
    display: inline-flex;
    align-items: center;
    justify-content: inherit;
    gap: 4px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
  }
  th.left .sort-button  { justify-content: flex-start; }
  th.right .sort-button { justify-content: flex-end; }
  .sort-button:hover,
  .sort-button:focus-visible { color: var(--text-primary); }

  .sort-icon { color: var(--text-faint); }

  td { padding: 7px 10px; white-space: nowrap; }
  td.right { text-align: right; }

  .bt-row {
    border-bottom: 1px solid var(--border-light);
    cursor: pointer;
    transition: background 0.1s;
  }
  .bt-row:hover    { background: var(--bg-hover); }
  .bt-row:focus-visible { outline: 1px solid var(--purple-mid); outline-offset: -1px; }
  .bt-row.selected { background: var(--purple-tint); }
  .bt-row:last-child { border-bottom: none; }

  .name-cell { max-width: 14rem; overflow: hidden; text-overflow: ellipsis; }

  /* ── Detail panel ────────────────────────────────────────────────────────── */

  .detail-panel {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-shrink: 0;
  }

  .detail-name { word-break: break-all; color: var(--text-secondary); }

  .close-btn {
    color: var(--text-faint);
    font-size: 14px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .close-btn:hover { color: var(--text-primary); }

  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .mini-card {
    background: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mini-label { font-size: 10px; color: var(--text-muted); }
  .mini-val   { font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .download-link {
    display: block;
    text-align: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .download-link:hover { color: var(--text-primary); border-color: var(--text-muted); }

  .trade-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 0;
  }

  .trade-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .page-btns { display: flex; justify-content: space-between; flex-shrink: 0; }

  .page-btn { font-size: 12px; color: var(--text-muted); transition: color 0.15s; }
  .page-btn:hover:not(:disabled) { color: var(--text-primary); }
  .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── Run panel ───────────────────────────────────────────────────────────── */

  .run-panel { flex-shrink: 0; }

  .run-summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    user-select: none;
  }

  .run-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  .run-input {
    width: 100%;
    background: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--text-primary);
    resize: none;
    transition: border-color 0.15s;
  }
  .run-input:focus { border-color: var(--purple-mid); outline: none; }

  .btn-primary {
    align-self: flex-start;
    padding: 6px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    background: var(--purple-mid);
    color: #fff;
    transition: background 0.15s, opacity 0.15s;
  }
  .btn-primary:hover:not(:disabled) { background: var(--purple-strong); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .run-results { display: flex; flex-direction: column; gap: 6px; }

  .run-result-card {
    background: var(--bg-app);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  /* ── Shared utilities ────────────────────────────────────────────────────── */

  .section-title { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
  .field         { display: flex; flex-direction: column; gap: 4px; }
  .field-label   { font-size: 11px; color: var(--text-muted); }

  .bt-select {
    background: var(--bg-app);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 12px;
    padding: 5px 8px;
    cursor: pointer;
    width: 100%;
    transition: border-color 0.15s;
  }
  .bt-select:focus { border-color: var(--purple-mid); outline: none; }

  .mono      { font-family: 'SF Mono', 'Fira Code', monospace; }
  .bold      { font-weight: 600; }
  .small     { font-size: 12px; }
  .muted     { color: var(--text-muted); }
  .hint      { font-size: 12px; color: var(--text-muted); }
  .pos       { color: var(--green-mid); }
  .neg       { color: var(--red-bright); }
  .err       { color: var(--red-bright); }
  .right     { text-align: right; }
  .uppercase { text-transform: uppercase; }
</style>
