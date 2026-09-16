"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef } from "react";
import { cn } from "@/shared/utils";
import type { ChildColor, ChildSwitcherVM } from "./child-switcher.i-vm";

interface ChildSwitcherProps extends ChildSwitcherVM {
  onSwitch: (childId: string) => void;
  isLoading?: boolean;
  /**
   * Namespace for every DOM id this component emits (US-E24.18 #11). Defaults
   * to `""`, i.e. the historical `tab-<childId>` / `tabpanel-<childId>` /
   * `child-switcher-label` scheme, so existing consumers need no change.
   *
   * A page rendering ≥2 `ChildSwitcher` instances MUST pass a DISTINCT
   * `idPrefix` to each — otherwise both emit the same ids and `aria-labelledby`
   * / `aria-controls` resolve to whichever came first in the document.
   * When you pass one, build the panel's id with `childSwitcherIds(prefix)`
   * rather than re-deriving the string.
   */
  idPrefix?: string;
}

/**
 * The single source of the ids this component emits — exported so a consumer
 * builds its tabpanel id from the SAME function the tab uses, instead of
 * duplicating the template literal.
 */
export function childSwitcherIds(idPrefix = "") {
  return {
    label: `${idPrefix}child-switcher-label`,
    tab: (childId: string) => `${idPrefix}tab-${childId}`,
    panel: (childId: string) => `${idPrefix}tabpanel-${childId}`,
  };
}

/** Maps design-token color name → CSS variable string (avatar background). */
const COLOR_VAR: Record<ChildColor, string> = {
  primary: "var(--edu-primary-accessible)", // 4.88:1 vs white (was --edu-primary 3.29:1 FAIL)
  success: "var(--edu-success)",
  warning: "var(--edu-warning)",
  error: "var(--edu-error)",
  purple: "var(--edu-purple)",
};

/** Per-color avatar foreground — ensures ≥4.5:1 on its background (WCAG 1.4.3). */
const COLOR_TEXT: Record<ChildColor, string> = {
  primary: "#ffffff", // 4.88:1 on --edu-primary-accessible
  success: "var(--edu-text-primary)", // #2a3547 → 7.17:1 on #13deb9
  warning: "var(--edu-warning-foreground)", // #2a3547 → 6.67:1 on #ffae1f
  error: "var(--edu-text-primary)", // #2a3547 → 5.21:1 on #fa896b
  purple: "#ffffff", // 5.25:1 on --edu-purple
};

export function ChildSwitcher({
  childList,
  activeChildId,
  onSwitch,
  isLoading = false,
  idPrefix = "",
}: ChildSwitcherProps) {
  // Shared UI atom → shared namespace: a `components/shared/` component cannot
  // own a feature namespace (`gradeBook`), so the label lives in `Common`.
  const t = useTranslations("Common");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ids = childSwitcherIds(idPrefix);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next =
        e.key === "ArrowRight"
          ? (idx + 1) % childList.length
          : (idx - 1 + childList.length) % childList.length;
      tabRefs.current[next]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const c = childList[idx];
      const blocked = isLoading && c.childId !== activeChildId;
      if (!blocked) onSwitch(c.childId);
    }
  }

  return (
    <div className="rounded-[12px] border border-border bg-card p-4">
      <p
        id={ids.label}
        className="mb-3 font-bold text-edu-text-secondary text-xs uppercase tracking-wider"
      >
        {t("childSwitcherLabel")}
      </p>
      <div
        role="tablist"
        aria-labelledby={ids.label}
        className="flex flex-wrap gap-2"
      >
        {childList.map((child, idx) => {
          const isActive = child.childId === activeChildId;
          const colorVar = COLOR_VAR[child.color] ?? "var(--edu-primary)";
          return (
            <button
              key={child.childId}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              aria-selected={isActive}
              // Only the ACTIVE child has a panel in the DOM — every consumer
              // mounts exactly one. Emitting `aria-controls` on the inactive
              // tabs pointed at ids that exist nowhere (WCAG 4.1.2, A11Y-002 of
              // the US-E24.16 review); `aria-controls` is optional per tab, a
              // dangling one is not. `id` stays on EVERY tab — the panel's
              // `aria-labelledby` needs it.
              aria-controls={isActive ? ids.panel(child.childId) : undefined}
              id={ids.tab(child.childId)}
              tabIndex={isActive ? 0 : -1}
              type="button"
              aria-disabled={isLoading && !isActive}
              onClick={() => {
                if (isLoading && !isActive) return;
                onSwitch(child.childId);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-[10px] border px-3 py-2 text-left",
                "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isLoading && !isActive && "cursor-not-allowed opacity-60",
              )}
              style={
                isActive
                  ? {
                      borderColor: colorVar,
                      borderWidth: "1.5px",
                      backgroundColor: `color-mix(in srgb, ${colorVar} 8%, transparent)`,
                    }
                  : {
                      borderColor: "var(--edu-border)",
                      borderWidth: "1.5px",
                      backgroundColor: "var(--edu-card)",
                    }
              }
            >
              {/* Avatar circle */}
              <span
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full font-bold text-[10px]"
                style={{
                  backgroundColor: colorVar,
                  color: COLOR_TEXT[child.color],
                }}
                aria-hidden="true"
              >
                {child.avatar}
              </span>
              <span className="flex flex-col">
                {/* Real mode can hand us a child whose display name IAM could
                    not resolve — fall back to a STABLE ordinal label, never a
                    raw memberId (that uuid would become this tab's accessible
                    name) and never a blank tab. Same degradation as the sibling
                    `ChildPicker` (US-E18.33 review). */}
                <span className="font-[800] text-[12.5px] text-foreground leading-tight">
                  {child.name ??
                    t("childOrdinalLabel", { ordinal: child.ordinal })}
                </span>
                <span className="text-[10.5px] text-edu-text-secondary leading-tight">
                  {child.className || t("classPending")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
