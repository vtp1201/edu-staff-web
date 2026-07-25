"use client";

import { useTranslations } from "next-intl";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import { toStudentAbsenceFailureType } from "../../domain/failures/student-absence.failure";
import type { StudentAbsencesErrorKey } from "./student-absences-screen.i-vm";

/**
 * Failure key → user copy, translated at PRESENTATION only (i18n rule).
 *
 * An explicit exhaustive switch — NOT a dynamic `t(\`errors.${key}\`)` — for two
 * reasons: (a) `"invalid-date"` maps to the already-authored leaf
 * `studentAbsences.errors.invalid-date-future`, the ONE override (spec.md §6);
 * (b) `"network-error"` has no leaf in this namespace and reuses
 * `discipline.errors.network-error`, the same dual-namespace pattern as
 * `sd-error-message.ts`. A dynamic lookup would silently break on both.
 */
export function useSAErrorMessage() {
  const tSa = useTranslations("studentAbsences.errors");
  const tShared = useTranslations("discipline.errors");

  return (key: StudentAbsencesErrorKey): string => {
    switch (key) {
      case "forbidden":
        return tSa("forbidden");
      case "not-found":
        return tSa("not-found");
      case "duplicate-date":
        return tSa("duplicate-date");
      case "invalid-date":
        // The ONE override — the wire code is ABSENCE_INVALID_DATE but the
        // authored key is `invalid-date-future` (opposite direction from
        // `discipline.errors.invalid-date`). Do not "simplify" this.
        return tSa("invalid-date-future");
      case "invalid-state":
        return tSa("invalid-state");
      case "invalid-id":
        return tSa("invalid-id");
      case "invalid-input":
        return tSa("invalid-input");
      case "network-error":
        return tShared("network-error");
    }
    // No `default:` on purpose — the switch is exhaustive over the union, so a
    // 9th failure member becomes a `tsc` error here instead of silently
    // rendering "network error" for an unrelated failure.
  };
}

/** Thrown-value → stable failure key (mutations/queries throw plain objects). */
export function errorKeyOf(err: unknown): StudentAbsencesErrorKey {
  return toStudentAbsenceFailureType(err);
}

/**
 * Roster lookup for display (FR-010). Unknown id → show the raw id rather than a
 * wrong name (audit honesty, mirrors `resolveRosterEntry` in `staff-discipline`).
 */
export function saStudentOf(
  roster: readonly StudentRosterEntry[],
  studentMemberId: string,
  fallbackClassName = "",
): StudentRosterEntry {
  return (
    roster.find((s) => s.studentMemberId === studentMemberId) ?? {
      studentMemberId,
      fullName: studentMemberId,
      className: fallbackClassName,
    }
  );
}
