<script lang="ts">
  import MetricCard from './MetricCard.svelte';
  import PriceChart from './PriceChart.svelte';
  import OrderPanel from './OrderPanel.svelte';
  import PositionsList from './PositionsList.svelte';
  import PortfolioSummary from './PortfolioSummary.svelte';
  import { portfolioMetrics } from '../data/mockData';

  let chartRef: ReturnType<typeof PriceChart> | undefined;

  export function refreshChart(): void {
    chartRef?.refresh?.();
  }
</script>

<div class="page">
  <div class="metrics-row">
    {#each portfolioMetrics as m}
      <MetricCard label={m.label} value={m.value} delta={m.delta} tone={m.tone} />
    {/each}
  </div>

  <div class="trade-layout">
    <PriceChart bind:this={chartRef} />
    <OrderPanel>
      <PositionsList />
      <PortfolioSummary />
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
