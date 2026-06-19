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
            aria-controls={`tabpanel-${year.yearId}`}
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
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {year.yearLabel}
              </span>
              {year.isCurrent && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
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
