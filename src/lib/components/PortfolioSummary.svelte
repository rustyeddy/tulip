<script lang="ts">
  import { portfolioSummary } from '../data/mockData';
</script>

<div class="portfolio-summary">
  {#each portfolioSummary as row}
    <div class="port-row">
      <span class="port-label">{row.label}</span>
      <span class="port-value" class:warning={row.tone === 'warning'}>{row.value}</span>
    </div>
  {/each}
</div>

<style>
  .portfolio-summary {
    padding: 10px 12px;
    border-top: 0.5px solid var(--border);
    flex-shrink: 0;
  }

  .port-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 0.5px solid var(--border-light);
  }

  .port-row:last-child { border-bottom: none; }

  .port-label {
    font-size: 12px;
    color: var(--text-hint);
  }

  .port-value {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }
</style>
