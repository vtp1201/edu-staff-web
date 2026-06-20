"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef } from "react";
import { cn } from "@/shared/utils";
import type { ChildColor } from "../../domain/entities/grade-book.entity";
import type { ChildSwitcherVM } from "./child-switcher.i-vm";

interface ChildSwitcherProps extends ChildSwitcherVM {
  onSwitch: (childId: string) => void;
  isLoading?: boolean;
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
}: ChildSwitcherProps) {
  const t = useTranslations("gradeBook");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
        id="child-switcher-label"
        className="mb-3 font-bold text-edu-text-secondary text-xs uppercase tracking-wider"
      >
        {t("childSwitcherLabel")}
      </p>
      <div
        role="tablist"
        aria-labelledby="child-switcher-label"
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
              aria-controls={`tabpanel-${child.childId}`}
              id={`tab-${child.childId}`}
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
                <span className="font-[800] text-[12.5px] text-foreground leading-tight">
                  {child.name}
                </span>
                <span className="text-[10.5px] text-edu-text-secondary leading-tight">
                  {child.className}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
