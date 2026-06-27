<script lang="ts">
  import { navState, PAGE_TITLES, accountState, cycleAccount, activeAccountLabel } from '../stores/nav.svelte';
  import { themeStore } from '../stores/theme.svelte';

  interface Props {
    onRefresh: () => void;
  }

  let { onRefresh }: Props = $props();
</script>

<header class="topbar">
  <span class="page-title">{PAGE_TITLES[navState.currentPage]}</span>
  <div class="topbar-actions">
    <button class="account-switcher" onclick={cycleAccount} aria-label="Switch account">
      <i class="ti ti-building-bank" aria-hidden="true"></i>
      <span>{activeAccountLabel()}</span>
      <i class="ti ti-chevron-down" aria-hidden="true"></i>
    </button>
    <button class="icon-btn" onclick={onRefresh} aria-label="Refresh data">
      <i class="ti ti-refresh" aria-hidden="true"></i>
    </button>
    <button class="icon-btn" onclick={themeStore.toggle} aria-label="Toggle theme">
      <i class="ti {themeStore.current === 'dark' ? 'ti-sun' : 'ti-moon'}" aria-hidden="true"></i>
    </button>
    <button class="icon-btn" aria-label="Alerts">
      <i class="ti ti-bell" aria-hidden="true"></i>
    </button>
  </div>
</header>

<style>
  .topbar {
    height: var(--topbar-h);
    background: var(--bg-sidebar);
    border-bottom: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 10px;
    flex-shrink: 0;
  }

  .page-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .account-switcher {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-hover);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 5px 10px;
    font-size: 12px;
    color: var(--text-secondary);
    transition: background 0.1s;
  }

  .account-switcher:hover {
    background: var(--bg-card);
  }

  .account-switcher i {
    font-size: 14px;
    color: var(--text-muted);
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: background 0.1s, color 0.1s;
  }

  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .icon-btn i {
    font-size: 16px;
  }
</style>
