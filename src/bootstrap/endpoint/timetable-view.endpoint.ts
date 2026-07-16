/**
 * Read-only timetable view endpoints (`core` service, US-E18.11 BE wiring).
 * Kept separate from the admin builder's `timetable.endpoint.ts` so the two
 * feature modules' infra stay decoupled (plan decision 3).
 *
 * There is NO `/me`, `/teacher/me`, or `/my-children` self-scope endpoint on
 * the real wire (ground-truthed against the full `services/core/docs/
 * openapi.yaml` path list — cross-repo ask #15). `getMyTimetable`/`getChildren`
 * therefore stay mock-first permanently and never call HTTP; only the
 * class-scoped read and the teacher's own `GET /classes` (auto-filtered
 * server-side to "classes I'm assigned to") are real.
 */
export const TIMETABLE_VIEW_EP = {
  /** Class-scoped published timetable (`?termId=` mandatory). */
  classTimetable: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable`,
  /**
   * TEACHER-role auto-filtered class list ("classes I'm assigned to") — the
   * fan-out source for `getByTeacher`. Same endpoint + precedent as
   * `src/features/teacher/infrastructure/repositories/teacher-class.repository.ts`.
   */
  myClasses: "/core/api/v1/classes",
} as const;
