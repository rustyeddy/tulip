type Theme = 'dark' | 'light';

function createThemeStore() {
  const stored = (typeof localStorage !== 'undefined'
    ? localStorage.getItem('theme')
    : null) as Theme | null;

  let current = $state<Theme>(stored ?? 'dark');

  return {
    get current() { return current; },
    toggle() {
      current = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', current);
      document.documentElement.setAttribute('data-theme', current);
    },
    init() {
      document.documentElement.setAttribute('data-theme', current);
    },
  };
}

export const themeStore = createThemeStore();
