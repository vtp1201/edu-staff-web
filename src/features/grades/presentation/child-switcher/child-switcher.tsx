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

/** Maps design-token color name → CSS variable string. */
const COLOR_VAR: Record<ChildColor, string> = {
  primary: "var(--edu-primary)",
  success: "var(--edu-success)",
  warning: "var(--edu-warning)",
  error: "var(--edu-error)",
  purple: "var(--edu-purple)",
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
      onSwitch(childList[idx].childId);
    }
  }

  return (
    <div className="rounded-[12px] border border-border bg-card p-4">
      <p
        id="child-switcher-label"
        className="mb-3 font-bold text-muted-foreground text-xs uppercase tracking-wider"
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
              disabled={isLoading && !isActive}
              onClick={() => onSwitch(child.childId)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-[10px] border px-3 py-2 text-left",
                "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-60",
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
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full font-bold text-[10px] text-white"
                style={{ backgroundColor: colorVar }}
                aria-hidden="true"
              >
                {child.avatar}
              </span>
              <span className="flex flex-col">
                <span className="font-[800] text-[12.5px] text-foreground leading-tight">
                  {child.name}
                </span>
                <span className="text-[10.5px] text-muted-foreground leading-tight">
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
