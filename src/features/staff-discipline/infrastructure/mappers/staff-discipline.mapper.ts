import type { StaffConductNoteEntity } from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffViolationEntity } from "../../domain/entities/staff-violation.entity";
import { deriveSelfApproved } from "../../domain/use-cases/derive-self-approved";
import type { StaffConductNoteResponseDto } from "../dtos/staff-conduct-note-response.dto";
import type { StaffViolationResponseDto } from "../dtos/staff-violation-response.dto";

/**
 * DTO → entity mappers (pure). Two responsibilities the wire cannot cover:
 *  1. resolve `staffName`/`department` against the FIXED roster (roster-UUID gap,
 *     FR-009 — no live search endpoint exists);
 *  2. re-derive `selfApproved` from `authorMemberId`/`approverMemberId` — the one
 *     source of truth (ADR 0073). A wire value is never trusted over the ids,
 *     so the audit annotation can't be silently turned off upstream.
 */

/** Roster lookup with a non-throwing placeholder for an unknown id. */
export function resolveRosterEntry(
  roster: readonly StaffRosterEntry[],
  staffMemberId: string,
): StaffRosterEntry {
  const hit = roster.find((r) => r.staffMemberId === staffMemberId);
  if (hit) return hit;
  return {
    staffMemberId,
    // Unknown id → show the raw id rather than a wrong name (audit honesty).
    staffName: staffMemberId,
    department: "",
    initials: staffMemberId.slice(0, 2).toUpperCase(),
  };
}

export function toStaffViolationEntity(
  dto: StaffViolationResponseDto,
  roster: readonly StaffRosterEntry[],
): StaffViolationEntity {
  const staff = resolveRosterEntry(roster, dto.staffMemberId);
  return {
    recordId: dto.recordId,
    staffMemberId: dto.staffMemberId,
    staffName: staff.staffName,
    department: staff.department,
    category: dto.category,
    description: dto.description,
    severity: dto.severity,
    occurredAt: dto.occurredAt,
    state: dto.state,
    authorMemberId: dto.authorMemberId,
    approverMemberId: dto.approverMemberId,
    selfApproved: deriveSelfApproved(dto.authorMemberId, dto.approverMemberId),
    rejectionReason: dto.rejectionReason,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toStaffConductNoteEntity(
  dto: StaffConductNoteResponseDto,
  roster: readonly StaffRosterEntry[],
): StaffConductNoteEntity {
  const staff = resolveRosterEntry(roster, dto.staffMemberId);
  return {
    termId: dto.termId,
    staffMemberId: dto.staffMemberId,
    staffName: staff.staffName,
    department: staff.department,
    rating: dto.rating,
    note: dto.note,
    state: dto.state,
    authorMemberId: dto.authorMemberId,
    approverMemberId: dto.approverMemberId,
    selfApproved: deriveSelfApproved(dto.authorMemberId, dto.approverMemberId),
    rejectionReason: dto.rejectionReason,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
