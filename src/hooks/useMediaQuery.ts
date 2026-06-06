import { useState, useEffect } from 'react';

/**
 * Reactive matchMedia hook. Returns whether the given media query currently
 * matches, updating on change (orientation, resize, devtools toggle).
 *
 * SSR-safe: returns `false` when `window` is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Sync immediately in case the query changed between render and effect.
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * The single source of truth for "is this a phone-sized viewport".
 *
 * Standardised on the Tailwind `md` breakpoint (768px): below it we render the
 * dedicated mobile layouts (bottom-sheet inventory, stacked editor, bottom nav).
 * Use this everywhere instead of ad-hoc `window.innerWidth` reads.
 */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * Whether the primary pointer is coarse (finger / stylus) rather than a mouse.
 *
 * This is orthogonal to viewport size — a small laptop window is NOT coarse, and
 * a large tablet IS. Use it to gate touch-only affordances (on-screen rotate /
 * delete controls, always-visible card actions) so they appear for real touch
 * devices regardless of width, and stay hidden for mouse users.
 */
export function useIsTouch(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
