"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { cn } from "@/shared/utils";

export type StatusFilter = "all" | "pending" | "approved" | "rejected";

export interface StaffLeaveFiltersProps {
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

const FILTERS: StatusFilter[] = ["all", "pending", "approved", "rejected"];

const ACTIVE_TONE: Record<StatusFilter, string> = {
  all: "border-primary bg-primary/12 text-primary",
  pending: "border-edu-warning bg-edu-warning/15 text-edu-warning-foreground",
  approved: "border-edu-success bg-edu-success/15 text-edu-success-text",
  rejected: "border-edu-error bg-edu-error/15 text-edu-error-text",
};

export function StaffLeaveFilters({
  statusFilter,
  onStatusChange,
  counts,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: StaffLeaveFiltersProps) {
  const t = useTranslations("staffLeave.filters");
  const fromId = useId();
  const toId = useId();

  return (
    <div className="flex flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card">
      <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="sr-only">{t("all")}</legend>
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusChange(f)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-[var(--edu-radius-btn)] border px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? ACTIVE_TONE[f]
                  : "border-border text-edu-text-secondary hover:bg-muted",
              )}
            >
              {t(f)}
              <span
                className={cn(
                  "rounded-full px-2 text-xs font-extrabold tabular-nums",
                  active
                    ? "bg-background/60"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-end gap-3 border-t border-dashed border-border pt-3">
        <label htmlFor={fromId} className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("dateFrom")}
          </span>
          <input
            id={fromId}
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="min-h-11 rounded-[var(--edu-radius-btn)] border border-border bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label htmlFor={toId} className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("dateTo")}
          </span>
          <input
            id={toId}
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="min-h-11 rounded-[var(--edu-radius-btn)] border border-border bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
    </div>
  );
}
