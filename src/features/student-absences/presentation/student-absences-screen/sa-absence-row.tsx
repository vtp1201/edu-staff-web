"use client";

import { Flag, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { StudentAbsenceEntity } from "../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import { SAExcusedBadge } from "./sa-excused-badge";
import { SAFlaggedIndicator } from "./sa-flagged-indicator";

/**
 * One absence row. Purely presentational — row-action visibility is
 * CALLER-computed (`canEdit`/`canFlag`) and never re-derived here (mirrors
 * `SDViolationRowProps`' "explicit, not re-derived" precedent).
 *
 * Two independent signals (FR-007): `SAExcusedBadge` ALWAYS renders;
 * `SAFlaggedIndicator` is MOUNTED only for `FLAGGED_UNEXCUSED`, so it is
 * genuinely absent otherwise. Never merged into one pill.
 *
 * There is no unflag control here, in any branch, for any state (FR-006).
 * The long-reason display wraps rather than truncates (spec.md §8 [GAP]).
 */
export interface SAAbsenceRowProps {
  absence: StudentAbsenceEntity;
  /** Resolved by the container from the static roster. */
  student: StudentRosterEntry;
  /** Show the class chip (principal's schoolwide view only). */
  showClass: boolean;
  canEdit: boolean;
  canFlag: boolean;
  isBusy: boolean;
  onEdit: () => void;
  onFlag: () => void;
}

export function SAAbsenceRow({
  absence,
  student,
  showClass,
  canEdit,
  canFlag,
  isBusy,
  onEdit,
  onFlag,
}: SAAbsenceRowProps) {
  const t = useTranslations("studentAbsences");
  const isFlagged = absence.state === "FLAGGED_UNEXCUSED";

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-foreground text-sm">
            {student.fullName}
          </span>
          {showClass && (
            <StatusBadge tone="primary">{absence.classId}</StatusBadge>
          )}
          <span className="font-mono text-edu-text-secondary text-xs">
            {absence.date}
          </span>
          <SAExcusedBadge excused={absence.excused} />
          {isFlagged && <SAFlaggedIndicator />}
        </div>
        {absence.reason && (
          <p className="mt-1.5 break-words text-edu-text-secondary text-sm">
            {absence.reason}
          </p>
        )}
      </div>

      {(canEdit || canFlag) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={isBusy}
              aria-label={`${t("form.editTitle")} — ${student.fullName}`}
              onClick={onEdit}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t("form.editTitle")}
            </Button>
          )}
          {canFlag && (
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={isBusy}
              aria-label={`${t("flagAction")} — ${student.fullName}`}
              onClick={onFlag}
            >
              <Flag className="size-4" aria-hidden="true" />
              {t("flagAction")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
