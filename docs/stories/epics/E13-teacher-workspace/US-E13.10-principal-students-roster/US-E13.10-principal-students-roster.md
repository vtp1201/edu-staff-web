# US-E13.10 Principal Students Roster (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/admin-roster/` (read-only reuse — no
  new files if the existing `get-roster.use-case.ts` + `get-classes.use-case.ts`
  are role-agnostic), route
  `app/[locale]/t/[tenant]/(app)/principal/students/page.tsx`
- Shared contract/file: `features/admin-roster/domain/use-cases/get-roster.use-case.ts`,
  `features/admin-roster/presentation/student-roster-screen/` — REUSE, do not
  fork. If the existing screen has ADMIN-only mutation affordances
  (enroll/unenroll/transfer buttons), gate them out for the principal caller via
  a `readOnly`/`variant` prop — do NOT duplicate the component (decision `0026`).

## Product Contract

Sidebar nav (`nav-config.ts`, principal role) already links to
`/principal/students` but the route does not exist at all (full 404). This
story adds a read-only, school-wide student roster for the principal —
list/search/filter only, NO enroll/unenroll/transfer (those stay admin-only
under `/admin/roster`).

Ground-truthed BE authorization: `services/core/docs/openapi.yaml`'s
`GET /classes/{classId}/students` (class roster) is documented as "Accessible
to ADMIN/SUPER_ADMIN, or a TEACHER with any assignment". Web's `principal`
appRole is a COLLAPSE of BE role enums `ADMIN` and `MANAGER`
(`role-meta.ts` `ROLE_ENUM_TO_APP`) — i.e. when the signed-in user's BE token
role is literally `ADMIN`, they already land as `principal` in the web app
(there is no separate BE role for the web's own `/admin/*` persona outside the
`SUPER_ADMIN` path — see `docs/decisions/adr` for US-E18.24). Existing
principal screens (`US-E13.5` principal-teachers, `US-E13.8` principal-classes)
already call ADMIN-gated `core` endpoints successfully today, which is standing
proof MANAGER is treated ADMIN-equivalent by `core`'s authorization for reads.
**The engineer MUST re-verify this directly** (call the roster endpoint with a
principal-role token, or grep the Go authorization middleware for the roster
handler) before wiring for real — if it 403s, mock-first per decision `0014`
and flag a cross-repo ask, do not silently force-mock without checking.

## Relevant Product Docs

- No existing `docs/product/design-spec.jsonc`/DR for this screen. Visually
  reuse `admin-roster`'s `student-roster-screen` table/search/filter pattern —
  same list, same columns, minus the mutation actions. Do not invent new
  layout/tokens.

## Acceptance Criteria

- Given a principal opens `/principal/students`, they see the school-wide
  student roster (name, class, gender/DOB if the admin-roster DTO already
  carries it — do not add new fields it doesn't have).
- Search by name and filter by class are available (reuse admin-roster's
  existing filter bar component).
- NO enroll/unenroll/transfer affordances are rendered for this role (verified
  by the accessibility/tech-lead reviewers — a control a screen-reader user can
  reach but that silently 403s on click is a defect, not just a UI omission).
- Empty/loading/error states reuse `ListSkeleton`/`ListError` shared components
  (decision `0026`) — no new skeleton/error component.
- If BE authorization actually rejects the principal token (403), the screen
  degrades to mock-first (decision `0014`) with the SAME UI (no visible
  difference to the user) and a cross-repo ask is filed by fe-lead.
- WCAG 2.1 AA: table semantics, keyboard-navigable, visible focus, no
  color-only status.

## Design Notes

- Commands: none in this story (read-only).
- Queries: reuse `get-roster.use-case.ts` (search + pagination) and
  `get-classes.use-case.ts` (class filter options) from `features/admin-roster`.
- API: `GET /classes/{classId}/students` or the school-wide roster endpoint
  `admin-roster` already calls — ground-truth exact path in
  `roster.repository.ts` before assuming; DO NOT re-derive from scratch.
- Domain rules: read-only variant — no new domain rule, just an omitted-affordance
  presentation concern.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/principal/students/page.tsx` (RSC)
  reusing `StudentRosterScreen` with a `readOnly` (or `variant="principal"`)
  prop threaded from the page — confirm the exact prop-extension shape with
  `fe-component-architect` before adding it (must not break the admin caller).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | none new if pure reuse; a new test for the `readOnly` prop hiding mutation controls |
| Integration | reuse `roster.repository.test.ts` coverage; add a principal-role authorization test if a new DI wiring path is introduced |
| E2E | Storybook interaction: principal variant renders no mutation buttons; search/filter still work |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E13.10`.

## Evidence

(fill after implementation)

## Implementation Plan

### 0. Ground-truth corrections (verified by reading the actual code)

- **`admin-roster` is per-class, not flat school-wide** — confirmed via
  `admin/roster/page.tsx` (`getClasses()` for the picker + `getClassRoster(currentClass.id)`
  for the table). Principal's "school-wide" roster = the SAME class-picker +
  per-class table UX (breadcrumb dropdown already lists every class), not a new
  flat cross-class list. No new aggregation query needed.
- **`getClassRoster`/`getSearchPool` are ALREADY permanently mock-first for
  EVERY caller** (`roster.repository.ts` docblock, US-E18.5 cross-repo ask #9 —
  wire `EnrollmentResponse` has no name/DOB/gender/status fields, IAM has no
  batch profile lookup). This means the story's "verify BE 403 for principal"
  concern is **moot for roster listing** — it's mock today regardless of role,
  admin included. Only `getClasses` (+ homeroom fan-out) goes real, and it's role-
  and-param-identical to what admin already calls successfully. **No hybrid
  fallback needed for `getClasses`** — `makeRosterRepository()` (`bootstrap/di/
  admin-roster.di.ts`) has zero role branching (auth comes purely from the
  bearer token in `createServerHttpClient()`), so it is reused **completely
  unmodified**. Engineer still does the one-time verification the story asks
  for (call with a principal token or grep the Go middleware) before closing —
  if `getClasses` unexpectedly 403s for `MANAGER`, add a single-line hybrid
  branch in the SAME factory then (no new DI factory).
- **`RosterTable` bakes in mutation affordances directly in markup** — header +
  per-row `Checkbox` (bulk-select), a bulk destructive action bar, and a
  44×44 per-row "remove from class" icon-button — these are NOT gated by any
  existing prop. `RosterEmptyState` is enroll-only copy/CTA ("Thêm học sinh đầu
  tiên", disabled import). `StudentRosterScreen` owns non-optional
  `onEnroll`/`onUnenroll`/`onUnenrollMany`/`onTransfer` action props plus a
  confirm-dialog state machine that has no meaning for a read-only caller.
  `RosterBreadcrumb` and `ClassInfoCard` have **zero mutation affordances** —
  reusable as-is, unmodified, no wrapper.

### 1. Component-placement decision (decision `0026`) — state clearly

**Two different mechanisms for two different things, not one blanket "variant prop":**

- **`RosterTable`** → this IS "variant of an existing composed component, đúng
  design" (decision-tree bucket 1/3's "variant/style của 1 primitive" extended
  to "composed component customize"): add a `readOnly?: boolean` prop **in
  place** in `features/admin-roster/presentation/student-roster-screen/
  components/roster-table.tsx`. When `true`: omit the header + per-row
  checkbox column, omit the bulk-action bar entirely, omit the trailing
  actions `<th>`/`<td>` column (colSpan of the "no match" row drops 8→6), hide
  the toolbar's "Export CSV" button (already a disabled placeholder even for
  admin — for principal, drop it rather than ship a visible dead control).
  `onRequestUnenrollOne`/`onRequestUnenrollMany` become optional, only ever
  invoked when `!readOnly`. This is genuinely "the same table, one design
  variant" — no fork.
- **The screen-level composition is NOT a boolean on `StudentRosterScreen`.**
  Reason: `StudentRosterScreen`'s prop contract requires all 4 mutation
  actions and owns ~100 lines of confirm-dialog/panel state (`confirm`,
  `recentlyAdded`, `panelSearchRef`, `handleRequestEnroll`, `confirmTransfer`,
  `confirmUnenroll`, `focusPanelSearch`) that would need dead branches or a
  discriminated prop union just to support a caller that never uses any of it.
  That pollutes the admin contract's type-safety for the sake of one boolean.
  Instead: a new, small (~50-line) screen `PrincipalRosterScreen` that
  composes `RosterBreadcrumb` + `ClassInfoCard` (unmodified) + `RosterTable
  readOnly` + shared `EmptyState`/`ListSkeleton`/`ListError` — zero duplicated
  business logic (no unenroll/transfer math, no dialogs). Per decision `0026`'s
  tree this is a "composed component, chỉ 1 screen dùng (principal) — tạm để
  `features/<x>/presentation/`" — and it stays in the **same feature**
  (`features/admin-roster/presentation/`, NOT a new `features/principal-roster`
  module) because it's the identical domain/entities (`ClassSummary`,
  `RosterStudent`), just a second, read-only caller. Promote later only if a
  THIRD role needs the same read-only shell.
- **`fe-component-architect` recommendation: SKIP.** The mechanism is decided
  above (prop-in-place on one existing sub-component + one new thin
  composition reusing existing pieces with a plain VM/props contract) — this
  is not a novel component system or a non-trivial prop-contract design;
  `fe-nextjs-engineer` can implement directly from this plan.

### 2. Files by layer

```
Phase 1 — RosterTable read-only variant (in place, admin-roster feature)
  Files:
    features/admin-roster/presentation/student-roster-screen/components/roster-table.tsx
      (edit: add `readOnly?: boolean`, make unenroll callbacks optional)
    features/admin-roster/presentation/student-roster-screen/components/roster-table.test.tsx (NEW)
  Test first: roster-table.test.tsx — RTL render with readOnly=true asserts:
    no `role="checkbox"` in the document, no button named like
    "Xoá khỏi lớp" (unenroll), bulk-action bar never renders even after a
    (non-existent) selection path, "no match" row still centers correctly
    (colSpan). A second case (readOnly=false, default) asserts existing
    checkboxes/remove-button/bulk-bar still render — guards the admin caller
    against regression.
  Done when: roster-table.test.tsx green; student-roster-screen.stories.tsx
    (admin, unaffected — readOnly defaults false) still passes.

Phase 2 — Principal roster screen (new, same feature, read-only composition)
  Files:
    features/admin-roster/presentation/principal-roster-screen/
      principal-roster-screen.i-vm.ts (NEW)
        — PrincipalRosterScreenVm = { classes: ClassSummary[]; currentClass:
          ClassSummary; roster: RosterStudent[]; activeCount: number;
          transferredCount: number; fetchError?: RosterFailure["type"] | null }
          (same shape as StudentRosterScreenVm MINUS `searchPool` — no
          AddStudentPanel). No action props at all (read-only — no
          RosterActionResult union needed here).
      principal-roster-screen.tsx (NEW, 'use client')
        — composes RosterBreadcrumb + ClassInfoCard (both unmodified imports
          from the sibling student-roster-screen/components/) + RosterTable
          readOnly + shared EmptyState (no cta) for the empty-roster case +
          class-switch via router.push(`?classId=`) (same pattern as
          StudentRosterScreen.handleClassChange — copy the ~6-line handler,
          it's too small to extract).
      principal-roster-screen.stories.tsx (NEW)
  Test first: principal-roster-screen.stories.tsx interaction play functions
    for: loading (ListSkeleton renders, `Common.skeleton.loadingAriaLabel`),
    empty (EmptyState renders, NO "Thêm học sinh" CTA anywhere in the DOM),
    error (ListError renders with `Common.confirmDialog.retry`, retry calls
    the passed callback), populated (table rows render, NO checkbox/remove
    button/bulk-bar/AddStudentPanel anywhere — the explicit "no mutation
    affordance" assertion the AC calls out), class-switch (selecting a
    different class in RosterBreadcrumb re-triggers the loader with the new
    classId).
  Done when: all 5 story states pass `vitest.storybook.mts` interaction runs.

Phase 3 — Route + DI wiring (RSC, reuse-only)
  Files:
    app/[locale]/t/[tenant]/(app)/principal/students/page.tsx (NEW)
      — RSC, Suspense + skeleton fallback (mirrors admin/roster/page.tsx
        shape). Reuses `makeRosterRepository()` UNCHANGED (bootstrap/di/
        admin-roster.di.ts — no edit) + `getClasses`/`getRoster` use-cases
        UNCHANGED (do NOT import enroll/unenroll/transfer use-cases at all —
        the page.tsx file should have zero import of them, which IS the proof
        no mutation code path exists for this route).
      — RBAC: `principal/layout.tsx`'s existing role-guard layout already
        gates this route (role==="principal" check, redirect otherwise) — no
        new guard code needed, confirmed by reading the layout.
      — classId from `searchParams` (same `?classId=` contract as admin route).
      — retry-on-error: a small client wrapper calling `router.refresh()`
        (mirrors `principal-classes-screen`'s `fetchError` + retry pattern) —
        no new Server Action needed since this route has no mutations.
  Test first: none new at this layer beyond the Storybook interaction above
    (RSC page.tsx has no branching logic worth a unit test beyond the empty-
    classes / fetchError mapping, which is exercised by the story's play
    functions against a pre-shaped VM — matches how principal-classes did it).
  Done when: `bun build` clean, route renders in dev with `NEXT_PUBLIC_USE_MOCK=true`.
```

### 3. i18n

- **Reuse `adminRoster` namespace as-is** for: breadcrumb (`breadcrumb.classes`,
  `breadcrumb.roster`), class info (`classInfo.*`), table headers
  (`table.name`, `table.studentId`, `table.dob`, `table.gender`,
  `table.status`, `table.searchPlaceholder`, `table.clearSearch`,
  `table.noMatch`), status badges (`status.active`, `status.transferred`),
  pagination (`pagination.nav`). These are the exact same words for the exact
  same data — forking a parallel `principalStudents.table.*` set would be pure
  i18n drift.
- **Reuse `Common` namespace** for: `Common.confirmDialog.retry` (ListError
  retry label), `Common.skeleton.loadingAriaLabel` (ListSkeleton aria-label).
- **New namespace `principalStudents`** — ONLY for copy that doesn't exist yet
  because it's specific to this read-only screen shell:
  - `principalStudents.title` — page `<h1>` (principal framing, e.g. "Học sinh
    toàn trường" vs admin's roster-management title — do not reuse
    `adminRoster.title` verbatim if its copy implies management actions;
    confirm the exact admin title string first and only diverge if it
    actually says something action-oriented).
  - `principalStudents.subtitle`
  - `principalStudents.empty.title` / `principalStudents.empty.body` (EmptyState
    copy — read-only framing, NOT `adminRoster.empty.*` which says "Thêm học
    sinh đầu tiên cho lớp này").
  - `principalStudents.error.title` / `principalStudents.error.description`
    (ListError title/description for the `getClasses`/`getRoster` failure
    case — reuse `adminRoster.errors.<type>` keys for the per-failure-type
    message if the `RosterFailure` union key matches, otherwise a generic
    fallback string here).
  Add to `vi.json` (source) + mirror in `en.json` in the same commit/phase —
  do not defer.

### 4. Test plan summary (maps to the packet's Validation table)

| Layer | Proof | File |
| --- | --- | --- |
| Unit | `readOnly` hides checkboxes/bulk-bar/remove-button; default (admin) keeps them | `roster-table.test.tsx` (NEW) |
| Integration | none new — `roster.repository.test.ts` coverage already exercises `getClasses` real-path + `getClassRoster`/`getSearchPool` mock-stub path; no new repository code | existing |
| E2E/Story | 5 interaction states (loading/empty/error/populated/class-switch) + explicit "no mutation affordance" assertion | `principal-roster-screen.stories.tsx` (NEW) |
| Platform | `bun build` clean | — |
| Release | design-review gate (screen reuses an already-approved visual pattern 1:1, minus removed affordances — lightweight review) + a11y audit confirms no reachable-but-403ing control | `docs/DESIGN_REVIEW.md` |

### 5. Risks / open questions

- **[OPEN QUESTION]** Exact wording for `principalStudents.title`/`subtitle` and
  `empty.title`/`empty.body` — needs product copy, not invented here. Default
  to a literal, unambiguous label ("Học sinh toàn trường" / "Xem danh sách học
  sinh theo lớp") if no design-spec entry exists; flag to `fe-lead` if this
  needs a UX-writer pass before implementation.
- **[OPEN QUESTION]** Whether to keep the disabled "Export CSV" toolbar button
  for principal. Plan defaults to **hide it** (cleaner read-only view, not in
  AC's listed capabilities) — reversible with one boolean if product wants it
  visible-but-disabled for parity with admin.
- No `docs/product/design-spec.jsonc` entry exists for this screen (per
  packet) — visual reuse of `admin-roster`'s approved pattern is the spec;
  no new tokens, no ADR needed.
- Genuine BE-authorization risk is narrow and already scoped: only
  `getClasses` goes real; if principal's `MANAGER`-mapped token 403s there
  (unverified until the engineer checks), the fallback is a one-line hybrid
  branch in the existing `makeRosterRepository()` factory — not a new
  composite, per the "don't over-engineer preemptively" guidance.
