# US-E13.2 Attendance BE Wiring — Wire Real Core Attendance API

## Status

in-progress

## Lane

normal

> Ground-truthed against `edu-api/services/core/internal/attendance` Go source
> (2026-07-18) — BE US-046 is **implemented**, not `planned` (this packet
> pre-dated it). Drift is "cao" (epic table, `EPIC-OVERVIEW.md` Wave 2) but no
> auth/tenant/PII/dataloss/validation-weakening hard gate trips, and the
> LATE-status mapping reuses an EXISTING token (`--edu-info`, no new
> `tokens.css` entry) — kept at `normal` lane per the epic table's own
> classification (same call as US-E18.11 timetable, also "cao" drift/normal
> lane). A data-contract ADR is still registered (`0058`) per the data-contract
> ADR rule.

## Dependencies

- Depends on: US-E13.1 (teacher class view — needs class context), reuses
  `ITeacherClassRepository`/`TeacherClassRepository` (`src/features/teacher/`,
  already real-wired) for class listing + name resolution — no new BE ask
  needed for those two.
- Blocks: none
- Feature module(s) chạm: `src/features/attendance/` (mock-first + UI from
  US-E02.x); reads (does not modify) `src/features/teacher/` repository.
- Shared contract/file: `bootstrap/endpoint/attendance.endpoint.ts`,
  `AttendanceRepository`, `attendance.di.ts`.

## Product Contract — CORRECTED against Go ground truth

**BE reality (`internal/attendance/adapter/http/routes.go` +
`core/domain/error/errors.go`, 2026-07-18):**

```
POST /api/v1/classes/:classId/attendance   record/correct one class's attendance for ONE date (GVCN or SUPER_ADMIN only)
GET  /api/v1/classes/:classId/attendance?date=YYYY-MM-DD   read a class's attendance for that date
GET  /api/v1/members/:memberId/attendance?startDate=&endDate=   read ONE student's attendance range (used for a future student/parent view, not this US)
```

Request/response are genuinely **daily, class-wide, no period/subject axis**
(`RecordAttendanceRequest{date, records:[{studentMemberId, status}]}`,
`ClassAttendanceResponse{classId, date, records:[{studentMemberId, status}]}`)
— confirms the epic table's "period-based web ≠ class/date-based BE" note, and
goes further: **there is no subject dimension either**. This is a homeroom
(GVCN) daily roll call, not a per-subject-period session. The web's mock model
(`ClassPeriod` with `subject`+`period`, `AttendanceRoster.period`) does not
correspond to anything on the wire — **not a drift to remap, a model to
replace**.

**Status enum is 4-value, not 3-value**: `PRESENT | ABSENT | LATE |
EXCUSED_ABSENT` (`validate:"oneof=..."`, `ATTENDANCE_INVALID_STATUS` if
violated) vs. the web's current 3-state entity (`present | excused | absent`,
no `late`). **`late` must be added** as a 4th toggle state — mapped to the
existing `--edu-info` token (blue), distinct from success/warning/error
already used by present/excused/absent. No new `tokens.css` entry.

**No student display-name field on the wire** (`ClassAttendanceRecord` is
`{studentMemberId, status}` only) — same recurring gap as cross-repo ask
#6/#7/#9/#13/#15/#18/#20/#21/#22 (confirming it a 9th time), BUT this US is
NOT permanently blocked like those: reuse the **already real-wired**
`GetClassStudentsUseCase`/`TeacherClassRepository.getClassStudents()`
(`src/features/teacher/`, `GET /core/api/v1/classes/:id/students`) as the
name-resolution source, joined client-side by `studentMemberId`. That
repository already ships the exact same graceful degrade
(`displayName?.trim() || studentMemberId`, `teacher-class.mapper.ts`) —
reusing it is following an already-accepted precedent, not inventing a new
one. `studentCode`/`avatarUrl` (mock-only fields) have no wire source at all
— dropped from the entity.

**Class list ("my classes for attendance")**: no dedicated endpoint. Reuse
`ITeacherClassRepository.listMyClasses()` (`GET /core/api/v1/classes`,
TEACHER-role auto-filtered, already real) filtered to `isHomeroom === true` —
matches the BE authorization model exactly (`ATTENDANCE_FORBIDDEN` if actor
isn't the class's GVCN).

**No range/history endpoint for a class.** Only single-date class GET and
single-student range GET exist — **no bulk "class attendance across N days"
endpoint** (same shape of gap as ask #16's missing bulk timetable-conflicts).
History tab wiring: fan out `GetAttendanceByDate` per date in the requested
range, clamped client-side to a bounded window (max 31 days) to cap fan-out
cost; aggregate into a per-day status-count summary (no more
date/period/subject rows — period/subject don't exist). Logged as cross-repo
ask #28 (a class-scoped date-range attendance summary endpoint would remove
the fan-out).

**Correction window**: `ATTENDANCE_CORRECTION_WINDOW_EXPIRED` (403) — the GVCN
can only correct the SAME UTC day; older dates become read-only reactively.
Surfaced through the existing save-error toast as a new failure type
(`correction-window-expired`), no new dialog — same "reactive gate through
existing error surface" pattern as US-E18.13's seal gate.

## Relevant Product Docs

- `docs/product/screens.md` — "Attendance" row (Teacher section, ✅)
- `design_src/edu/classops.jsx` — states `["Có mặt","Vắng phép","Vắng KP"]`,
  `"class/date/period selectors"` — **period selector removed** (no wire
  concept); 4th `late` toggle added (design-system supremacy per decision
  `0011`/ADR `0058` — reference mockup predates the real contract).
- BE Go source (ground truth, openapi/ERROR_CODES may drift):
  `edu-api/services/core/internal/attendance/**`,
  `edu-api/services/core/docs/ERROR_CODES.md` §Attendance (US-046).

## Acceptance Criteria

- AC-1: `IAttendanceRepository` redesigned to the class+date model
  (`getClassAttendance(classId, date)`, `saveClassAttendance(classId, date,
  records)`, `getMyHomeroomClasses()`, `getAttendanceHistory(classId, from,
  to)`); mock repo updated to model the SAME contract (no period, 4-state,
  no lying-green tests).
- AC-2: Real `AttendanceRepository` maps BE envelope per `api-integration.md`;
  reuses `TeacherClassRepository` (class list + name-resolution) via
  composition, not duplication.
- AC-3: Error codes ground-truthed + mapped (UPPER_SNAKE, `codeFromKey`):
  `ATTENDANCE_FORBIDDEN`→`forbidden`, `ATTENDANCE_NOT_FOUND`→`not-found`,
  `ATTENDANCE_CORRECTION_WINDOW_EXPIRED`→`correction-window-expired`,
  `ATTENDANCE_STUDENT_NOT_ENROLLED`→`student-not-enrolled`,
  `ATTENDANCE_INVALID_*`/`ATTENDANCE_BATCH_TOO_LARGE`/
  `ATTENDANCE_INVALID_DATE_RANGE`/`ATTENDANCE_DATE_RANGE_TOO_LARGE`→
  `invalid-request`, network→`network-error`, else→`unknown`. Retry only when
  `retryable === true`.
- AC-4: DI factory (`attendance.di.ts`) wires mock when
  `NEXT_PUBLIC_USE_MOCK=true`; real branch calls `ensureFreshSession()` before
  `createServerHttpClient()` (decision `0018`, epic playbook step 6).
- AC-5: UI updated for the real model — period selector removed, 4th `late`
  toggle added, history tab shows per-day status-count summary (not
  date/period/subject rows) — passes design-review gate + a11y audit (status
  is never color-only: icon/label alongside `--edu-info` for `late`).
- AC-6: Full existing Vitest suite (338 files / 2179 tests baseline) still
  passes + new tests green; `tsc --noEmit` clean; `bun run build` (real-mode
  guard) green.

## Design Notes

- `raw: true` (top-level axios config, not nested in `params`) for the history
  fan-out's envelope reads — recurring epic bug class (`EPIC-OVERVIEW.md`
  §"Bug class xuyên suốt").
- `ensureFreshSession()` wired into `attendance.di.ts`'s real branch.
- No new `tokens.css` entry — `late` reuses `--edu-info`/`--edu-info-light`.
- ADR `0058` records: (a) daily class-wide model replacing period-based mock
  model, (b) 4-state status + `late`→`--edu-info` mapping, (c) bounded
  fan-out history design, (d) reactive correction-window gate.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases (record/read/history-aggregate — valid/forbidden/not-enrolled/correction-window-expired/invalid-status); mapper (4-state, name-join fallback) |
| Integration | `AttendanceRepository` (real, mocked http) + mock repo (contract-consistent) |
| E2E | Storybook attendance stories: today tab (4-state, no period), history tab (day-summary), empty/error states |
| Platform | `bun vitest run` full suite + `tsc --noEmit` + `bun run build` (real-mode) |

## Harness Delta

- `docs/TEST_MATRIX.md`: update US-E13.2 row — mock-first → real-wired
  (hybrid: class-list/name-resolution/record/read real; history bounded
  fan-out real; nothing permanently blocked).
- ADR `0058` (attendance contract remap) registered via `harness-cli decision add`.
- `EPIC-OVERVIEW.md` cross-repo ask #28 (class-scoped date-range attendance summary).
