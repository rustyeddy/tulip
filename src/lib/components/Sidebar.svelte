<script lang="ts">
  import { PAGES, navState, navigateTo, type NavSection } from '../stores/nav.svelte';

  const sections: NavSection[] = [...new Set(PAGES.map((p) => p.section))];

  function itemsFor(section: NavSection) {
    return PAGES.filter((p) => p.section === section);
  }
</script>

<aside class="sidebar">
  <div class="logo-area">
    <div class="logo">
      <div class="logo-icon">
        <i class="ti ti-chart-candle" aria-hidden="true"></i>
      </div>
      <div class="logo-text">
        <span class="logo-name">Tulip</span>
        <span class="logo-sub">trader platform</span>
      </div>
    </div>
  </div>

  <nav aria-label="Main navigation">
    {#each sections as section}
      <span class="nav-section-label">{section}</span>
      {#each itemsFor(section) as item}
        <a
          class="nav-item"
          class:active={navState.currentPage === item.key}
          href={'#' + item.key}
          onclick={(e: MouseEvent) => { e.preventDefault(); navigateTo(item.key); }}
        >
          <i class="ti {item.icon}" aria-hidden="true"></i>
          {item.label}
          {#if item.live}
            <span class="live-dot" aria-label="Connected"></span>
          {/if}
          {#if item.badge}
            <span class="nav-badge">{item.badge}</span>
          {/if}
        </a>
      {/each}
    {/each}
  </nav>

  <div class="sidebar-footer">
    <span class="connection-status connected">
      <i class="ti ti-wifi" aria-hidden="true"></i>
      Connected
    </span>
  </div>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-w);
    min-width: var(--sidebar-w);
    background: var(--bg-sidebar);
    border-right: 0.5px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .logo-area {
    padding: 18px 14px 14px;
    border-bottom: 0.5px solid var(--border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    background: var(--purple-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .logo-icon i {
    font-size: 16px;
    color: #fff;
  }

  .logo-text {
    display: flex;
    flex-direction: column;
  }

  .logo-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    line-height: 1.2;
  }

  .logo-sub {
    font-size: 10px;
    color: var(--text-faint);
    margin-top: 1px;
  }

  nav {
    flex: 1;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;
  }

  .nav-section-label {
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 12px 8px 5px;
    display: block;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-size: 13px;
    transition: background 0.1s, color 0.1s;
  }

  .nav-item i {
    font-size: 17px;
    flex-shrink: 0;
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .nav-item.active {
    background: var(--purple-tint);
    color: var(--purple-bright);
  }

  .nav-item.active i {
    color: var(--purple-mid);
  }

  .nav-badge {
    margin-left: auto;
    font-size: 10px;
    background: var(--purple-dark);
    color: var(--purple-bright);
    border-radius: 20px;
    padding: 1px 6px;
    line-height: 1.6;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green-mid);
    margin-left: auto;
    flex-shrink: 0;
  }

  .sidebar-footer {
    padding: 10px 8px;
    border-top: 0.5px solid var(--border);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    font-size: 12px;
    border-radius: var(--radius-md);
    color: var(--text-faint);
  }

  .connection-status.connected {
    color: var(--green-mid);
  }

  .connection-status i {
    font-size: 14px;
  }

  @media (max-width: 680px) {
    .sidebar { width: 52px; min-width: 52px; }
    .logo-text, .nav-section-label { display: none; }
    .nav-item { justify-content: center; padding: 10px; }
    .logo-area { padding: 12px 10px; display: flex; justify-content: center; }
  }
</style>
