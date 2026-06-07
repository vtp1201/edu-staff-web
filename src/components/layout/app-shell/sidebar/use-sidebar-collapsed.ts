"use client";

import { useCallback, useEffect, useState } from "react";
import { readCollapsed, writeCollapsed } from "./sidebar-collapse";

/**
 * Sidebar collapse state, hydrated from `localStorage` after mount (avoids an
 * SSR/client mismatch — the server always renders expanded). Toggling persists.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed(window.localStorage));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(window.localStorage, next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
