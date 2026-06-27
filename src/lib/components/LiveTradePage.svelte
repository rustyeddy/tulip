<script lang="ts">
  import { onMount } from 'svelte';
  import { sseStore, type SSEStatus } from '../sse';
  import { api, type AccountSummary, type OpenTrade } from '../api';
  import { activeAccountId } from '../stores/nav.svelte';
  import MetricCard from './MetricCard.svelte';
  import PriceChart from './PriceChart.svelte';
  import OrderPanel from './OrderPanel.svelte';
  import PositionsList from './PositionsList.svelte';
  import PortfolioSummary from './PortfolioSummary.svelte';

  const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

  let account    = $state<AccountSummary | null>(null);
  let acctStatus = $state<SSEStatus>('connecting');
  let trades     = $state<OpenTrade[]>([]);
  let chartRef: ReturnType<typeof PriceChart> | undefined;

  let tradesAbort: AbortController | null = null;

  async function loadTrades() {
    const id = activeAccountId();
    if (!id) return;
    tradesAbort?.abort();
    tradesAbort = new AbortController();
    try {
      trades = await api.trades(id, tradesAbort.signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }

  // Reactive SSE — reconnects when active account changes.
  $effect(() => {
    const id = activeAccountId();
    if (!id) return;
    const base = `${BASE}/api/v1/accounts/${id}`;
    const { data, status } = sseStore<AccountSummary>(`${base}/stream/account`, 'account');
    const unsubData   = data.subscribe(v => { account = v; });
    const unsubStatus = status.subscribe(v => { acctStatus = v; });
    return () => { unsubData(); unsubStatus(); };
  });

  export function refreshChart(): void {
    chartRef?.refresh?.();
    loadTrades();
  }

  // ── Metric cards derived from real account data ───────────────────────────

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  let metrics = $derived(account ? [
    {
      label: 'NAV',
      value: money.format(account.NAV),
      delta: acctStatus === 'open' ? 'Live' : 'No stream',
      tone: (acctStatus === 'open' ? 'positive' : 'neutral') as 'positive' | 'neutral',
    },
    {
      label: 'Balance',
      value: money.format(account.Balance),
      delta: '',
      tone: 'neutral' as const,
    },
    {
      label: 'Unrealized P/L',
      value: money.format(account.UnrealizedPL),
      delta: `${trades.length} position${trades.length !== 1 ? 's' : ''}`,
      tone: (account.UnrealizedPL >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
    },
    {
      label: 'Free margin',
      value: money.format(account.MarginAvail),
      delta: account.NAV > 0 ? `${(account.MarginAvail / account.NAV * 100).toFixed(1)}% of NAV` : '',
      tone: 'neutral' as const,
    },
  ] : []);

  onMount(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5_000);
    return () => {
      clearInterval(interval);
      tradesAbort?.abort();
    };
  });
</script>

<div class="page">
  {#if metrics.length > 0}
    <div class="metrics-row">
      {#each metrics as m}
        <MetricCard label={m.label} value={m.value} delta={m.delta} tone={m.tone} />
      {/each}
    </div>
  {:else}
    <div class="metrics-empty">Connecting to account stream…</div>
  {/if}

  <div class="trade-layout">
    <PriceChart bind:this={chartRef} />
    <OrderPanel accountId={activeAccountId()} nav={account?.NAV ?? 0}>
      <PositionsList {trades} />
      <PortfolioSummary {account} />
    </OrderPanel>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 14px;
    gap: 12px;
    overflow: hidden;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    flex-shrink: 0;
  }

  .metrics-empty {
    font-size: 13px;
    color: var(--text-faint);
    flex-shrink: 0;
  }

  .trade-layout {
    flex: 1;
    display: flex;
    gap: 12px;
    min-height: 0;
  }

  @media (max-width: 900px) {
    .metrics-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
