/** `GET /core/api/v1/classes` item shape (core ClassResponse, TEACHER-role
 *  auto-filtered). Same endpoint/precedent as `teacher-class.repository.ts`'s
 *  `listMyClasses` — deliberately duplicated here (not imported) to keep
 *  `features/attendance` self-contained (ADR `0058`, resolved conflict with
 *  the two planning docs' cross-feature-injection proposal). */
export interface ClassSummaryDto {
  classId: string;
  name: string;
  /** Homeroom teacher (GVCN) member id — drives the `isHomeroom` filter. */
  homeroomTeacherId?: string | null;
}

export type ClassListResponseDto = ClassSummaryDto[];
