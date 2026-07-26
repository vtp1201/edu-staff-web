"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ClassGradeFilter,
  ClassSort,
  ClassSortKey,
  ClassStatusFilter,
} from "./derive-visible-classes";

const ALL = "ALL";
const SORT_NONE = "NONE";

export interface ClassGradeOption {
  value: number;
  /** Already-translated, e.g. `t("gradeN", { n: value })`. */
  label: string;
}

export interface ClassFiltersBarProps {
  statusFilter: ClassStatusFilter;
  gradeFilter: ClassGradeFilter;
  nameSearch: string;
  gradeOptions: ClassGradeOption[];
  sort: ClassSort | null;
  hasActiveFilter: boolean;
  onStatusChange: (v: ClassStatusFilter) => void;
  onGradeChange: (v: ClassGradeFilter) => void;
  onNameSearchChange: (v: string) => void;
  onSortChange: (v: ClassSort | null) => void;
  onClearFilters: () => void;
  /** Pre-translated copy — this component is a pure prop-in/event-out leaf. */
  labels: {
    statusLabel: string;
    statusOptions: { active: string; archived: string; all: string };
    gradeLabel: string;
    allGradesLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    sortLabel: string;
    sortNone: string;
    sortByName: string;
    sortByGrade: string;
    sortAscAriaLabel: string;
    sortDescAriaLabel: string;
    clearFiltersLabel: string;
  };
}

/**
 * Client-side filter + sort controls (FR-003/004/005) — no network call.
 * Feature-local by design: every filter bar in this codebase is, because the
 * field set differs per screen (component-contracts.md §5).
 * One sort control drives BOTH the table and the card list, so sorting works
 * identically at every breakpoint (no table-header-click sort, which mobile
 * couldn't offer).
 */
export function ClassFiltersBar({
  statusFilter,
  gradeFilter,
  nameSearch,
  gradeOptions,
  sort,
  hasActiveFilter,
  onStatusChange,
  onGradeChange,
  onNameSearchChange,
  onSortChange,
  onClearFilters,
  labels,
}: ClassFiltersBarProps) {
  const statusId = useId();
  const gradeId = useId();
  const searchId = useId();
  const sortId = useId();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          className="font-bold text-foreground text-xs uppercase tracking-wide"
          htmlFor={statusId}
        >
          {labels.statusLabel}
        </label>
        <Select
          onValueChange={(v) => onStatusChange(v as ClassStatusFilter)}
          value={statusFilter}
        >
          <SelectTrigger className="w-40" id={statusId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">
              {labels.statusOptions.active}
            </SelectItem>
            <SelectItem value="ARCHIVED">
              {labels.statusOptions.archived}
            </SelectItem>
            <SelectItem value={ALL}>{labels.statusOptions.all}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="font-bold text-foreground text-xs uppercase tracking-wide"
          htmlFor={gradeId}
        >
          {labels.gradeLabel}
        </label>
        <Select
          onValueChange={(v) => onGradeChange(v === ALL ? ALL : Number(v))}
          value={gradeFilter === ALL ? ALL : String(gradeFilter)}
        >
          <SelectTrigger className="w-40" id={gradeId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{labels.allGradesLabel}</SelectItem>
            {gradeOptions.map((g) => (
              <SelectItem key={g.value} value={String(g.value)}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="font-bold text-foreground text-xs uppercase tracking-wide"
          htmlFor={searchId}
        >
          {labels.searchLabel}
        </label>
        <Input
          className="w-48"
          id={searchId}
          onChange={(e) => onNameSearchChange(e.target.value)}
          placeholder={labels.searchPlaceholder}
          type="search"
          value={nameSearch}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="font-bold text-foreground text-xs uppercase tracking-wide"
          htmlFor={sortId}
        >
          {labels.sortLabel}
        </label>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(v) =>
              onSortChange(
                v === SORT_NONE
                  ? null
                  : { key: v as ClassSortKey, dir: sort?.dir ?? "asc" },
              )
            }
            value={sort?.key ?? SORT_NONE}
          >
            <SelectTrigger className="w-40" id={sortId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SORT_NONE}>{labels.sortNone}</SelectItem>
              <SelectItem value="name">{labels.sortByName}</SelectItem>
              <SelectItem value="gradeLevel">{labels.sortByGrade}</SelectItem>
            </SelectContent>
          </Select>
          {sort && (
            <Button
              aria-label={
                sort.dir === "asc"
                  ? labels.sortAscAriaLabel
                  : labels.sortDescAriaLabel
              }
              onClick={() =>
                onSortChange({
                  key: sort.key,
                  dir: sort.dir === "asc" ? "desc" : "asc",
                })
              }
              size="icon"
              type="button"
              variant="outline"
            >
              {sort.dir === "asc" ? (
                <ArrowUpAZ aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDownAZ aria-hidden="true" className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilter && (
        <Button onClick={onClearFilters} type="button" variant="outline">
          {labels.clearFiltersLabel}
        </Button>
      )}
    </div>
  );
}
