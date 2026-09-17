"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { cn } from "@/shared/utils";
import type { AcademicYear } from "../../domain/entities/academic-record.entity";

export interface YearTimelineProps {
  years: AcademicYear[];
  activeYearId: string;
  onChange: (id: string) => void;
}

/** Horizontal year selector. Tablist semantics: each year is a `tab`. */
export function YearTimeline({
  years,
  activeYearId,
  onChange,
}: YearTimelineProps) {
  const t = useTranslations("academicRecord");
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    let next: number;
    switch (e.key) {
      case "ArrowRight":
        next = (currentIndex + 1) % years.length;
        break;
      case "ArrowLeft":
        next = (currentIndex - 1 + years.length) % years.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = years.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    buttonRefs.current[next]?.focus();
    onChange(years[next].yearId);
  }

  return (
    <div
      role="tablist"
      aria-label={t("yearTimeline.ariaLabel")}
      className="flex flex-wrap gap-2"
    >
      {years.map((year, index) => {
        const active = year.yearId === activeYearId;
        return (
          <button
            key={year.yearId}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${year.yearId}`}
            // Only the ACTIVE year has a panel in the DOM — the screen mounts
            // exactly one (`tabpanel-${activeYear.yearId}`). Emitting
            // `aria-controls` on the inactive tabs pointed at ids that exist
            // nowhere (WCAG 4.1.2, US-E24.19 #15 — the same defect closed for
            // `ChildSwitcher` in US-E24.18 #11); `aria-controls` is optional per
            // tab, a dangling one is not. `id` stays on EVERY tab — the panel's
            // `aria-labelledby` needs it.
            aria-controls={active ? `tabpanel-${year.yearId}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(year.yearId)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border px-4 py-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-bold",
                  // Harness backlog #16 (sibling of US-E24.19 #3): computed
                  // ~3.65:1 light / ~3.52:1 dark on the `bg-primary/10` active
                  // background — already over the 3:1 large-bold-text floor,
                  // not an actual violation, but swapped to the established
                  // accessible pairing anyway as a margin improvement (same
                  // idiom as #3: `text-edu-primary-accessible` light,
                  // `dark:text-edu-primary` dark).
                  active
                    ? "text-edu-primary-accessible dark:text-edu-primary"
                    : "text-foreground",
                )}
              >
                {/* `null` = the classId → academic-year join did not resolve
                    (US-E18.54). Label it honestly; never invent a year. */}
                {year.yearLabel ?? t("yearTimeline.unresolvedLabel")}
              </span>
              {year.isCurrent && (
                <span
                  // Harness backlog #16: 11px text is SMALL text (floor
                  // 4.5:1) — computed ~3.66:1 light / ~2.94:1 dark with
                  // `text-primary`, a genuine AA failure.
                  // `text-edu-primary-accessible` only reaches ~4.05:1 here,
                  // still short of 4.5:1; `text-edu-text-primary` is the fix
                  // `status-badge.tsx` already established for exactly this
                  // shape (tone="primary", A11Y-001) — 11.5:1+ on any light
                  // tint, and already theme-aware (no dark: needed).
                  className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-edu-text-primary"
                >
                  {t("yearTimeline.currentBadge")}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(`yearStatus.${year.sealStatus}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
