# US-E13.8 Principal Classes — School-Wide Class List (Read)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E13.5 (principal-teachers-management — ships `GetPrincipalClassesUseCase` / `IPrincipalTeachersRepository.listClasses()` this US reuses), US-E12.10 (class-management — canonical `Class` entity + real core wiring)
- Blocks: none
- Feature module(s) chạm: `src/features/principal/presentation/classes/`, `src/features/principal/domain/teachers/` (reuse, no new use-case expected), `src/features/principal/infrastructure/teachers/` (reuse)
- Shared contract/file: `Class` entity (`src/features/admin/class-management/domain/entities/class.entity.ts`), `IPrincipalTeachersRepository.listClasses()` (already real, core `GET /api/v1/classes`) — NOT a new repository/entity unless analysis finds a genuine gap.

## Context (why this US exists)

`docs/product/screens.md:84` lists `Classes | (app)/principal/classes | teacher.jsx | features/principal | ⬜` as the
last design-vs-build gap found in the 2026-07-26 screen audit. There is NO dedicated `PrincipalClassesScreen`
component in `design_src/edu/teacher.jsx` — the screens.md row points at that file only because it's the shared
design source for the Principal Dashboard (`PrincipalDashboardHome`) and Principal Teachers screens, and it contains
two visual reference patterns this new screen can draw from:
- `TeacherClasses` (lines 750–774) — card-grid pattern (class name, subject, student count, avg score, attendance,
  curriculum progress) — this is the TEACHER's own-classes view (US-E13.1, already built as
  `teacher-classes-screen`), not principal, but its card layout is a visual reference.
- `PrincipalTeachersScreen` table pattern (already built, US-E13.5) — table layout, filters, Badge usage.

Meanwhile the DATA layer for a principal-facing class list already exists and is REAL: `GetPrincipalClassesUseCase`
(`src/features/principal/domain/teachers/use-cases/get-principal-classes.use-case.ts`) calls
`IPrincipalTeachersRepository.listClasses()` which wires to real core `GET /api/v1/classes` (confirmed in
US-E13.5's BE-readiness table) and returns the canonical `Class` entity (`id`, `name`, `gradeLevel`, `status`,
`academicYear`, `studentCount`, `homeroomTeacherId`, `homeroomTeacherName`). Today this is consumed ONLY as a
`<select>` options source inside `TeacherAssignmentSheet`'s GVCN picker — never surfaced as its own browsable
screen. This US's job is mostly a NEW PRESENTATION LAYER on EXISTING real data — analysis should confirm whether
any additional data (per-class avg score / attendance, à la `TeacherClasses`) is in scope, and if so, flag the
fan-out cost (38+ classes × N calls) as an NFR/perf concern before recommending it.

## Relevant Product Docs

- `docs/product/screens.md` (Principal section, "Classes" row)
- `docs/product/design-spec.jsonc` — no existing entry for this screen; will need one if ba-spec-writer / a follow-up
  `/uiux` pass produces layout specifics beyond reuse of existing patterns.
- `docs/product/roles-permissions.md` — principal role = `MANAGER` claim server-side (per US-E13.5 RBAC section:
  "ADMIN / MANAGER (appRole=principal) can view...").
- `../edu-api/services/core/docs/{openapi.yaml,INTEGRATION.md}` — `Classes` tag, `GET /api/v1/classes`.
- `docs/stories/epics/E13-teacher-workspace/US-E13.5-principal-teachers-management/story.md` — sibling story,
  BE-readiness table precedent, reused repository.
- `src/features/admin/class-management/` — canonical `Class` entity + admin CRUD screen (read-only reuse reference
  for table layout; this US must NOT duplicate create/edit/archive — those stay admin-only).
- `src/features/teacher/presentation/teacher-classes-screen/` — card-grid visual reference (own-classes, not
  school-wide) — reuse the PATTERN, not the component (per `.claude/rules/component-organization.md`, this is a
  different actor/scope so a shared component promotion is not automatic; note the decision either way).

## Acceptance Criteria

(To be defined in full by `ba-use-case-modeler`; placeholder scope below for intake.)

- Principal can view a list of all classes in the tenant for the active/selected academic year.
- Each row/card shows: class name, grade level, homeroom teacher (or "Chưa phân công"), student count, status
  (Đang học / Đã lưu trữ).
- Loading / empty / error states.
- Read-only: no create, rename, archive, or homeroom-assignment action on this screen (those remain
  `(app)/admin/classes` US-E12.10 and `(app)/principal/teachers` US-E13.5 respectively).
- RBAC: `principal` only (route guard `(app)/principal/layout.tsx`, `evaluateNamespaceAccess`).

## Design Notes

- Commands: none (read-only screen).
- Queries: `listClasses()` (existing, real).
- API: `GET /api/v1/classes` (core, real, already wired).
- Tables: none new.
- Domain rules: none new — display-only projection of `Class`.
- UI surfaces: `(app)/principal/classes` route, `features/principal/presentation/classes/`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E13.8 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Presentation-only reuse expected — minimal/no new domain unit tests if no new use-case is introduced. |
| Integration | If a new use-case/repo method is introduced (e.g. for per-class metrics), repository contract tests. |
| E2E | Storybook interaction states (loading/empty/error/populated) + Playwright smoke once `/fe` implements. |
| Platform | n/a |
| Release | Spec-only for this BA pass; stays `planned` until `/fe` implements + proves. |

## Harness Delta

- Story registered: `scripts/bin/harness-cli story add --id US-E13.8 ...` (this session).
- `docs/TEST_MATRIX.md` row added, status `planned`.
- No ADR expected (pure UI/read-only reuse of an existing real endpoint) unless analysis surfaces a genuine new
  data/contract decision.
- **Repository-gap finding (added by `ba-spec-writer`, this session):** the "obvious" reuse target named above,
  `IPrincipalTeachersRepository.listClasses()`, is NOT actually reusable as-is for this screen — it passes no
  query params, discards pagination, and hardcodes `studentCount: 0` / `homeroomTeacherId: null` /
  `homeroomTeacherName: null` on every row (its own inline comment calls this a "KNOWN GAP"). A second existing
  repository, `IClassManagementRepository.listClasses()` (admin's `(app)/admin/classes`, US-E12.10), already wraps
  the SAME endpoint correctly (real params, real pagination, real `enrich()` fan-out for studentCount/homeroom).
  This is a data-completeness/repository-reuse finding, not a new auth/token/data-contract/design-system decision
  — no ADR raised. Full analysis in `integration.md` §5 and consolidated in `spec.md` §6 ("THE CENTRAL OPEN
  DECISION"); `fe-lead`/`fe-planner` must resolve which repository this screen calls before FR-002/FR-007 can be
  honestly satisfied.

## Evidence

**Implemented 2026-07-26** on `feat/us-e13.8-principal-classes` (7 commits:
`b0dc90d`→`5641eba`). See `plan.md` + `component-contracts.md` in this packet for
the full phased plan and architecture.

**Repository-choice gap (resolved):** screen calls `IClassManagementRepository
.listClasses()` (admin's canonical repo, extended with an additive `limit?`
param) via a NEW principal-scoped DI facade, `makePrincipalClassesRepository()`
(`src/bootstrap/di/principal-classes.di.ts`) — permanently forced onto
`MockClassManagementRepository` (NOT gated by `NEXT_PUBLIC_USE_MOCK`) because
`core`'s `ListClassesUseCase.Execute` (ground-truthed against Go source,
`list_classes.go`) only grants `ADMIN`/`TEACHER`; `MANAGER` (principal) hits a
hard 403 today. Cross-repo ask #39 logged in
`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`. Admin's own real
`class-management.di.ts` factory is untouched — only this screen's read path
is force-mocked, as a launch-blocking-risk mitigation, not a dev convenience.

**Pipeline:** `fe-planner` → `fe-component-architect` (state-engineer skipped,
justified YAGNI — plain local `useState`/`useMemo`, no TanStack Query, matches
sibling `class-management-screen.tsx` precedent) → `fe-nextjs-engineer` (TDD)
→ `fe-tech-lead-reviewer` + `fe-accessibility-auditor` (parallel) → fix round
(5 findings, all closed) → design-review gate (this section).

Design review: pass
- design-system: conform — tokens-only confirmed (grep for raw color/hex/
  Tailwind palette scales across all new files: 0 hits); `StatusBadge`
  (`ACTIVE→success`/`ARCHIVED→muted`) matches `class-management-screen.tsx`'s
  existing convention exactly, no divergence; `LoadMoreButton` reused as-is
  from `components/shared/load-more-button/` (no new component); no new
  primitive/token needed.
- a11y: WCAG 2.1 AA — contrast (`text-edu-error-text` per ADR 0049, not
  `text-destructive`), keyboard-operable filters/sort/pagination, icon-only
  sort-toggle has `aria-label`, focus rings intact (no `outline-none`),
  ≥44×44px touch targets (primitive defaults), status conveyed via
  `StatusBadge` label+tone not color alone, reduced-motion unaffected (no new
  animation beyond `ui/skeleton`'s existing motion-safe pulse). 2 findings from
  `fe-accessibility-auditor` (A11Y-001 empty-state no-op, A11Y-003 duplicate
  loading announcement) + 1 doc-only (A11Y-002) all fixed in `4cb0c30`.
- impeccable: no `design-spec.jsonc` entry exists for this screen (spec.md §8
  GAP, non-blocking) — gate substitutes a faithful-extension check:
  `PrincipalTeachersScreen`'s table/`STATUS_TONE`/`TableCaption`/`role="alert"`
  conventions are mirrored exactly, no net-new visual language introduced.
- states: loading (table+card variant, single hoisted `role="status"`)/empty
  (2 variants: zero-tenant vs zero-filtered, correctly gated on
  `hasActiveFilter` post-fix)/error (2 variants: network+retry vs
  forbidden+no-retry)/success all present and Storybook-covered; responsive
  320/375/768/1280 verified via viewport-addon stories with overflow
  assertions, no horizontal scroll.

**Proof:**
- Unit: `derive-visible-classes.test.ts` (18+ cases, AC-1.8/1.9/1.11–1.17),
  `mock-class-management.repository.test.ts`, `principal-classes.di.test.ts`
  (env-matrix, mock-always regardless of `USE_MOCK`), `actions.test.ts`.
- Integration: `class-management.repository.test.ts` (extended for `limit`
  param threading).
- E2E/Storybook: 22/22 interaction stories green (loading×2, empty×2,
  error×2, success, load-more success/failure/hidden, filter/sort +
  persistence, CTA gating, keyboard-only, 320/375/768/1280).
- Platform: `bunx tsc --noEmit` clean; `bun run build` OK
  (`ƒ /[locale]/t/[tenant]/principal/classes` present); `bun lint` — 1
  pre-existing unrelated warning only (verified via `git stash`).
- Full suite: `bun vitest run` → 424 files / 2875 tests passed.

Reviewed by `fe-tech-lead-reviewer` — **Approved** (0 blocking findings, 4
should-fix items, all closed same-branch). `fe-accessibility-auditor` — 2
should-fix + 1 doc-only, all closed.

**Known limitation (documented, not a defect):** production principals see
mock class data until BE ships MANAGER RBAC on `GET /api/v1/classes` (ask
#39) — same accepted pattern as `staff-leave.di.ts`/`teaching-plan.di.ts`.
