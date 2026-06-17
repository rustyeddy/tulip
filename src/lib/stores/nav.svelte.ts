/**
 * nav.svelte.ts — global navigation state
 *
 * Uses Svelte 5 runes ($state) so any component can import
 * `navState` and read/write the current page reactively.
 */

export type NavSection = 'Trading' | 'Setup' | 'System';

export interface NavPage {
  key: string;
  label: string;
  icon: string;
  section: NavSection;
  live?: boolean;
  badge?: number;
}

export const PAGES: NavPage[] = [
  { key: 'dashboard',  label: 'Dashboard',  icon: 'ti-layout-dashboard', section: 'Trading' },
  { key: 'live-trade', label: 'Live trade', icon: 'ti-player-play', section: 'Trading' },
  { key: 'trades',     label: 'Trades',     icon: 'ti-list',        section: 'Trading' },
  { key: 'chart',      label: 'Chart',      icon: 'ti-chart-line',  section: 'Trading' },
  { key: 'backtests',  label: 'Backtests',  icon: 'ti-flask',       section: 'Trading', badge: 4 },
  { key: 'replay',     label: 'Replay',     icon: 'ti-player-play-filled', section: 'Trading' },
  { key: 'strategies', label: 'Strategies', icon: 'ti-code',        section: 'Setup' },
  { key: 'data',       label: 'Data',       icon: 'ti-database',    section: 'Setup' },
  { key: 'account',    label: 'Account',    icon: 'ti-user-circle', section: 'System' },
  { key: 'admin',      label: 'Admin',      icon: 'ti-settings',    section: 'System' },
];

export type PageKey = (typeof PAGES)[number]['key'];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  PAGES.map((p) => [p.key, p.label])
);

function readInitialPage(): string {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  return PAGE_TITLES[hash] ? hash : 'dashboard';
}

export const navState = $state<{ currentPage: string }>({
  currentPage: readInitialPage(),
});

export function navigateTo(pageKey: string): void {
  if (!PAGE_TITLES[pageKey]) return;
  navState.currentPage = pageKey;
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', '#' + pageKey);
  }
}

export const accountState = $state<{ accounts: string[]; activeIndex: number }>({
  accounts: ['Alpaca — Main', 'Alpaca — Paper', 'Interactive Brokers'],
  activeIndex: 0,
});

export function cycleAccount(): void {
  accountState.activeIndex = (accountState.activeIndex + 1) % accountState.accounts.length;
}

export function activeAccountLabel(): string {
  return accountState.accounts[accountState.activeIndex];
}
