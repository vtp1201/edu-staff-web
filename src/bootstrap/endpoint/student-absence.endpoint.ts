/**
 * `core` conduct sub-domain endpoints for the student-absence track
 * (US-E09.6, INT-001..004).
 *
 * **Never invoked today**: `bootstrap/di/student-absence.di.ts`'s `makeRepo()`
 * force-mocks the repository unconditionally (roster-UUID gap — see that file's
 * doc comment), so no HTTP repository exists yet. These constants are written now
 * so the future real-wiring story has the ground-truthed paths ready without
 * magic strings (mirrors the `staff-discipline`/`discipline`/`staff-leave`
 * precedent).
 *
 * All 4 paths were ground-truthed BE-side (spec.md §6 / integration.md §2,
 * against `core`'s `conduct/adapter/http/routes.go`). The natural key travels on
 * the path (`:date`) + query (`?classId=&studentMemberId=`) — NEVER as an
 * editable PATCH body field (FR-004).
 */
export const STUDENT_ABSENCE_EP = {
  /** POST — record a new absence (teacher/GVCN, own class, initial RECORDED). */
  record: "/core/api/v1/conduct/student-absences",
  /** GET `?classId=&from=&to=` — role-scoped list. */
  list: "/core/api/v1/conduct/student-absences",
  /** PATCH `?classId=&studentMemberId=` — body: `reason?`/`excused?` only. */
  edit: (date: string) => `/core/api/v1/conduct/student-absences/${date}`,
  /** POST `?classId=&studentMemberId=` — one-way RECORDED → FLAGGED_UNEXCUSED. */
  flag: (date: string) => `/core/api/v1/conduct/student-absences/${date}/flag`,
  // NOTE: there is deliberately no `unflag` path — no such endpoint exists on
  // the BE and the transition is terminal (FR-006/FR-013).
} as const;
