import type { StudentAbsenceState } from "../../domain/entities/student-absence.entity";

/**
 * INT-001/002/003/004 response shape — camelCase, ground-truthed against
 * `core`'s `dto/student_absence.go` (spec.md §6).
 *
 * There is deliberately NO `studentName`/`className` field: those do not exist
 * on the wire (roster-UUID gap, FR-010) and are resolved client-side against the
 * static roster at the presentation layer.
 */
export interface StudentAbsenceResponseDto {
  classId: string;
  studentMemberId: string;
  /** Bare `YYYY-MM-DD` — not a datetime. */
  date: string;
  reason?: string;
  excused: boolean;
  state: StudentAbsenceState;
  recordedByMemberId: string;
  flaggedByMemberId?: string;
  createdAt: string;
  updatedAt: string;
}
