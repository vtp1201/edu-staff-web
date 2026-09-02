# US-E24.8 Implementation Plan — Class detail shell + deep-link

Owner: fe-planner. No code written here. See story packet
`US-E24.8-class-detail-shell.md` for AC/contract; this file is the phased
breakdown + grounding decisions made while reading the merged US-E24.7 code,
the timetable/dashboard entities, and `class-hub.jsx`.

## 0. Ground-truth corrections vs the packet/epic text

1. **US-E24.7 is already merged into `main`** (not just "depends on" —
   `roles`/`subjects`/`kpi` on `TeacherClass`, `RoleBadges` at
   `features/teacher/presentation/shared/role-badges.tsx`, `getHomeroomKpi`
   use-case/DI, `/teacher/classes/page.tsx` all exist today). `RoleBadges`
   already ships a `size?: "sm" | "md"` prop **explicitly reserved for this
   story's identity header** (its own doc comment says so) — reuse verbatim,
   `size="md"`. No new component needed for badges.
2. **`classId` is NOT on `TimetableSlot` today, but IS on the wire already**:
   `MemberSlotResponseDto.classId` (real, `member-timetable-response.dto.ts`)
   is read by `mapMemberWeeklyTimetable` only to resolve `className` via
   `classNameOf` — the raw id is discarded. Plan: thread `classId` through
   (mapper → `TimetableSlot` entity → grid → VM) rather than "ask BE" (no BE
   gap here, contrary to the packet's tentative phrasing "nếu chỉ có tên lớp,
   thêm classId"). `mapRealWeeklyTimetable` (pure class-scoped path, used by
   `getByClass`, itself unused by any caller today per its own doc comment)
   gets `className: undefined` — no `classId` there either; leave it, out of
   scope (no consumer).
3. **Dashboard `ScheduleItem`/`PendingGradeItem` real repo returns `[]`
   today** (`teacher-dashboard.repository.ts` — no BE source, stubbed,
   documented in-file). Only the **mock** repo has real row data. So adding
   `classId?: string` to these two entities is a **safe additive field** with
   zero real-wire risk — no BE ask needed, just extend entity + mock fixture +
   VM + dashboard page mapping (mirrors `TeacherClassKpi`'s "optional field,
   mock sets it, real stays absent" convention already established in E24.7).
4. **E24.4 (student cross-subject tabs) is `planned`, NOT implemented** in
   this worktree (its own packet exists but no code) — the "redirect helper:
   cùng pattern E24.4" note in Design Notes has nothing to copy from yet. Plan
   instead follows the **already-shipped** `teacher/lesson-plans/[id]/edit`
   redirect precedent: plain `next/navigation` redirect built from
   `` `/${locale}/t/${tenant}/...` `` (not the next-intl `routing.ts` wrapper,
   which has no query-string param). AC asks for **308** specifically → use
   `permanentRedirect` (from `next/navigation`, confirmed exported), not
   `redirect` (307/303) — the lesson-plans precedent uses `redirect` for a
   *notice* redirect, this one is a genuine permanent alias, so
   `permanentRedirect` is the correct primitive, not a copy of that file.
5. **Design's internal tab id is `sessions`**, not `timetable`
   (`class-hub.jsx` `ClassHubScreen`/`design-spec.jsonc` `sessionsTab`). The
   packet's own AC + Dependencies section normatively fixes the URL/i18n key
   as `?tab=timetable` / `teacher.classHub.tabs.timetable` — **follow the
   packet, not the raw mockup var name**; `sessions` never appears in code,
   URLs, or i18n keys. Internal TS union type may still privately read
   `"timetable"` throughout — no `"sessions"` anywhere.
6. **`notFound()` precedent**: `student/courses/[courseId]/page.tsx` —
   denial on the primary read collapses to `next/navigation`'s `notFound()`
   (existence-oracle rule: don't distinguish "doesn't exist" from "not
   yours"). This story's `getMyClass` reuses that rule: any `TeacherClassFailure`
   on the class lookup (including a plain "not in `listMyClasses()`" miss) →
   `notFound()`.
7. **No new `getMyClass(classId)` BE call needed.** `ITeacherClassRepository`
   has no by-id read and none is needed: `listMyClasses()` already returns the
   full per-teacher list (roles/subjects/kpi included) and the list is small
   (a teacher's own classes) — same pattern the existing `students/page.tsx`
   already uses (`classesResult.data.find((c) => c.id === classId)`). Plan
   uses a small **domain use-case wrapper** (`GetMyClassUseCase`) that calls
   `listMyClasses()` and finds by id, rather than adding a new repository
   method or a new BE round-trip — avoids the N+1 array-scan being duplicated
   ad hoc in three different pages (shell, dashboard deep-link resolution
   isn't needed, schedule deep-link isn't needed — only the shell page reads
   this, but the wrapper still buys single-responsibility + testability over
   inlining `.find()` again).

## 1. Domain (`src/features/teacher/domain/`)

**Files**
- **New** `use-cases/get-my-class.use-case.ts` — `GetMyClassUseCase`,
  `execute(classId): Promise<Result<TeacherClass>>`. Wraps
  `repo.listMyClasses()`, finds by `id`, returns
  `{ ok: false, error: { type: "not-found" } }` when absent (reuse the
  existing `TeacherClassFailure` union — confirm it already has a `not-found`
  variant; if it only has `network-error`/`unknown`, add `not-found` as an
  additive union member, since the packet's own AC requires distinguishing
  "class doesn't exist/isn't mine" for the `notFound()` branch).
- **New**, pure, in `domain/tab-resolver.ts` (feature-local, no framework
  deps): `resolveClassHubTab(roles: ClassRole[], requested: string |
  undefined): ClassHubTab` where
  `type ClassHubTab = "students" | "timetable" | "course" | "homeroom"`.
  Rules (from AC + Design Notes):
  - `requested` not in the 4 known ids → default.
  - `requested === "homeroom"` and `!roles.includes("homeroom")` → default.
  - default = `"homeroom"` when `roles` is `["homeroom"]` only (pure GVCN, no
    subject tab makes sense as default); `"students"` otherwise (GVBM, or
    dual-role — packet's own wording: "`students` nếu GVBM, `homeroom` nếu
    chỉ GVCN").
  - Pure function, zero I/O — this is the TDD centerpiece per Validation
    table row 1 ("tab resolver (roles × param → tab)").
- **New**, pure, `domain/class-hub-tabs.ts`: `visibleTabs(roles: ClassRole[]):
  ClassHubTab[]` — `["students","timetable","course"]` always +
  `"homeroom"` appended iff `roles.includes("homeroom")`. Feeds both the tab
  resolver's validity check and the tablist rendering (single source for "is
  this tab allowed", not duplicated between resolver and UI).

**Test first**
- `tab-resolver.test.ts`: the AC's three scenarios verbatim (GVCN+GVBM → 4
  tabs, default `students`; GVBM-only → 3 tabs, `?tab=homeroom` → falls back
  to `students`; GVCN-only → default `homeroom`); plus unknown/garbage
  `requested` string.
- `get-my-class.use-case.test.ts`: mock repo, found/not-found/network-error
  passthrough cases.

**Done when**: `tab-resolver`/`class-hub-tabs`/`get-my-class` unit tests
green; no framework import in `domain/`.

## 2. Infrastructure — no new repository/DTO work

Nothing to add here: `listMyClasses()` (real + mock) already carries
everything the shell needs (roles/subjects/kpi/studentCount/
academicYearLabel). The two touches below are pre-existing infra files
extended for the deep-link plumbing (§0.2/§0.3), not new repos:

- `features/timetable/infrastructure/mappers/weekly-timetable.mapper.ts`
  (`mapMemberWeeklyTimetable`): add `classId: slot.classId` to the emitted
  `TimetableSlot` (the value already exists on `MemberSlotResponseDto`, just
  unused past `classNameOf` lookup). `mapRealWeeklyTimetable` gets
  `classId: dto.classId` too (cheap, consistent, that mapper's own top-level
  `classId` is already known — not used by any caller today, no risk).
- `features/teacher/infrastructure/repositories/mock-teacher-dashboard.repository.ts`:
  add a plausible `classId` (matching one of the mock `listMyClasses` ids) to
  each fixture `ScheduleItem`/`PendingGradeItem` row.

**Test first**: extend `weekly-timetable.mapper.test.ts` /
`real-weekly-timetable.mapper.test.ts` — assert `classId` passthrough.
Extend `teacher-dashboard.repository.test.ts` mock-repo case if it asserts
row shape; else covered transitively by the page test in Phase 4.

**Done when**: mapper tests green; `tsc` clean on the two extended entities
(`TimetableSlot.classId?`, `ScheduleItem.classId?`, `PendingGradeItem.classId?`
— all optional, additive).

## 3. Bootstrap (`src/bootstrap/di/`)

**Files**
- `di/teacher-class.di.ts` — **new** `makeGetMyClassUseCase()` factory
  (mirrors `makeListMyTeacherClassesUseCase`, reuses `makeRepo()`).
- No endpoint changes (no new HTTP call).

**Done when**: `bun build` resolves; no `'server-only'` leak into
`presentation/`.

## 4. Presentation

### 4a. `features/teacher/presentation/class-hub/`

**Files**
- `class-hub.i-vm.ts`:
  ```ts
  export interface ClassHubHeaderVm {
    classId: string;
    classLabel: string;        // "Lớp 10A1" — resolved in page.tsx (i18n)
    roles: ClassRole[];
    subjects: { id: string; name: string }[];
    studentCount: number;
    academicYearLabel: string;
  }
  export interface ClassHubTabsVm {
    activeTab: ClassHubTab;
    visibleTabs: ClassHubTab[];
    baseHref: string;          // `/teacher/classes/{classId}` (app-relative)
  }
  ```
  Plain data contracts — no framework types leak in (matches
  `RoleBadges`/`TeacherClassStudentsScreenVM` convention).
- `class-hub-header.tsx` (`'use client'` only if it needs interactivity — it
  doesn't; **RSC**, per Design Notes "tab content là RSC con... không client
  fetch" applies to the whole shell): icon box (46×46, tone purple when
  `roles.includes("homeroom")` else primary, per design-spec), title + `<RoleBadges
  size="md" roles subjects />`, meta line. Back-button breadcrumb is a plain
  `<button>` per mockup (`onClick={() => setSelected(null)}`) — but this is a
  **routed** shell (no client state), so it becomes a `Link` to
  `/teacher/classes` (equivalent affordance, matches app's route-based
  navigation convention elsewhere — flag as an intentional interaction-model
  swap from the mockup's SPA-toggle, not a deviation from the *visual* spec).
- `class-hub-tabs.tsx` — `role="tablist"`, each tab a `Link` (`href={
  \`${baseHref}?tab=${id}\` }`, `role="tab"`, `aria-selected={id ===
  activeTab}`) — **Link-based nav**, per packet ("Tabs (Link-based)"), so
  Tab/Enter keyboard nav is native (AC's "Tab/Enter bắt buộc" satisfied for
  free; arrow-key roving tabindex is explicitly optional per AC — **skip it**,
  YAGNI, flag in Risks).
- `tab-placeholder.tsx` — pure presentational, `{ labelKey }` →
  `EmptyState`-style card, "Đang xây dựng (US-E24.9/10/11)" copy (per-tab
  variant text so E24.9/10/11 each know which placeholder they replace).
- `class-hub-screen.tsx` — composes header + tabs + `{children}` (tab body
  passed from `page.tsx` as a React node — RSC composition, no prop-drilled
  fetch). Reuses **existing** `TeacherClassStudentsScreen` unmodified for the
  `"students"` tab (packet: "nhúng làm tab" — it already renders its own
  breadcrumb/header internally; **this shell's header replaces that**, so
  `TeacherClassStudentsScreen`'s existing `<Breadcrumb>` sub-component must be
  suppressed when rendered inside the shell — smallest change: add an
  optional `hideBreadcrumb?: boolean` prop to
  `TeacherClassStudentsScreen`/its VM, default `false` so the standalone
  `/students` redirect-target route (pre-redirect callers, none left after
  §4b, but keep the prop for safety) still renders as before. Flagged as a
  **modification to an existing presentation component**, not a fork.

### 4b. Routes (`src/app/[locale]/t/[tenant]/(app)/teacher/classes/`)

- **New** `[classId]/page.tsx`:
  ```
  params: { locale, tenant, classId }; searchParams: { tab?: string }
  1. result = await (await makeGetMyClassUseCase()).execute(classId)
  2. !result.ok → notFound()
  3. tab = resolveClassHubTab(result.data.roles, searchParams.tab)
  4. tab body:
     - "students": fetch getTeacherClassStudentsUseCase (existing use-case,
       same as today's students/page.tsx) → <TeacherClassStudentsScreen
       hideBreadcrumb />
     - "timetable" | "course" | "homeroom": <TabPlaceholder labelKey=.../>
  5. render <ClassHubScreen header=... tabs=...>{body}</ClassHubScreen>
  ```
- **Rewrite** `[classId]/students/page.tsx` → body becomes:
  ```ts
  const { locale, tenant, classId } = await params;
  permanentRedirect(`/${locale}/t/${tenant}/teacher/classes/${classId}?tab=students`);
  ```
  (drops all its current data-fetching — the shell page now owns that).
  Existing `page.test.ts` for this route (if any — check in Phase 4 kickoff)
  gets rewritten to assert the redirect target instead of VM assembly.

**Test first (integration, page-level, Vitest + RSC test harness already used
elsewhere e.g. `lesson-plans/[id]/edit/page.test.ts`)**:
- 4 tabs for dual-role class; 3 tabs for GVBM-only; `?tab=homeroom` on a
  GVBM-only class → falls back to `students` tab body actually rendered.
- `/students` → asserts `permanentRedirect` called with `?tab=students` (308
  semantics — Next's `permanentRedirect` throw-based control flow, assert via
  the standard `NEXT_REDIRECT` catch pattern already used in this repo's other
  redirect tests).
- Unknown/foreign `classId` → `notFound()` called.

### 4c. Deep-link touches (existing screens, additive)

- `teacher-dashboard-home.i-vm.ts`: add `classId?: string` to
  `ScheduleItemVM`/`PendingGradeVM`.
- `teacher-dashboard-home.tsx`: wrap the schedule row's subject/class block
  and the pending-grade row in a `Link` to
  `` `/teacher/classes/${item.classId}?tab=timetable` `` /
  `` `?tab=students` `` **when `classId` is present** (real repo returns none
  today → rows stay plain `<li>` text until BE ships schedule/pending-grade
  data — no dead links, matches the "hide the tile" convention already used
  for KPIs). Page-level assembly (`teacher/(dashboard-home route)/page.tsx` or
  wherever `TeacherDashboardHomeClient` is composed) passes `classId` through
  unchanged from `ScheduleItem`/`PendingGradeItem`.
- `timetable-grid.tsx` `Cell`: when `cellVariant === "teacher"` **and**
  `slot.classId` is present, wrap the cell's inner `<div>` in a `Link` (
  `` `/teacher/classes/${slot.classId}?tab=timetable` ``, hover tint via
  existing `hover:` token classes, focus ring via default `Link` a11y — no
  new component, the existing filled-cell markup becomes the `Link`'s child).
  When `cellVariant === "class"` (student/parent view) — **no link**, cell
  stays static (packet's deep-link AC is teacher-schedule-only).

**Test first (Storybook interaction)**:
- Dashboard home story: schedule row / pending-grade row is an `<a>` with the
  expected `href` (existing `teacher-dashboard-home.stories.tsx` extended, not
  forked).
- Teacher-schedule story: a filled cell is an `<a>` with `href` containing
  `?tab=timetable`; hover/focus states visible (existing
  `teacher-schedule.stories.tsx` extended).

### 4d. New Storybook stories for the shell itself

`class-hub-screen.stories.tsx` (or per-component stories for
header/tabs/placeholder — component-architect to decide granularity):
`shell-both-roles`, `subject-only`, `placeholder-tabs`, `mobile-wrap`
(narrow viewport → tabs wrap, per AC).

## 5. i18n

Namespace `teacher.classHub` (new) — packet's own Dependencies line fixes
this path:
- `teacher.classHub.breadcrumb.classes` = "Lớp học" / "Classes".
- `teacher.classHub.tabs.students` = "Học sinh" / "Students".
- `teacher.classHub.tabs.timetable` = "Thời khoá biểu" / "Timetable"
  (**new label — the old "Tiết học" wording, if it exists anywhere under a
  different key, is NOT reused/renamed; grep confirms no such key exists yet
  in this repo — E24.9 hasn't shipped a timetable tab before now, so this is
  a clean new key, not a rename**).
- `teacher.classHub.tabs.course` = "Khoá học online" / "Online course".
- `teacher.classHub.tabs.homeroom` = "Chủ nhiệm" / "Homeroom".
- `teacher.classHub.meta` = "{count} học sinh · Năm học {year}" / "{count}
  students · AY {year}" (ICU plural not needed per existing convention —
  check `teacherClasses` namespace precedent from E24.7 for the exact
  plural/no-plural convention and mirror it).
- `teacher.classHub.placeholder.title` = "Đang xây dựng" / "Under
  construction"; `teacher.classHub.placeholder.body.{timetable,course,homeroom}`
  = per-tab "Tab này sẽ có ở US-E24.9/10/11" style copy.
- Reuse `teacherClasses.homeroomBadge` / `teacherClasses.card.roleBadge.subject`
  (already shipped by E24.7) via `RoleBadges` — **do not** duplicate under
  the new namespace.

## 6. fe-component-architect / fe-state-engineer — needed?

- **fe-component-architect: recommend spawning.** Four new composed
  components in one story (`class-hub-header`, `class-hub-tabs`,
  `tab-placeholder`, `class-hub-screen` composition) plus a cross-cutting
  modification to an existing component (`TeacherClassStudentsScreen`
  `hideBreadcrumb`) is enough surface + prop-contract risk to warrant an
  explicit pass — particularly confirming the tablist a11y pattern
  (`role="tablist"`/`role="tab"`/`aria-selected` on `Link`, not `button`,
  which is slightly non-standard ARIA authoring practice worth a deliberate
  decision) before the engineer starts.
- **fe-state-engineer: skip.** Confirmed no TanStack Query/client state
  anywhere in this story — URL (`searchParams.tab`) IS the state, resolved
  server-side in the RSC page, matching the packet's own explicit
  instruction ("RSC con theo searchParams.tab, không client fetch"). No
  interactivity beyond `Link` navigation.

## 7. Test plan summary (maps to Validation table)

| Layer | File(s) | Asserts |
| --- | --- | --- |
| Unit | `tab-resolver.test.ts` | roles × param → tab (3 AC scenarios + fallback) |
| Unit | `class-hub-tabs.test.ts` | visible-tab list per role combo |
| Unit | `get-my-class.use-case.test.ts` | found/not-found/network-error |
| Unit | `weekly-timetable.mapper.test.ts` (extend) | `classId` passthrough |
| Integration | `[classId]/page.test.ts` | 4-tab/3-tab, fallback, notFound |
| Integration | `[classId]/students/page.test.ts` (rewrite) | 308 target URL |
| Story | `class-hub-screen.stories.tsx` | shell-both-roles / subject-only / placeholder / mobile-wrap |
| Story | `teacher-dashboard-home.stories.tsx` (extend) | row `<a>` href |
| Story | `teacher-schedule.stories.tsx` (extend) | cell `<a>` href, hover/focus |
| Platform | — | tsc / vitest / build |
| Release | — | design-review + a11y (tablist ARIA, focus ring on Link cells) |

## 8. Harness delta for `fe-lead`

- `harness-cli backlog add` — **E24.17** "students tab grade columns (US-246
  draft)" per packet's own Harness Delta line (roster keeps its current
  columns in this story; grade-column redesign per `studentsTab.columns` in
  design-spec is explicitly out of scope here).

## 9. Risks, dependencies, open questions

- **[OPEN QUESTION]** Arrow-key roving-tabindex for the tablist is AC-optional
  — plan skips it (Link-based tabs give free Tab/Enter nav, which is the
  AC-mandatory bar). Flag to `fe-accessibility-auditor`: confirm plain
  sequential-Tab-through-Links is an acceptable ARIA `tablist` pattern (some
  screen readers expect arrow-key roving on a real `tablist`) — if the audit
  flags it, the fix is additive (a `useEffect` keydown handler), not a
  rearchitecture.
- **[OPEN QUESTION]** `class-hub-header`'s back-button becomes a routed
  `Link` instead of the mockup's client-side `setSelected(null)` toggle —
  visually identical, interaction model differs from the SPA mockup by
  necessity (this is a real route, not a client-state toggle). Not blocking;
  noted so design-review doesn't flag it as a spec deviation.
- **[OPEN QUESTION]** `teacher.classHub.meta` count/plural convention — mirror
  whatever `teacherClasses` (E24.7) already settled for "N học sinh" rather
  than inventing a second convention; engineer confirms in Phase 5.
- **Risk**: `TeacherClassStudentsScreen`'s `hideBreadcrumb` prop threading
  touches a component 3 other stories/tests already cover (E24.7-adjacent) —
  keep the default `false` so no existing consumer changes behavior; only the
  new shell page passes `true`.
- **Risk**: dashboard/schedule deep-links are inert until BE ships real
  `ScheduleItem`/`PendingGradeItem`/timetable-by-member data with `classId` —
  mock-only visually verifiable today (per §0.3, real repos return `[]`
  already, so this is not a regression, just a currently-quiet feature on the
  real path).
- **Dependency**: none blocking — US-E24.7 (badges/roles/kpi) already merged.
  This story unblocks US-E24.9/E24.10/E24.11 (each replaces one placeholder
  tab body).
