<script lang="ts">
  import type { AccountSummary } from '../api';

  interface Props {
    account: AccountSummary | null;
  }

  let { account }: Props = $props();

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
</script>

<div class="portfolio-summary">
  {#if account}
    <div class="port-row">
      <span class="port-label">NAV</span>
      <span class="port-value">{money.format(account.NAV)}</span>
    </div>
    <div class="port-row">
      <span class="port-label">Free margin</span>
      <span class="port-value">{money.format(account.MarginAvail)}</span>
    </div>
    <div class="port-row">
      <span class="port-label">Margin used</span>
      <span class="port-value" class:warning={account.MarginUsed > account.NAV * 0.5}>
        {money.format(account.MarginUsed)}
      </span>
    </div>
  {:else}
    <span class="empty">No account data.</span>
  {/if}
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
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .port-value.warning { color: var(--amber); }

  .empty {
    font-size: 12px;
    color: var(--text-faint);
  }
</style>
