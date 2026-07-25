import type {
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "../entities/student-absence.entity";

/**
 * FR-003 / AC-003.5 — client-side duplicate-date pre-check.
 *
 * Pure predicate over the list ALREADY in the cache (never a new fetch). It is
 * defense-in-depth only: the repository/server remains authoritative and still
 * throws `duplicate-date` when a race slips through a stale client list
 * (AC-003.6, state-design.md §8 case 3).
 */
export function isDuplicateAbsence(
  candidate: StudentAbsenceKey,
  existing: readonly StudentAbsenceEntity[],
): boolean {
  return existing.some(
    (row) =>
      row.classId === candidate.classId &&
      row.studentMemberId === candidate.studentMemberId &&
      row.date === candidate.date,
  );
}
