# US-E13.2 — State Architecture (attendance BE wiring)

Author: `fe-state-engineer`. Plan only — no production code. Ground-truthed
against `edu-api/services/core/internal/attendance/**` (routes.go, dto/attendance.go,
core/domain/error/errors.go) and ADR `0058`. Precedents read: `teacher-class.di.ts`,
`timetable-view.di.ts` (DI composition), `grade-approval-container.tsx` +
`grade-approval-keys.ts` (client `useQuery` over a Server Action, key hierarchy),
`api-envelope.ts` (`parseEnvelope`/`errorCodeOf`/`statusOf`), `teacher-class.repository.ts`
(`fetchAllPages` cursor-drain pattern).

## 0. Current-state baseline (what changes)

Today the whole screen is RSC-only: `page.tsx` reads `searchParams` (`class`, `date`,
`period`), calls three DI use-cases synchronously in the RSC render, passes a flat
`AttendanceScreenVM` to a `'use client'` reducer-only component; `saveAttendanceAction`
is a Server Action that `revalidatePath`s the page. **No TanStack Query anywhere in
this feature today.** That pattern stays for the today-tab (single date, single
request, cheap) — it does NOT need to become a client fetch. The history tab is the
one part that must move to a client `useQuery` because it is a *bounded fan-out* the
user can re-trigger (change the date range) without a full navigation, and because
per-day sub-requests benefit from independent caching (§3).

## 1. Revised `IAttendanceRepository`

```ts
// src/features/attendance/domain/repositories/i-attendance.repository.ts
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED_ABSENT";

export interface AttendanceRecord {
  studentMemberId: string;
  studentName: string; // joined client-side, §4 — NOT part of the DTO
  status: AttendanceStatus;
}

export interface ClassAttendanceDay {
  classId: string;
  date: string; // YYYY-MM-DD
  records: AttendanceRecord[];
}

/** One day's aggregate for the history tab — no period/subject (don't exist). */
export interface AttendanceDaySummary {
  date: string;
  counts: Record<AttendanceStatus, number>;
  totalStudents: number;
}

export interface HomeroomClassSummary {
  id: string;
  name: string;
}

export interface IAttendanceRepository {
  /** GET /api/v1/classes/:classId/attendance?date= — today-tab read. */
  getClassAttendance(classId: string, date: string): Promise<ClassAttendanceDay>;

  /** POST /api/v1/classes/:classId/attendance — record/correct one date. */
  saveClassAttendance(
    classId: string,
    date: string,
    records: Array<{ studentMemberId: string; status: AttendanceStatus }>,
  ): Promise<void>;

  /** No dedicated endpoint — reuses ITeacherClassRepository.listMyClasses()
   *  filtered to isHomeroom===true. Kept on THIS interface (not leaked to
   *  presentation) so callers don't need to know the composition detail. */
  getMyHomeroomClasses(): Promise<HomeroomClassSummary[]>;

  /** Bounded (≤31 days) client-side fan-out + aggregation, see §3. Repository
   *  returns the AGGREGATE, not raw per-day records — the use-case stays a
   *  thin pass-through and the fan-out/aggregation logic has ONE home
   *  (testable in the repository/mock-repository pair, not duplicated in a
   *  use-case AND a repository). */
  getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]>;
}
```

Naming matches AC-1 exactly (`getClassAttendance`, `saveClassAttendance`,
`getMyHomeroomClasses`, `getAttendanceHistory`). `studentCode`/`avatarUrl` dropped
(no wire source, ADR `0058` §3). `period`/`subject`/`ClassPeriod` entity retired.

**Where fan-out + aggregation logic lives — repository, not use-case.** Rationale:
the aggregation is a pure function of "N single-day DTOs → day summaries" and is
identical regardless of caller; putting it in the repository keeps
`ListAttendanceHistoryUseCase` a 1-line delegate (matches the existing pattern for
every other use-case in this feature) and keeps the *real* repository and the *mock*
repository symmetric — the mock repo must independently model the same bounded-fan-out
contract (AC-1: "mock repo updated to model the SAME contract"), so the aggregation
helper (`aggregateDaySummaries(records-per-day[]): AttendanceDaySummary[]`) should be a
shared pure function in `infrastructure/mappers/attendance.mapper.ts`, imported by
both `AttendanceRepository` and `MockAttendanceRepository` — one home, no duplication
(`component-organization.md` principle applied to logic, not just UI).

## 2. DI composition — `attendance.di.ts` composing `teacher-class`'s repository

Follows the `timetable-view.di.ts` precedent (a DI factory in one feature composing
another feature's already-real repository) exactly — not the `teacher-class.di.ts`
precedent itself (that one is the *composed-from* side), and not a domain→domain
import (forbidden by the layer table: `domain/` may only import "types nội bộ").
The composition happens **only** in `bootstrap/di/`, which is explicitly allowed to
import another feature's public exports.

```ts
// src/bootstrap/di/attendance.di.ts
import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAttendanceRepository } from "@/features/attendance/domain/repositories/i-attendance.repository";
import { AttendanceRepository } from "@/features/attendance/infrastructure/repositories/attendance.repository";
import { MockAttendanceRepository } from "@/features/attendance/infrastructure/repositories/mocks/attendance.mock.repository";
import { GetClassStudentsUseCase } from "@/features/teacher/domain/use-cases/get-class-students.use-case";
import { ListMyClassesUseCase as ListMyTeacherClassesUseCase } from "@/features/teacher/domain/use-cases/list-my-classes.use-case";
import { MockTeacherClassRepository } from "@/features/teacher/infrastructure/repositories/mock-teacher-class.repository";
import { TeacherClassRepository } from "@/features/teacher/infrastructure/repositories/teacher-class.repository";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";

async function makeTeacherClassRepo() {
  if (USE_MOCK) return new MockTeacherClassRepository();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  return new TeacherClassRepository(http, currentUserId);
}

async function makeRepo(): Promise<IAttendanceRepository> {
  if (USE_MOCK) return new MockAttendanceRepository();
  await ensureFreshSession(); // decision 0018, playbook step 6 — BEFORE createServerHttpClient()
  const http = await createServerHttpClient();
  const teacherClassRepo = await makeTeacherClassRepo();
  return new AttendanceRepository(http, teacherClassRepo);
}

export async function makeListMyHomeroomClassesUseCase() { ... }
export async function makeGetClassAttendanceUseCase() { ... }
export async function makeSaveAttendanceUseCase() { ... }
export async function makeGetAttendanceHistoryUseCase() { ... }
```

**`AttendanceRepository` takes `ITeacherClassRepository` as a constructor
dependency** (not the concrete `TeacherClassRepository` class — depend on the
interface, DIP): its `getClassAttendance`/`getAttendanceHistory` call
`teacherClassRepo.getClassStudents(classId)` to resolve names (§4), and
`getMyHomeroomClasses` calls `teacherClassRepo.listMyClasses()` filtered to
`isHomeroom === true`. The mock `MockAttendanceRepository` similarly takes a
`MockTeacherClassRepository` (or the same interface) injected — this is what makes
"mock repo models the SAME contract" (AC-1) actually true: the mock also does the
join/filter, not a shortcut.

This keeps `domain/` pure (no cross-feature import — `IAttendanceRepository` doesn't
mention `ITeacherClassRepository` anywhere in its signature, only in the
*infrastructure* implementation's constructor) and matches the layer table: only
`infrastructure/` and `bootstrap/di/` may reach across.

`ensureFreshSession()` runs once per `makeRepo()` call (i.e. once per Server Action /
RSC render), before the shared `http` client is created — matches the
`timetable-view.di.ts` placement exactly (call it before `createServerHttpClient()`,
not after).

## 3. History fan-out + aggregation strategy

**Bounding.** Clamp `[from, to]` to ≤31 days *before* fan-out, both to cap request
volume and because the BE's own `ATTENDANCE_DATE_RANGE_TOO_LARGE` ceiling is 366 days
(too generous for this UI) — the repository enforces the tighter 31-day UI bound and
returns an `invalid-request` failure if the caller asks for more (never silently
truncates — silent truncation would show a wrong "empty" summary for dates the user
thinks were included).

**Concurrency: bounded `Promise.all`, not sequential, not unbounded.** 31 requests
fired as a single unbounded `Promise.all` is acceptable at this ceiling (31 is small;
compare `TeacherClassRepository.listMyClasses()` which already fires one
roster-count request per class with unbounded `Promise.all`, an accepted precedent in
this codebase). Sequential (`for await`) is rejected — no ordering dependency between
days, and it would make the worst case ~31× slower for no benefit. A concurrency
limiter (p-limit style) is unnecessary complexity below ~50 fan-out requests; if a
future US raises the bound, revisit.

**Partial failure.** One day's `GET` failing (e.g. transient network blip) must not
fail the whole history view. Use `Promise.allSettled`, not `Promise.all`: a day whose
fetch rejected is either (a) omitted from the summary array with a `partial: true`
flag surfaced to the UI (preferred — matches "no lying-green": don't show a fabricated
zero-count day), or (b) if the rejection is `ATTENDANCE_NOT_FOUND` specifically (no
attendance recorded for that date yet — a normal, expected case, not an error) treated
as a zero-count day (`{PRESENT:0,ABSENT:0,LATE:0,EXCUSED_ABSENT:0}`, `totalStudents`
from the roster join). Any OTHER error code on a given day bubbles that day's failure
into an aggregate-level failure only if **every** day failed (i.e. the whole range is
unreachable → treat as `network-error`/`unauthorized` etc. per the normal mapping);
if only some days failed, return the succeeded days + a `partial: true` marker rather
than failing the entire tab — a single flaky day should not blank the whole history.

**Where computed:** repository (`getAttendanceHistory`), reusing
`teacherClassRepo.getClassStudents(classId)` (called ONCE, not once per day) to get
`totalStudents` and to resolve names only if a future need arises (today's aggregate
shape doesn't need names, only counts — see AC-5 "per-day status-count summary").

```ts
async getAttendanceHistory(classId: string, from: string, to: string) {
  assertBoundedRange(from, to, 31); // throws invalid-request failure upstream
  const dates = enumerateDates(from, to);
  const results = await Promise.allSettled(
    dates.map((date) =>
      this.http.get(ATTENDANCE_EP.classAttendance(classId), {
        params: { date },
        raw: true, // envelope read — top-level axios config (bug class guard)
      }) as Promise<ApiEnvelope<ClassAttendanceResponseDto>>,
    ),
  );
  return aggregateDaySummaries(dates, results); // shared pure fn, §1
}
```

**TanStack Query for the history tab (client-side, `'use client'` container).** The
today-tab stays RSC + Server Action (no change to that pattern — it's cheap, single
request, and the existing reducer/`useTransition` save flow is unaffected by this US
except for the 4-state enum). The **history tab** becomes a small client container
(new file, e.g. `attendance-history-container.tsx`, following the
`grade-approval-container.tsx` shape) because:
- the date-range picker needs to re-trigger a fetch without a full page nav/RSC
  re-render (better UX for "look at last week vs. this week"),
- per-range caching is meaningful (TanStack Query dedupes/caches a given
  `(classId, from, to)` tuple so flipping back to a previously-viewed range is instant).

```ts
// attendance-query-keys.ts
export const attendanceKeys = {
  all: ["attendance"] as const,
  homeroomClasses: () => ["attendance-homeroom-classes"] as const,
  today: (classId: string, date: string) =>
    ["attendance-today", classId, date] as const,
  history: (classId: string, from: string, to: string) =>
    ["attendance-history", classId, from, to] as const,
};
```

- `queryFn` for `attendanceKeys.history` calls a NEW Server Action
  `getAttendanceHistoryAction(classId, from, to)` (thin wrapper around
  `makeGetAttendanceHistoryUseCase()`, mirrors `saveAttendanceAction`'s shape —
  `{ ok: true; data } | { ok: false; errorKey }`) — client components never import
  `bootstrap/di` directly (layer table).
- The whole 31-day fan-out is cached as **one** query entry keyed by the requested
  range (not 31 separate query entries) — the fan-out is an implementation detail of
  the Server Action/repository, invisible to the client cache. This avoids the
  complexity of TanStack Query orchestrating 31 parallel sub-queries for a value the
  UI only ever consumes as one aggregate array.
- Today-tab stays server-driven — it does NOT get a matching `attendanceKeys.today`
  client query in this US (listed above for completeness/future-proofing only); adding
  one would be scope creep beyond AC-1..AC-6.

## 4. Student-name join — where, and invalidation implications

**Join happens in the repository (`AttendanceRepository.getClassAttendance`), not the
use-case, not presentation.** Rationale: the join is a repository-composition detail
(reaching across to `ITeacherClassRepository`) — the use-case (`GetClassAttendanceUseCase`)
should stay a 1-line delegate like every other use-case in this feature, and
presentation must never see `studentMemberId`-only records (would leak the "no display
name on the wire" gap up to the component, violating the ADR's stated fix).

```ts
async getClassAttendance(classId: string, date: string): Promise<ClassAttendanceDay> {
  const [dayDto, rosterResult] = await Promise.all([
    this.http.get(ATTENDANCE_EP.classAttendance(classId), { params: { date }, raw: true }),
    this.teacherClassRepo.getClassStudents(classId),
  ]);
  const roster = rosterResult.ok ? rosterResult.data : [];
  const nameByMemberId = new Map(roster.map((s) => [s.studentMemberId, s.displayName]));
  return mapClassAttendanceDay(dayDto, nameByMemberId); // fallback: displayName?.trim() || studentMemberId, same graceful-degrade as teacher-class.mapper.ts
}
```

Both calls fire in parallel (`Promise.all`) — the roster fetch does not depend on the
attendance fetch's result, so no need to sequence them.

**Query-key / invalidation implications (client side, history tab only — today-tab is
RSC and re-renders fresh on `revalidatePath` regardless):**
- The roster (`getClassStudents`) is **not** a separately-cached client query in this
  screen — it's folded into the server-side join inside the Server Action/repository
  call, so from the client's point of view there is only ONE cache entry
  (`attendanceKeys.history(...)`) per range; there is no second "roster" query to keep
  in sync with it. **This sidesteps the invalidation question entirely for the client
  cache** — the roster is always read fresh as part of resolving each history query
  (bounded by TanStack Query's own `staleTime`, not a separate invalidation rule).
- **Saving attendance does NOT invalidate the roster** (the roster/name list doesn't
  change from an attendance save) but DOES need to invalidate/refetch the affected
  day's data: after `saveAttendanceAction` succeeds for `(classId, date)`, the
  Server Action's `revalidatePath` already covers the today-tab (RSC). For the
  history tab, if the saved date falls inside the currently-displayed history range,
  the client must invalidate `attendanceKeys.history(classId, *, *)` (a prefix
  invalidation on `["attendance-history", classId]`, not exact-key, since the exact
  `from`/`to` the user has open may not be known to the save action) so the day's
  updated counts reflect on next tab switch. Implementation: `saveAttendanceAction`
  can't call `queryClient.invalidateQueries` (it's server-side); instead, after a
  successful save the `AttendanceScreen`'s save handler (client-side, already has a
  `queryClient` if the history container is a sibling) calls
  `queryClient.invalidateQueries({ queryKey: ["attendance-history", classId] })`
  itself — mirrors `grade-approval-container.tsx`'s `useMutation({ onSuccess: () =>
  queryClient.invalidateQueries(...) })` pattern, just triggered from the reducer's
  save callback instead of a `useMutation` (today-tab save stays a Server Action +
  `useTransition`, not a converted `useMutation`, to minimize the diff — AC scope is
  "wire BE", not "convert today-tab to client-query architecture").
- `attendanceKeys.homeroomClasses()` (if ever promoted to a client query) would need
  no invalidation from a save — the class list doesn't change from recording
  attendance.

## 5. Ground-truthed error taxonomy (12 codes)

Source: `core/internal/attendance/core/domain/error/errors.go` (constructors →
`apperror.New(status, "snake_case_i18n_key", nil)`; wire `error.code` is the
UPPER_SNAKE of that key per decision `0008`/`api-integration.md`). Mapper follows the
`toTeacherClassFailure` shape exactly: branch on `errorCodeOf(err)`/`statusOf(err)`,
never on `message`.

| Go constructor | HTTP | Wire `error.code` | `AttendanceFailure["type"]` |
| --- | --- | --- | --- |
| `ErrAttendanceForbidden` | 403 | `ATTENDANCE_FORBIDDEN` | `forbidden` |
| `ErrAttendanceNotFound` | 404 | `ATTENDANCE_NOT_FOUND` | `not-found` |
| `ErrAttendanceCorrectionWindowExpired` | 403 | `ATTENDANCE_CORRECTION_WINDOW_EXPIRED` | `correction-window-expired` |
| `ErrAttendanceStudentNotEnrolled` | 404 | `ATTENDANCE_STUDENT_NOT_ENROLLED` | `student-not-enrolled` |
| `ErrAttendanceInvalidTenantID` | 400 | `ATTENDANCE_INVALID_TENANT_ID` | `invalid-request` |
| `ErrAttendanceInvalidClassID` | 400 | `ATTENDANCE_INVALID_CLASS_ID` | `invalid-request` |
| `ErrAttendanceInvalidMemberID` | 400 | `ATTENDANCE_INVALID_MEMBER_ID` | `invalid-request` |
| `ErrAttendanceInvalidDate` | 400 | `ATTENDANCE_INVALID_DATE` | `invalid-request` |
| `ErrAttendanceInvalidStatus` | 400 | `ATTENDANCE_INVALID_STATUS` | `invalid-request` |
| `ErrAttendanceBatchTooLarge` | 400 | `ATTENDANCE_BATCH_TOO_LARGE` | `invalid-request` |
| `ErrAttendanceInvalidDateRange` | 400 | `ATTENDANCE_INVALID_DATE_RANGE` | `invalid-request` |
| `ErrAttendanceDateRangeTooLarge` | 400 | `ATTENDANCE_DATE_RANGE_TOO_LARGE` | `invalid-request` |
| — (transport failure, no response) | — | `NETWORK_ERROR` (sentinel) | `network-error` |
| — (anything unmapped) | — | — | `unknown` |

`AttendanceFailure` (revised):

```ts
export type AttendanceFailure =
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "correction-window-expired" }
  | { type: "student-not-enrolled" }
  | { type: "invalid-request"; message?: string }
  | { type: "save-failed"; message?: string } // client-side guard (e.g. empty periodId) — no wire code
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

Mapper (`attendance-failure.mapper.ts`, new file, mirrors
`teacher-class-failure.mapper.ts`):

```ts
export function toAttendanceFailure(err: unknown): AttendanceFailure {
  const status = statusOf(err);
  const code = errorCodeOf(err);
  if (code === "NETWORK_ERROR" || status === undefined) return { type: "network-error" };
  if (code === "ATTENDANCE_FORBIDDEN") return { type: "forbidden" };
  if (code === "ATTENDANCE_NOT_FOUND") return { type: "not-found" };
  if (code === "ATTENDANCE_CORRECTION_WINDOW_EXPIRED") return { type: "correction-window-expired" };
  if (code === "ATTENDANCE_STUDENT_NOT_ENROLLED") return { type: "student-not-enrolled" };
  if (
    code === "ATTENDANCE_INVALID_TENANT_ID" ||
    code === "ATTENDANCE_INVALID_CLASS_ID" ||
    code === "ATTENDANCE_INVALID_MEMBER_ID" ||
    code === "ATTENDANCE_INVALID_DATE" ||
    code === "ATTENDANCE_INVALID_STATUS" ||
    code === "ATTENDANCE_BATCH_TOO_LARGE" ||
    code === "ATTENDANCE_INVALID_DATE_RANGE" ||
    code === "ATTENDANCE_DATE_RANGE_TOO_LARGE"
  ) {
    return { type: "invalid-request" };
  }
  return { type: "unknown" };
}
```

Only retry when `retryable === true` (per `api-integration.md`) — none of the 12
codes above are retryable (all are 4xx client errors); only a genuine
`NETWORK_ERROR`/5xx transport case is retryable, handled by the existing
interceptor/reactive-refresh layer, not by this mapper.

`correction-window-expired` surfaces through the EXISTING save-error toast path
(`onSave`'s `result.ok === false` branch in `attendance-screen.tsx`) — add one new
i18n key (`attendance.errors.correctionWindowExpired`) to the existing `tErrors`-style
lookup, no new dialog/UI element (ADR `0058` §6, mirrors ADR `0055`'s seal-gate
pattern).

## 6. RSC ↔ client boundary

- `page.tsx` (RSC) stays the entry point: reads `searchParams` (`class`, `date` —
  `period` param dropped, no longer meaningful), calls
  `makeListMyHomeroomClassesUseCase()` + `makeGetClassAttendanceUseCase()` (today-tab
  only) synchronously, passes the result as props into `AttendanceScreen`.
- `AttendanceScreen` (`'use client'`) keeps its reducer for the today-tab's in-flight
  edits (4-state now) + `useTransition`-driven `saveAttendanceAction` call — unchanged
  shape, just the status union widens to 4 values and the `roster.period` header
  (class/subject/date/period) becomes a class/date-only header (no subject, no period
  number).
- **New**: a small client child, `AttendanceHistoryContainer` (replaces
  `AttendanceHistoryTab`'s pure-presentational role — becomes a container +
  presentational split, or the existing file gains a `'use client'` data-fetching
  wrapper around a presentational sub-component), owns `useQuery(attendanceKeys.history(...))`
  and a local date-range control (URL state via `searchParams` is fine too — RSC could
  pass an initial default 7-day range as `initialData` to seed the query, avoiding a
  loading flash on first render, same as any RSC→client `initialData` handoff
  elsewhere in the app).
- No Zustand/global store anywhere in this design — server state via TanStack Query
  (history tab only) + Server Actions (today-tab save) + URL/searchParams (filters),
  matching the repo-wide rule.
- DI (`bootstrap/di/attendance.di.ts`) and infrastructure remain strictly server-only
  (`import "server-only"` retained/added where missing); the new
  `getAttendanceHistoryAction` Server Action is the ONLY bridge the client history
  container uses to reach `makeGetAttendanceHistoryUseCase()` — no direct import of
  `bootstrap/di` from `presentation/`.

## Summary of new/changed files (for the implementer, not exhaustive)

- `domain/entities/attendance-record.entity.ts` — 4-state status, drop
  `studentCode`/`avatarUrl`, rename `studentId`→`studentMemberId`.
- `domain/entities/attendance-status.entity.ts` — `PRESENT|ABSENT|LATE|EXCUSED_ABSENT`.
- `domain/entities/class-attendance-day.entity.ts` (new, replaces `class-period.entity.ts`).
- `domain/entities/attendance-day-summary.entity.ts` (new, history aggregate).
- `domain/repositories/i-attendance.repository.ts` — per §1.
- `domain/failures/attendance.failure.ts` — per §5.
- `domain/use-cases/*` — renamed/thinned to match new repo methods.
- `infrastructure/mappers/attendance.mapper.ts` — DTO↔entity + `aggregateDaySummaries` pure fn.
- `infrastructure/mappers/attendance-failure.mapper.ts` (new).
- `infrastructure/repositories/attendance.repository.ts` — takes `ITeacherClassRepository`, per §2/§4.
- `infrastructure/repositories/mocks/attendance.mock.repository.ts` — mirrors the same composition + 4-state + bounded history.
- `bootstrap/endpoint/attendance.endpoint.ts` — `classAttendance: (classId) => \`/classes/${classId}/attendance\`` (drop `myClasses`/`save(periodId)`/`history(classId)`).
- `bootstrap/di/attendance.di.ts` — per §2.
- `presentation/attendance-screen/*` — drop period selector/column, add `late` toggle (`--edu-info`), history tab becomes a client container with `useQuery` (§3/§6).
- `presentation/attendance-screen/attendance-query-keys.ts` (new, §3).
- `app/.../attendance/actions.ts` — add `getAttendanceHistoryAction`; `saveAttendanceAction` signature becomes `(classId, date, records)`.
