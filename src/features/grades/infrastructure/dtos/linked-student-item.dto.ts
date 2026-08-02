/**
 * `GET /members/{parentMemberId}/linked-students` (`core`, BE US-148) — the
 * parent's own child roster. Ground-truthed against `LinkedStudentItemResponse`
 * / `LinkedStudentsResponse` in `services/core/docs/openapi.yaml` (2026-08-02):
 * the response is an OBJECT `{ links: [...] }`, NOT a bare array and NOT
 * cursor-paginated.
 *
 * Feature-local BY DESIGN — `features/timetable` declares the same wire shape
 * for its own picker. The two features deliberately resolve "my children"
 * independently (documented on `TimetableChild`) rather than importing across
 * feature boundaries; only the IAM name lookup is shared, and it is shared
 * through `bootstrap/di` as a narrow function port (decision 0017).
 *
 * There is NO student display name on this row — US-E18.33 resolves it from
 * IAM's tiered `GET /members?ids=` batch lookup instead (ADR-0120).
 */
export interface LinkedStudentItemDto {
  linkId: string;
  parentMemberId: string;
  studentMemberId: string;
  createdAt: string;
  /** Omitted (absent) OR null — the two are equivalent by BE design (D5). */
  classId?: string | null;
  /** Omitted together with `classId`. */
  className?: string | null;
}

export interface LinkedStudentsResponseDto {
  links: LinkedStudentItemDto[];
}
