import { useCallback, useEffect, useState } from 'react';

/** 'system' follows the OS setting; the others pin it. Stored in localStorage as 'theme'. */
export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'theme';
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

function readMode(): ThemeMode {
  const stored = localStorage.getItem(KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Mirrors the inline script in index.html, which applies the stored mode before first paint. */
function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
}

export function useTheme(): { mode: ThemeMode; next: ThemeMode; cycle: () => void } {
  const [mode, setMode] = useState<ThemeMode>(readMode);

  useEffect(() => {
    applyMode(mode);
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  }, [mode]);

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const cycle = useCallback(() => setMode(next), [next]);
  return { mode, next, cycle };
}
