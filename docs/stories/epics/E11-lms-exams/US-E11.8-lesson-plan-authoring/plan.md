# Implementation Plan — US-E11.8 Teacher Lesson Plan Authoring

Written by `fe-planner`. Build contract = `spec.md` (62 AC, 10 UC). Do not
re-derive layout — cite `design-spec.jsonc` → `screens.lessonPlan` +
`design_src/edu/lesson-plan.jsx` for every visual value. This plan does not
write code.

## 0. Corrections to carry forward (read before coding)

1. **Endpoint file — `spec.md` wins over `story.md`.** `story.md`'s
   "Shared contract/file" line says `bootstrap/endpoint/lms.endpoint.ts` (new
   `LESSON_PLAN_EP` group). `spec.md` §6/§11 is explicit and reasoned: **new
   file** `src/bootstrap/endpoint/lesson-plan.endpoint.ts`, do **NOT** touch
   `lms.endpoint.ts` (reserved for the still-unbuilt `lms` service prefix;
   lesson-plan is `core`). `spec.md` is "THE build contract" per the task
   brief — follow it. Flagging to `fe-lead` so `story.md`'s dependency line
   gets corrected (no ADR needed, this is a file-naming fix, not an
   architecture decision).
2. **Route group path.** Grepped `src/app` — the real teacher route convention
   is `src/app/[locale]/t/[tenant]/(app)/teacher/<feature>/...` (see
   `exam-bank`'s actual tree), not
   `(dashboard)/(app)/teacher/...` as shorthand-referenced in the task brief.
   Plan below uses the grepped, real path.
3. **`design-spec.jsonc` `lessonPlan.i18nKeyCount: 80`** matches `spec.md` §9's
   "existing ~80 keys" — confirmed consistent, no drift.

## 1. Scope

Net-new `src/features/lesson-plan/` (Clean Architecture: domain →
infrastructure → bootstrap/{endpoint,di} → presentation), 3 routes under
`teacher/lesson-plans`, reusing the existing `lessonPlan` i18n namespace +
12 new keys, reusing `subject-catalogue` DI read-only. Service: `core`
(`lessonplan` sub-domain), mock-first via `NEXT_PUBLIC_USE_MOCK` (real
contract ground-truthed, not decision-0014 permanent mock).

## 2. Component-architect / state-engineer call

**Run both `fe-component-architect` and `fe-state-engineer` in parallel next.**
Justification:
- Two distinct screens (`LessonPlanListScreen` with two owner-toggle scopes
  each with their own loading/empty/error states; `LessonPlanBuilderScreen`
  with create/edit/locked variants) — real component-tree decomposition work
  (7 named components already in `design-spec.jsonc`: `LPCard`,
  `LPStatusChip`, `LPTagChipsInput`, `LPDropdown`, `LPConfirmDialog`, plus the
  two screens) — `fe-component-architect` should produce the tree + `.i-vm.ts`
  prop contracts before the engineer starts, same as `exam-bank` did
  (`use-exam-builder.ts` + screen/sub-component split is the precedent to
  follow, not fork).
- Real server-state complexity: two independent `useInfiniteQuery` cursor
  pagination call sites (list-mine, browse-by-subject) with **client-side**
  filters layered over fetched pages (§6 — filters must NOT become new query
  params except browse's `tag`), plus RSC↔client boundary across 3 routes
  (skeleton-on-server, hydrate-on-client), plus optimistic-ish
  save/publish state (unsaved-indicator diffing, auto-lock race handling on
  `already-published`). This is exactly the "non-trivial server state" trigger
  in `fe-lead`'s dispatch rule — `fe-state-engineer` should own query-key
  design (`["lesson-plan", "list", "mine"]` / `["lesson-plan", "list",
  "subject", subjectId]` / `["lesson-plan", "detail", id]`) + invalidation
  (create → invalidate list-mine; update/publish → invalidate detail + both
  list scopes) before the engineer starts.
- Both can run **in parallel** (independent concerns: component tree/props vs.
  query keys/cache) — no shared-file collision (component-architect writes
  `.i-vm.ts` + tree sketch, state-engineer writes hook/query-key sketch); the
  engineer then reconciles both into `presentation/`.

## 3. Phased breakdown (TDD-ordered)

### Phase 1 — Domain (pure, unit-test-first)
**Files:**
- `domain/entities/lesson-plan.entity.ts` — `LessonPlanEntity` (mirrors
  `LessonPlanResponse` §6: `planId`, `teacherId`, `subjectId`, `gradeLevel`,
  `title`, `objectives`, `contentOutline`, `activities`, `assessmentMethod`,
  `status`, `tags: string[]`, `publishedAt?`, `createdAt`, `updatedAt`).
- `domain/failures/lesson-plan.failure.ts` — 13-variant `LessonPlanFailure`
  union verbatim from `spec.md` §6.
- `domain/repositories/i-lesson-plan.repository.ts` — 6 methods (create,
  update, publish, get, listMine, listBySubject), cursor-paginated list
  methods return `{ items, nextCursor?, hasMore }`.
- `domain/use-cases/`: `create-lesson-plan.use-case.ts`,
  `update-lesson-plan.use-case.ts`, `publish-lesson-plan.use-case.ts`,
  `get-lesson-plan.use-case.ts`, `list-my-lesson-plans.use-case.ts`,
  `list-lesson-plans-by-subject.use-case.ts`.

**Test first:** one `*.use-case.test.ts` per use-case (6 files) — mock
`ILessonPlanRepository`; cover success + each failure branch each use-case can
surface (e.g. `create` → title-required/title-too-long/subject-not-found/
invalid-subject-id/tag-limit-exceeded/tag-too-long/forbidden/network-error/
unknown; `publish` → already-published/not-found/not-visible/forbidden/
network-error). Also `mapper.test.ts` for `publishedAt`-key-absence handling
(DRAFT → `undefined`, not error).

**Done when:** all 6 use-case unit suites + mapper unit test green,
0 framework imports in `domain/`.

### Phase 2 — Infrastructure (server-only)
**Files:**
- `infrastructure/dtos/lesson-plan-response.dto.ts` — camelCase, matches §6
  wire shape exactly.
- `infrastructure/mappers/lesson-plan.mapper.ts` — DTO→Entity,
  `publishedAt` absent-key → `undefined`.
- `infrastructure/mappers/map-lesson-plan-error.ts` — branches on
  `error.code` (UPPER_SNAKE), never `message`; generic fallback 403→forbidden,
  404→not-found, `retryable===true`→network-error, else unknown. **Before
  finalizing:** do the real integration-test round-trip against a running
  `core` instance (or best-effort verify against `edu-api` source per
  `spec.md` §8 open question 4) — do not just claim by analogy to
  `map-exam-bank-error.ts`.
- `infrastructure/repositories/lesson-plan.repository.ts` — implements
  `ILessonPlanRepository`, `import 'server-only'`, casts
  `(await this.http.post(...)) as unknown as LessonPlanResponseDto`; list
  calls use `{ raw: true }` + `parseEnvelope()` for
  `meta.pagination.nextCursor`/`hasMore` (sibling of `params`, per §6's cited
  prior regression class).
- `infrastructure/repositories/mocks/mock-lesson-plan.repository.ts` — seed
  data per §6's mock-first plan: mixed DRAFT (current teacher) + PUBLISHED
  (own + other teacher) across 2–3 subjects, one plan at 10-tag boundary, one
  title at exactly 200 chars, `publishedAt` key-absent for DRAFT, in-memory
  cursor pagination, mutate-in-place on create/update/publish.

**Test first:** `lesson-plan.repository.test.ts` (integration-style, mock
HTTP client) asserting envelope unwrap + error→failure mapping for each of
the 13 `LessonPlanFailure` variants; `mock-lesson-plan.repository.test.ts`
asserting seed invariants (boundary cases present, pagination shape, mutation
semantics) — same pattern as `subject-catalogue.mock.repository.test.ts`.

**Done when:** repository integration tests green; mock repo tests green;
`bunx tsc --noEmit` clean (server-only boundary enforced by build, not just
convention).

### Phase 3 — Bootstrap (endpoint + DI)
**Files:**
- `bootstrap/endpoint/lesson-plan.endpoint.ts` — **new file**, `LESSON_PLAN_EP`
  exactly as `spec.md` §6 (`list`, `create`, `detail(id)`, `update(id)`,
  `publish(id)`, `bySubject(subjectId)`). Do not touch `lms.endpoint.ts`.
- `bootstrap/di/lesson-plan.di.ts` — `import 'server-only'`; `makeRepo()`
  swaps `MockLessonPlanRepository`/`LessonPlanRepository` on `USE_MOCK`
  (mirror `subject-catalogue.di.ts`'s shape, call `ensureFreshSession()`
  before the real-repo branch per decision `0018`); export
  `makeCreateLessonPlanUseCase`, `makeUpdateLessonPlanUseCase`,
  `makePublishLessonPlanUseCase`, `makeGetLessonPlanUseCase`,
  `makeListMyLessonPlansUseCase`, `makeListLessonPlansBySubjectUseCase`, plus
  a read-only re-export/call path to
  `makeSubjectCatalogueRepository()` (from
  `bootstrap/di/subject-catalogue.di.ts`, existing) for the picker — do not
  fork a second subject integration (per story.md's FE Resolution Notes #1).

**Test first:** none new (DI factories are thin wiring, no branching logic to
unit-test beyond what Phase 1/2 already cover) — verified instead by Phase 4's
Server Action tests exercising the factories end-to-end against the mock repo.

**Done when:** `bun build` still green with `USE_MOCK` both on/off (server-only
guard doesn't break client bundle).

### Phase 4 — Server Actions + routes (RSC boundary)
**Files:**
- `src/app/[locale]/t/[tenant]/(app)/teacher/lesson-plans/page.tsx` (RSC) +
  `actions.ts` (`'use server'`, calls `makeListMyLessonPlansUseCase`/
  `makeListLessonPlansBySubjectUseCase` only).
- `.../lesson-plans/create/page.tsx` + `actions.ts` (`makeCreateLessonPlanUseCase`
  + subject-picker read via `makeSubjectCatalogueRepository()`).
- `.../lesson-plans/[id]/edit/page.tsx` + `actions.ts`
  (`makeGetLessonPlanUseCase`, `makeUpdateLessonPlanUseCase`,
  `makePublishLessonPlanUseCase`).
- Route guard: same `(app)/teacher/**` role-gate convention as exam-bank/
  lesson-bank — no new RBAC mechanism (per `spec.md` §2).

**Test first:** action-level test asserting `actions.ts` never imports
`infrastructure/` directly (only `bootstrap/di/`), and a happy-path +
failure-path assertion per action (create success, create title-required,
update already-published race, publish success, publish forbidden) — mirrors
how `exam-bank/actions.ts` is tested (check that file's test for the exact
harness pattern before writing new ones).

**Done when:** all 6 route actions covered by at least one success + one
representative failure test; `bun build` green.

### Phase 5 — Presentation (components + i-vm)
**Files (hand-off from `fe-component-architect`'s tree, likely shape):**
- `presentation/lesson-plan-list-screen/{lesson-plan-list-screen.i-vm.ts,
  .tsx, .stories.tsx}` + `lp-card.tsx`, `lp-status-chip.tsx`,
  `lp-dropdown.tsx`, `lesson-plan-filter-bar.tsx`, `lesson-plan-skeleton.tsx`,
  `lesson-plan-empty.tsx` (mine-empty vs. mine-filtered-empty vs.
  browse-prompt vs. browse-empty — 4 distinct empty/prompt states, not 1).
- `presentation/lesson-plan-builder-screen/{lesson-plan-builder-screen.i-vm.ts,
  .tsx, .stories.tsx}` + `lp-tag-chips-input.tsx`, `lp-confirm-dialog.tsx`
  (publish, `role="dialog" aria-modal="true"`), `builder-header.tsx` (unsaved
  dot indicator), `use-lesson-plan-builder.ts` (client hook — form state +
  publish-readiness gate FR-003, mirrors `use-exam-builder.ts`).

**Cite, don't re-derive:** every spacing/color/icon/grid value from
`design-spec.jsonc` → `screens.lessonPlan` (already read: `listScreen`
section covers pageHeader/ownerToggle/filterBar down to px values; builder
section — read the remainder of that entry before building — covers
2-column/mobile-stack breakpoint). Reference mockup:
`design_src/edu/lesson-plan.jsx` (`LessonPlanScreen`, `LessonPlanBuilderScreen`).

**Test first (Storybook interaction, per state):** list-mine
loading/empty/filtered-empty/error/success; list-browse
prompt/loading/empty/error/success; builder-create validation-errors;
builder-edit skeleton/race-auto-lock/error; builder-locked read-only;
publish-confirm-dialog open/confirm/cancel/error; tag-chips add/dup-ignore/
max-10/too-long/remove-hidden-when-locked.

**Done when:** design-review gate ready (impeccable audit/critique run,
tokens-only, WCAG AA states present in stories).

### Phase 6 — i18n
Reuse existing `lessonPlan` namespace (~80 keys, DR-021) as-is. Add **exactly**
the 12 keys from `spec.md` §9 to both
`src/bootstrap/i18n/messages/vi.json` and `en.json` (same path, same commit):
`lessonPlan.errors.{not-visible, already-published, tag-limit-exceeded,
tag-too-long, subject-not-found, invalid-id}`,
`lessonPlan.browse.{promptTitle, promptBody, emptyTitle}`,
`lessonPlan.card.unknownOwner`, `lessonPlan.errors.accessDenied.{title,body}`.
Do not invent beyond this list (`LESSON_PLAN_INVALID_CURSOR` is silent by
design, no key). Verify via `bunx tsc --noEmit` (typed `t()` catches drift).

### Phase 7 — E2E (Storybook already covers interaction; Playwright for flow)
Playwright spec: canonical path create → save draft → edit → publish
(confirm dialog) → locked view (per `spec.md` §5 "Key flows"), plus:
list-mine and list-browse loading/empty/error at viewport matrix
320/375/768/1280 (NFR-002), access-denied vs. not-found distinct redirect
(AC-008.3/.4), non-owner-DRAFT-URL probe (NFR-005 manual check).

### Phase 8 — Gate + harness proof
- `fe-tech-lead-reviewer` + `fe-accessibility-auditor` in parallel.
- Confirm error-code casing round-trip was actually done (Phase 2 note), not
  just claimed — reviewer checklist item.
- Bump `docs/TEST_MATRIX.md` US-E11.8 row from `planned` → proof flags
  (unit/integration/e2e/build) once each phase's proof lands; row already
  exists at `planned` (verified — line 127) so no new row needed, only status
  update at the end.
- `harness-cli story update --id US-E11.8 --status implemented ...` once all
  gates green.

## 4. State classification (server / URL / local-form)

- **Server (TanStack Query, `fe-state-engineer` to finalize keys):**
  list-mine (`useInfiniteQuery`), list-by-subject (`useInfiniteQuery`,
  disabled until subject chosen), single-plan detail (`useQuery`), subject
  picker options (`useQuery`, via existing subject-catalogue repo).
- **URL/route param:** `:id` on edit route; owner-toggle scope + selected
  subject on the list route are candidates for URL search params (shareable
  filter state) vs. local state — `fe-state-engineer` to decide, default to
  local state if no deep-link requirement surfaces (KISS).
- **Local-form:** builder field state (title/gradeLevel/tags/4 sections),
  tag-chips input buffer, publish-readiness derived boolean (FR-003, pure
  client compute, no query), unsaved-diff boolean (FR-010).
- **No Zustand** — confirmed not needed, all state above fits server-cache or
  local component state.

## 5. Risks, dependencies, open questions

- **[RESOLVED, carried from story.md FE Resolution Notes — plan around
  these, don't re-litigate]:** subject picker reuses
  `makeSubjectCatalogueRepository()` read-only (no second integration);
  FR-007 owner attribution always renders `lessonPlan.card.unknownOwner` for
  ALL owners (not just unresolvable ones) — component must not attempt any
  ad-hoc name lookup; FR-010 ships dot-only, no leave-guard dialog.
  `fe-component-architect`/`fe-state-engineer` should treat all three as
  fixed constraints, not open design space.
  - **Note this is stricter than a literal reading of spec.md's fallback**
    (spec.md's own `card.unknownOwner` copy implies "unknown owner" as a
    fallback for *unresolvable* names, but story.md's resolution renders it
    for *all* owners). Following story.md (fe-lead's authored resolution)
    since it's the more recent, decision-bearing artifact — flag to
    `fe-lead` to confirm this reading is intended before Phase 5 locks the
    card component's prop contract (`ownerLabel: string` always
    `unknownOwner`-sourced vs. `ownerLabel?: string \| null` with a
    conditional fallback — small API difference, cheap to settle now).
- **[CHECKLIST ITEM]** Error-code casing verification (spec.md §8 open
  question 4) — engineer must do a real round-trip or documented best-effort
  source check before `map-lesson-plan-error.ts` is considered done;
  reviewer gate blocks on this not being just asserted.
- **Endpoint file location discrepancy** (§0.1 above) — flagged to `fe-lead`,
  no ADR needed (naming/file-placement fix, not an architecture decision).
- **No new design-system token, no new RBAC, no token/session change** — lane
  `normal` confirmed correct, no ADR trigger from this plan.
- `docs/TEST_MATRIX.md` row for US-E11.8 already exists at `planned` (line
  127) — no new row needed; plan is to bump status once phases land proof.
