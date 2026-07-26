# Implementation Plan — US-E13.8 Principal Classes

Input: `spec.md` (12 FR, 32 AC), `use-cases.md`, `integration.md`, `story.md`, plus
fe-lead's pre-resolved ground truth (repository decision, BE-gap mitigation, academic-year
helper, RBAC guard already exists). This plan does not re-derive those — see "Locked decisions"
below — it only phases the build.

## 0. Locked decisions (from fe-lead, not re-opened here)

1. **Repository = Option 1.** Screen calls `IClassManagementRepository.listClasses()`
   (`src/features/admin/class-management/domain/repositories/i-class-management.repository.ts`)
   directly, wired through a **new, principal-scoped DI facade** — not
   `IPrincipalTeachersRepository.listClasses()` (stays untouched, still serves US-E13.5's picker).
2. **Interface extension:** add optional `limit?: number` to
   `IClassManagementRepository.listClasses(params)`, thread into
   `class-management.repository.ts` axios params and `mock-class-management.repository.ts`'s
   signature (mock may ignore the value). Additive — `(app)/admin/classes/page.tsx`'s existing
   `classRepo.listClasses({})` call is unaffected.
3. **BE RBAC gap (confirmed via Go source, cross-repo ask #39 already logged):** `core`'s
   `ListClassesUseCase` grants `ADMIN`/`TEACHER` only — `MANAGER` (principal) hits a hard 403
   today. Mitigation: new `bootstrap/di/principal-classes.di.ts` exporting
   `makePrincipalClassesRepository()` that is **permanently forced to
   `MockClassManagementRepository`** for this screen's call, regardless of `NEXT_PUBLIC_USE_MOCK`
   — same precedent as `class-management.di.ts`'s own `listTeachers` override. Comment must cite
   the Go source line + cross-repo ask #39. Admin's own real path is untouched.
4. **Academic year:** reuse existing `resolveCurrentAcademicYear()`
   (`src/bootstrap/lib/resolve-current-term.ts`) — no second resolution mechanism.
5. **RBAC:** zero new guard code — route lands under the existing
   `src/app/[locale]/t/[tenant]/(app)/principal/layout.tsx` tree (confirmed pattern, mirrors
   `admin/layout.tsx`, decision `0063`).
6. **No formal domain use-case layer for the read.** Confirmed precedent:
   `(app)/admin/classes/page.tsx` calls `makeClassManagementRepository()` and then
   `classRepo.listClasses({})` **directly** from the RSC page — no intervening use-case class.
   This screen mirrors that exact shape (repository-direct from RSC page), consistent with
   Clean-Arch's `app/page.tsx` → `bootstrap/di/` → repository chain; introducing a use-case here
   would be inventing a layer the sibling screen doesn't have (YAGNI).
7. **Filter/sort state = local `useState`, no URL params.** Confirmed precedent:
   `class-management-screen.tsx` (admin's sibling list screen) uses local `useState` for its
   `yearFilter`/`gradeFilter`, not `useSearchParams`. AC-1.17 only requires persistence "within
   the session," not across reload/share — local state satisfies every AC; URL state would be
   unrequested scope.
8. **Route path:** `src/app/[locale]/t/[tenant]/(app)/principal/classes/page.tsx` +
   `actions.ts` (tenant-scoped segment, matching the actual `principal/teachers` sibling path,
   not the shorter `(app)/principal/classes` shorthand used in spec prose).

## 1. Summary

New read-only, school-wide, paginated class list for `principal`. Reuses the `Class` entity +
`IClassManagementRepository` (admin's canonical repo for this data), forced onto the mock
implementation via a thin principal-scoped DI facade until BE adds `MANAGER` to
`core`'s RBAC check (cross-repo ask #39). Client-side status/grade/name filter + sort (no
server-side params exist), server-side cursor "load more" via a Server Action. No new mutation
surface, no new RBAC mechanism, no ADR. **Done** = all 32 AC provable (unit + integration +
Storybook interaction + a11y/responsive pass), `principalClasses` i18n namespace complete,
design-review gate green against `PrincipalTeachersScreen`'s table convention.

## 2. Phased breakdown

### Phase 1 — Domain contract extension (`limit` param)

**Goal:** thread `limit` through the existing interface without touching its behavior for
existing callers.

**Files:**
- `src/features/admin/class-management/domain/repositories/i-class-management.repository.ts`
  — add `limit?: number` to `listClasses(params: {...})`.
- `src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts`
  — thread `params.limit` into the `this.http.get(CLASS_EP.classes, { params: {...} })` object
  (alongside `academicYear`/`cursor`), defaulting to whatever the real endpoint does when
  omitted (unset — do not invent a default here, only pass it when the caller supplies it).
- `src/features/admin/class-management/infrastructure/repositories/mock-class-management.repository.ts`
  — accept `limit?: number` in the signature (destructure and ignore, or slice `filtered` to
  `limit` for mock realism — pick to slice, so mock behavior for this screen's `limit=100`
  default is representative if the mock dataset ever grows past 100).

**Test first:** extend `class-management.repository`'s existing integration test (or add one)
asserting `listClasses({ limit: 100 })` sends `limit: 100` in the axios `params` object.
Extend/verify mock repository unit test still passes with the new optional param (no existing
call site breaks — `(app)/admin/classes/page.tsx`'s `classRepo.listClasses({})` must still
compile and behave identically since `limit` stays optional).

**Done when:** existing admin class-management tests stay green; new assertion for `limit`
passes; `tsc --noEmit` clean.

---

### Phase 2 — Principal-scoped DI facade (forced-mock)

**Goal:** compose a `listClasses` path for the principal screen that is permanently mock-backed
until BE ships `MANAGER` RBAC, without touching admin's own real DI factory.

**Files:**
- `src/bootstrap/di/principal-classes.di.ts` (new) — `'server-only'`. Exports
  `makePrincipalClassesRepository(): Promise<IClassManagementRepository>` returning
  `new MockClassManagementRepository()` unconditionally (not gated by `USE_MOCK`). Doc comment
  MUST state: (a) the Go source file + line for `ListClassesUseCase.Execute`'s `isAdmin`/
  `isTeacher` branch, (b) "cross-repo ask #39" reference in `EPIC-OVERVIEW.md`, (c) that this is
  intentionally **not** wired to `USE_MOCK` (unlike the rest of the app) because a real call
  would 403 for every principal, always — this is a launch-blocking correctness gate, not a
  dev-convenience mock.
- No changes to `bootstrap/di/class-management.di.ts` (admin's factory stays real-capable).

**Test first:** unit test for `principal-classes.di.ts` asserting the returned repository is
always the mock instance (e.g. call `listClasses({})` and assert it resolves with the mock
seed data's shape) regardless of `NEXT_PUBLIC_USE_MOCK` env value (test both `"true"` and
unset/`"false"` — same pattern likely already used for `class-management.di.ts`'s
`listTeachers` override, check that spec file for the exact assertion style to mirror).

**Done when:** facade test green; grep confirms `USE_MOCK` is not referenced/branched on in the
new file.

---

### Phase 3 — RSC page + Server Actions (initial load + load-more)

**Goal:** wire the repository-direct RSC page (mirrors `(app)/admin/classes/page.tsx`'s shape)
plus a `loadMoreClassesAction` Server Action for cursor pagination.

**Files:**
- `src/app/[locale]/t/[tenant]/(app)/principal/classes/page.tsx` (new, RSC) — calls
  `resolveCurrentAcademicYear()` then `makePrincipalClassesRepository()` then
  `.listClasses({ academicYear, limit: 100 })`; passes `{ classes, nextCursor, hasMore,
  academicYear, fetchError }` as VM props into `PrincipalClassesScreen`, plus
  `onLoadMore={loadMoreClassesAction}`.
- `src/app/[locale]/t/[tenant]/(app)/principal/classes/actions.ts` (new, `'use server'`) —
  `loadMoreClassesAction(academicYear: string, cursor: string)` calls
  `makePrincipalClassesRepository()` then `.listClasses({ academicYear, cursor, limit: 100 })`,
  returns `{ ok, data?: ClassListPage, errorKey?: ClassManagementFailure["type"] }` (no
  translation at this boundary, per `.claude/rules/i18n.md`).
- No new route guard file — lands under the existing `principal/layout.tsx` tree.

**Test first:** `actions.test.ts` (mirrors `principal/teachers/actions.test.ts`'s existing
pattern) — asserts `loadMoreClassesAction` calls the facade's `listClasses` with the right
params and maps a failure result to `{ ok: false, errorKey }` without translating.

**Done when:** action unit tests green; page compiles (`tsc --noEmit`); manual smoke: page
renders via `makePrincipalClassesRepository()`'s mock seed data.

---

### Phase 4 — Presentation: `PrincipalClassesScreen` + subcomponents

**Goal:** the table/card list, filters, sort, load-more, states, optional CTA — built for real
(only the data source is mocked, per locked decision #3).

**Files (feature-local, `features/principal/presentation/classes/`):**
- `principal-classes-screen.i-vm.ts` — `PrincipalClassesVm { classes: Class[]; nextCursor:
  string | null; hasMore: boolean; academicYear: string; fetchError:
  ClassManagementFailure["type"] | null }` + props `{ vm, onLoadMore: (academicYear, cursor) =>
  Promise<{ok, data?, errorKey?}> }`.
- `principal-classes-screen.tsx` — orchestrates local `useState` for: `classes` (seeded from
  `vm.classes`, appended on load-more success), `nextCursor`/`hasMore` (updated on load-more),
  `statusFilter` (default `"ACTIVE"`), `gradeFilter`, `nameSearch`, `sort: { key: "name" |
  "gradeLevel"; dir: "asc" | "desc" } | null`, `loadingMore`, `loadMoreError`. Derives the
  visible row set via `useMemo` (filter → search → sort, in that order, AND semantics per
  AC-1.13). Renders loading skeleton / error (network vs forbidden, distinct copy+retry
  presence per AC-1.6/1.7) / empty (two variants: zero-tenant-wide vs zero-after-filter, per
  AC-1.4/1.5) / success table (desktop/tablet ≥768px, reuse `Table`/`TableHeader`/`TableRow`
  primitives per `PrincipalTeachersScreen`'s pattern) — card list variant for mobile <768px
  (new, no existing card-list precedent for this exact field set; build simple stacked
  `Card`-like div using existing tokens, not a new primitive).
- `class-status-badge.tsx` or reuse existing `StatusBadge` directly with a local
  `STATUS_TONE: Record<ClassStatus, StatusTone>` map (`ACTIVE: "success"`, `ARCHIVED: "muted"`)
  inline in the screen file — mirrors `PrincipalTeachersScreen`'s `STATUS_TONE` const pattern,
  no new component needed.
- `class-filters-bar.tsx` — status `Select`/toggle + grade `Select` + name `Input`, all
  keyboard-operable (reuse `components/ui/select`, `components/ui/input`).
- `load-more-button.tsx` — feature-local for now (see §3 component-organization note below;
  NOT promoted to `components/shared/` in this US).
- Optional: `classes-cta.tsx` for the UC-2 "Xem giáo viên" link-out (Could-have, phase this in
  only if time permits — see §4 phasing call).

**Test first (TDD, per state):**
1. Pure filter/sort logic extracted as a plain function (e.g. `deriveVisibleClasses(classes,
   { statusFilter, gradeFilter, nameSearch, sort })` in a co-located `.ts` file, not inline in
   the component) with a Vitest unit test covering AC-1.8/1.9/1.11/1.12/1.13/1.15/1.16/1.17 —
   this is the cheapest, most valuable proof (pure domain-ish logic, no framework).
2. Storybook interaction stories (`.stories.tsx`) for: loading, empty (both variants),
   error (both variants — network+retry vs forbidden+no-retry), success (populated,
   multi-grade), load-more (success/failure/hasMore=false), filter/sort interactions, CTA
   visibility gating (AC-2.1) if built, responsive viewport addon (320/375/768/1280, AC-X.1),
   keyboard-only pass (AC-X.2).

**Done when:** pure-fn unit tests green; Storybook interaction suite (`vitest.storybook.mts`)
green for all listed states; a11y addon clean.

---

### Phase 5 — i18n (`principalClasses` namespace)

**Goal:** every UI string typed, vi source + en mirror.

**Files:** `src/bootstrap/i18n/messages/vi.json` + `en.json` — new `principalClasses` key tree:
`title`, `subtitle`, filters (`status.active/archived/all`, `gradeFilter.label/allGrades`,
`search.placeholder`), sort labels, table headers (`name`, `gradeLevel`, `homeroom`,
`studentCount`, `status`), `homeroomUnassigned` ("Chưa phân công"), states (`loading`,
`emptyTenantWide`, `emptyFiltered`, `clearFilters`, `errors.network-error`,
`errors.forbidden`, `retry`), `loadMore` (`label`, `retry`), CTA label if built
(`viewTeachers`), a11y captions (`table.caption`, `table.loading` sr-only pattern per
`principalTeachers`'s existing convention).

**Test first:** none new beyond `tsc --noEmit` (typed `t()` catches key drift) — covered by
Phase 4's Storybook stories exercising every string.

**Done when:** `bunx tsc --noEmit` clean; grep for hardcoded Vietnamese diacritics in the new
`.tsx` files returns nothing.

---

### Phase 6 — Design-review gate + QA sign-off

**Goal:** close the loop per `docs/DESIGN_REVIEW.md` given no `design-spec.jsonc` entry exists
(§8 GAP, not a blocker).

**Checks:**
- Confirm screen reads as a faithful extension of `PrincipalTeachersScreen`'s table pattern +
  token usage (not a net-new visual language) — `/impeccable audit`+`critique` scoped per
  `.claude/rules/impeccable.md` (tokens/layout are supreme, only a11y/spacing/hierarchy
  critique applies).
- `fe-accessibility-auditor`: WCAG 2.1 AA pass (contrast, focus, touch targets, keyboard,
  status-not-color-alone).
- `fe-qa-playwright`: E2E smoke for RBAC redirect (non-principal roles), happy path, load-more,
  filter/sort, responsive breakpoints.
- Update `docs/TEST_MATRIX.md` US-E13.8 row from `planned` → `implemented` only once all proof
  layers (unit/integration/E2E/platform/release) exist, per `.claude/rules/tdd.md`.

## 3. Component + state sketch

```
PrincipalClassesScreen (client, local useState orchestrator)
├── Header (title, count badge, optional CTA button — reuse StatusBadge + Button)
├── ClassFiltersBar (status Select, grade Select, name Input) — client-side only, no network
├── ErrorState (network vs forbidden variants) | EmptyState (2 variants) | LoadingSkeleton
└── SuccessView
    ├── Table (desktop/tablet ≥768px) — reuse components/ui/table primitives
    │   rows: name · gradeLevel · homeroom (StatusBadge or placeholder text) · studentCount ·
    │         status (StatusBadge tone=success|muted)
    ├── CardList (mobile <768px) — new, feature-local stacked layout, same fields
    └── LoadMoreButton (feature-local; hidden when hasMore=false; inline retry on failure)
```

**State classification:**
- **Server (RSC-fetched once):** initial `classes`/`nextCursor`/`hasMore` — fetched in
  `page.tsx`, passed as VM props.
- **Local-form/UI (client `useState`, no TanStack Query needed — this is a simple
  fetch-once-then-append list, not a cache-invalidation-heavy resource):** `classes` (seeded +
  appended), `nextCursor`/`hasMore` (updated on load-more), `statusFilter`, `gradeFilter`,
  `nameSearch`, `sort`, `loadingMore`, `loadMoreError`.
- **No URL state** (locked decision #7) — filters need only session-lifetime persistence.
- **No global/Zustand store** — confined to one screen, no cross-component sharing need.

`fe-state-engineer` verdict: **not required as a separate pass.** This is a simple
fetch-then-client-append pattern with no TanStack Query cache, no cross-screen invalidation, and
an explicit local-state precedent already proven on the nearly-identical sibling
(`class-management-screen.tsx`'s `useState`-based filters + `classes` array). Bringing in
TanStack Query here would add cache-key/invalidation machinery the read-only, single-fetch
screen doesn't need (YAGNI) — the "load more" append is a plain array concat on Server Action
success, not a query-cache concern. `fe-component-architect` should still confirm this at
implementation time if the row/card visual complexity turns out to need finer prop contracts
than sketched here.

`fe-component-architect` verdict: **recommended, yes.** The component tree above is a
high-level sketch only — the responsive table↔card contract (which fields collapse/reflow at
each breakpoint), the exact `ClassFiltersBar` prop shape, and the `LoadMoreButton`'s
loading/error/hidden state contract deserve a dedicated pass before `fe-nextjs-engineer` starts
TDD, per the standard pipeline for "new responsive table/card component tree with
filter/sort/badge/pagination."

## 4. Component-organization note (flagged, not resolved here)

Admin's `class-management-screen.tsx` has unused `nextCursor`/`hasMore` VM fields — it never
built a "load more" UI. This US is the first to actually implement one. Options:
(a) build `LoadMoreButton` feature-local in `features/principal/presentation/classes/` only
(chosen for this plan — component-organization rule's "1 screen, tentative" tier), or
(b) build it in `components/shared/` immediately since the *need* (cursor pagination UI) is
demonstrably shared with admin's dormant fields.

**Decision for this plan: (a).** Per `.claude/rules/component-organization.md`, promotion
happens on the **2nd actual use**, not on a theoretical second consumer — admin's screen doesn't
render a load-more control today, so there is no second consumer yet, only a second *potential*
one. Retrofitting admin's screen to add its own load-more UI is explicitly **out of scope** for
this US (spec §3 out-of-scope: only mutation/homeroom/rollup/drill-down are named, but
introducing new UI on a sibling screen unprompted violates YAGNI here too). **Follow-up flagged
for `fe-lead`/backlog:** when admin's class list adds its own load-more control, promote
`LoadMoreButton` to `components/shared/load-more-button/` at that point (move, don't copy).

## 5. Phasing call — Should/Could items (per spec.md §6 Open Question #6)

- **FR-004 (grade/name filter-search) and FR-005 (sort), both Should-have:** phased INTO v1
  (Phase 4) — both are pure client-side logic over already-loaded rows, cheap to build
  alongside the required status filter (FR-003, Must), and already fully AC'd
  (AC-1.11–1.17). Deferring them would leave the screen visibly incomplete against a fully
  Storyboarded spec for near-zero cost savings.
- **FR-010 (CTA to teachers screen), Could-have:** phased in ONLY if Phase 4 velocity allows;
  if deferred, note it as a follow-up story, since AC-2.1/2.2 are simple (2 AC, pure
  navigation, no new screen). Recommend building it — it's small — but not gating the rest of
  the US on it.

## 6. Risks, dependencies, open questions

- **[RISK — launch-blocking, carried from spec.md, NOT re-derived, just restated for
  visibility]** MANAGER-role RBAC on the real `GET /api/v1/classes` endpoint is unverified
  against a non-mock `core` environment. Mitigated for THIS US by the forced-mock facade
  (Phase 2) — the screen ships fully functional on mock data; switching to real data is a
  follow-up once BE lands cross-repo ask #39. No action needed from `fe-nextjs-engineer` beyond
  building the facade as specified.
- **No `design-spec.jsonc` entry** for this screen (§8 GAP) — design-review gate substitutes a
  "faithful extension of `PrincipalTeachersScreen`" check (Phase 6). A `/uiux` follow-up to
  author a normative entry is warranted but non-blocking.
- **`enrich()` perf cost** (2 extra HTTP calls per class per page) is inherited from the
  resolved repository, already-accepted (admin pays it today) — moot for this US anyway since
  Phase 2 forces the mock repository (no real HTTP calls happen at all until the facade is
  later un-forced).
- **[OPEN QUESTION]** Badge tone for `ARCHIVED` status — this plan proposes `muted` (mirrors
  `schedule: done → muted` convention in `design-system.md`); confirm with `/uiux` or
  `fe-tech-lead-reviewer` if a stronger visual distinction is wanted at design-review time.
  Not blocking — easy one-line change if reviewer disagrees.
- **[OPEN QUESTION]** Card-list layout (mobile <768px) has no existing precedent with this
  exact field set (name/grade/homeroom/studentCount/status) — `fe-component-architect` should
  decide the card's internal layout (stacked vs. two-column label/value) before TDD begins.
- No ADR needed — confirmed by spec.md §10 ("Data-completeness/repository-reuse finding at the
  implementation layer, not a new auth/token/data-contract/design-system decision").

## 7. Next steps (handoff)

- **`fe-component-architect`** — YES, run next. Design the responsive table↔card component
  tree/prop contracts sketched in §3, resolve the two open a11y/layout questions in §6.
- **`fe-state-engineer`** — NOT required as a separate pass (see §3 verdict) — plain local
  `useState`, no TanStack Query, no cross-screen cache. `fe-component-architect` may flag if
  this read changes during their pass; if so, re-route back to `fe-state-engineer` at that
  point rather than pre-emptively spawning them now.
- **`fe-nextjs-engineer`** — implements Phases 1–5 in order (contract → DI facade → RSC/actions
  → presentation → i18n), strict TDD per phase.
- **`fe-tech-lead-reviewer` + `fe-accessibility-auditor`** — parallel gate after Phase 5.
- **`fe-qa-playwright`** — Phase 6.
