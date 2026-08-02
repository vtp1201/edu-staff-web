# US-E13.9 Teacher Students Roster (index page — closes dead sidebar link)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/teacher/` (new use-case + presentation screen), route `app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx`
- Shared contract/file: none (composes existing `list-my-classes.use-case.ts` + `get-class-students.use-case.ts`; does not touch admin-roster)

## Product Contract

Sidebar nav (`nav-config.ts`, teacher role) already links to `/teacher/students`
but no index route exists — only `teacher/students/[studentId]/academic-record`
(reachable only by direct URL, unreachable via UI). This story adds the missing
index: a read-only list of every student across all of the signed-in teacher's
classes, letting the teacher navigate into a class roster or a student's
academic record.

Ground-truthed reuse (no new BE gap): `list-my-classes.use-case.ts` (teacher's
classes) + `get-class-students.use-case.ts` (per-class roster, already real —
`teacher-class.repository.ts`) are both wired. This story adds ONE new
aggregating use-case, `list-my-students.use-case.ts`, composing them (same
"self-scope composition" pattern as `getByTeacher` in the timetable feature —
`Promise.all` across classes, de-dupe students who share ≥2 classes by
`studentId`, keep the FIRST class match for display). No admin-roster
component may be reused directly (that feature's mutations — enroll/unenroll/
transfer — are ADMIN-only and out of scope; a shared read-only list-row
component MAY be promoted to `components/shared/` if the shape is identical to
the existing `teacher-class-students-screen` roster row — check before adding a
new one, per decision `0026`).

## Relevant Product Docs

- `docs/product/screens.md` (add a row after this is delivered)
- No `docs/product/design-spec.jsonc` entry exists yet for this screen — no
  uiux Design Request either. Build BY REUSE against the existing
  `teacher-class-students-screen` visual pattern (list/table + search + class
  filter) — do not invent new tokens/layout. Flag to fe-lead if a genuinely new
  pattern is needed (it should not be).

## Acceptance Criteria

- Given a teacher with ≥1 assigned class, when they open `/teacher/students`,
  then they see every student across all their classes in one list (name,
  class, avatar-initials), de-duplicated if a student appears in >1 class.
- Given a teacher with zero assigned classes, when they open the page, then
  they see an empty state (reuse `ListSkeleton`/`ListError`/empty pattern from
  `components/shared/`, do not hand-roll a new one).
- Given the aggregating fetch partially fails (one class's roster call
  errors), the screen must not blank out the classes that DID resolve —
  degrade per-class, never all-or-nothing (mirror the `getByTeacher`
  enrollment-degrades-independently posture in timetable).
- Given a teacher clicks a student row, they navigate to that student's
  academic record (`/teacher/students/[studentId]/academic-record`) — the
  existing route, now finally reachable from the UI.
- Search/filter by name and by class (client-side filter over the aggregated
  list is acceptable — no new BE endpoint needed).
- WCAG 2.1 AA: keyboard-navigable rows, visible focus ring, list announced via
  semantic table/list markup, name is the visible+accessible label (not just an
  avatar).

## Design Notes

- Commands: none (read-only screen).
- Queries: `listMyClassesAction()` (existing) → `getClassStudentsAction(classId)`
  (existing) per class, composed by the NEW `list-my-students.use-case.ts`.
- API: `GET /classes` (teacher-scoped), `GET /classes/{classId}/students`
  (`core`, real, already wired in `teacher-class.repository.ts`) — ground-truth
  against `services/core/docs/openapi.yaml` before writing the DTO if the shape
  has drifted since US-E13.1.
- Tables: n/a (client aggregation only).
- Domain rules: de-dupe by `studentId`; keep first class encountered (stable
  order = `list-my-classes` response order).
- UI surfaces: `app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx` (RSC) +
  `features/teacher/presentation/teacher-students-roster-screen/` (new,
  1-screen-only home per decision `0026` — promote to `components/shared/` only
  if a 2nd screen needs the identical row component).

## Validation

| Layer | Expected proof | Actual (2026-08-02) |
| --- | --- | --- |
| Unit | `list-my-students.use-case.test.ts` — aggregation, de-dupe, partial-failure degrade | DONE — 6 cases green (zero classes → no roster calls; class-list failure propagated; flatten order; de-dupe keeps first class; per-class degrade; all-classes-fail → `{rows: [], failedClassCount: N}`). Plus `list-pagination.test.tsx` (7 cases) for the promoted shared pager: single-page → renders nothing, range arithmetic incl. short last page, disabled prev/next, `size-11` touch target, AA text token. |
| Integration | none new (repositories already covered by US-E13.1) | DONE — none added; no new DTO/repo method (the new use-case composes two already-covered use-cases). |
| E2E | Storybook interaction: list render, empty state, search filter, row → academic-record link | DONE — `teacher-students-roster-screen.stories.tsx`: Loading, Empty (zero classes), ErrorState, WithStudents, PartialFailure, AllClassRostersFailed (review fix — all rosters failed shows the retryable error card, NOT "no classes assigned"), SearchFilter (asserts visible header count is filtered), ClassFilter, RowLinksToAcademicRecord. Plus `list-pagination.stories.tsx` (FirstPage / LastPage / SinglePageRendersNothing) and the existing `teacher-class-students-screen.stories.tsx`, which now exercises the same shared pager. |
| Platform | `bun build` clean | DONE — `bunx tsc --noEmit` clean; `bun lint:fix` clean (1 pre-existing unrelated warning in `message-context-menu.tsx`); `bun run build` succeeds with `NEXT_PUBLIC_USE_MOCK` unset, route `/[locale]/t/[tenant]/teacher/students` present. |
| Release | design-review gate + a11y audit green | DONE — `fe-tech-lead-reviewer` + `fe-accessibility-auditor` findings all applied (see Evidence): decision-0026 pager promotion + shared status-tone map, factually-correct all-failed copy, filtered header count, A11Y-001 contrast + 44px touch target. |

## Harness Delta

Registered via `harness-cli story add --id US-E13.9`.

## Evidence

Branch `feat/us-e13.9-teacher-students-roster`. Implementation ran red→green→
refactor (`.claude/rules/tdd.md`): the aggregating use-case tests were written
before `list-my-students.use-case.ts`, and `list-pagination.test.tsx` was
written (and observed failing on a missing module) before the shared pager.

### Delivered

- Domain: `teacher-student-roster-row.entity.ts`, `list-my-students.use-case.ts`
  (fan-out over the teacher's classes; per-class roster failures degrade and are
  counted in `failedClassCount`, never silent — only the class-list call itself
  is whole-screen fatal).
- DI: `makeListMyStudentsUseCase()` in `bootstrap/di/teacher-class.di.ts`
  (reuses the existing repo factory — no new wiring).
- Route: `app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx` (RSC) — the
  previously dead sidebar link now resolves.
- Presentation: `teacher-students-roster-screen/` (+ `components/
  teacher-students-roster-table.tsx`), shared `ListSkeleton`/`ListError`/
  `EmptyState`.
- i18n: `teacherStudentsRoster` namespace in `messages/{vi,en}.json`.

### Review + a11y fix pass (post-implementation)

- MUST-FIX (decision 0026): the local `Pagination` copied between the two
  teacher roster screens was promoted — moved, not copied — to
  `components/shared/list-pagination/` (folder + `index.ts` + `.stories.tsx` +
  `.test.tsx`), taking pre-translated label props and a `formatShowing(range)`
  callback so the from/to arithmetic lives in one place. BOTH
  `teacher-students-roster-screen.tsx` and `teacher-class-students-screen.tsx`
  now import it; both local copies are deleted.
- MUST-FIX (correctness): when every class roster fails, the screen no longer
  claims "you have no classes assigned" — a new
  `allClassesFailed = failedClassCount > 0 && rows.length === 0` branch renders
  a retryable `ListError` with the new `emptyAllFailed` / `emptyAllFailedBody`
  keys (vi + en), and suppresses the now-redundant partial-degrade notice.
  Covered by the `AllClassRostersFailed` story.
- SHOULD-FIX (decision 0026): the duplicated `STATUS_TONE` map is now
  `features/teacher/presentation/student-status-tone.ts`
  (`STUDENT_STATUS_TONE`, keyed off `TeacherRosterStudent["status"]`), imported
  by both roster tables. The two table components stay separate (different
  columns / row link) — only the tone map is shared.
- SHOULD-FIX (UX): while a search/class filter is active the visible header
  count now shows the filtered count via `resultCountFiltered` ("N / M"), so it
  matches the table and the sr-only live region.
- A11Y-001 (WCAG 1.4.3): the pager's "showing X–Y of Z" line moved from
  `text-edu-text-muted` (2.75:1) to `text-edu-text-secondary` (5.48:1) inside
  the shared component. The pager's buttons are `size-11` (44×44, WCAG 2.5.5)
  for both screens — this also fixes the sibling class-students screen, which
  was on `size-9` (36px).

### Proof commands (run 2026-08-02, all green)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean (exit 0) |
| `bun lint:fix` | 2302 files checked, clean; only a pre-existing unrelated warning in `messaging/.../message-context-menu.tsx` |
| `bun vitest run` | 445 files / **3204 tests passed** (was 3197 before this pass — +7 from `list-pagination.test.tsx`) |
| `bunx vitest run --config vitest.storybook.mts` | 153 files / **1144 interaction tests passed** (+4: 3 `ListPagination` stories + `AllClassRostersFailed`) |
| `bun run build` | success with `NEXT_PUBLIC_USE_MOCK` unset; `/[locale]/t/[tenant]/teacher/students` listed as a dynamic route |

## Implementation Plan

Ground-truthed against current code 2026-08-02 (fe-planner). Confirms:
`ListMyClassesUseCase`/`GetClassStudentsUseCase` are real and wired
(`teacher-class.repository.ts`, `bootstrap/di/teacher-class.di.ts` — note: the
DI file is `teacher-class.di.ts`, not `teacher.di.ts`); `TeacherRosterStudent`
has `enrollmentId, studentMemberId, displayName, academicYearLabel, enrolledAt,
status` (no `classId`/`className`, no avatar field — the aggregating use-case
must inject the class label since the entity doesn't carry it). Both existing
sibling screens (`teacher-classes-screen`, `teacher-class-students-screen`)
**hand-roll** their own skeleton/empty/error markup — neither uses
`components/shared/list-skeleton`/`list-error` (those were added later, decision
0026/INFRA-shared-list-states). This plan uses the shared components per the
AC's explicit instruction and current hard rule, which is a deliberate
improvement over the two older siblings, not a copy of their pattern — flagged
so `fe-tech-lead-reviewer` doesn't flag it as an inconsistency.

`TeacherRosterTable` (existing, per-class screen) renders plain rows with NO
link to academic-record — AC #4 of this story (click row → academic record) is
NEW interaction not present in any sibling; route already exists
(`teacher/students/[studentId]/academic-record/page.tsx`, `studentId` param).
`studentMemberId` is the id to use for that link (matches the entity's own
naming and the pattern in `teacher-class-students-screen` where
`studentCode = s.studentMemberId`).

No `TeacherClass.id → TeacherClass.name` map exists ready-made for the roster
screen; `list-my-classes` result already carries `{ id, name }` per class so the
new use-case builds this map itself (no new DTO needed).

Avatar initials: no shared `getInitials`/avatar-initials component exists yet.
Closest reuse candidate is the Vietnamese-aware `initialsOf()` local helper in
`teacher-dashboard.tsx` (first letter of last two words) — this plan copies the
same one-line algorithm as a **local** helper in the new screen (not promoted
to `shared/`, since only 2 in-feature usages exist and decision 0026 promotes
on the 2nd cross-feature use, not cross-component-within-feature use — if
`fe-tech-lead-reviewer` disagrees, promoting the existing `initialsOf` out of
`teacher-dashboard.tsx` into `features/teacher/presentation/` local util shared
by both is an acceptable in-review adjustment, still not `components/shared/`).

### Phase 1 — Domain: aggregating use-case

Files:
- `src/features/teacher/domain/entities/teacher-student-roster-row.entity.ts` —
  NEW entity `TeacherStudentRosterRow { studentMemberId, displayName, classId,
  className, status: "active" | "transferred" }` (composition output; distinct
  from `TeacherRosterStudent` because it carries `classId`/`className`, which no
  existing entity does).
- `src/features/teacher/domain/use-cases/list-my-students.use-case.ts` — NEW.
  Signature: `execute(): Promise<ClassResult<TeacherStudentRosterRow[]>>`
  (reuses the existing `ClassResult`/`TeacherClassFailure` union — no new
  failure type needed, this use-case can only fail the way `list-my-classes`
  fails: if the teacher's OWN class list call throws, that's not
  partial-failable — degrade is only for per-class roster calls, never for the
  class list itself).
  - Constructor takes `{ listMyClasses: ListMyClassesUseCase, getClassStudents:
    GetClassStudentsUseCase }` (composes the two use-cases directly, per the
    packet's Design Notes — NOT the repository; keeps this use-case a pure
    orchestrator over existing use-cases, mirrors how `getByTeacher` in
    timetable composes calls, not repos, at that layer... actually
    `getByTeacher` lives IN a repository. For THIS story the composition sits
    in the use-case layer since both `ListMyClassesUseCase` and
    `GetClassStudentsUseCase` are already use-cases (not raw repo methods) —
    domain-layer composition is correct here and keeps `ITeacherClassRepository`
    unchanged.
  - Algorithm:
    1. `classesResult = await listMyClasses.execute()`. If `!ok` → return
       `{ ok: false, error: classesResult.error }` (whole-screen error state;
       matches AC "zero assigned classes" is a *separate*, valid `ok:true,
       data:[]` case, not an error).
    2. If `classesResult.data.length === 0` → return `{ ok: true, data: [] }`
       immediately (empty state, no further calls — satisfies the "zero classes
       → empty state" AC without firing any roster requests).
    3. `Promise.allSettled` (NOT `Promise.all` — this is the partial-failure
       requirement) over `classesResult.data.map(cls =>
       getClassStudents.execute(cls.id))`.
    4. For each **fulfilled** settle result with `ok: true`, map its
       `TeacherRosterStudent[]` to rows tagged with that class's `{id, name}`.
       For a **rejected** promise or a fulfilled `{ok:false}` result — skip that
       class silently (degrade), do NOT bubble its failure into the top-level
       result (mirrors timetable's secondary-call-degrades posture). Order of
       classes for iteration = `list-my-classes` response order (stable).
    5. De-dupe: walk the flattened per-class order; keep the FIRST row seen per
       `studentMemberId` (a `Set<string>` of seen ids, first-wins — matches the
       packet's explicit rule).
    6. Return `{ ok: true, data: dedupedRows }`. Never `ok:false` for a partial
       roster failure — only for the top-level class-list failure in step 1.
  - **Open question** [OPEN QUESTION — flag to fe-lead]: should a partial
    failure surface ANY signal to the teacher (e.g. a small inline notice "1
    lớp không tải được") or stay fully silent? The AC only requires "must not
    blank out the classes that DID resolve" — it does not require a visible
    partial-failure indicator. This plan defaults to **fully silent degrade**
    (simplest, matches timetable precedent which is also silent) but flags it
    since a silent failure could confuse a teacher whose one class's roster
    consistently 500s. If fe-lead wants a visible banner, that's a VM field
    addition (`partialFailureCount?: number`), not a domain change — cheap to
    add later.

Test first (`list-my-students.use-case.test.ts`, fake `ListMyClassesUseCase`/
`GetClassStudentsUseCase` via constructor injection or minimal stub objects
implementing `.execute()`):
1. zero classes → `{ ok: true, data: [] }`, `getClassStudents.execute` never
   called (assert call count 0 — proves the "don't fire N roster calls for an
   empty class list" perf/AC guard).
2. `listMyClasses` fails → `{ ok: false, error }` propagated verbatim.
3. 2 classes, no overlap → flattened rows, order = class order then row order.
4. 2 classes sharing 1 student (same `studentMemberId`) → deduped, KEEPS the
   row tagged with the FIRST class (assert `className`/`classId` of the kept
   row == first class's).
5. class A roster call rejects (`getClassStudents.execute` throws or resolves
   `{ok:false}`), class B succeeds → result is `ok:true` with ONLY class B's
   students, no error surfaced (proves partial-failure degrade, both throw and
   `{ok:false}` paths since `GetClassStudentsUseCase.execute` returns a
   `ClassResult`, never actually throws in current code — but `Promise.allSettled`
   must still be used defensively / or plain `try/catch` per-call if `.execute`
   is guaranteed never to throw — verify against current impl signature before
   picking `allSettled` vs `Promise.all` + per-call `try/catch` wrapper; since
   `GetClassStudentsUseCase.execute` never rejects today (repository always
   catches to `ClassResult`), a simpler `Promise.all` over settled `ClassResult`
   values with a `.filter(r => r.ok)` may be sufficient and is preferred — SKIP
   `allSettled` unless a reject path is actually reachable; keep the test for
   whichever mechanism is chosen).
6. all classes fail → `{ ok: true, data: [] }` (empty list is a valid ready
   state per AC, not an error — only the top-level class-list call can error).

Done when: all 6 unit tests green, `bunx tsc --noEmit` clean.

### Phase 2 — Infrastructure

None. No new DTO, mapper, or repository method — this use-case composes two
already-wired use-cases (`bootstrap/di/teacher-class.di.ts` already builds
both). Confirmed: `TeacherRosterStudent` (existing entity, from
`getClassStudents`) has everything needed for a list row EXCEPT `classId`/
`className`, which the use-case attaches from the `list-my-classes` result
(no BE gap, no DTO change).

DI: extend `src/bootstrap/di/teacher-class.di.ts` with one new factory:
```ts
export async function makeListMyStudentsUseCase() {
  const repo = await makeRepo();
  return new ListMyStudentsUseCase(
    new ListMyClassesUseCase(repo),
    new GetClassStudentsUseCase(repo),
  );
}
```
(reuses the existing private `makeRepo()` — no new repository wiring).

### Phase 3 — Presentation + i18n + Storybook

Files:
- `src/features/teacher/presentation/teacher-students-roster-screen/teacher-students-roster-screen.i-vm.ts`
  ```ts
  export interface TeacherStudentRosterRowVM {
    studentMemberId: string;
    displayName: string;
    className: string;
    status: "active" | "transferred";
    /** App-relative route to this student's academic record. */
    academicRecordHref: string;
  }
  export interface TeacherStudentsRosterScreenVM {
    status: "ready" | "error";
    errorKey?: TeacherClassFailure["type"];
    rows: TeacherStudentRosterRowVM[];
    /** Distinct class names present, for the class-filter dropdown (derived
     *  server-side from `rows`, no extra call). */
    classNames: string[];
  }
  ```
- `teacher-students-roster-screen.tsx` (`'use client'`) — component tree:
  ```
  TeacherStudentsRosterScreen
  ├── h1 (pageTitle) + result count caption (mirrors teacher-class-students-screen header pattern)
  ├── filter row: Input(search, icon Search) + class-filter <Select> (shadcn, ui:add if not present — CHECK components/ui/select exists first)
  ├── aria-live polite filtered-count sr-only span (existing pattern)
  └── section (card wrapper)
      ├── loading → <ListSkeleton variant="inline" rows={6} renderRow={...} loadingAriaLabel={t("loadingLabel")} />
      ├── status==="error" → <ListError shape="inline-card" iconSize={10} message={...} retryLabel={...} onRetry={() => window.location.reload()} />
      ├── rows.length === 0 → empty state (reuse the same hand-rolled empty pattern as teacher-classes-screen OR check for a shared EmptyState — grep `components/shared` for one before hand-rolling again; if none exists, hand-roll matching teacher-classes-screen's EmptyState markup exactly, do not invent new visual language)
      ├── filtered.length === 0 (search/filter yields nothing) → noSearchResults message (existing i18n pattern from studentPage namespace, new key under this screen's own namespace)
      └── <TeacherStudentRosterTable rows={filteredPageRows} /> — new component,
          reuse <Table/TableRow/TableCell> primitives + <StatusBadge> exactly like
          `TeacherRosterTable`; each row is a <Link> (whole row or name cell) to
          `academicRecordHref`, keyboard-focusable, visible focus ring
          (focus-visible:ring-2 ring-ring) — satisfies AC's keyboard/focus
          requirement; avatar-initials rendered via local `initialsOf()` next to
          name (NOT just an icon — name text is still the primary accessible
          label, avatar is decorative `aria-hidden`).
  ```
  Local state: `query` (search string), `classFilter` (selected class name or
  "all"), `page` — all local `useState`, same shape as
  `teacher-class-students-screen.tsx` (no TanStack Query needed — RSC page does
  the one-shot server fetch, exactly like today's siblings).
- `teacher-students-roster-screen.stories.tsx` — states: loading, error, empty
  (zero classes), success (multi-class with dedupe visible), search-filtered,
  class-filtered.
- Possible new primitive: **verify `components/ui/select` exists** before using
  a `<Select>` for the class filter — if missing, run `bun ui:add select`
  (shadcn) during implementation, not planned as a bespoke component.

i18n — new namespace `teacherStudentsRoster` (sibling to `teacherClasses`, kept
separate since this is a different screen/aggregate, not a sub-page of
`teacherClasses`) in `messages/{vi,en}.json`:
```
teacherStudentsRoster.pageTitle
teacherStudentsRoster.resultCount            (reuse ICU {count} pattern)
teacherStudentsRoster.searchPlaceholder
teacherStudentsRoster.classFilterLabel
teacherStudentsRoster.classFilterAll
teacherStudentsRoster.empty                  (zero classes)
teacherStudentsRoster.noSearchResults
teacherStudentsRoster.errorRetryAction
teacherStudentsRoster.errors.network-error   (reuse TeacherClassFailure["type"] keys — SAME literal set as teacherClasses.errors, mirror not alias since next-intl namespaces don't share)
teacherStudentsRoster.errors.unauthorized
teacherStudentsRoster.errors.not-found
teacherStudentsRoster.errors.unknown
teacherStudentsRoster.loadingLabel            (ListSkeleton's loadingAriaLabel)
teacherStudentsRoster.columns.name
teacherStudentsRoster.columns.class
teacherStudentsRoster.columns.status
teacherStudentsRoster.status.active            (reuse literal copy from teacherClasses.studentPage.status — consider t.rich/shared key later, not blocking)
teacherStudentsRoster.status.transferred
```
Add both `vi` (source) and `en` (mirror) simultaneously.

### Phase 4 — Route + Server wiring

- `src/app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx` (RSC, no
  `actions.ts` needed — read-only, no mutation, no form submit; matches
  `teacher/classes/page.tsx` which also has no sibling `actions.ts`):
  ```ts
  import { makeListMyStudentsUseCase } from "@/bootstrap/di/teacher-class.di";
  import { TeacherStudentsRosterScreen } from "@/features/teacher/presentation/teacher-students-roster-screen/teacher-students-roster-screen";
  import type { TeacherStudentsRosterScreenVM } from ".../teacher-students-roster-screen.i-vm";

  export default async function TeacherStudentsPage() {
    const useCase = await makeListMyStudentsUseCase();
    const result = await useCase.execute();
    const vm: TeacherStudentsRosterScreenVM = result.ok
      ? {
          status: "ready",
          rows: result.data.map((r) => ({
            studentMemberId: r.studentMemberId,
            displayName: r.displayName,
            className: r.className,
            status: r.status,
            academicRecordHref: `students/${r.studentMemberId}/academic-record`,
          })),
          classNames: Array.from(new Set(result.data.map((r) => r.className))),
        }
      : { status: "error", errorKey: result.error.type, rows: [], classNames: [] };
    return <TeacherStudentsRosterScreen vm={vm} />;
  }
  ```
- No changes to `nav-config.ts` — the `/teacher/students` link already exists;
  this story just makes it resolve instead of 404.
- No new route guard needed — sits under the existing `teacher/` segment,
  inherits whatever layout-level role gate already protects `(app)/teacher/*`
  (verify at implementation time that `teacher/classes` has no bespoke guard
  beyond the shared teacher layout — if it does, mirror it exactly, don't add a
  new one).

Done when: `/teacher/students` renders the aggregated list; design-review gate
ready (no new tokens — 100% reuse of `edu-*` tokens + existing `Table`/
`StatusBadge`/`ListSkeleton`/`ListError`/`Input` primitives).

### Test plan summary (`.claude/rules/tdd.md`)

| Layer | Proof |
| --- | --- |
| Unit | `list-my-students.use-case.test.ts` (6 cases above) |
| Integration | none new — both underlying repo methods already covered (US-E13.1) |
| E2E/Story | Storybook interaction: loading skeleton renders; error state + retry click; empty state (zero classes); success list with a deduped row visibly appearing once; search narrows rows; class-filter narrows rows; row is a focusable link to `academic-record` (keyboard Enter navigates) |
| Platform | `bun build` clean, `bunx tsc --noEmit` clean |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) + a11y audit green |

### Risks / open questions

- **[OPEN QUESTION]** Silent vs visible partial-failure UX (see Phase 1) — default silent, flagged for fe-lead/product call.
- **[OPEN QUESTION]** `Promise.allSettled` vs `Promise.all` + `.filter(r=>r.ok)` for the per-class fan-out — current `GetClassStudentsUseCase.execute` never rejects (always resolves a `ClassResult`), so `allSettled` may be unnecessary defensive code; fe-nextjs-engineer should pick the simpler mechanism unless a reject path is found at implementation time.
- Class-filter `<Select>` primitive existence unverified in this plan pass — confirm/`bun ui:add select` at implementation start (small, non-blocking).
- No `docs/product/design-spec.jsonc` entry exists for this screen (confirmed in packet) — pure reuse of `teacher-class-students-screen`'s visual language; if `fe-tech-lead-reviewer`/design-review wants a spec entry added retroactively, that's a docs-only follow-up, not a blocker.
- Performance note (non-blocking): `ListMyClassesUseCase.execute()` under the
  hood (`TeacherClassRepository.listMyClasses`) ALREADY fetches every class's
  full roster once (to compute `studentCount`) — this new aggregating use-case
  will fetch each class roster a SECOND time via `GetClassStudentsUseCase`. For
  a teacher with many classes this is a real but pre-existing-pattern-consistent
  N+1-ish double-fetch (same shape already exists between `teacher/classes` and
  `teacher/classes/[classId]/students`, which also re-fetches). Not fixing here
  — flag to fe-lead as a possible future repository-level optimization
  (`listMyClasses` could return roster data it already has), out of scope for
  this story.

### Architecture step recommendation

- **`fe-component-architect`: NOT needed.** The component tree is a
  near-exact re-composition of `teacher-class-students-screen.tsx` (already
  built, proven pattern) plus swapping in the newer shared `ListSkeleton`/
  `ListError` primitives. No new component contracts beyond what's specified
  above.
- **`fe-state-engineer`: NOT needed.** No TanStack Query involved — this
  mirrors the exact same RSC-fetch-once + local `useState` filter/pagination
  pattern already used by both sibling teacher screens (no client-side
  server-state cache, no query-key design, no mutation/invalidation). The
  aggregation logic lives entirely in the domain use-case (Phase 1), not in
  client state.
- Recommend `fe-lead` route straight to `fe-nextjs-engineer` (TDD) after
  resolving the two `[OPEN QUESTION]`s above (or accepting this plan's
  defaults).
