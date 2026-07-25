"use client";

import { useTranslations } from "next-intl";
import type {
  StaffDisciplineField,
  StaffDisciplineFieldError,
} from "../../domain/failures/staff-discipline.failure";
import { toStaffDisciplineFailureType } from "../../domain/failures/staff-discipline.failure";
import type { StaffDisciplineErrorKey } from "./staff-discipline-screen.i-vm";

/**
 * Failure key → user copy, translated at PRESENTATION only (i18n rule).
 *
 * An explicit exhaustive switch — NOT a dynamic `t(\`errors.${key}\`)` — because
 * the keys live across TWO namespaces: the 9 shared codes reuse
 * `discipline.errors.*` verbatim (spec §8 [CONFLICT] resolution) while the 3
 * conduct-note-specific ones live under `staffDiscipline.errors.*`. A dynamic
 * lookup would need every key mirrored into both namespaces.
 */
export function useSDErrorMessage() {
  const tShared = useTranslations("discipline.errors");
  const tSd = useTranslations("staffDiscipline.errors");

  return (key: StaffDisciplineErrorKey): string => {
    switch (key) {
      case "locked":
        return tSd("locked");
      case "term-not-found":
        return tSd("term-not-found");
      case "invalid-rating":
        return tSd("invalid-rating");
      case "missing-reject-reason":
        return tShared("missing-reject-reason");
      case "invalid-transition":
        return tShared("invalid-transition");
      case "already-processed":
        return tShared("already-processed");
      case "same-actor":
        return tShared("same-actor");
      case "not-found":
        return tShared("not-found");
      case "forbidden":
        return tShared("forbidden");
      case "invalid-severity":
        return tShared("invalid-severity");
      case "validation":
        // Field-scoped copy is rendered per field (see useSDFieldErrorMessage);
        // this is the banner fallback for a validation failure.
        return tShared("missing-description");
      default:
        return tShared("network-error");
    }
  };
}

/** Field-scoped validation copy (inline field errors, AC-002.4/.5, AC-007.6/.7). */
export function useSDFieldErrorMessage() {
  const tShared = useTranslations("discipline.errors");
  const tSd = useTranslations("staffDiscipline.errors");

  return (field: StaffDisciplineField): string => {
    switch (field) {
      case "severity":
        return tShared("invalid-severity");
      case "rating":
        return tSd("invalid-rating");
      case "termId":
        return tSd("term-not-found");
      case "note":
      case "description":
        return tShared("missing-description");
      default:
        return tShared("missing-description");
    }
  };
}

/** First error for a given field, if the failure carries one. */
export function fieldErrorFor(
  field: StaffDisciplineField,
  fields: StaffDisciplineFieldError[] | undefined,
): StaffDisciplineFieldError | undefined {
  return fields?.find((f) => f.field === field);
}

/** Thrown-value → stable failure key (mutations/queries throw plain objects). */
export function errorKeyOf(err: unknown): StaffDisciplineErrorKey {
  return toStaffDisciplineFailureType(err);
}
