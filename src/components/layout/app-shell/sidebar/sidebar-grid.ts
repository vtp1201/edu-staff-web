import type * as React from "react";

/**
 * DR-009 US-E16.4 — single-track grid sizing for the sidebar wrapper. Animating
 * `grid-template-columns` is GPU-composited, unlike the previous `width`
 * transition. Track width stays token-driven via the sidebar CSS vars
 * (260px expanded / 72px collapsed). Kept in a framework-free module so it can
 * be unit-tested in the node test env (sidebar.tsx pulls client-only imports).
 */
export function sidebarGridStyle(collapsed: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: collapsed
      ? "var(--edu-sidebar-width-collapsed, 72px)"
      : "var(--edu-sidebar-width, 260px)",
  };
}
