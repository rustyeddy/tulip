<script lang="ts">
  import Sidebar from './lib/components/Sidebar.svelte';
  import Topbar from './lib/components/Topbar.svelte';
  import LiveTradePage from './lib/components/LiveTradePage.svelte';
  import PlaceholderPage from './lib/components/PlaceholderPage.svelte';
  import { navState } from './lib/stores/nav.svelte';

  let liveTradeRef: ReturnType<typeof LiveTradePage> | undefined;

  function handleRefresh(): void {
    liveTradeRef?.refreshChart?.();
  }

  interface PlaceholderDef {
    icon: string;
    title: string;
    subtitle: string;
  }

  const placeholders: Record<string, PlaceholderDef> = {
    chart:       { icon: 'ti-chart-line',  title: 'Chart',      subtitle: 'Full-screen charting view' },
    backtests:   { icon: 'ti-flask',       title: 'Backtests',  subtitle: 'Strategy backtesting results' },
    strategies:  { icon: 'ti-code',        title: 'Strategies', subtitle: 'Strategy builder and editor' },
    data:        { icon: 'ti-database',    title: 'Data',       subtitle: 'Data feeds and sources' },
    account:     { icon: 'ti-user-circle', title: 'Account',    subtitle: 'Broker connections and account settings' },
    admin:       { icon: 'ti-settings',    title: 'Admin',      subtitle: 'Platform administration' },
  };
</script>

<div class="app">
  <Sidebar />

  <div class="main">
    <Topbar onRefresh={handleRefresh} />

    <div class="content">
      {#if navState.currentPage === 'live-trade'}
        <LiveTradePage bind:this={liveTradeRef} />
      {:else if placeholders[navState.currentPage]}
        {@const p = placeholders[navState.currentPage]}
        <PlaceholderPage icon={p.icon} title={p.title} subtitle={p.subtitle} />
      {/if}
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
</style>
