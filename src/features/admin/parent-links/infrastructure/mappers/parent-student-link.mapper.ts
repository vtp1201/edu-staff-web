import {
  errorCodeOf,
  isApiError,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentStudentLink } from "../../domain/entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";
import type { LinkCandidateResponseDto } from "../dtos/link-candidate-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";
import type { ParentStudentLinkResponseDto } from "../dtos/parent-student-link-response.dto";

/** DTO (nested wire shape) → flat domain entity. */
export function toParentStudentLink(
  dto: ParentStudentLinkResponseDto,
): ParentStudentLink {
  return {
    linkId: dto.linkId,
    studentId: dto.student.memberId,
    studentName: dto.student.fullName,
    studentAvatarUrl: dto.student.avatarUrl ?? undefined,
    studentClassName: dto.student.className,
    parentId: dto.parent.memberId,
    parentName: dto.parent.fullName,
    parentAvatarUrl: dto.parent.avatarUrl ?? undefined,
    parentPhone: dto.parent.phone,
    relationship: dto.relationship,
    note: dto.note ?? undefined,
    consentStatus: dto.consentStatus,
    linkedOn: dto.linkedOn,
  };
}

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

export function toLinkCandidate(dto: LinkCandidateResponseDto): LinkCandidate {
  return {
    memberId: dto.memberId,
    fullName: dto.fullName,
    avatarUrl: dto.avatarUrl ?? undefined,
    className: dto.className ?? undefined,
    phone: dto.phone ?? undefined,
  };
}

/**
 * Map a normalised `ApiError` to the failure union — branch on `error.code`
 * (UPPER_SNAKE) / status ONLY, never on `message` (decision 0008; assumed
 * `core` codes per spec.md §8 OQ, holds regardless of exact code since the AC
 * is written against UI behaviour). `LINK_ALREADY_EXISTS`/409 → already-linked
 * (FR-004); `VALIDATION_ERROR`/422 → validation (per-field, FR-004/E2);
 * `RESOURCE_NOT_FOUND`/404 → not-found (AC-005.7); `FORBIDDEN_ACTION`/403 →
 * forbidden (HIGH-RISK, AC-005.5/.6); else → network-error.
 */
export function toFailure(err: unknown): ParentStudentLinkFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "LINK_ALREADY_EXISTS" || status === 409) {
    return { type: "already-linked" };
  }
  if (code === "VALIDATION_ERROR" || status === 422) {
    const fields = isApiError(err) ? (err.fields ?? []) : [];
    return { type: "validation", fields };
  }
  if (code === "RESOURCE_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "FORBIDDEN_ACTION" || status === 403) {
    return { type: "forbidden" };
  }
  return { type: "network-error" };
}
