"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type {
  StaffApprovalState,
  StaffViolationSeverity,
} from "../../domain/entities/staff-violation.entity";

/**
 * Violations filter bar — principal only (the container decides whether to render
 * it at all; this component stays dumb/controlled). Both filters are CLIENT-SIDE
 * narrowing (spec §8 OQ3) — they never touch the query key.
 *
 * A11y: `aria-pressed` toggle buttons inside a `fieldset`/`legend` (Biome rejects
 * `role="radio"`/`role="group"` on div/button — established repo pattern).
 */
export type StateFilter = StaffApprovalState | "all";
export type SeverityFilter = StaffViolationSeverity | "all";

const STATES: StateFilter[] = [
  "all",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];
const SEVERITIES: SeverityFilter[] = ["all", "MINOR", "MODERATE", "SEVERE"];

const STATE_LABEL_KEY = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

const SEVERITY_LABEL_KEY = {
  MINOR: "low",
  MODERATE: "medium",
  SEVERE: "high",
} as const;

export interface SDViolationFilterBarProps {
  stateFilter: StateFilter;
  severityFilter: SeverityFilter;
  onStateFilterChange: (value: StateFilter) => void;
  onSeverityFilterChange: (value: SeverityFilter) => void;
  onOpenCreateDialog: () => void;
}

export function SDViolationFilterBar({
  stateFilter,
  severityFilter,
  onStateFilterChange,
  onSeverityFilterChange,
  onOpenCreateDialog,
}: SDViolationFilterBarProps) {
  const t = useTranslations("staffDiscipline.violations");
  const tStatus = useTranslations("staffDiscipline.violations.status");
  const tSeverity = useTranslations("staffDiscipline.violations.severity");

  return (
    <div className="flex flex-col gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 font-extrabold text-[11px] text-muted-foreground uppercase tracking-wide">
            {t("filters.state")}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {STATES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={stateFilter === value}
                onClick={() => onStateFilterChange(value)}
                className={cn(
                  "min-h-11 rounded-full border px-3 py-1 font-bold text-xs",
                  stateFilter === value
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-background text-edu-text-secondary hover:bg-muted",
                )}
              >
                {value === "all"
                  ? t("filters.all")
                  : tStatus(STATE_LABEL_KEY[value])}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-1.5 font-extrabold text-[11px] text-muted-foreground uppercase tracking-wide">
            {t("filters.severity")}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={severityFilter === value}
                onClick={() => onSeverityFilterChange(value)}
                className={cn(
                  "min-h-11 rounded-full border px-3 py-1 font-bold text-xs",
                  severityFilter === value
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-background text-edu-text-secondary hover:bg-muted",
                )}
              >
                {value === "all"
                  ? t("filters.all")
                  : tSeverity(SEVERITY_LABEL_KEY[value])}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <Button type="button" onClick={onOpenCreateDialog} className="min-h-11">
        <Plus className="size-4" aria-hidden="true" />
        {t("addNew")}
      </Button>
    </div>
  );
}
