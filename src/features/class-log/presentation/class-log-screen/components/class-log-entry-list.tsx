"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type { HomeroomEntry } from "../../../domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "../../../domain/entities/homeroom-entry-status.entity";
import { STATUS_TONE } from "../status-tone";

const ALL_STATUSES: HomeroomEntryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

/** Left status bar color (token bg-edu-*). */
const STATUS_BAR: Record<HomeroomEntryStatus, string> = {
  DRAFT: "bg-muted-foreground/40",
  SUBMITTED: "bg-edu-warning",
  APPROVED: "bg-edu-success",
  REJECTED: "bg-edu-error",
};

type Props = {
  entries: HomeroomEntry[];
  filterStatus?: HomeroomEntryStatus;
  onFilterChange: (status?: HomeroomEntryStatus) => void;
  onSelect: (entry: HomeroomEntry) => void;
};

export function ClassLogEntryList({
  entries,
  filterStatus,
  onFilterChange,
  onSelect,
}: Props) {
  const t = useTranslations("classLog");
  const filtered = filterStatus
    ? entries.filter((e) => e.status === filterStatus)
    : entries;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter chips */}
      <fieldset className="flex flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t("list.title")}</legend>
        <FilterChip
          active={!filterStatus}
          label={t("list.filterAll")}
          onClick={() => onFilterChange(undefined)}
        />
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={filterStatus === s}
            label={t(`status.${s}`)}
            onClick={() => onFilterChange(s)}
          />
        ))}
      </fieldset>

      {filtered.length === 0 ? (
        <div
          role="status"
          className="rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-12 text-center text-sm text-edu-text-secondary"
        >
          {t("list.empty")}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <li key={entry.entryId}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={cn(
                  "flex w-full items-center gap-4 overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card py-4 pr-5 pl-0 text-left shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-12 w-1 shrink-0 rounded-full",
                    STATUS_BAR[entry.status],
                  )}
                />
                <span className="w-24 shrink-0 text-xs font-bold text-edu-text-secondary tabular-nums">
                  {entry.entryDate}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-sm text-foreground">
                  {entry.summary}
                </span>
                <StatusBadge tone={STATUS_TONE[entry.status]}>
                  {t(`status.${entry.status}`)}
                </StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "bg-edu-primary-accessible hover:bg-edu-primary-accessible/90"
          : undefined
      }
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
