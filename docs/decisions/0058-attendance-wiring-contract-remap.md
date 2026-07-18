# 0058 Attendance wiring contract remap — daily class-wide model, 4-state status, bounded history fan-out

Date: 2026-07-18

## Status

Accepted

## Context

US-E13.2 (epic `E13-teacher-workspace`, cross-referenced from `E18-be-wiring`'s
Wave 2 table) wires the existing mock-first attendance screen
(`src/features/attendance/`) to the real `core` service. Ground-truthing
`edu-api/services/core/internal/attendance/**` (Go source — routes, handlers,
DTOs, domain errors) against the web's mock model found drift beyond the epic
table's one-line note ("period-based web ≠ class/date-based BE → remap"):

1. **No period or subject axis at all.** The real contract is a daily,
   class-wide homeroom (GVCN) roll call: `POST/GET
   /api/v1/classes/:classId/attendance` key on `(classId, date)` only —
   `RecordAttendanceRequest{date, records:[{studentMemberId,status}]}`,
   `ClassAttendanceResponse{classId,date,records}`. The web's mock model
   (`ClassPeriod{subject,period}`, `AttendanceRoster.period`) invented both a
   period and a subject dimension that correspond to nothing on the wire. This
   is not a field rename — the period selector in
   `design_src/edu/classops.jsx` ("class/date/period selectors") is removed
   from the screen; a GVCN records attendance once per class per day, not per
   period.
2. **4-state status, not 3-state.** `RecordAttendanceRequest`'s `status` is
   `oneof=PRESENT ABSENT LATE EXCUSED_ABSENT` (`ATTENDANCE_INVALID_STATUS` on
   violation) — richer than the web's `present | excused | absent` (no
   `late`). Decision: add `late` as a 4th toggle state, mapped to the existing
   `--edu-info` token (blue) — distinct from `present`(success)/
   `excused`→`excusedAbsent`(warning)/`absent`(error), already defined in
   `src/app/tokens.css`. No new token added; status remains never
   color-only (icon + label per `.claude/rules/accessibility.md`).
3. **No student display-name field on the wire**
   (`ClassAttendanceRecord{studentMemberId,status}` only) — the same
   recurring gap as cross-repo asks #6/#7/#9/#13/#15/#18/#20/#21/#22
   (`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`), but here it is NOT a
   permanent blocker: `src/features/teacher/infrastructure/repositories/
   teacher-class.repository.ts`'s `getClassStudents()` (already real-wired,
   `GET /core/api/v1/classes/:id/students`) already ships the exact same
   graceful degrade (`displayName?.trim() || studentMemberId`,
   `teacher-class.mapper.ts`) for a teacher's own roster. Reusing that
   repository as the name-resolution source (joined client-side by
   `studentMemberId`) follows an already-accepted precedent rather than
   inventing a new one. `studentCode`/`avatarUrl` (mock-only, no wire source)
   are dropped from `AttendanceRecord`.
4. **Class listing reuses `ITeacherClassRepository.listMyClasses()`**
   (`GET /core/api/v1/classes`, TEACHER-role auto-filtered, already real —
   US-E18.11 precedent), filtered to `isHomeroom === true` — this matches the
   real authorization rule exactly (`ATTENDANCE_FORBIDDEN` unless actor is the
   class's GVCN or a SUPER_ADMIN). No new endpoint or BE ask needed.
5. **No bulk/range endpoint for a class's attendance history.** Only a
   single-date class GET and a single-STUDENT range GET
   (`GET /api/v1/members/:memberId/attendance?startDate=&endDate=`, scoped to
   one member, not usable for a class-wide history view) exist. Decision:
   fan out `GetAttendanceByDate` per date across the requested range, clamped
   client-side to a bounded window (max 31 days) to cap fan-out cost, and
   aggregate into a per-day status-count summary (replacing the old
   date/period/subject row list — period/subject don't exist to show).
   Logged as cross-repo ask #28 in `EPIC-OVERVIEW.md` (a class-scoped
   date-range attendance summary endpoint would remove the fan-out).
6. **Correction window is a reactive gate, not a client precheck.**
   `ATTENDANCE_CORRECTION_WINDOW_EXPIRED` (403) fires when the GVCN tries to
   correct a date outside "same UTC day". No client-side precheck endpoint
   exists (and none is needed) — surfaced as a new failure type
   (`correction-window-expired`) through the existing save-error toast, same
   "reactive gate through the existing error surface" pattern as ADR `0055`'s
   seal gate.

## Decision

- Replace the period-based domain model (`ClassPeriod`, `AttendanceRoster.period`)
  with a class+date model. Domain/UI changes: remove the period selector;
  today-tab header shows class + date only; roster table keyed by
  `studentMemberId`.
- Add `late` as a 4th `AttendanceStatus` value, styled with the existing
  `--edu-info`/`--edu-info-light` tokens (no `tokens.css` change).
- `AttendanceRecord.studentName` resolves via a client-side join against
  `TeacherClassRepository.getClassStudents()` (dependency on the already-real
  `teacher` feature's repository, composed at the use-case/DI layer — not
  duplicated).
- `listMyClasses` (attendance) reuses `TeacherClassRepository.listMyClasses()`
  filtered to `isHomeroom === true`.
- History tab: bounded (≤31 days) client-side fan-out over
  `GetAttendanceByDate`, aggregated to a per-day status-count summary.
- `correction-window-expired` added to `AttendanceFailure` as a reactive gate,
  surfaced through the existing toast — no new dialog.
- Error taxonomy ground-truthed from `core/internal/attendance/core/domain/
  error/errors.go` (12 constructors) — UPPER_SNAKE via `codeFromKey`,
  confirming decision `0008` holds for this cluster too.

## Consequences

- The attendance screen's period selector and history table columns change —
  this IS a UI change (not a transport-only swap), so it goes through the
  design-review gate + accessibility audit before merge (per
  `.claude/rules/impeccable.md`/`accessibility.md`), unlike most Wave-1/2 US's
  in `E18-be-wiring` that were zero-UI-change.
- History becomes a bounded, client-fan-out read (≤31 days) instead of a
  single BE call — acceptable given the existing mock UI already only showed
  a fixed 7-day window; a true bulk endpoint (cross-repo ask #28) would
  simplify this later without a web-side contract change (the aggregate shape
  stays compatible).
- No new cross-repo BE dependency blocks this US — unlike US-E18.8/9/13/14,
  nothing in this cluster is permanently mock; class-list, name-resolution,
  record, read, and history are all real.

## Related

- `docs/stories/epics/E13-teacher-workspace/US-E13.2-attendance-be-wiring/US-E13.2-attendance-be-wiring.md`
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (Wave 2 table row, cross-repo ask #28)
- ADR `0055` (reactive-gate precedent), ADR `0054` (per-cell status precedent), decision `0026` (component placement — reuse over duplication).
