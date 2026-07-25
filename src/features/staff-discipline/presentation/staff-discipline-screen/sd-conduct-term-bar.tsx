"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffDisciplineTermOption } from "./staff-discipline-screen.i-vm";

/**
 * Term + staff filter bar — PRINCIPAL ONLY (design-spec
 * `conductNotesTab.termSelector.visibleFor: "principal only"`; the teacher's
 * self-view renders nothing here at all, AC-006.3, not a disabled control).
 *
 * `termId` is a real server param (changing it re-queries INT-006, AC-006.6);
 * the staff filter is client-side narrowing only.
 */
export interface SDConductTermBarProps {
  termOptions: StaffDisciplineTermOption[];
  termId: string;
  staffFilter: string;
  staffOptions: StaffRosterEntry[];
  /** Inline term-selector error (e.g. term-not-found, AC-006.8), translated. */
  termErrorMessage?: string;
  onTermChange: (termId: string) => void;
  onStaffFilterChange: (staffMemberId: string) => void;
  onOpenSetDialog: () => void;
}

export function SDConductTermBar({
  termOptions,
  termId,
  staffFilter,
  staffOptions,
  termErrorMessage,
  onTermChange,
  onStaffFilterChange,
  onOpenSetDialog,
}: SDConductTermBarProps) {
  const t = useTranslations("staffDiscipline.conductNotes");
  const tAll = useTranslations("staffDiscipline.violations.filters");
  const termFieldId = useId();
  const termErrorId = useId();
  const staffFieldId = useId();

  return (
    <div className="flex flex-col gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor={termFieldId}
            className="font-extrabold text-[11px] text-muted-foreground uppercase tracking-wide"
          >
            {t("filters.term")}
          </label>
          <Select value={termId} onValueChange={onTermChange}>
            <SelectTrigger
              id={termFieldId}
              aria-invalid={Boolean(termErrorMessage)}
              aria-describedby={termErrorMessage ? termErrorId : undefined}
              className="min-h-11 sm:w-56"
            >
              <SelectValue placeholder={t("filters.term")} />
            </SelectTrigger>
            <SelectContent className="pointer-events-auto">
              {termOptions.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {termErrorMessage && (
            <p
              id={termErrorId}
              role="alert"
              className="font-semibold text-edu-error-text text-xs"
            >
              {termErrorMessage}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor={staffFieldId}
            className="font-extrabold text-[11px] text-muted-foreground uppercase tracking-wide"
          >
            {t("filters.staffMember")}
          </label>
          <Select value={staffFilter} onValueChange={onStaffFilterChange}>
            <SelectTrigger id={staffFieldId} className="min-h-11 sm:w-56">
              <SelectValue placeholder={t("filters.staffMember")} />
            </SelectTrigger>
            <SelectContent className="pointer-events-auto">
              <SelectItem value="all">{tAll("all")}</SelectItem>
              {staffOptions.map((s) => (
                <SelectItem key={s.staffMemberId} value={s.staffMemberId}>
                  {s.staffName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="button" onClick={onOpenSetDialog} className="min-h-11">
        <Plus className="size-4" aria-hidden="true" />
        {t("form.title")}
      </Button>
    </div>
  );
}
