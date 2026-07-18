"use client";

import { useEffect, useState } from "react";

/** Below the design-spec's 820px card-list breakpoint (`table.mobileVariant`). */
const MOBILE_QUERY = "(max-width: 819.98px)";

/**
 * SSR-safe viewport gate — picks the table (≥820px) vs card list (<820px).
 * Defaults to `false` during SSR so the desktop table never flashes before
 * hydration; the initial client value is read synchronously from `matchMedia`.
 * Feature-local (different breakpoint from messaging's `use-is-mobile`).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(MOBILE_QUERY).matches
      : false,
  );

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
