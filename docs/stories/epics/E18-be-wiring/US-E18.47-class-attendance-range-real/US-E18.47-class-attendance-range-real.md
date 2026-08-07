# US-E18.47 Class attendance range real (BE US-187)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/attendance/`
- Shared contract/file: `ATTENDANCE_EP`, `IAttendanceRepository.getAttendanceHistory`

## Ground truth (fe-lead, verified before delegating against `edu-api` local checkout, US-187)

`edu-api/services/core/docs/openapi.yaml` (~L2930, `GET /api/v1/classes/{classId}/attendance`) +
`.../attendance/core/application/usecase/get_class_attendance_range.go`:

- **Same route as the existing single-day GET** — no new path. `date` is now
  OPTIONAL. Exactly one mode per request:
  - `date` only → single-day mode (US-046, unchanged) → `ClassAttendanceResponse`.
  - `startDate`+`endDate` together, `date` omitted → range mode (US-187) →
    `ClassAttendanceRangeResponse`, records ordered `(date, studentMemberId)`
    ascending across the whole range.
  - Supplying `date` WITH `startDate`/`endDate` → `400
    ATTENDANCE_INVALID_DATE` (ambiguous mode). A range request missing one of
    its two bounds → same 400.
- Auth: SAME gate as the by-date read (`authorizeClassRead`, ADR 0029/US-179)
  — class's HOMEROOM teacher (GVCN), or tenant ADMIN/SUPER_ADMIN/MANAGER
  (MANAGER read added US-179, already consumed).
- Range constraints: `endDate` before `startDate` → `400
  ATTENDANCE_INVALID_DATE_RANGE`; range > 366 days → `400
  ATTENDANCE_DATE_RANGE_TOO_LARGE`. Empty result (no records in range) → `200`
  empty `records`, never 404.
- **No pagination** — mirrors the sibling member-range endpoint (US-046); a
  class's ≤366-day range is bounded, response is one shot.
- Response shape: `{classId, records: [{date, studentMemberId, status}]}`.

## Current state (read before touching anything) — EXACT fan-out to replace

`src/features/attendance/domain/use-cases/list-attendance-history.use-case.ts`
already exists and is the consumer: `MAX_HISTORY_DAYS = 31` (bounded, rejects
out-of-bound requests, never silently truncates — ADR 0058 §5). Its
`execute()` calls `this.repo.getAttendanceHistory(classId, from, to)`.

`src/features/attendance/infrastructure/repositories/attendance.repository.ts`'s
`getAttendanceHistory()` currently:
1. `fetchAllPages()` the class roster (unrelated, keep).
2. `Promise.allSettled(dates.map(date => this.http.get(ATTENDANCE_EP.classAttendance(classId), {params:{date}})))`
   — ONE HTTP call PER DAY (≤31 calls today).
3. `aggregateDaySummaries(dates, results, roster.length)` — builds
   `AttendanceDaySummary[]` (per-day rollup, NOT per-student-per-day
   records — check this entity shape carefully, the new range response gives
   raw per-(date,student) records, you'll need to re-aggregate client-side
   into the SAME `AttendanceDaySummary[]` output shape the use-case/UI
   already expects, or decide the UI needs to change if the aggregation
   logic can't be preserved 1:1 — read `attendance-day-summary.entity.ts` and
   `aggregateDaySummaries()`'s current logic in full before writing the
   replacement).

## Scope

1. Replace the day-by-day fan-out in `getAttendanceHistory()` with ONE call:
   `GET /classes/{classId}/attendance?startDate=&endDate=` (the SAME
   `ATTENDANCE_EP.classAttendance(classId)` constant, different query params
   — check whether the endpoint constant needs a second variant or can stay
   one function with a query-object parameter).
2. Re-derive `AttendanceDaySummary[]` from the flat `records[]` the range
   response returns (group by `date`, count by `status`, same aggregation
   semantics `aggregateDaySummaries` currently produces from the per-day
   `Promise.allSettled` results) — this should be a PURE function refactor,
   same output contract, new input shape. If any day in the requested range
   has ZERO records (never taken), preserve whatever "no attendance recorded"
   treatment the current code gives that day (check: does the old fan-out
   distinguish "day not yet recorded" from "day recorded, zero absent"? The
   new response won't have a per-day placeholder for a day with no records
   at all — make sure that distinction, if it existed, survives).
3. Error mapping: `400 ATTENDANCE_INVALID_DATE_RANGE` (endDate < startDate —
   should be unreachable client-side if `MAX_HISTORY_DAYS`/date-picker already
   prevent it, but map it anyway defensively), `400
   ATTENDANCE_DATE_RANGE_TOO_LARGE` (also should be unreachable given
   `MAX_HISTORY_DAYS = 31` << BE's 366-day cap — but map it, don't assume).
   Branch on `error.code`, decision 0008.
4. `MAX_HISTORY_DAYS = 31` stays as-is (ADR 0058 §5's reasoning was about
   capping FE-side fan-out COST — with a single range call replacing N calls,
   the cost argument for keeping it at 31 rather than raising it toward 366
   is weaker; this is a product/UX decision, not purely technical — DEFAULT
   to leaving it at 31 unless there's a clear reason to raise it, and if you
   do consider raising it, flag it to fe-lead rather than silently changing
   the constant, since ADR 0058 documents the current number with reasoning
   that may need updating).
5. Update `MockAttendanceRepository`'s `getAttendanceHistory` if needed for
   consistency (likely no change needed — mock already returns the aggregated
   shape directly).

## NOT in scope

- Single-day mode (`getClassAttendance(classId, date)`) — unchanged, still real.
- Member-scoped attendance range (`/members/{id}/attendance`) — already real
  since US-E18.34, unrelated, untouched.
- Any UI/component change beyond what's needed to keep the existing
  `attendance-history-day-summary-row.tsx`/`attendance-history-tab.tsx`
  working unchanged (this should be a pure data-layer swap, zero UI diff).

## Acceptance Criteria

- Real mode: viewing N days of class attendance history costs exactly 1 HTTP
  call (plus the unrelated roster fetch), not N.
- Aggregated day-summary output is IDENTICAL in shape and semantics to the
  old fan-out's output (zero UI regression).
- Range/date-order errors map to sensible failures, not `unknown`.
- `USE_MOCK=true` unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test: single-call proof (call-count assertion, not just result-shape), aggregation-from-flat-records test, error-code mapping |
| Integration | real interceptor pipeline test |
| E2E | none new — existing `attendance-history-tab` Storybook coverage should pass unchanged |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row update for attendance history real-mode (call-count proof).
- Close ask #28 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 7 row.

## Evidence

Implemented (fe-nextjs-engineer). Pure data-layer swap — zero UI diff.

**Files changed**

| Layer | File | Change |
| --- | --- | --- |
| infrastructure (dto) | `features/attendance/infrastructure/dtos/class-attendance-response.dto.ts` | + `ClassAttendanceRangeRecordDto` / `ClassAttendanceRangeResponseDto` (flat, per-record `date`). Single-day DTO untouched. |
| infrastructure (mapper) | `features/attendance/infrastructure/mappers/attendance.mapper.ts` | `aggregateDaySummaries(dates, allSettledResults, total)` **removed**, replaced by pure `aggregateRangeDaySummaries(dates, records, total)`. `errorCodeOf` import dropped (no per-day error branch left). |
| infrastructure (repo) | `features/attendance/infrastructure/repositories/attendance.repository.ts` | `getAttendanceHistory()` — `Promise.allSettled(dates.map(get))` → ONE `GET …/attendance?startDate&endDate`, fired in parallel with the roster drain. |
| domain (docs only) | `attendance-day-summary.entity.ts`, `i-attendance.repository.ts` | stale "no bulk range endpoint exists" / "fan-out" comments corrected. |
| tests | `attendance.mapper.test.ts`, `attendance.repository.test.ts` | 5 obsolete fan-out cases removed, 14 added (see below). |
| docs | `docs/TEST_MATRIX.md` | US-E18.47 row, `implemented`. |

Untouched as scoped: `MockAttendanceRepository` (already returns the aggregated
shape per enumerated day), `getClassAttendance` single-day mode,
`MAX_HISTORY_DAYS = 31`, all presentation.

**Call-count proof (the AC that matters)** —
`attendance.repository.test.ts`: `get.mock.calls` filtered to
`ATTENDANCE_EP.classAttendance("c-1")` has length **1** for a 31-day window
(`2026-06-01 → 2026-07-01`), where the old fan-out issued 31; plus an explicit
`expect(params).not.toHaveProperty("date")` guard so a future edit can't
re-introduce the ambiguous both-modes request (`400 ATTENDANCE_INVALID_DATE`).

**"Never recorded" vs "recorded but empty": no distinction existed, so none was
lost.** The old `aggregateDaySummaries` folded a fulfilled day with `records: []`
AND a day rejected with `ATTENDANCE_NOT_FOUND` into the *identical*
`{counts: zeroCounts(), totalStudents}` summary — the wire never carried the
difference (BE returns `200` + empty list, never 404). `aggregateRangeDaySummaries`
seeds a zero-count bucket for every enumerated date, so an unrecorded day reads
exactly the same as before. The one behavioural change is a strict improvement:
the old code silently **omitted** a day that failed for a non-`NOT_FOUND` reason
(and re-threw only if EVERY day failed); with a single call there is no partial
state — it either reports every requested day or throws for the caller to map.

**Error mapping** — `ATTENDANCE_INVALID_DATE_RANGE` and
`ATTENDANCE_DATE_RANGE_TOO_LARGE` were already in `toAttendanceFailure`'s
`INVALID_REQUEST_CODES`; they are now proven at the *repository* seam (5 cases,
incl. `ATTENDANCE_INVALID_DATE`, `ATTENDANCE_INVALID_CLASS_ID` →
`invalid-request` and `ATTENDANCE_FORBIDDEN` → `forbidden`), not only in the
mapper's own unit test. Neither is reachable from the UI today
(`MAX_HISTORY_DAYS = 31` « 366 and the picker orders the bounds) — mapped
defensively as instructed.

**Proof run (from the worktree)**

- `bun vitest run` → **487 files / 3709 tests pass**, zero failures, zero
  regression (baseline 3700; −5 obsolete, +14 new).
- `bunx tsc --noEmit` → clean.
- `bun lint` → clean (1 pre-existing warning + 1 info, unrelated files).
- `bun run build` → green in real mode **and** with `NEXT_PUBLIC_USE_MOCK=true`.

**Flagged to `fe-lead` (not actioned):** ADR `0058` §5 justifies
`MAX_HISTORY_DAYS = 31` by *client fan-out cost* — an argument this story
removes. Raising it toward BE's 366-day ceiling is now cheap technically but is
a product/UX call and needs the ADR's reasoning updated; left at 31.
