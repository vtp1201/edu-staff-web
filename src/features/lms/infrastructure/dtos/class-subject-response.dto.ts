/**
 * core `ClassSubjectSummaryResponse` (US-057) — one row of a class's curriculum
 * offerings, as returned by `GET /classes/{classId}/subjects`.
 *
 * Ground-truthed against `edu-api/services/core/docs/openapi.yaml`: the display
 * name lives on the NESTED `lockedFields` object (inherited from the Subject
 * master), NOT at the top level, and the row's own id is `classSubjectId`, not
 * `id`. The identical shape is already read by
 * `bootstrap/lib/resolve-my-grade-subjects.ts` — the two agree on purpose.
 *
 * Only the fields this feature's picker uses are declared; `academicYearLabel`,
 * `gradeLevel`, `createdAt` and the rest of `lockedFields` are on the wire but
 * deliberately unread here (see `ClassSubjectRef`).
 */
export interface ClassSubjectSummaryResponseDto {
  classSubjectId: string;
  classId: string;
  subjectId: string;
  status: "ACTIVE" | "ARCHIVED";
  lockedFields: { subjectName: string };
}
