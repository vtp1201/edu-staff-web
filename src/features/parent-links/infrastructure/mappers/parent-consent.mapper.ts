import {
  errorCodeOf,
  isApiError,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { LinkedStudentSummary } from "../../domain/entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../../domain/failures/parent-consent.failure";
import type { LinkedStudentResponseDto } from "../dtos/linked-student-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";

/** INT-001 DTO → domain entity (nullable avatarUrl → undefined). */
export function toLinkedStudentSummary(
  dto: LinkedStudentResponseDto,
): LinkedStudentSummary {
  return {
    studentId: dto.studentId,
    fullName: dto.fullName,
    avatarUrl: dto.avatarUrl ?? undefined,
    linkId: dto.linkId,
  };
}

/** INT-002 / INT-003 DTO → domain entity. */
export function toParentStudentConsent(
  dto: ParentStudentConsentResponseDto,
): ParentStudentConsent {
  return {
    studentId: dto.studentId,
    parentId: dto.parentId,
    disciplineAlerts: dto.disciplineAlerts,
    absenceAlerts: dto.absenceAlerts,
    gradeAlerts: dto.gradeAlerts,
  };
}

/**
 * Map a normalised `ApiError` to the consent failure union — branch on
 * `error.code` (UPPER_SNAKE) / status ONLY, never on `message` (decision 0008).
 * `FORBIDDEN_ACTION`/403 → forbidden (hard section error, AC-002.2);
 * `VALIDATION_ERROR`/422 → validation (per-field); everything else including
 * transport/5xx → network-error. Exact `core` codes are OPEN (spec §8) but the
 * AC is written against UI behavior, so this holds regardless.
 */
export function toConsentFailure(err: unknown): ParentConsentFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "VALIDATION_ERROR" || status === 422) {
    const fields = isApiError(err) ? (err.fields ?? []) : [];
    return { type: "validation", fields };
  }
  if (code === "FORBIDDEN_ACTION" || status === 403) {
    return { type: "forbidden" };
  }
  return { type: "network-error" };
}
