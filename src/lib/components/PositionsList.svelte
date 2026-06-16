<script lang="ts">
  import { openPositions } from '../data/mockData';
</script>

<div class="panel-section positions-section">
  <h2 class="panel-title">Open positions</h2>
  <div class="positions-list">
    {#each openPositions as pos}
      <div class="position-item">
        <div class="pos-top">
          <span class="pos-symbol">{pos.symbol}</span>
          <span class="pos-pnl" class:positive={pos.pnlTone === 'positive'} class:negative={pos.pnlTone === 'negative'}>
            {pos.pnl}
          </span>
        </div>
        <div class="pos-detail">
          <span class="pos-side" class:long={pos.side === 'LONG'} class:short={pos.side === 'SHORT'}>
            {pos.side} {pos.qty}
          </span>
          <span class="pos-avg">avg ${pos.avgPrice}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .panel-section {
    padding: 12px 12px 14px;
    border-bottom: 0.5px solid var(--border);
  }

  .positions-section {
    flex: 1;
  }

  .panel-title {
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .positions-list {
    display: flex;
    flex-direction: column;
  }

  .position-item {
    padding: 9px 0;
    border-bottom: 0.5px solid var(--border-light);
  }

  .position-item:last-child { border-bottom: none; }

  .pos-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }

  .pos-symbol {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .pos-pnl {
    font-size: 13px;
    font-weight: 500;
  }

  .pos-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pos-side {
    font-size: 11px;
    font-weight: 500;
  }

  .pos-side.long { color: var(--green-bright); }
  .pos-side.short { color: var(--red-bright); }

  .pos-avg {
    font-size: 11px;
    color: var(--text-hint);
  }
</style>
