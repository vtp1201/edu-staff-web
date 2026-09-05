# US-E24.9 Implementation Plan — Timetable tab: class week + period-log (GVBM) +
# period-prep (GVBM) + homeroom daily log (GVCN)

Owner: fe-planner. No code written here. Lane **high-risk** — 3 write surfaces
(`period-logs` PUT/DELETE, `period-preps` PUT/DELETE, `homeroom-entries`
submit-family) gated by slot/role; every mutation gets a forge-authCtx test
calling the use-case directly (decision 0063), authCtx assembled ONLY in
`bootstrap/di/`.

## 0. Ground-truth corrections vs the packet/epic text

1. **i18n namespace is `teacherClasses.hub.*`, not `teacher.classHub.*`.**
   Grepped `vi.json` (US-E24.8 already shipped `teacherClasses.hub.tabs.*`,
   `teacherClasses.hub.placeholder.body.timetable` — a placeholder string this
   story now replaces). All new copy goes under
   `teacherClasses.hub.timetable.*`. The packet's own Design Notes/Dependencies
   sections say `teacher.classHub.*` — that key path does not exist anywhere
   in this repo; follow the shipped namespace, not the packet prose.
2. **`period-logs`/`period-preps` have exactly ONE real security boundary:
   the BE.** Ground-truthed `services/core/docs/openapi.yaml` +
   `ERROR_CODES.md`: authorization is **re-resolved server-side from the live
   timetable slot** on every write — the client never sends a
   `teacherMemberId` in the body, and BE deliberately folds "no slot" / "wrong
   teacher" / "MANAGER read-only" / weekend date into ONE 422
   (`PERIOD_LOG_NO_SLOT` / `PERIOD_PREP_NO_SLOT`, VULN-233-001 — a 403 would be
   an occupancy oracle). This means period-log/prep are **not** a permanently
   mock-first feature the way the three canonical decision-0063 instances are
   (`staff-discipline`, `student-absences`) — the client-side `authCtx` guard
   here is a genuine **defense-in-depth / instant-feedback UX** layer on top of
   an already-authoritative BE check, not the sole enforcement. The AC's
   forge-role test requirement still applies verbatim (direct use-case call,
   zero HTTP, `FORGED_ROLES`-style sweep) — §5 below designs it — but the plan
   states this nuance explicitly so `fe-tech-lead-reviewer` doesn't mis-read it
   as "the only check" the way the three original instances are.
3. **The check lives in the USE-CASE, not the repository** (documented
   divergence from 0063's canonical shape, justified by #2): because BE
   re-derives the slot's teacher itself, the repository has nothing of its own
   to verify against — the one piece of data the guard needs
   (`assignedTeacherMemberId`, i.e. `slot.teacherMemberId`) is already known
   to the **caller** (the day-card server component already rendered it for
   the highlight/label), not fetched again by the repo. `SavePeriodLog`/
   `DeletePeriodLog`/`SavePeriodPrep`/`DeletePeriodPrep` use-cases take
   `assignedTeacherMemberId` as an explicit call arg and assert
   `authCtx.memberId === assignedTeacherMemberId` as their FIRST statement,
   before touching the repo (0063 point 5's ordering requirement, applied one
   layer up). Satisfies the SAME testability bar: a test instantiates the
   use-case with a spy repo and a forged `authCtx`, asserts the repo method is
   never called.
4. **`getByClass` on `IWeeklyTimetableRepository` is real, contract-correct,
   and simply un-called today** (`RealWeeklyTimetableRepository.getByClass`
   already implements `GET /classes/{id}/timetable`; `Hybrid…` force-routes it
   to mock only because nothing calls it — its own doc comment says "kept for
   the day a direct class-scoped use-case is added"). **That day is this
   story.** Plan flips `HybridWeeklyTimetableRepository.getByClass` to call
   `this.real.getByClass` (one-line change) instead of adding a parallel
   fetch path. No BE gap, no new endpoint.
5. **`teacherMemberId` is already on the wire for `getByClass`**
   (`RealSlotResponseDto.teacherMemberId`, required) but is **not currently
   copied onto `TimetableSlot`** (`mapRealWeeklyTimetable` only sets
   `teacherName: slot.teacherMemberId` — the id as a display fallback, per its
   own "no wire display name yet, ask #6/#7" comment). BE contract-update
   §2.3 **shipped `SlotResponse.teacherName` (optional)** since that comment
   was written — the id-fallback ask is resolved. Plan: extend
   `RealSlotResponseDto` with `teacherName?: string`; `mapRealWeeklyTimetable`
   emits `teacherName: slot.teacherName ?? slot.teacherMemberId` AND a new
   `teacherMemberId: slot.teacherMemberId` field on `TimetableSlot` (additive,
   mirrors the `classId` precedent US-E24.8 added to the by-member mapper).
   The by-member path (`getByMember`/`getByTeacher`, used by other screens) is
   **out of scope** — different consumer, no story need, not touched.
6. **Bell schedule (`startTime`/`endTime`) has no wire source yet** (US-244 is
   `openapi.draft.yaml`, not deployed). Per the AC ("chưa có → không hiện giờ")
   the UI must already be able to render BOTH states, so `TimetableSlot` gets
   two additive optional fields (`startTime?`, `endTime?`, `"HH:mm"`) that the
   REAL mapper leaves `undefined` (documented: draft, not this story's job to
   wire) and the MOCK fixtures populate on a few slots to drive the "Đang diễn
   ra" Storybook state. No ADR needed (additive optional field, not a new
   token/contract commitment) — flag in Risks that this is scaffolding for a
   not-yet-shipped BE story, not a promise of what US-244 will look like.
7. **Week navigation needs a NEW component, not `WeekNav` reuse.** Grepped
   `features/timetable/presentation/timetable-view/week-nav.tsx` — that
   component is **client-`useState` offset-based** (`weekOffset: number`,
   `onChange`), the opposite state model from this story's own AC
   (`?week=YYYY-Www` URL param, server-resolved, matching the class-hub
   shell's own "URL is the state" convention from US-E24.8). Building a
   second, Link-based week-nav local to this tab (§4) is the correct call —
   not a fork of `WeekNav`, a different component for a different state model
   (same reasoning US-E24.8 gave for Link-based tabs vs `WeekNav`'s buttons).
8. **`resolveCurrentTermContext()` (`bootstrap/lib/resolve-current-term.ts`)
   has no `academicYearId`** (only `termId`/`termName`/`academicYearLabel` —
   `academicYearLabel` is the display STRING, not the UUID the PUT/DELETE body
   needs). `AcademicYear.id` already exists on the entity. Plan adds
   `academicYearId: activeYear.id` to `CurrentTermContext` (additive field,
   same shared resolver every real timetable call already uses — no new
   composition).
9. **`ClassLogRepository`/`MockClassLogRepository` have NO authCtx check at
   all today** (pure passthrough to BE — `createEntry`/`submitEntry`/
   `reviseEntry` take no role/scope param; the teacher route's own
   `actions.ts` hardcodes `approveEntryAction`/`rejectEntryAction` to always
   return `unauthorized` as a ROUTE-LEVEL split, not a repository check). This
   is a pre-existing gap, out of scope to retrofit (packet: "không viết repo
   mới cho homeroom-entries"). BUT this story is the first to expose
   `createEntry`/`submitEntry`/`reviseEntry` on a screen **GVBM can also
   load** (the shared class-hub timetable tab) — previously these actions
   lived only behind `/teacher/class-log`, a route a GVBM would have no nav
   entry to reach in practice. Plan closes this with a **new, small,
   role-only gate at the Server Action layer** (§6) — the 0063-sanctioned
   carve-out ("role-only gating can stop at `requireRole()` + a single
   `role !== X` check with no additional entity" when there's no separate
   per-record scope beyond what the route's own class lookup already proves).
   This is NOT a new repository or a new authCtx entity — it reuses the
   already-fetched `TeacherClass.roles` (from `GetMyClassUseCase`, the same
   call the shell page already makes) as the scope proof.

## 1. Domain — `src/features/period-log/domain/`

**Entities**
- `entities/period-log.entity.ts`
  ```ts
  export type PeriodGrade = "A" | "B" | "C" | "D";
  export interface PeriodLog {
    classId: string; date: string; periodNumber: number;
    termId: string; dayOfWeek: "MON"|"TUE"|"WED"|"THU"|"FRI";
    subjectId: string; teacherMemberId: string;
    lessonTitle: string; remark: string; grade: PeriodGrade; absentCount: number;
    createdAt: string; updatedAt: string;
  }
  export interface SavePeriodLogInput {
    lessonTitle: string; remark?: string; grade: PeriodGrade; absentCount: number;
  }
  ```
  (mirrors `PeriodLogEntryResponse`/`UpsertPeriodLogEntryRequest` 1:1,
  ground-truthed against `openapi.yaml` lines 14519-14615 — `remark` is `""`
  not omitted per BE's own doc, so entity keeps it required `string`).
- `entities/period-prep.entity.ts`
  ```ts
  export interface PeriodMaterial { title: string; url: string; }
  export interface PeriodPrep {
    classId: string; date: string; periodNumber: number;
    termId: string; dayOfWeek: "MON"|"TUE"|"WED"|"THU"|"FRI";
    subjectId: string; teacherMemberId: string;
    note: string; lessonPlanId: string | null; materials: PeriodMaterial[];
    createdAt: string; updatedAt: string;
  }
  export interface SavePeriodPrepInput {
    note?: string; lessonPlanId?: string; materials: PeriodMaterial[];
  }
  export const MAX_MATERIALS = 20;
  export const MAX_MATERIAL_TITLE_LENGTH = 200;
  export const MAX_NOTE_LENGTH = 5000; // BE cap (`PERIOD_PREP_INVALID_NOTE`), NOT the packet's UI-only guess
  ```
  (ground-truthed: BE's `note` cap is 5000, not the packet's unstated figure —
  use the contract value).
- `entities/period-log-auth-context.entity.ts` — ONE shared context for both
  sub-resources (same check, same feature — per 0063's "feature-prefixed
  domain entity" naming convention):
  ```ts
  export interface PeriodLogAuthContext {
    role: UserRole;       // from decodeRoleClaim — logged/available for a future admin-write path, not itself the check
    memberId: string;     // decision 0074 — decodeMemberId, never decodeSubClaim
  }
  ```

**Failures** `failures/period-log.failure.ts`
```ts
export type PeriodLogFailure =
  | { type: "slot-forbidden-or-missing" }   // BE 422 PERIOD_LOG_NO_SLOT / PERIOD_PREP_NO_SLOT — NEVER split 403/422 (VULN-233-001)
  | { type: "term-mismatch" }               // BE 409 PERIOD_LOG_TERM_MISMATCH (log only — prep has no 409, see §0 ground-truth)
  | { type: "too-many-materials" }          // 400 PERIOD_PREP_TOO_MANY_MATERIALS (client validates first; this is the BE backstop)
  | { type: "lesson-plan-not-owned" }       // 400 PERIOD_PREP_LESSON_PLAN_NOT_OWNED
  | { type: "validation"; fields?: { field: string; message: string }[] }
  | { type: "not-found" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```
Note: prep's `openapi.yaml` PUT response table lists **no 409** at all (only
400/401/422) — the packet's "409 term-mismatch" line applies to **period-log
only**. `toFailure()` (infra, §2) must not manufacture a prep 409 branch.

**Repository interface** `repositories/i-period-log.repository.ts` — ONE
repository, both sub-resources (precedent: `staff-discipline`'s one-repo/
2-sub-resource shape, memory `project-us-e095-staff-discipline-plan`), 6
methods (packet's own 6 use-case names map 1:1, no single-GET — the week LIST
is the only read this UI needs; a per-period GET is never called):
```ts
export interface IPeriodLogRepository {
  listPeriodLogs(classId: string, from: string, to: string): Promise<PeriodLog[]>;
  savePeriodLog(classId: string, date: string, periodNumber: number,
    ctx: { termId: string; academicYearId: string }, input: SavePeriodLogInput): Promise<PeriodLog>;
  deletePeriodLog(classId: string, date: string, periodNumber: number,
    ctx: { termId: string; academicYearId: string }): Promise<void>;
  listPeriodPreps(classId: string, from: string, to: string): Promise<PeriodPrep[]>;
  savePeriodPrep(classId: string, date: string, periodNumber: number,
    ctx: { termId: string; academicYearId: string }, input: SavePeriodPrepInput): Promise<PeriodPrep>;
  deletePeriodPrep(classId: string, date: string, periodNumber: number,
    ctx: { termId: string; academicYearId: string }): Promise<void>;
}
```

**Use-cases** `use-cases/*.use-case.ts` (6, packet's exact names)
- `GetWeekPeriodLogs.execute(classId, from, to)` → `Result<PeriodLog[]>`
  (thin passthrough, `≤31` days is a BE-enforced cap; client only needs to
  never request > 31d, which the week-nav's own week-length already satisfies).
- `SavePeriodLog.execute(authCtx, params: { classId, date, periodNumber,
  assignedTeacherMemberId, termId, academicYearId, input })` → `Result<PeriodLog>`.
  **First statement**: `if (authCtx.memberId !== params.assignedTeacherMemberId)
  return fail({ type: "slot-forbidden-or-missing" })` — repo never called.
- `DeletePeriodLog` — same guard shape, `Result<void>`.
- `GetWeekPeriodPreps` / `SavePeriodPrep` / `DeletePeriodPrep` — mirror image,
  `SavePeriodPrep`'s guard ALSO enforces `materials.length <= MAX_MATERIALS`
  client-side before the repo call (own `{type:"too-many-materials"}` fail —
  the AC's own wording "link thứ 21 bị chặn" wants this caught before a wasted
  round trip, not only via the BE 400 backstop).

**Test first**
- `save-period-log.use-case.test.ts` / `save-period-prep.use-case.test.ts`:
  spy repo, forged `authCtx.memberId !== assignedTeacherMemberId` for EVERY
  role value (`teacher`, `principal`, `admin`, `student`, `parent` —
  `FORGED_ROLES` sweep per 0063's testability contract) → asserts `ok:false,
  slot-forbidden-or-missing` AND `repo.savePeriodLog`/`savePeriodPrep` **never
  called** (spy call-count 0). Matching case: `authCtx.memberId ===
  assignedTeacherMemberId` → repo called once, happy path passthrough.
- `save-period-prep.use-case.test.ts`: 21-materials input → `too-many-materials`
  without calling repo; 20 → passthrough.
- `delete-period-log.use-case.test.ts` / `delete-period-prep.use-case.test.ts`:
  same forge-role sweep.
- `get-week-period-logs.use-case.test.ts` / preps: found/empty/network-error
  passthrough (thin wrapper, low-value beyond confirming the Result shape).

**Done when**: 6+ use-case test files green; zero framework import in
`features/period-log/domain/`.

## 2. Infrastructure — `src/features/period-log/infrastructure/`

**Files**
- `dtos/period-log-response.dto.ts` / `period-log-list-response.dto.ts` —
  mirror `PeriodLogEntryResponse`/`PeriodLogEntryList` verbatim (camelCase,
  `remark: string` not optional).
- `dtos/period-prep-response.dto.ts` / `period-prep-list-response.dto.ts` —
  mirror `PeriodPrepResponse`/`PeriodPrepList` (`lessonPlanId: string | null`).
- `mappers/period-log.mapper.ts` / `period-prep.mapper.ts` — 1:1 field
  passthrough (no display transforms needed, wire is already the entity
  shape).
- `repositories/period-log.repository.ts` (real) — implements
  `IPeriodLogRepository`. `toFailure()`:
  ```
  PERIOD_LOG_NO_SLOT | PERIOD_PREP_NO_SLOT           → slot-forbidden-or-missing
  PERIOD_LOG_TERM_MISMATCH                            → term-mismatch      (log PUT/DELETE only)
  PERIOD_PREP_TOO_MANY_MATERIALS                      → too-many-materials
  PERIOD_PREP_LESSON_PLAN_NOT_OWNED                   → lesson-plan-not-owned
  PERIOD_LOG_INVALID_* | PERIOD_PREP_INVALID_*        → validation (map message per code, no `fields[]` array on 400s — BE's 400s are single-field domain backstops, not the `/error/fields` 422 shape; only a genuine `VALIDATION_FAILED` 422 carries `fields[]`)
  PERIOD_LOG_NOT_FOUND | PERIOD_PREP_NOT_FOUND        → not-found
  network / no status                                 → network-error
  default                                              → unknown
  ```
  PUT body includes `termId`/`academicYearId` (log) or same (prep); DELETE
  sends them as **query params** (`?termId=&academicYearId=`), per ground
  truth — do not put them in a DELETE body.
- `repositories/mocks/period-log.mock.repository.ts` + `fixtures.ts` —
  in-memory store keyed by `${classId}#${date}#${periodNumber}`. The mock's
  save/delete methods do **not** re-check `assignedTeacherMemberId` (that
  guard is the use-case's job, §1 point 3 — the mock repo is a dumb store,
  same posture as `MockClassLogRepository`). Fixtures seed 2-3 pre-existing
  logs/preps (some materials-list populated, one with `lessonPlanId` set) to
  drive the "already logged"/"already prepared" Storybook states without a
  save round-trip.

**Test first**
- `period-log.repository.test.ts` — PUT body shape assertion (all 4 upsert
  fields), DELETE query-param shape (`termId`+`academicYearId`, NOT body),
  every `toFailure()` branch above (one test per BE code, ground-truthed
  against `ERROR_CODES.md`, not invented).
- `period-log.mock.repository.test.ts` — CRUD round-trip, list range filter.

**Done when**: repository tests green; DTOs compile against the entity 1:1
(no `as unknown as` shape drift).

## 3. Bootstrap

**`bootstrap/lib/resolve-current-term.ts`** (extend, additive)
- `CurrentTermContext` gets `academicYearId: string` (`activeYear.id`).
- **Test first**: extend `resolve-current-term.test.ts` (if it exists; else
  new) asserting `academicYearId` passthrough.

**`bootstrap/endpoint/period-log.endpoint.ts`** (new)
```ts
export const PERIOD_LOG_EP = {
  logs: (classId: string, date: string, n: number) => `/core/api/v1/classes/${classId}/period-logs/${date}/${n}`,
  logsRange: (classId: string) => `/core/api/v1/classes/${classId}/period-logs`,
  preps: (classId: string, date: string, n: number) => `/core/api/v1/classes/${classId}/period-preps/${date}/${n}`,
  prepsRange: (classId: string) => `/core/api/v1/classes/${classId}/period-preps`,
} as const;
```
(`from`/`to` passed as axios `params`, not URL-templated — matches every
other range endpoint in this codebase, e.g. `CLASS_LOG_EP`/timetable).

**`bootstrap/di/period-log.di.ts`** (new)
```ts
async function makeRepo(): Promise<IPeriodLogRepository> {
  if (USE_MOCK) return new MockPeriodLogRepository();
  await ensureFreshSession();
  return new PeriodLogRepository(await createServerHttpClient());
}
async function makeAuthCtx(): Promise<PeriodLogAuthContext> {
  const token = await getAccessToken();
  return {
    role: (token && decodeRoleClaim(token)) ?? "student",   // deny-by-default (0063 point 2)
    memberId: (token && decodeMemberId(token)) ?? "",         // "" can never match a real teacherMemberId (0063 point 6)
  };
}
export async function makeGetWeekPeriodLogsUseCase() { ... }
export async function makeSavePeriodLogUseCase() {
  return { useCase: new SavePeriodLogUseCase(await makeRepo()), authCtx: await makeAuthCtx() };
}
// … 4 more, same shape (Save/Delete pair for logs and preps)
```
Factories that back a **mutation** return `{ useCase, authCtx }` (not a bare
use-case) so the Server Action can't accidentally call `.execute()` without
threading the context — a small self-documenting seam, cheaper than a second
factory-naming convention.

**`bootstrap/di/timetable-view.di.ts`** (extend)
- Add `makeGetClassTimetableUseCase()` → `new GetClassTimetableUseCase(await makeRepo())`.
- Flip `HybridWeeklyTimetableRepository.getByClass` (in
  `real-weekly-timetable.repository.ts`) from `this.mock.getByClass(...)` to
  `this.real.getByClass(...)` — one-line, un-forces the already-real path
  (§0.4). Update that class's own doc comment (currently claims "nothing
  calls it" — no longer true).

**Done when**: `bun build` resolves; no `'server-only'` leak into
`presentation/`.

## 4. Domain (teacher feature) — pure selectors for the tab

`src/features/teacher/domain/` (this tab's own view-logic — cross-feature
composition of timetable + period-log data belongs here per decision 0017,
never inside either feature's own domain):

- `iso-week.ts`: `parseIsoWeek(param?: string): Date` (Monday 00:00, defaults
  to the current week when `param` is absent/malformed — never throws),
  `toIsoWeekParam(monday: Date): string` (`"2026-W36"`), `addWeeks(monday,
  delta)`. Pure, no `Date.now()` inside the parser (caller injects "now" for
  default resolution — testable, per `tdd.md`'s determinism rule).
- `timetable-tab-selectors.ts`:
  - `buildWeekDays(monday: Date): Date[]` (Mon-Sat, 6 days — matches
    `WeeklyTimetable`'s existing `dayIndex 0-5` convention, no Sunday row).
  - `isPeriodLive(slot: { startTime?: string; endTime?: string }, day: Date,
    now: Date): boolean` — `false` whenever either time is undefined (§0.6).
  - `pickUpcomingPeriod(slots, memberId, weekDays, now): { dayIndex; period;
    slot } | null` — the aside panel's "tiết sắp tới". Rule (AC): the
    caller's own nearest slot that is CURRENTLY live OR strictly in the
    future within the rendered week; `null` (→ "Không có tiết sắp tới") when
    none remain (e.g. viewing past Saturday's last period with `now` after
    it — **does not roll into next week's grid**, since this selector only
    sees the currently-rendered week's `slots`; the AC's "qua ngày cuối tuần →
    tiết đầu tuần sau" is satisfied by the PAGE re-running this selector
    against next week's `slots` after a `week=+1` navigation, not by the
    selector itself reaching across weeks — cheaper, keeps the selector
    pure and single-week-scoped).
  - `isMySlot(slot, memberId): boolean` — `slot.teacherMemberId === memberId`
    (drives the "— tiết của bạn" highlight; AC's forged-`sub` test targets
    THIS function directly, passing a `memberId` that deliberately differs
    from a `sub`-shaped id to prove the caller derived `memberId` correctly
    upstream, not `isMySlot` itself misusing `sub`).
  - `logKeyOf(date, periodNumber): string` / `prepKeyOf(...)` — the
    `${date}#${periodNumber}` lookup key shared by the "already logged /
    already prepared" badge and the mock repo's own store key (§2) — ONE
    function, not duplicated between infra and presentation.

**Test first**
- `iso-week.test.ts`: round-trip parse/format, malformed param → current
  week, `addWeeks` wraps year boundary.
- `timetable-tab-selectors.test.ts`: `isPeriodLive` true/false/undefined-time
  matrix; `pickUpcomingPeriod` — mid-week live slot, end-of-week exhausted →
  `null`, no slots at all → `null`, forged `memberId` ≠ any `teacherMemberId`
  → `null` (never highlights/picks another teacher's slot); `isMySlot` forged
  `sub`-vs-`memberId` mismatch case (the AC's own named scenario).

**Done when**: pure selector tests green, zero `Date.now()` inside — every
test injects `now`.

## 5. Server Actions — `app/.../teacher/classes/[classId]/actions.ts` (NEW file)

No `actions.ts` exists yet for this route (page.tsx is 100% read-only today).
```ts
"use server";
export async function savePeriodLogAction(classId, date, periodNumber, assignedTeacherMemberId, input) {
  const { useCase, authCtx } = await makeSavePeriodLogUseCase();
  const { termId, academicYearId } = await resolveCurrentTermContext();
  const result = await useCase.execute(authCtx, { classId, date, periodNumber, assignedTeacherMemberId, termId, academicYearId, input });
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result;
}
// deletePeriodLogAction, savePeriodPrepAction, deletePeriodPrepAction — same shape
```
Daily homeroom-entry actions (§0.9's role-gate carve-out):
```ts
async function assertHomeroomOf(classId: string): Promise<boolean> {
  const result = await (await makeGetMyClassUseCase()).execute(classId);
  return result.ok && result.data.roles.includes("homeroom");
}
export async function saveDailyEntryAction(classId, entryDate, summary, notableEvents?) {
  if (!(await assertHomeroomOf(classId))) return { ok: false, errorKey: "unauthorized" };
  return createEntryAction(classId, entryDate, summary, notableEvents); // reuse verbatim, no fork
}
export async function submitDailyEntryAction(classId, entryId) {
  if (!(await assertHomeroomOf(classId))) return { ok: false, errorKey: "unauthorized" };
  return submitEntryAction(classId, entryId);
}
export async function reviseDailyEntryAction(classId, entryId) {
  if (!(await assertHomeroomOf(classId))) return { ok: false, errorKey: "unauthorized" };
  return reviseEntryAction(classId, entryId);
}
```
(Imports `createEntryAction`/`submitEntryAction`/`reviseEntryAction` straight
from `app/.../teacher/class-log/actions.ts` — cross-route reuse of exported
Server Action functions is a supported Next.js pattern, no re-export shim
needed. `createEntry`'s existing `already-exists` failure covers "one entry
per day", so no separate check needed here.)

**Test first (integration-ish, mirrors `class-log`'s own action test style
if one exists; else a plain unit test with a mocked `makeGetMyClassUseCase`)**:
- `assertHomeroomOf` false (GVBM-only class) → `saveDailyEntryAction`/
  `submitDailyEntryAction`/`reviseDailyEntryAction` ALL return
  `{ok:false, errorKey:"unauthorized"}` **without calling** the underlying
  class-log action (spy import — this is the forge-role test for this
  surface, satisfying 0063's testability bar even though the boundary here
  is a Server Action wrapper, not a repository, per §0.9's documented
  carve-out).

## 6. Presentation — `src/features/teacher/presentation/class-hub/timetable-tab/`

**Files** (composed screen, one real tab body replacing `TabPlaceholder`'s
`"timetable"` branch):
- `timetable-tab.i-vm.ts` — `TimetableTabVm { classId; weekDays: {date;
  dayLabel; isToday; isHoliday}[]; slots: WeeklyTimetable["slots"];
  logsByKey: Record<string, PeriodLog>; prepsByKey: Record<string, PeriodPrep>;
  myMemberId: string; canWriteLog: boolean /* isMySlot per-slot, computed per
  row not globally */; homeroom: { visible: boolean; readOnly: boolean;
  entriesByDate: Record<string, HomeroomEntry> }; upcoming: ReturnType<typeof
  pickUpcomingPeriod>; weekParam: string; prevWeekHref: string; nextWeekHref:
  string; }` — raw data, i18n at presentation per convention.
- `timetable-tab.tsx` — RSC (no client fetch — page.tsx assembles the VM
  server-side, mirrors the shell's own "URL is the state" posture). Renders
  the 2-col grid (`minmax(0,1.7fr) minmax(260px,1fr)`, mobile 1-col per
  design-spec).
- `day-card.tsx` — one day's card: header (today/holiday), period rows.
- `period-row.tsx` — "Tiết n" + subject + teacher + room; own-slot tint +
  "— tiết của bạn"; live badge when `isPeriodLive`; two inline
  action buttons (open `period-log-form`/`period-prep-form`) when
  `isMySlot(slot, myMemberId)`.
- `period-log-form.tsx` / `period-prep-form.tsx` — `'use client'`,
  react-hook-form + zod (matches Design Notes: "form state react-hook-form +
  zod; sau action revalidatePath — Không TanStack"). Zod schemas import the
  entity's own length constants (`MAX_MATERIALS`, `MAX_NOTE_LENGTH`, 200/2000
  for log) — never re-declare magic numbers.
- `materials-field-array.tsx` — add/remove row (title+url), `useFieldArray`,
  disables "Thêm" past 20, inline url-scheme validation message.
- `daily-log-panel.tsx` — the per-day "Sổ chủ nhiệm" strip: GVCN gets
  textarea + Lưu nháp/Gửi duyệt/Sửa&gửi lại (status-branched, reuses
  `class-log-screen`'s existing `statusTone`/badge mapping — import, don't
  re-derive); GVBM/other gets read-only render + "Chỉ GVCN sửa được" caption.
- `upcoming-period-panel.tsx` — aside: 2 status chips (đã/chưa chuẩn bị, đã/
  chưa ghi sổ) + 3 shortcut links (KHGD/Điểm danh/Sổ đầu bài, `?classId=`
  query per packet).
- `class-timetable-week-nav.tsx` — Link-based (§0.7), `href={baseHref}?tab=
  timetable&week=${weekParam}`.

**`tab-placeholder.tsx`** (existing file, US-E24.8) — narrow
`PlaceholderTab` from `Exclude<ClassHubTab, "students">` to
`Exclude<ClassHubTab, "students" | "timetable">` (timetable is no longer a
placeholder); drop the now-dead `PLACEHOLDER_ICON.timetable`/
`teacherClasses.hub.placeholder.body.timetable` key (flag for removal in i18n
pass, §7).

**`app/.../teacher/classes/[classId]/page.tsx`** (existing, extend) — the
`activeTab === "timetable"` branch changes from `<TabPlaceholder tab=…/>` to
an `await`ed VM assembly (list logs+preps for the rendered week range, list
homeroom entries for the same range, resolve `myMemberId`, build the week-nav
hrefs) → `<TimetableTab vm={...} />`.

**Test first (Storybook interaction, per AC's own enumerated states)**:
`timetable-tab.stories.tsx` — `both-roles-today`, `subject-only`,
`homeroom-only-readonly-period`, `rejected-daily`, `holiday`, `no-slots`,
`error`; mobile 375 (1-col, forms don't overflow — form fields `w-full`,
materials rows wrap).

## 7. i18n — `teacherClasses.hub.timetable.*` (extends existing namespace)

- `teacherClasses.hub.timetable.periodLog.{title,lessonTitle,remark,grade,
  absentCount,absentHint,save,delete,deleteConfirm,alreadyLogged,notLogged,
  readonlyForHomeroom}`.
- `teacherClasses.hub.timetable.periodPrep.{title,note,lessonPlan,
  lessonPlanNone,materials,materialTitle,materialUrl,addMaterial,
  removeMaterial,maxMaterialsReached,save,delete,alreadyPrepared,
  notPrepared}`.
- `teacherClasses.hub.timetable.daily.{title,draft,submit,revise,rejectedReason,
  readonlyForSubject}` — reuses `class-log`'s own status-label strings where
  identical (DRAFT/SUBMITTED/APPROVED/REJECTED) rather than duplicating a
  second translation of the same word.
- `teacherClasses.hub.timetable.upcoming.{title,noUpcoming,shortcuts.{
  teachingPlan,attendance,classLog}}`.
- `teacherClasses.hub.timetable.errors.{slot-forbidden-or-missing,
  term-mismatch,too-many-materials,lesson-plan-not-owned,validation,
  not-found,network-error,unknown}` — `PeriodLogFailure["type"]` as the exact
  key set (typed `t()`, per `i18n.md`).
- **Prune**: `teacherClasses.hub.placeholder.body.timetable` (dead once the
  real tab ships) — vi+en both, keep `course`/`homeroom` (still placeholders).

## 8. fe-component-architect / fe-state-engineer — needed?

- **fe-component-architect: recommend spawning, in parallel with
  fe-state-engineer is NOT needed (see below) — this can run solo.** ~9 new
  composed components (day-card, period-row, 2 forms, materials-field-array,
  daily-log-panel, upcoming-panel, week-nav) in one story, several with
  nontrivial prop contracts (per-slot own/live/logged/prepped state fan-out)
  is enough surface to warrant an explicit component-tree pass before the
  engineer starts, particularly: (a) whether `period-row` owns its own
  open/closed drawer state (`useState` local, not lifted — confirm this
  doesn't quietly become an 8th piece of "global" tab state); (b) the daily
  log panel's reuse boundary against `class-log-screen`'s existing
  sub-components (`class-log-entry-form.tsx` — can `daily-log-panel` embed it
  directly instead of re-authoring a textarea+buttons block?).
- **fe-state-engineer: skip**, confirmed by the packet's own Design Notes
  ("Không TanStack cần thiết") and consistent with US-E24.8's precedent (URL +
  RSC-resolved data; forms are local react-hook-form state, `revalidatePath`
  after each Server Action re-renders the RSC tree — no client cache to
  invalidate). Only re-engage if the engineer finds a reason optimistic UI
  (e.g. instant badge flip before `revalidatePath` resolves) is needed beyond
  the standard "form submits, page revalidates, badge updates on the next
  render" flow — YAGNI until then.

## 9. Test plan summary (maps to Validation table)

| Layer | File(s) | Asserts |
| --- | --- | --- |
| Unit | `save-period-log.use-case.test.ts`, `save-period-prep.use-case.test.ts`, `delete-*.use-case.test.ts` | FORGED_ROLES sweep → `slot-forbidden-or-missing`, zero repo calls; happy path passthrough; 21-material cap |
| Unit | `iso-week.test.ts`, `timetable-tab-selectors.test.ts` | week parse/format, `isPeriodLive`, `pickUpcomingPeriod` (incl. forged-memberId, end-of-week exhaustion), `isMySlot` |
| Unit | `get-week-period-logs.use-case.test.ts` (+preps) | found/empty/network-error |
| Integration | `period-log.repository.test.ts` | PUT body shape, DELETE query params, every BE error code → failure branch |
| Integration | `period-log.mock.repository.test.ts` | CRUD + range filter |
| Integration | `classes/[classId]/actions.test.ts` (new) | `assertHomeroomOf` false → 3 daily actions denied without calling class-log actions (forge-role for the homeroom-entries surface) |
| Integration | `weekly-timetable.mapper.test.ts` (extend) | `teacherMemberId`/`teacherName` fallback passthrough on `getByClass` path |
| Story | `timetable-tab.stories.tsx` | both-roles-today / subject-only / homeroom-only-readonly-period / rejected-daily / holiday / no-slots / error, mobile 375 |
| Platform | — | tsc / vitest / build |
| Release | — | design-review + a11y (radio A–D labelled, textarea labelled, badges text+color) + security (authCtx forge-role proofs above) |

## 10. Harness delta for `fe-lead`

- None new — this story fully absorbs its own packet's placeholder-removal
  scope. §0.7's new week-nav component and §0.4's `getByClass` un-mock are
  in-scope file touches, not separate backlog items.

## 11. Risks, dependencies, open questions

- **[OPEN QUESTION]** §0.6's `startTime`/`endTime` fields are pure
  scaffolding for a NOT-YET-SHIPPED BE story (US-244 draft). If US-244 ships
  with a different shape (e.g. bell-schedule as a separate lookup rather than
  per-slot fields), this story's fields become dead weight to migrate, not
  reuse verbatim — flagged, not blocking (additive optional field, cheap to
  change later).
- **[OPEN QUESTION]** `assertHomeroomOf` (§5) re-calls `GetMyClassUseCase`
  (a second `listMyClasses()` scan) inside each daily-entry action, separate
  from the one the shell page already did to render the tab. Acceptable per
  US-E24.8's own precedent (`listMyClasses()` is already the established
  "small list, cheap re-scan" pattern) but flagged in case a future review
  wants an in-request memoization — not built here (YAGNI, no evidence of a
  perf problem).
- **[OPEN QUESTION]** Whether `PeriodLogAuthContext.role` is ever read for
  anything beyond logging/parity with the 0063 shape — today's actual check
  is purely `memberId === assignedTeacherMemberId`. Kept in the entity for
  forward-compat (a future ADMIN-write path) and 0063 shape-consistency, not
  because today's logic branches on it. `fe-tech-lead-reviewer`: confirm this
  unused-today field isn't flagged as dead code — it is intentional interface
  parity, documented here.
- **Risk**: `daily-log-panel` reusing `class-log-screen`'s
  `class-log-entry-form.tsx` sub-component (§8) may require that component to
  accept a narrower/embedded layout prop (it currently renders inside its own
  full-page card chrome) — component-architect to confirm reuse-vs-adapt
  before the engineer starts; if the existing form's chrome can't be
  stripped cheaply, a **new but thin** wrapper around the SAME
  `create/submit/revise` action bindings is acceptable (no new repo/use-case
  either way — the boundary this ADR/lane cares about is untouched).
  Related project memory: `project-messaging-e104-plan` and
  `project-us-e1213-subject-detail-route-plan` both hit this same
  "existing screen component vs. embedded card" tension — resolve the same
  way (extend the existing component with a layout prop, don't fork).
- **Dependency**: none blocking — US-E24.7 (roles/kpi) and US-E24.8 (shell,
  `GetMyClassUseCase`, `?tab=` routing) already merged. This story unblocks
  nothing else in Phase 2 (E24.11/E24.10 don't depend on E24.9's own tab
  body, only on the shell).
