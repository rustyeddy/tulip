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

export interface AccountInfo {
  id: string;
  is_default: boolean;
}

export const accountState = $state<{ accounts: AccountInfo[]; activeIndex: number }>({
  accounts: [],
  activeIndex: 0,
});

export async function initAccounts(): Promise<void> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/v1/accounts`);
    if (!res.ok) return;
    const data = await res.json();
    accountState.accounts = data.accounts ?? [];
    const defaultIdx = accountState.accounts.findIndex((a) => a.is_default);
    if (defaultIdx >= 0) accountState.activeIndex = defaultIdx;
  } catch { /* backend offline */ }
}

export function cycleAccount(): void {
  if (accountState.accounts.length === 0) return;
  accountState.activeIndex = (accountState.activeIndex + 1) % accountState.accounts.length;
}

export function activeAccountId(): string {
  return accountState.accounts[accountState.activeIndex]?.id ?? '';
}

export function activeAccountLabel(): string {
  const acc = accountState.accounts[accountState.activeIndex];
  return acc ? acc.id : 'No account';
}
