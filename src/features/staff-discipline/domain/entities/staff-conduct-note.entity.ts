import type { StaffApprovalState } from "./staff-violation.entity";

/**
 * Staff conduct-note domain entity (US-E09.5). Natural key = `(termId, staffMemberId)`.
 * Once `state === "APPROVED"` the record is permanently immutable via the set
 * endpoint (ADR 0074) — see `IStaffDisciplineRepository.setStaffConductNote`.
 */
export type StaffConductRating =
  | "SATISFACTORY"
  | "NEEDS_IMPROVEMENT"
  | "UNSATISFACTORY";

export const STAFF_CONDUCT_RATINGS: readonly StaffConductRating[] = [
  "SATISFACTORY",
  "NEEDS_IMPROVEMENT",
  "UNSATISFACTORY",
] as const;

/** Hard cap on the note field (AC-007.10, design-spec `setForm.note.maxLength`). */
export const STAFF_CONDUCT_NOTE_MAX_LENGTH = 5000;

export interface StaffConductNoteEntity {
  termId: string;
  staffMemberId: string;
  /** Mock-roster resolved — never on the wire. */
  staffName: string;
  /** Mock-roster resolved — never on the wire. */
  department: string;
  rating: StaffConductRating;
  note: string;
  state: StaffApprovalState;
  authorMemberId: string;
  approverMemberId?: string;
  /** Read-derived: `approverMemberId === authorMemberId` (ADR 0073). */
  selfApproved: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetStaffConductNoteInput {
  staffMemberId: string;
  termId: string;
  /** Validation-only on the wire (spec §6) — not stored, not echoed back. */
  academicYearId?: string;
  rating: StaffConductRating;
  note: string;
}
