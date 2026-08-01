/**
 * `GET /members/{memberId}/linked-students` item, enriched by BE US-148.
 * The response is an OBJECT `{ links: [...] }` — NOT a bare array and NOT
 * cursor-paginated (ground-truthed against `LinkedStudentsResponse` in
 * `services/core/docs/openapi.yaml`, 2026-08-01), so no `raw: true` /
 * `fetchAllPages` handling applies here.
 *
 * There is still NO student display name on this (or any) endpoint a PARENT
 * may call — cross-repo ask #20's residual half; the picker degrades to an
 * ordinal label instead of inventing one.
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
