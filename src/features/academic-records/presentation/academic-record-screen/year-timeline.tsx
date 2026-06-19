"use client";

import { useTranslations } from "next-intl";
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

  return (
    <div
      role="tablist"
      aria-label={t("yearTimeline.ariaLabel")}
      className="flex flex-wrap gap-2"
    >
      {years.map((year) => {
        const active = year.yearId === activeYearId;
        return (
          <button
            key={year.yearId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(year.yearId)}
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
