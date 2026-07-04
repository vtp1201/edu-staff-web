"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind's `max-md` range (below the 768px `md` breakpoint). */
const MOBILE_QUERY = "(max-width: 767.98px)";

/**
 * US-E17.3 — SSR-safe mobile-viewport gate.
 *
 * Used ONLY to gate the `aria-hidden` HTML attribute on the off-screen messaging
 * pane (see `paneAriaHidden`) — an attribute CSS media queries cannot toggle. The
 * slide animation and its reduced-motion guard remain pure CSS (`motion-reduce:`),
 * so this `matchMedia` call does not conflict with AC-17.
 *
 * Defaults to `false` during SSR / first paint so the desktop layout never flashes
 * `aria-hidden` on a pane before hydration.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
