# US-E20.5 Parent Attendance View (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E20.4 (reuses the same child-selection UX/entity —
  `LinkedStudentSummary` — build after or alongside, share the picker if one is
  extracted there)
- Blocks: none
- Feature module(s) chạm: new `src/features/parent-attendance/` (or extend
  `src/features/attendance/` with a parent-facing use-case — decide with
  `fe-component-architect`/`fe-state-engineer` which module boundary fits; the
  existing `attendance` feature is entirely teacher/homeroom-scoped today, so a
  new sibling module is the more likely fit per Clean-Architecture
  per-feature convention), route
  `app/[locale]/t/[tenant]/(app)/parent/attendance/page.tsx`
- Shared contract/file: child picker — reuse `child-switcher`
  (`features/grades/presentation/child-switcher/`) rather than fork a third
  picker (timetable already has one, grades has one — this is the visual
  pattern to reuse, not the timetable one, since `child-switcher` is the
  "child + subject/scope" combo already used for `parent/grades`).

## Product Contract

Sidebar nav (`nav-config.ts`, parent role) links to `/parent/attendance` but
the route does not exist. This adds a per-child attendance history view for
the parent: pick a child, see their attendance records over a date range
(present/absent/late/excused).

**Ground-truthed BE gap (mock-first required, decision `0014`):**
`GET /members/{memberId}/attendance` (`core`, `services/core/docs/openapi.yaml`
line ~2757) is explicitly documented "Authorization: STUDENT (self only) or
ADMIN/SUPER_ADMIN" — **PARENT is not in the allowed-caller list**. This mirrors
the recurring "the role model structurally excludes this actor" pattern already
seen in this epic (US-E18.24) and in the timetable child-name gap (ask #20) —
it is a genuine BE gap, not a client bug. Build this screen **mock-first**
against `NEXT_PUBLIC_USE_MOCK` + `bootstrap/lib/mock.ts` (decision `0014`), and
fe-lead files a new cross-repo ask for edu-api's BE team to add PARENT to the
`getMemberAttendance` authorization list (or introduce a
`GET /parents/{id}/children/{childId}/attendance` parent-scoped variant) before
this can be un-mocked. Do NOT attempt to force-call the real endpoint with the
parent's own token — it will 403 by design, not by accident.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the
  existing attendance status badges/tone mapping (`attendance-status.entity.ts`,
  `class-status-tone.ts`-style semantic tokens) — present/absent/late/excused
  already have an established token mapping elsewhere in the app; do not invent
  new colors.

## Acceptance Criteria

- Given a parent with ≥1 linked child, `/parent/attendance` shows a child
  picker (reuse `child-switcher`) defaulting to the first child, and that
  child's attendance history for a sensible default range (e.g. current month)
  below.
- Given the parent switches children, the attendance list refetches for the
  newly selected child.
- Given a parent with zero linked children, the page shows the existing
  no-child empty state (consistent with `parent/grades`).
- Status is never conveyed by color alone (icon/label required per
  `.claude/rules/accessibility.md`).
- Mock-first: the screen is fully functional against
  `NEXT_PUBLIC_USE_MOCK=true` fixtures; when unmocked in a real environment the
  real repository throws a typed `forbidden`/`not-implemented` failure that
  degrades to an honest "not available yet" state rather than crashing (same
  posture as other mock-first BE gaps in this repo).
- WCAG 2.1 AA: date-range control and picker keyboard-operable, focus visible,
  table/list semantics for the attendance rows.

## Design Notes

- Commands: none (read-only).
- Queries: NEW `get-child-attendance.use-case.ts` (mirrors
  `get-child-grades.use-case.ts`'s shape) → mock repository only for now (real
  repository implementation may still be written contract-correct and force-
  routed to mock via a Hybrid composite, matching the `HybridWeeklyTimetableRepository`
  precedent — but ONLY if the real implementation is actually exercised
  somewhere; otherwise keep it mock-only and note the gap plainly, per the
  US-E18.20 lesson: never claim "force-mocked, matching X" without the code
  actually matching).
- API: none real yet (see BE gap above) — mock fixture shape can mirror
  `MemberAttendanceResponse` from `services/core/docs/openapi.yaml` so the DTO
  is ready to wire the day PARENT is added to that endpoint's ACL.
- Domain rules: date range validation mirrors BE's documented constraints
  (`endDate >= startDate`, ≤366 days) even in mock mode, so behavior doesn't
  change when unmocked later.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/parent/attendance/page.tsx` (RSC)
  + `features/parent-attendance/presentation/parent-attendance-screen/` (new).

## Validation

| Layer | Expected proof | Actual (2026-08-02) |
| --- | --- | --- |
| Unit | `get-child-attendance.use-case.test.ts`, date-range validation | ✅ 6 use-case cases (inverted range short-circuits the repo, 366-day boundary ±1, typed/untyped rejection) + `date-range.test.ts` (12) + `build-parent-attendance-vm.test.ts` (12 — `parseIsoDate` replaces `formatIsoDate`, incl. the vi/en ordering guard) + `resolve-range.test.ts` (8) |
| Integration | mock repository test only (no real HTTP boundary yet) | ✅ `mock-child-attendance.repository.test.ts` (6, goes through the real DTO→mapper path) + `child-attendance.mapper.test.ts` (3, key-set assertion that `classId` is dropped) + **fix round**: `unavailable-child-attendance.repository.test.ts` (2) + `bootstrap/di/parent-attendance.di.test.ts` (6 — the 3-state env matrix, incl. "no `createServerHttpClient` in any state") + `parent/attendance/page.test.ts` (3 — real page→DI→repo chain per env) |
| E2E | Storybook interaction: child switch → refetch, empty state, status badges render with icon+label | ✅ 11 interaction stories (`parent-attendance-screen.stories.tsx`): Populated / **PopulatedEnglishLocale** / SwitchChild / ChangeDateRange / DefaultCurrentMonthRange / Loading / NoLinkedChildren / EmptyRange / ErrorForbidden / ErrorNetworkRetry / ErrorInvalidRange, + `Shared/ListError → WithIdForAriaDescribedby`. Mutation-checked: removing the badge icon or forcing `showRetry` red-lines 3 of them; force-mocking the DI factory red-lines 2 of `page.test.ts` |
| Platform | `bun build` clean | ✅ clean with `NEXT_PUBLIC_USE_MOCK=true` AND with the flag unset (real mode) — the route is `ƒ /[locale]/t/[tenant]/parent/attendance`; real mode now degrades to the `forbidden` state instead of serving mock rows (`page.test.ts`) |
| Release | design-review gate + a11y audit green | pending fe-lead (no `design-spec.jsonc` entry exists for this screen — token/pattern reuse is the substitute) |

## Harness Delta

Registered via `harness-cli story add --id US-E20.5`. Cross-repo ask filed:
"add PARENT to `GET /members/{memberId}/attendance` authorization (or a
parent-scoped child-attendance endpoint)" — track in the FE→BE asks report.

## Evidence

_Filled by fe-nextjs-engineer, 2026-08-02. Branch
`feat/us-e20.5-parent-attendance-view`, three layer-scoped commits._

### Proof commands (all run on the branch, results as observed)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean — 1 pre-existing warning + 1 info in `features/messaging/presentation/message-context-menu/message-context-menu.tsx` (untouched by this story) |
| `bun vitest run` | **459 files / 3304 tests, 0 failures** (baseline before this story: 453 / 3265) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1182 tests, 0 failures** (baseline: 156 / 1172) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | clean |
| `env -u NEXT_PUBLIC_USE_MOCK bun run build` | clean (build-guard convention — this screen is force-mocked at the DI factory, so real mode degrades honestly rather than breaking the build) |

> Baseline note: the pre-work `bun vitest run` raced the `git mv` of
> `child-switcher.test.tsx` and reported 3253 passed + that file unresolvable;
> its 12 tests are accounted for in the 3265 baseline above.

### Commits

1. `refactor(shared): promote ChildSwitcher to components/shared (US-E20.5)`
2. `feat(parent-attendance): domain + mock-only infrastructure for child attendance (US-E20.5)`
3. `feat(parent-attendance): parent child-attendance screen + route (US-E20.5)`

### `ChildSwitcher` promotion — parity result

Moved (not copied) `features/grades/presentation/child-switcher/` →
`components/shared/child-switcher/` with `index.ts` + its own `.i-vm.ts`. The
component body is byte-identical except two lines: the type import and
`useTranslations("gradeBook")` → `useTranslations("Common")`. All four existing
interaction stories moved verbatim (same assertions/fixtures, `title` renamed
to `Shared/ChildSwitcher`) and pass — that is the parity proof for the card
wrapper, tablist ARIA, tab sizing/active colour-mix, the 26px avatar with the
ADR-0049-safe `COLOR_VAR`/`COLOR_TEXT` maps, the name/class typography and the
roving-tabindex keyboard model. `parent/grades` (`GradeBookScreen`) imports the
shared component and its own stories/tests pass unmodified.

### Deviation from the Component Architecture (§2 "bonus finding")

The architecture asked to MOVE `ChildSummary`/`ChildColor` out of
`features/grades/domain/entities/grade-book.entity.ts` into the shared
component's `.i-vm.ts`. Implemented differently, on purpose: `grades`' own
`domain/` (`IGradeBookRepository.getChildList()`, `GetChildListUseCase`) needs
those types, so that move would make a `domain/` file import
`@/components/shared/...` — a hard layer violation (`domain/` imports nothing
outside domain), strictly worse than the smell it was fixing.

Instead the shared component declares its OWN contract
(`ChildSwitcherChild`/`ChildColor`/`ChildSwitcherVM`) and `grades`' domain keeps
its repository contract untouched. Zero illegal edges in either direction, zero
changes to `grades/domain`, and both consumers satisfy the props structurally —
so drift becomes a compile error, not a silent mismatch. This is the intent of
the architect's finding (the shared component no longer reaches into a
feature's domain) with the layer rule preserved. Flagged to `fe-lead`; no ADR
believed necessary (it is an application of the existing layer table, not a new
rule), but it is the reviewer's call.

### Other notable decisions

- ~~**Mock-only, unconditional**~~ — **REVERSED in the fix round**, see
  "Fix round" below. The factory is now `USE_MOCK`-gated; real mode returns
  `UnavailableChildAttendanceRepository`. The DTO + mapper ARE contract-correct
  against `MemberAttendanceResponse`, so un-mocking is still a small diff.
- **Mock data is generated, not hard-coded to one month.** The default range is
  the CURRENT month, so a fixture pinned to a fixed month would render empty
  from next month on. `buildMockAttendanceDto` is deterministic (10-school-day
  status cycle, weekends skipped, per-child offset) and its test asserts all
  four statuses appear over any full month.
- **`?childId=` is not trusted**: `resolveActiveChildId` falls back to the first
  linked child when the requested id is not in the parent's own list, so an
  arbitrary URL id is never forwarded to the repository.
- **Shared-component API extension (not a fork)**: `ListError` gained one
  optional `id?: string` so the date inputs can `aria-describedby` the error
  text. Additive, every existing caller unchanged.
- **No new tokens, no new status vocabulary**: reuses `attendance.status.*` and
  the ADR-0058 tone table (`present→success, late→info, excusedAbsent→warning,
  absent→error`) via the shared `StatusBadge`, always icon **+** text label.

### i18n

- NEW namespace `parentAttendance` (title/subtitle, range legend + both date
  labels, table caption/columns, summary label, loading aria-label, both empty
  states, retry, and one message per failure key) — added to `vi.json` and
  `en.json` in the same commit.
- `gradeBook.childSwitcherLabel` → `Common.childSwitcherLabel` (moved, same
  copy; the `gradeBook` key is deleted, no dead key left).
- Fix round: `parentAttendance.summaryChip` added to `vi.json` (`"{label} {count}"`)
  and `en.json` (`"{label}: {count}"`) — the differing punctuation is the point:
  chip composition is now a translator's decision, not JSX word order.

## Fix round (2026-08-02) — tech-lead MUST-FIX + 4 SHOULD-FIX

_Applied by fe-nextjs-engineer on the same branch. CONSIDER-level items and the
2 a11y Minors were deferred per fe-lead._

### MUST-FIX — real mode no longer fabricates a real child's attendance

`bootstrap/di/parent-attendance.di.ts` returned the mock repository
unconditionally, so with `NEXT_PUBLIC_USE_MOCK` unset in a real environment a
parent would have seen invented present/late/excused/absent rows for their real
child — contradicting this story's own AC and materially worse than the
`staff-leave`/`principal-classes` force-mock precedent (those serve harmless
roster-shaped seed data; this is child-specific data a parent could act on).

- NEW `features/parent-attendance/infrastructure/repositories/unavailable-child-attendance.repository.ts`
  (`import "server-only"`): rejects `{ type: "forbidden" }` immediately, **no
  HTTP attempted**. `forbidden` (not `not-implemented`) is the accurate type —
  PARENT's absence from `getMemberAttendance`'s ACL is a permanent
  authorization gap, not an unshipped endpoint.
- The DI factory is now `USE_MOCK ? Mock : Unavailable`, with the reversal and
  its rationale documented in the factory's doc comment.
- The screen already omitted the retry control for `forbidden`
  (`isRetryableFailure`) — re-confirmed; the previously-unreachable
  `parentAttendance.errors.forbidden` key and the `ErrorForbidden` story are now
  the real production path.
- Proof (TDD, red first — the 3 new forbidden-state assertions failed against
  the old factory):
  - `bootstrap/di/parent-attendance.di.test.ts` — env matrix `"true"` /
    `"false"` / unset: mock repo + rows only for `"true"`; the other two get
    `UnavailableChildAttendanceRepository` and `{ ok: false, error: { type:
    "forbidden" } }`; and `createServerHttpClient` is asserted **never
    constructed in all three states** (it is `vi.doMock`-ed and the factory AND
    the `execute()` call path are both exercised).
  - `app/[locale]/t/[tenant]/(app)/parent/attendance/page.test.ts` — the real
    page → DI → repository → use-case chain per env: `"true"` ⇒ `error: null`
    with rows; unset/`"false"` ⇒ `error: "forbidden"` and `records: []`, while
    the switcher/range control still render. Mutation-checked: forcing the
    factory back to unconditional-mock red-lines 2 of these 3.

### SHOULD-FIX

1. `mocks/mock-child-attendance.repository.ts` now carries `import "server-only"`
   (matching 26/28 mock repositories); its doc comment now says
   development-only-when-`USE_MOCK`, not "the ONLY implementation".
2. `components/shared/list-error/list-error.stories.tsx` gained
   `WithIdForAriaDescribedby`, exercising the `id?: string` prop this story
   added — it asserts the id lands on the alert AND that a sibling date input's
   `aria-describedby` resolves to that text (`toHaveAccessibleDescription`), so
   the shared component's own story file covers its full prop surface.
3. `formatIsoDate` (hard-coded DD/MM/YYYY, wrong for `en`) is replaced by the
   pure `parseIsoDate` (`YYYY-MM-DD` → noon-UTC `Date`, `null` for a non-day or
   a rolled-over date like `2026-02-30`); the screen formats with next-intl
   `useFormatter().dateTime(day, { day/month: "2-digit", year: "numeric",
   timeZone: "UTC" })` — the same API `audit-log`/`lms` use. `vi` renders
   `03/08/2026`, `en` renders `08/03/2026`; noon-UTC + explicit `timeZone`
   keeps the calendar day stable across timezones and identical server/client.
   Proved by the new `PopulatedEnglishLocale` story (asserts `08/03/2026` is
   present and `03/08/2026` is absent under an `en` provider).
4. The summary chip no longer concatenates `{tStatus(status)} {counts[status]}`
   in JSX — it calls `t("summaryChip", { label, count })` against a new key in
   both message files. The same `en` story asserts `"Present: 1"`.

### Fix-round proof commands (as observed)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint:fix` / `bun lint` | clean — same 1 pre-existing warning + 1 info in `message-context-menu.tsx` (untouched) |
| `bun vitest run` | **462 files / 3317 tests, 0 failures** (fresh pre-fix baseline re-measured on the branch: 459 / 3304 → +3 files / +13 tests, zero regressions) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1184 tests, 0 failures** (pre-fix 157 / 1182 → +2 stories) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | clean |
| `env -u NEXT_PUBLIC_USE_MOCK bun run build` | clean; route still `ƒ` (dynamic, nothing prerendered) — the honest-degrade behaviour in that config is proved by `page.test.ts`, which runs the real chain with the flag unset |

> Known, deliberately out of scope (CONSIDER, deferred by fe-lead): in real mode
> the child LIST still comes from the force-mocked `makeGetChildListUseCase`
> (ADR 0054, pre-existing and shared with `parent/grades`), so the switcher
> shows seed children next to the honest "attendance not available" alert.

## Implementation Plan

_Written by fe-planner, 2026-08-02. Grounded in code read at plan time (see file
citations per phase) — no code written here._

### 0. Findings that shape the plan (read the actual files first)

- **BE gap confirmed current** in `edu-api/services/core/docs/openapi.yaml`
  `GET /api/v1/members/{memberId}/attendance` (operationId `getMemberAttendance`,
  ~line 2757): authorization = STUDENT-self or ADMIN/SUPER_ADMIN only. PARENT is
  absent. Constraints documented on the SAME endpoint we'll mirror in mock mode:
  `endDate < startDate → 400 ATTENDANCE_INVALID_DATE_RANGE`, `range > 366 days →
  400 ATTENDANCE_DATE_RANGE_TOO_LARGE`. Response schema `MemberAttendanceResponse`
  = `{ memberId, records: MemberAttendanceDayRecord[] }`,
  `MemberAttendanceDayRecord = { date, classId, status: AttendanceStatus }` (~line
  9518). → mock fixture DTO should mirror this exact shape (see Phase 2).
- **`child-switcher` data source has the SAME name-resolution gap as timetable's
  `TimetableChild`** — confirmed by reading `grades.di.ts` line 194-197:
  `makeGetChildListUseCase()` is commented "US-E13.7 — parent child-switcher:
  permanently mock (ADR 0054)" and the real `GradeBookRepository.getChildList()`
  (`grade-book.repository.ts:146-151`) unconditionally rejects with
  `{ type: "not-found" }` because `GET /members/{id}/linked-students` has no
  display fields. This is pre-existing, already-shipped, already-accepted behavior
  — **do not fix it in this story**. Per fe-lead's guidance and the
  component-organization rule (reuse > fork), this US reuses `child-switcher`
  as-is via the SAME `makeGetChildListUseCase()` factory grades already exports.
  `LinkedStudentSummary` (US-E20.4, real names) is NOT swapped in — `ChildSummary`
  (id/name/className/avatar/color) is a different, richer shape the switcher's
  presentation depends on (avatar color token, className label); swapping would
  require rebuilding the switcher, which is explicitly out of scope here.
- **Status vocabulary already established and reusable as-is**: `attendance.status`
  i18n namespace (`messages/vi.json` line ~800, keys `present`/`late`/
  `excusedAbsent`/`absent`) + tone mapping used today in
  `attendance-history-day-summary-row.tsx`: `present→success`, `late→info`,
  `excusedAbsent→warning`, `absent→error`, rendered via the SHARED
  `components/shared/status-badge` (`StatusBadge` — icon/label capable, not
  color-only). This is the exact tone table + component to reuse; no new badge,
  no new i18n status keys.
- **No existing shared "attendance status badge" component to promote** —
  `AttendanceHistoryDaySummaryRow` is itself feature-local/1-screen
  (comment says so explicitly) and just composes `StatusBadge` + `Table`. We'll
  do the same inline composition in the new feature, not import that row
  component (it's shaped for aggregate day-counts, not one-status-per-day).
- **Hybrid-repository precedent** (`HybridWeeklyTimetableRepository`,
  `bootstrap/di/timetable-view.di.ts`) is NOT a fit here: that pattern exists
  because the real repo IS reachable/tested for part of its surface. Here there
  is zero reachable real surface (403 by design for every parent caller) — so per
  the story's own explicit US-E18.20 lesson, this plan keeps the repository
  **mock-only** and does NOT write a parallel "real" repository class that is
  never constructed. (A thin `forbidden`-throwing stub is written ONLY as domain
  documentation value if `fe-tech-lead-reviewer` wants contract-readiness; default
  is: skip it, note the gap in a code comment on the DI factory instead, mirroring
  `makeGetChildListUseCase`'s own comment style.)

### Phase 1 — Domain (new `src/features/parent-attendance/domain/`)

**Module boundary decision**: new sibling feature, NOT extending
`features/attendance`. Read `features/attendance/domain/{entities,failures,
repositories}` — every entity (`AttendanceRecord`, `AttendanceDaySummary`,
`AttendanceRoster`, `ClassDate`) and the single `IAttendanceRepository` are
shaped around **teacher/homeroom** concerns (a class roster on a date, day-level
aggregate counts across a class). There is no per-student-across-many-days shape
and no "child" concept in that feature at all — bolting a parent read-path onto
it would mean adding an unrelated repository method to an interface consumed by
teacher screens (`attendance-screen.tsx`, `attendance-history-tab.tsx`), violating
its existing single-responsibility scope. The ONLY reusable piece is the
`AttendanceStatus` union type — reused by **type import**, not by extending the
interface: `import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity"`.
This keeps one canonical status vocabulary (no drift) while keeping the two
features' repositories independent, matching how `grades`' `GetChildGradesUseCase`
already reuses `IGradeBookRepository` for both class-view and self/child-view
(same repo, no cross-feature reach) — the analogous move here is a same-shape
NEW interface in the new feature, not reuse of `IAttendanceRepository` itself.

Files:
- `domain/entities/child-attendance-record.entity.ts`
  ```ts
  import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
  /** One day's attendance for a single linked child (mirrors BE's
   *  `MemberAttendanceDayRecord` minus `classId` — no wire source needed by the
   *  UI yet; drop, don't fabricate, per the `AttendanceRecord` precedent). */
  export interface ChildAttendanceRecord {
    date: string; // YYYY-MM-DD
    status: AttendanceStatus;
  }
  ```
- `domain/entities/attendance-date-range.entity.ts` — `{ startDate: string; endDate: string }` (reuse shape, don't import attendance feature's `date-range.ts` helpers directly since those are UTC day-math utilities, not a type — copy the two pure helpers `daysInclusive`/`enumerateDates` verbatim into this feature's own `domain/date-range.ts`, OR import them directly since they're pure/framework-free and domain→domain import is allowed per the layer table (`domain/` may import "chỉ types nội bộ" — re-check: table says domain imports nothing external; a cross-feature domain-to-domain pure-function import is a judgement call). **Decision: copy, don't import** — 6 lines of pure UTC math, and it avoids a domain→domain dependency edge between features that CLAUDE.md's layer table doesn't explicitly bless. Small duplication is cheaper than a cross-feature coupling here (YAGNI/KISS beats DRY at this size).
- `domain/failures/parent-attendance.failure.ts`:
  ```ts
  export type ParentAttendanceFailure =
    | { type: "forbidden" }        // real branch, if ever reached — mirrors ATTENDANCE_FORBIDDEN
    | { type: "invalid-date-range" }   // mirrors ATTENDANCE_INVALID_DATE_RANGE
    | { type: "date-range-too-large" } // mirrors ATTENDANCE_DATE_RANGE_TOO_LARGE
    | { type: "not-implemented" }  // honest "not available yet" degrade (per AC)
    | { type: "network-error" }
    | { type: "unknown"; message?: string };
  ```
- `domain/repositories/i-child-attendance.repository.ts`:
  `getChildAttendance(childId: string, range: AttendanceDateRange): Promise<ChildAttendanceRecord[]>`
  (throws `ParentAttendanceFailure`-shaped errors, same convention as
  `IGradeBookRepository`/`IAttendanceRepository`).
- `domain/use-cases/get-child-attendance.use-case.ts` — mirrors
  `get-child-grades.use-case.ts`'s `execute(childId, range)` shape AND does the
  date-range validation **in the use-case** (not the repo) so it runs identically
  mock or real later:
  ```ts
  export class GetChildAttendanceUseCase {
    constructor(private readonly repo: IChildAttendanceRepository) {}
    async execute(childId: string, range: AttendanceDateRange) {
      if (range.endDate < range.startDate) return { ok: false, error: { type: "invalid-date-range" } };
      if (daysInclusive(range.startDate, range.endDate) > 366) return { ok: false, error: { type: "date-range-too-large" } };
      try { return { ok: true, data: await this.repo.getChildAttendance(childId, range) }; }
      catch (err) { return { ok: false, error: toFailure(err) }; }
    }
  }
  ```

**Test first (red)**: `get-child-attendance.use-case.test.ts` —
  - `endDate < startDate` → `invalid-date-range`, repo never called (assert mock not invoked).
  - range of exactly 367 days → `date-range-too-large`; 366 days → passes through to repo.
  - repo resolves → `{ ok: true, data }` passthrough.
  - repo throws typed failure → passthrough; repo throws untyped → `unknown`.

**Done when**: use-case unit tests green, zero framework imports in `domain/`.

### Phase 2 — Infrastructure (mock-only, server-only)

Per Finding above: **no real repository class this phase** (avoids the
US-E18.20 trap of a written-but-never-constructed "real" implementation).
Instead:

- `infrastructure/dtos/child-attendance-response.dto.ts` — mirrors
  `MemberAttendanceResponse`/`MemberAttendanceDayRecord` 1:1 (camelCase, includes
  `classId` at DTO level even though the domain entity drops it — so the DTO is
  wire-ready the day this is unmocked):
  ```ts
  export interface ChildAttendanceDayRecordDto { date: string; classId: string; status: AttendanceStatus }
  export interface ChildAttendanceResponseDto { memberId: string; records: ChildAttendanceDayRecordDto[] }
  ```
- `infrastructure/mappers/child-attendance.mapper.ts` — DTO → `ChildAttendanceRecord[]`
  (drops `classId`, comment why, same pattern as `attendance.mapper.ts` dropping
  `studentCode`).
- `infrastructure/repositories/mocks/fixtures.ts` — 1-2 children × a realistic
  month of `ChildAttendanceDayRecordDto[]` (mostly present, a few late/excused/
  absent) so all 4 statuses render at least once in Storybook/manual QA.
- `infrastructure/repositories/mocks/mock-child-attendance.repository.ts` —
  implements `IChildAttendanceRepository`, `await mockDelay()`, filters fixture
  records to `[startDate, endDate]` inclusive (exercises the date-range fan-out
  even in mock mode, per AC "sensible default range" behavior), maps via the
  mapper.
- **`bootstrap/di/parent-attendance.di.ts`** (`'server-only'`):
  ```ts
  export async function makeGetChildAttendanceUseCase() {
    // PERMANENTLY MOCK — GET /members/{memberId}/attendance excludes PARENT from
    // its authorization list (edu-api openapi.yaml ~L2757); a real repository
    // branch here would 403 by design, not by accident. Cross-repo ask filed
    // (see story Harness Delta). Un-mock only after BE adds PARENT to the ACL
    // or ships a parent-scoped variant — then wire a real
    // `ChildAttendanceRepository` here the same way `grades.di.ts` wires
    // `GradeBookRepository`.
    return new GetChildAttendanceUseCase(new MockChildAttendanceRepository());
  }
  ```
  No `USE_MOCK` branch, no dead real-repo import — matches `makeGetChildListUseCase`'s
  own unconditional-mock style (`grades.di.ts:194-197`) and `makeApprovalRepo`'s
  documented-unreachable-real-branch style (`grades.di.ts:205-218`), but goes one
  step further and doesn't even write the unreachable class, since (unlike grade
  approval) there's no partial real surface anywhere to justify writing it.

**Test first (red)**: `mock-child-attendance.repository.test.ts` — returns only
records within range, ordered ascending, correct status mix; `child-attendance.mapper.test.ts`
— DTO→entity drops `classId`, preserves date/status.

**Done when**: mock repo + mapper unit tests green. No `infrastructure/` file
imports React/Next client APIs (`server-only` guard on the DI factory catches
this at build time already).

### Phase 3 — Presentation + route + i18n

Files:
- `features/parent-attendance/presentation/parent-attendance-screen/parent-attendance-screen.i-vm.ts`:
  ```ts
  export interface ParentAttendanceScreenVM {
    childList: ChildSummary[];       // from grades' entity — see below
    activeChildId: string | null;    // null = zero-children empty state
    range: { startDate: string; endDate: string };
    records: ChildAttendanceRecord[];
    error: ParentAttendanceFailure["type"] | null;
  }
  ```
  Reusing `ChildSummary` (grades' entity) as the VM's child-list type — since
  `child-switcher` is imported as-is and is typed against it; importing the type
  cross-feature is consistent with how `AttendanceStatus` is reused above
  (type-only reuse, no repo/use-case coupling).
- `parent-attendance-screen.tsx` (`'use client'`) — composes:
  - `<ChildSwitcher>` (imported directly from
    `@/features/grades/presentation/child-switcher/child-switcher` — reused
    component, per component-organization.md item 3's "promote don't fork";
    since it's still only used by 2 screens inside the SAME feature owner
    (grades) plus this new consumer, and the rule's promotion trigger is "used
    by ≥2 *screens*" not "≥2 features" — this already crosses that line. **Flag
    to fe-component-architect**: should `child-switcher` be promoted to
    `components/shared/child-switcher/` now that a second feature consumes it?
    Leaning yes — see Open Questions.)
  - A date-range control (reuse `components/ui/` `Popover` + `Calendar` primitives
    the same way any existing date-range picker in the repo does — grep
    `components/ui` for an existing range-picker composition before adding a new
    one; if none exists, two native `<input type="date">` bound to `startDate`/
    `endDate` is an acceptable KISS fallback given no design-spec entry exists for
    this screen).
  - An attendance list: `<table>` (or `Table` primitive) with one row per
    `ChildAttendanceRecord`, `StatusBadge` per the reused tone map
    (`present→success`, `late→info`, `excusedAbsent→warning`, `absent→error`),
    `t("attendance.status.<status>")` reused verbatim (no new i18n keys for
    status labels).
  - Empty state (zero children): reuse the exact empty-state component/copy
    `parent/grades` uses today (check `GradeBookContainer`'s no-child branch —
    read it before implementing to copy the pattern, not just the intent).
  - Loading/error states per VM's `error` field, mirroring `grades`' `isGradeBookFailure`-style
    discriminant helper (`build-grade-book-vm.ts` precedent) — write an
    analogous small `is-parent-attendance-failure.ts` helper, don't inline
    ternaries in the container.
- `parent-attendance-screen.stories.tsx` — states: loading, empty (0 children),
  1 child default range populated, child-switch triggers different data,
  error (each failure type at least once), all-4-statuses-visible.
- i18n: **new namespace `parentAttendance`** in `messages/{vi,en}.json` for
  screen-only chrome (page title, date-range labels, empty-state copy if it
  differs from grades' own, error copy per failure type) — reuse
  `attendance.status.*` for status labels and `gradeBook.childSwitcherLabel`
  stays as child-switcher's own internal label (unchanged, cross-namespace,
  already how it works today). Do NOT mint parallel `present`/`absent`/etc. keys.

**Test first (red)**: Storybook interaction test — render with 2 children →
switch child → assert list re-renders with the second child's fixture data;
zero-children fixture → assert empty-state copy visible; assert each status
row renders BOTH an icon/tone AND the text label (not tone-only) per a11y AC.

**Done when**: interaction tests green, `bun build` clean, design-review gate
scheduled (no design-spec entry to diff against — note that explicitly at the
gate per Product Docs section).

### Phase 4 — Route

- `app/[locale]/t/[tenant]/(app)/parent/attendance/page.tsx` (RSC) — mirrors
  `parent/grades/page.tsx`'s shape most closely (both need a resolved child +
  range before first render, unlike `parent/children`'s simpler no-await
  pattern):
  - reads `searchParams` for `childId`/`startDate`/`endDate` (URL state per
    CLAUDE.md's "server / URL / local-form" classification — no client store);
  - default range = current month if absent (compute via a small pure helper,
    tested);
  - calls `makeGetChildListUseCase()` (existing, from `grades.di.ts` — reused,
    not re-exported/duplicated) for the child list, `makeGetChildAttendanceUseCase()`
    (new) for records;
  - default `childId` = first child in list if absent from URL (unlike
    `parent/grades`'s hardcoded `MOCK_CHILD_ID` — that hardcoding is grades'
    own simplification, not something to copy forward; here we have the real
    child list already loaded so deriving the default properly is free).
  - no manual role check — `parent/layout.tsx` already gates `role === "parent"`
    (confirmed pattern from `parent/children/page.tsx`).
- `parent/attendance/actions.ts` (if switching child/range needs a Server
  Action re-fetch rather than a link-based `searchParams` navigation — prefer
  the link/searchParams navigation actually, since it's simpler and matches
  "URL state" classification; only add `actions.ts` if child-switch can't be a
  plain `<Link>` because `ChildSwitcher`'s `onSwitch` prop expects a callback,
  not an href — check `grade-book-container.tsx` for how it wires `onSwitch`
  today and mirror that exact wiring, whatever it turns out to be).

**Done when**: route resolves for a parent test account with mock data, 404
sidebar link is closed.

### Component + state sketch

```
ParentAttendancePage (RSC)
 └─ ParentAttendanceScreen (client)
     ├─ ChildSwitcher (reused, features/grades/presentation/child-switcher)
     ├─ DateRangeControl (new, small, local to this feature — 2 native date
     │   inputs or Popover+Calendar composition, decided during Phase 3 build)
     └─ AttendanceRecordsList (new, table + StatusBadge rows)
```

State classification: **URL state** (`childId`, `startDate`, `endDate` as
search params — matches `parent/grades`'s `term`/`childId` precedent) driving a
**server-computed** VM (no TanStack Query needed client-side since the RSC
already resolves everything server-side per request, same as `parent/grades`
today — no client-side refetch-on-switch machinery required, switching child
is a navigation, not a query invalidation). **No Zustand, no client fetch.**
Given this, `fe-state-engineer` is **not needed** — this follows the exact
RSC+searchParams pattern `parent/grades` already ships. `fe-component-architect`
worth a quick pass ONLY for the child-switcher promotion call (see Open
Questions) — not for the rest of the tree, which is small and conventional.

### Risks, dependencies, open questions

- **[OPEN QUESTION]** Promote `child-switcher` from
  `features/grades/presentation/` to `components/shared/child-switcher/` now
  that a second feature (`parent-attendance`) consumes it? Per
  `component-organization.md`'s literal trigger ("composed, dùng ≥2 screen →
  shared/"), this crosses the line the moment this story lands. Recommend
  fe-component-architect make the call; low risk either way since the move is
  a folder relocation + import path updates, no behavior change.
- **[OPEN QUESTION]** Date-range control: no `docs/product/design-spec.jsonc`
  entry exists for this screen (confirmed absent). Decide during Phase 3
  whether native `<input type="date">"` pair is acceptable for a11y/visual
  consistency or whether this needs a `uiux` design pass first — flag to
  fe-lead before Phase 3 if a design-spec entry is wanted before shipping.
- **[OPEN QUESTION]** Should the mock-only DI factory (Phase 2) also write a
  never-constructed real `ChildAttendanceRepository` class purely for
  contract-readiness (so unmocking later is a smaller diff), or is that exactly
  the anti-pattern the US-E18.20 lesson warns against? This plan defaults to
  **not writing it** — flag to fe-tech-lead-reviewer for a final call at review
  time, since reasonable people could land either side.
- **Cross-repo ask**: already filed per story's Harness Delta section (add
  PARENT to `getMemberAttendance` ACL, or a parent-scoped variant) — no new
  action needed here beyond what's already tracked.
- **No design-spec entry** — call this out explicitly at the design-review gate
  (`docs/DESIGN_REVIEW.md`) so the reviewer doesn't look for a spec that doesn't
  exist; token/pattern reuse (StatusBadge, ChildSwitcher, card/table primitives)
  is the substitute for a spec here.
- **a11y**: date inputs need visible `<label>` + keyboard operability (native
  `<input type="date">` gets this for free); attendance rows need table
  semantics (`<table>`/`Table` primitive, not `<div>` grids) per AC.

## Component Architecture

_Written by fe-component-architect, 2026-08-02. Resolves the planner's [OPEN
QUESTION] on `child-switcher` promotion. Read: `child-switcher.tsx`,
`.i-vm.ts`, `.stories.tsx`, `parent/grades/page.tsx`, `grades.di.ts:190-197`._

### 1. Decision — PROMOTE

`ChildSwitcherVM` (`{ childList: ChildSummary[]; activeChildId: string }`) is
**already feature-agnostic** — `ChildSummary` (`childId, name, className,
avatar, color: ChildColor`) carries zero grades-specific data (no scores, no
term, no subject). This is the "already generic" case, not the
`TimetableChild`-vs-`PrincipalTeacher` case (those genuinely differed in
shape/fields). `parent-attendance`'s child list is the exact same
`ChildSummary[]` (same `makeGetChildListUseCase()` factory, per planner's
Finding — no new data source). Per `component-organization.md`'s literal
trigger ("composed, dùng ≥2 screen → `shared/`"), this crosses the promotion
line the moment this story lands, and the contract is a straightforward
relocation with **zero behavior/type change** — do it now, not later.

**Bonus finding**: `ChildSummary`/`ChildColor` are currently mis-homed in
`features/grades/domain/entities/grade-book.entity.ts` — they were only ever
a *display contract for this switcher UI*, not a grades domain concept (no
grades feature file gives them business meaning beyond "render this row").
Promoting the component is the right moment to also move these two types
into the component's own `.i-vm.ts` (the canonical shared-UI contract), not
leave them sitting in a feature's `domain/` for a `components/shared/`
component to reach back and import (that would violate presentation's "own
`.i-vm.ts` only" boundary in reverse — a shared component importing a
specific feature's domain entity is the same smell as a feature importing
another feature's domain).

### 2. New canonical home

`src/components/shared/child-switcher/` (folder + `index.ts` + `.stories.tsx`
+ `.i-vm.ts`, per repo convention). **Move, don't copy** — delete the
`features/grades/presentation/child-switcher/` folder entirely; `grades`
imports the shared one going forward, same as `parent-attendance` will.

- `components/shared/child-switcher/child-switcher.i-vm.ts` (NEW canonical
  location for the type, moved verbatim out of `grade-book.entity.ts`):
  ```ts
  export type ChildColor = "primary" | "success" | "warning" | "error" | "purple";

  export interface ChildSummary {
    childId: string;
    name: string;
    className: string;
    /** 2-char initials for avatar fallback */
    avatar: string;
    /** design-token role string → maps to --edu-<color> CSS var in presentation */
    color: ChildColor;
  }

  export interface ChildSwitcherVM {
    childList: ChildSummary[];
    activeChildId: string;
  }
  ```
  `features/grades/domain/entities/grade-book.entity.ts` re-exports (or
  callers import directly from the new home — prefer the latter, update the
  ~3-4 grades call sites: `grade-book-screen.i-vm.ts`, `grade-book-screen.tsx`,
  `grades/page.tsx`'s `MOCK_CHILD_ID` neighbor, grade-book fixtures) — do NOT
  leave a dangling re-export "for compat"; this repo prefers explicit import
  fixups over indirection layers (grep-and-replace `../../domain/entities/
  grade-book.entity` → `@/components/shared/child-switcher` for these two
  types only, leaving `GradeBookRow`/`GradeBook`/etc. in place).
- `components/shared/child-switcher/child-switcher.tsx` — the component body
  moves **unchanged** (see parity checklist below — this is the whole point:
  no visual/behavioral edit during the move itself).

### 3. Parity checklist (verify BEFORE/AFTER move — the US-E20.4 lesson)

Every one of these must render identically for `parent/grades` post-move.
Do not "clean up" any of these during promotion — a promotion PR is a move,
not a redesign:

- **Card wrapper**: `rounded-[12px] border border-border bg-card p-4`.
- **Label**: uppercase, `font-bold text-edu-text-secondary text-xs
  tracking-wider`, `id="child-switcher-label"`, `aria-labelledby` on
  `role="tablist"`.
- **Tab button**: `min-h-[44px] min-w-[44px]` (touch target), `rounded-[10px]`,
  `border-width: 1.5px`; active = `borderColor: colorVar` +
  `backgroundColor: color-mix(in srgb, ${colorVar} 8%, transparent)`;
  inactive = `border-[var(--edu-border)]` + `bg-[var(--edu-card)]`.
  `isLoading && !isActive` → `opacity-60 cursor-not-allowed` +
  `aria-disabled="true"`.
- **Avatar circle**: exactly `size-[26px]`, `text-[10px] font-bold`,
  `COLOR_VAR`/`COLOR_TEXT` maps unchanged (these encode the ADR-0049 contrast
  fixes — `primary` uses `--edu-primary-accessible` 4.88:1, NOT
  `--edu-primary`; do not "simplify" back to the fail-contrast token).
  `aria-hidden="true"` on the avatar span (name text is the accessible name).
- **Name/class text**: `font-[800] text-[12.5px]` name, `text-[10.5px]
  text-edu-text-secondary` className, both `leading-tight`.
- **Keyboard model**: `role="tablist"`/`role="tab"`, roving `tabIndex`
  (active = 0, rest = -1), `ArrowRight`/`ArrowLeft` move focus only (wrap,
  don't change selection), `Enter`/`Space` activates (blocked when
  `isLoading && !active`). `aria-selected`, `aria-controls="tabpanel-<id>"`,
  `id="tab-<id>"`.
- **i18n**: label copy currently reads `useTranslations("gradeBook")` →
  `t("childSwitcherLabel")`. **This must change** — a shared component cannot
  own a feature namespace. Move the key to a namespace that reads naturally
  for a shared UI atom, e.g. `Common.childSwitcherLabel` (same vi/en string
  value, just relocated key path in `messages/{vi,en}.json`) — update both
  `grades`' AND the new `parent-attendance` screen's usage to the new key;
  grep for `childSwitcherLabel` to catch every reference (including
  `.stories.tsx`/`.test.tsx` assertions that may snapshot the string, though
  they shouldn't since they query by role/name text not translation key).
- **All 4 existing Storybook stories** (`ParentView_SingleChild`,
  `ParentView_MultiChild_Tab1`, `ParentView_SwitchLoading`,
  `ParentView_MultiChild_Switch`) move verbatim to
  `components/shared/child-switcher/child-switcher.stories.tsx` with updated
  import paths only — same assertions, same fixtures (`MOCK_VIEWER_CHILDREN`
  import path updates but content unchanged). Re-run them post-move as the
  parity proof (this is stronger than eyeballing — the interaction tests
  already assert every behavioral trait above).

### 4. Consumers after promotion

```
parent/grades/page.tsx (RSC)
 └─ GradeBookScreen ('use client', features/grades/presentation)
     └─ ChildSwitcher (shared, components/shared/child-switcher) — reused, no change

parent/attendance/page.tsx (RSC, NEW)
 └─ ParentAttendanceScreen ('use client', features/parent-attendance/presentation)
     └─ ChildSwitcher (shared, components/shared/child-switcher) — SAME import, same props
```

Both screens own their own `onSwitch` wiring (`grades` uses `onChildSwitch`
prop → `GradeBookScreen`'s own callback chain per `grade-book-screen.tsx:262-269`;
`parent-attendance` wires its own per Phase 4 of the Implementation Plan —
prefer a plain `<Link>`/`searchParams` navigation over a client callback if
`ChildSwitcher`'s `onSwitch: (childId: string) => void` prop can be satisfied
by a thin `(id) => router.push(...)`/form-action wrapper; either is fine,
`ChildSwitcher` itself is agnostic to how the parent screen reacts to
`onSwitch`). **`isLoading` prop is a controlled prop from each screen's own
pending-state** (grades: `isLoading` screen prop; parent-attendance: derive
from its own transition/loading state) — `ChildSwitcher` owns no internal
loading state, this is unchanged by the move.

### 5. `parent-attendance`'s own tabpanel wiring (new, not part of the shared component)

`GradeBookScreen` builds `panelProps` (`role="tabpanel"`,
`id="tabpanel-<activeChildId>"`, `aria-labelledby="tab-<activeChildId>"`) on
its OWN content wrapper to complete the tablist/tabpanel pair — this pairing
lives in the CONSUMER, not in `ChildSwitcher` (correct: the switcher doesn't
know what content it's switching). `ParentAttendanceScreen` must build the
identical `panelProps` pattern on its own attendance-list wrapper (same id
scheme: `tabpanel-${activeChildId}` / `tab-${activeChildId}`) — copy this
exact pattern from `grade-book-screen.tsx:102-110`, don't reinvent.

### 6. `AttendanceStatus` cross-feature import — CONFIRMED safe, no mirror

Type-only import (`import type { AttendanceStatus } from
"@/features/attendance/domain/entities/attendance-status.entity"`) into
`features/parent-attendance/domain/` is fine as the planner proposed. It's a
zero-dependency string-literal union (no framework, no other type refs) —
importing the type creates no runtime coupling and keeps one canonical status
vocabulary (avoids the drift a hand-mirrored `type AttendanceStatus = ...`
copy would eventually suffer if the real union ever grows a 5th state). This
is a plain type import, not a repository/use-case reach across features, so
it doesn't trip the "one repo per feature" boundary the planner correctly
protected in Phase 1 — no mirror needed.

### Missing primitives

None. No new shadcn primitive required — `Table`/`Popover`/`Calendar` (Phase
3's date-range control) all already exist under `components/ui/`; confirm at
build time, not flagged here as missing.
