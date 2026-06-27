<script lang="ts">
  import type { OpenTrade } from '../api';

  interface Props {
    trades: OpenTrade[];
  }

  let { trades }: Props = $props();

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
</script>

<div class="panel-section positions-section">
  <h2 class="panel-title">Open positions</h2>
  <div class="positions-list">
    {#if trades.length === 0}
      <span class="empty">No open positions.</span>
    {:else}
      {#each trades as t (t.ID)}
        <div class="position-item">
          <div class="pos-top">
            <span class="pos-symbol">{t.Instrument}</span>
            <span class="pos-pnl" class:positive={t.UnrealizedPL >= 0} class:negative={t.UnrealizedPL < 0}>
              {money.format(t.UnrealizedPL)}
            </span>
          </div>
          <div class="pos-detail">
            <span class="pos-side" class:long={t.Units > 0} class:short={t.Units < 0}>
              {t.Units > 0 ? 'LONG' : 'SHORT'} {Math.abs(t.Units).toLocaleString()}
            </span>
            <span class="pos-avg">avg {t.EntryPrice.toFixed(5)}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .panel-section {
    padding: 12px 12px 14px;
    border-bottom: 0.5px solid var(--border);
  }

  .positions-section {
    flex: 1;
    overflow-y: auto;
  }

  .panel-title {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .positions-list {
    display: flex;
    flex-direction: column;
  }

  .empty {
    font-size: 13px;
    color: var(--text-faint);
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

  .pos-side.long  { color: var(--green-bright); }
  .pos-side.short { color: var(--red-bright); }

  .pos-avg {
    font-size: 11px;
    color: var(--text-hint);
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .positive { color: var(--green-mid); }
  .negative { color: var(--red-bright); }
</style>
