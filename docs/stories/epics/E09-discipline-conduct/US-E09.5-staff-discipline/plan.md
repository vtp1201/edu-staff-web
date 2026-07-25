# US-E09.5 — Staff Discipline (Violations + Conduct Notes, tabbed) — Implementation Plan

Lane: **normal**, but NFR-008/NFR-009 (§"High-Risk-Grade Security Enforcement" in
`spec.md`) are treated as non-negotiable gates identical in rigor to a high-risk
lane (mirrors US-E20.1's Unlink posture). This plan calls those out as their own
mandatory phase (Phase 8), not folded into general testing.

## Precedent this plan reuses (do not rebuild)

- **One-repository-covers-multiple-sub-resources**: `src/features/discipline/domain/repositories/i-discipline.repository.ts`
  already covers 3 sub-resources (violations, conduct summary, leave requests)
  in ONE interface, force-mocked via one `makeRepo()`. This story follows the
  same shape for its 2 sub-resources (violations, conduct notes) — see decision
  §1 below.
- **Force-mocked DI, permanently, regardless of `NEXT_PUBLIC_USE_MOCK`**:
  `src/bootstrap/di/discipline.di.ts`'s `makeRepo()` doc-comment is the exact
  pattern and exact justification (roster-UUID gap) to mirror verbatim for
  `bootstrap/di/staff-discipline.di.ts`.
- **Mock repository module-level mutable state + fixtures file**:
  `src/features/discipline/infrastructure/repositories/mocks/{discipline.mock.repository.ts,fixtures.ts}`
  — in-memory array + `genId()` + deterministic date helpers (no `Date.now()`
  variance in assertions). Reuse the shape, not the content.
  `src/features/staff-leave/infrastructure/repositories/mocks/staff-leave.mock.repository.ts`
  is the closer precedent for the approve/reject/reject-reason mutation shape
  specifically (mutate-in-place + `toFailure`-style error branch).
  Fixture design (mix of states, `selfApproved`, `APPROVED`-locked, forbidden
  simulation) also mirrors ADR-driven fixture design used in `US-E14.6`'s seal
  fixtures (see fe-planner memory `project-us-e146-seal-plan.md`).
  Reference constants from `design_src/edu/staff-discipline.jsx`:
  `SD_STAFF_ROSTER` (line 106), `SD_SEED_VIOLATIONS` (120), `SD_SEED_CONDUCT_NOTES`
  (157), `SD_CATEGORIES` (83), `SD_TERMS` (91), `SD_CURRENT_ADMIN`/`SD_OTHER_ADMIN`
  (98/101 — use these two ids to construct the `selfApproved`-true and
  `selfApproved`-false fixtures respectively), `SD_SELF_STAFF_ID` (116 — the
  teacher self-view scope fixture).
- **Failure-union + `errorCodeOf`/`statusOf` branching**: `src/features/staff-leave/infrastructure/repositories/staff-leave.repository.ts`'s
  `toFailure` — branch on `error.code`/`status`, never `error.message`. Even
  though this feature is permanently mock-only (no real HTTP `toFailure`
  needed today), the MOCK repository still throws typed failure objects with
  the same discriminated shape so a future real repository is a drop-in swap.
- **Approve/reject/reject-reason UX + admin-screen precedent**: `src/features/staff-leave/presentation/staff-leave-screen/{staff-leave-screen.tsx,staff-leave-request-card.tsx}`
  — pending-state buttons, inline (not modal) reject affordance, dialog-stays-
  open-until-settled pattern (reused for `SDRejectPanel` and the two dialogs).
- **One-component-multi-role-route pattern**: `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx`
  serves BOTH `/teacher/discipline` and `/principal/discipline` from one
  role-conditional component via a `role` prop. `StaffDisciplineScreen` does
  the same for `/teacher/staff-discipline` / `/principal/staff-discipline`.
- **RSC + Server Action page wiring**: `(app)/principal/discipline/{page.tsx,actions.ts}`
  — factory-per-request DI, soft-fail to VM's `initialErrorKey` (not a thrown
  500), stable errorKey return shape (no i18n at the action boundary).
- **Reference mockup** (structural blueprint, not literal copy — legacy handoff
  = visual/UX spec, decision `0011`): `design_src/edu/staff-discipline.jsx` —
  `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge` (lines 187–216),
  `SDSelfApprovedNote` (217), `SDRejectPanel` (233), `SDTabButton` (390),
  `SDViolationsTab` (405), `SDConductNotesTab` (652), `SDFilterChip` (852).

## 1. Repository shape decision — ONE `IStaffDisciplineRepository` (not two + facade)

**Recommendation: one repository interface covering both sub-resources' 10
methods**, matching `i-discipline.repository.ts`'s already-proven precedent
(3 sub-resources, one interface, one force-mocked DI factory). Reasons:

- The two sub-resources share the identical `ApprovalTransition` lifecycle,
  the identical `selfApproved` derivation, and the identical mock-roster
  resolution (`SD_STAFF_ROSTER`) — a facade over two repos would just
  re-forward every call with no independent variance to justify the split.
- Both sub-resources are permanently force-mocked for the same reason (roster-
  UUID gap) — there's no scenario where one sub-resource goes "real" before
  the other, so there's no wiring benefit to splitting.
- `discipline`'s repo already sets the norm for "N sub-resources, 1 interface,
  1 mock class, 1 DI file" in this exact epic (E09) — following it keeps the
  epic internally consistent for the next reader/reviewer.
- Splitting file size is a non-issue: `IDisciplineRepository` has 17 methods
  across 3 sub-resources; this story's 10 methods across 2 sub-resources is
  smaller.

This is presented as this plan's considered recommendation, but per `spec.md`
§10 it is explicitly still open to a `fe-component-architect`/`fe-nextjs-engineer`
override if they find a concrete reason during implementation (e.g. if the two
tabs' query-key/invalidation graphs turn out to need fully independent
lifecycles — `fe-state-engineer` should confirm this doesn't happen before
Phase 5 starts).

## 2. Domain layer (`src/features/staff-discipline/domain/`)

### Entities (`domain/entities/`)

- `staff-violation.entity.ts` — `StaffViolationEntity` (per spec.md §6 field
  list verbatim: `recordId, staffMemberId, staffName, department, category,
  description, severity, occurredAt, state, authorMemberId, approverMemberId?,
  selfApproved, rejectionReason?, createdAt, updatedAt`) + input types
  `CreateStaffViolationInput` (staffMemberId, category, description, severity,
  occurredAt) + `RejectStaffViolationInput` (recordId, rejectionReason).
- `staff-conduct-note.entity.ts` — `StaffConductNoteEntity` (`termId,
  staffMemberId, staffName, department, rating, note, state, authorMemberId,
  approverMemberId?, selfApproved, rejectionReason?, createdAt, updatedAt`) +
  `SetStaffConductNoteInput` (staffMemberId, termId, academicYearId
  [validation-only per spec §6, not stored/not returned], rating, note).
- `staff-roster.entity.ts` — `StaffRosterEntry` (`staffMemberId, staffName,
  department`) — the fixed `SD_STAFF_ROSTER` shape, domain-typed so
  presentation can import the type without importing infrastructure.

### Failure (`domain/failures/staff-discipline.failure.ts`)

One union covering both sub-resources (mirrors `DisciplineFailure`'s shape,
one union per feature not per sub-resource — consistent with the 1-repo
decision):

```ts
type StaffDisciplineFailure =
  | { type: "validation"; fields: { field: string; message: string }[] }
  | { type: "missing-reject-reason" }
  | { type: "invalid-transition" }
  | { type: "already-processed" }
  | { type: "same-actor" }               // VIOLATION_SAME_ACTOR — see spec §8 OQ2
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "locked" }                    // STAFF_CONDUCT_NOTE_LOCKED (409)
  | { type: "term-not-found" }
  | { type: "invalid-rating" }
  | { type: "invalid-severity" }
  | { type: "network-error" };
```

Presentation maps `type` → `discipline.errors.<type>` (9 shared codes reused
verbatim per spec §8) except `locked`/`term-not-found`/`invalid-rating` which
map to `staffDiscipline.errors.<type>` (the 3 conduct-note-specific codes
already authored in the `staffDiscipline` namespace).

### Repository interface (`domain/repositories/i-staff-discipline.repository.ts`)

10 methods, `Promise<T>`-returning, throwing a typed `StaffDisciplineFailure`
on error (matches `IDisciplineRepository`'s convention — not a `Result<T,E>`
wrapper, for epic-internal consistency):

```ts
interface IStaffDisciplineRepository {
  // Violations
  listStaffViolations(params: { staffMemberId?: string }): Promise<StaffViolationEntity[]>;
  createStaffViolation(input: CreateStaffViolationInput): Promise<StaffViolationEntity>;
  submitStaffViolation(recordId: string): Promise<StaffViolationEntity>;
  approveStaffViolation(recordId: string): Promise<StaffViolationEntity>;
  rejectStaffViolation(input: RejectStaffViolationInput): Promise<StaffViolationEntity>;
  // Conduct notes
  listStaffConductNotes(params: { staffMemberId?: string; termId?: string }): Promise<StaffConductNoteEntity[]>;
  setStaffConductNote(input: SetStaffConductNoteInput): Promise<StaffConductNoteEntity>;
  submitStaffConductNote(staffMemberId: string, termId: string): Promise<StaffConductNoteEntity>;
  approveStaffConductNote(staffMemberId: string, termId: string): Promise<StaffConductNoteEntity>;
  rejectStaffConductNote(staffMemberId: string, termId: string, rejectionReason: string): Promise<StaffConductNoteEntity>;
}
```

### Use-cases (`domain/use-cases/`, 10 files, test-first per `.claude/rules/tdd.md`)

Each a thin orchestration class over the repo (mirrors `RecordViolationUseCase`/
`ApproveLeaveUseCase` shape — constructor-injected repo, `execute()` method,
one `.use-case.test.ts` per use-case with a `vi.fn()`-mocked repo):

1. `list-staff-violations.use-case.ts` — passthrough (teacher-scope enforcement
   is a REPOSITORY/server concern per NFR-008 §3, not re-validated here —
   avoid over-guarding domain with a check it can't authoritatively make).
2. `create-staff-violation.use-case.ts` — client-side guard: `description`
   non-empty, `severity` in enum (defense-in-depth mirroring server's
   `VIOLATION_INVALID_SEVERITY`/`VIOLATION_INVALID_INPUT`); else delegates.
3. `submit-staff-violation.use-case.ts` — passthrough delegate.
4. `approve-staff-violation.use-case.ts` — passthrough; `selfApproved` is a
   **read-derived field on the returned entity**, computed in the
   mapper/mock-repo (not recomputed in the use-case — single source of truth).
5. `reject-staff-violation.use-case.ts` — client UX guard: `rejectionReason`
   ≥10 chars (distinct, testable-in-isolation pure check per spec §6 INT-009
   grouping note — write as a small exported pure function
   `isRejectionReasonLongEnough(reason: string): boolean` so it's unit-testable
   without a repo mock and reusable by both violation/conduct-note reject
   use-cases).
6. `list-staff-conduct-notes.use-case.ts` — passthrough (mirrors #1).
7. `set-staff-conduct-note.use-case.ts` — client-side guard: `rating` in enum,
   `note` non-empty AND ≤5000 chars (AC-007.10); does NOT attempt a client-side
   lock pre-check here — the lock pre-check (AC-007.4, "form must not even
   open") is a PRESENTATION concern (reading the target record's current
   `state` before rendering the dialog), the use-case's job is only field
   validation plus surfacing the server's `locked` failure type if a stale
   request bypasses the UI (AC-007.5, the "server backstop" the use-case DOES
   own).
8. `submit-staff-conduct-note.use-case.ts` — passthrough delegate.
9. `approve-staff-conduct-note.use-case.ts` — passthrough; `selfApproved` same
   pattern as #4.
10. `reject-staff-conduct-note.use-case.ts` — reuses `isRejectionReasonLongEnough`
    from #5 (same shared pure function, not duplicated).

**`selfApproved` derivation** — a single exported pure function
`deriveSelfApproved(authorMemberId: string, approverMemberId?: string): boolean`
(`domain/use-cases/derive-self-approved.ts` or colocated in the mapper — decide
in Phase 2, but it MUST be a pure, independently unit-tested function per ADR
`0073`'s "always rendered, never suppressed" requirement) computed once at the
infrastructure/mapper boundary when constructing/updating an entity on
approve, not recomputed ad-hoc in presentation.

## 3. Infrastructure (`src/features/staff-discipline/infrastructure/`)

### DTOs (`infrastructure/dtos/`)

- `staff-violation-response.dto.ts` — camelCase wire shape, identical field
  set to the entity (spec §6 says the wire has no `staffName`/`department` —
  DTO reflects the REAL wire shape without those two fields; mapper adds them
  from the mock roster).
- `staff-conduct-note-response.dto.ts` — same pattern, `termId`+`staffMemberId`
  keyed, no `academicYearId` echoed back (validation-only per spec §6).

### Mapper (`infrastructure/mappers/staff-discipline.mapper.ts`)

- `toStaffViolationEntity(dto, roster)` / `toStaffConductNoteEntity(dto, roster)`
  — DTO → entity, resolving `staffName`/`department` by `staffMemberId` lookup
  against the fixed roster array (mirrors `staff-leave`'s roster-resolution
  approach cited in spec §6). Pure functions, unit-tested independent of any
  repo.
- `deriveSelfApproved` (see §2) — colocate here if not colocated in domain
  (single decision point, avoid duplicating in two files).

### Mock repository (`infrastructure/repositories/mocks/staff-discipline.mock.repository.ts` + `fixtures.ts`)

`server-only`, in-memory arrays, module-scoped mutable state reset per `new`
(mirrors `MockDisciplineRepository`'s exact pattern). Constructor optionally
takes a `{ viewerRole, viewerStaffMemberId }` context (or reads from an
injected auth/session helper the DI factory already has, consistent with how
`teacher` self-scope is server-enforced elsewhere — confirm exact mechanism
against how `staff-leave`'s DI factory determines the caller in Phase 4)
so `listStaffViolations`/`listStaffConductNotes` can enforce teacher's own-
`staffMemberId` scope SERVER-side, not client-filtered (NFR-008 point 3).

**Required fixtures** (verbatim from spec §6, non-negotiable — this is the
enforcement boundary until real BE wiring per the security section):

- Violations: all 4 states represented, ≥2 severities, ≥1 `selfApproved: true`
  (author===approver===`SD_CURRENT_ADMIN.id`), ≥1 `REJECTED` with a populated
  `rejectionReason`.
- Conduct notes: ≥1 per rating tier (3), ≥1 already `APPROVED` (dedicated fixture
  id to reproduce `STAFF_CONDUCT_NOTE_LOCKED` deterministically — e.g. a named
  const `MOCK_LOCKED_CONDUCT_NOTE_KEY`, NOT a random/toggle state — anti-demo
  rule per the moderation-plan precedent), ≥1 `selfApproved: true`, ≥2 terms
  represented (`SD_TERMS`).
- A simulated `forbidden` rejection path for a non-`principal` mutating call —
  implement as: every mutating method checks `viewerRole !== "principal"` (or
  `!== "teacher-owns-record"` for the narrow teacher case, which doesn't apply
  since teacher has zero mutating methods) and throws `{ type: "forbidden" }`
  BEFORE touching in-memory state — this must be independently unit-testable
  by calling the mock repo/method directly with a forged role, per NFR-008
  point 2 ("a client-side `if` hiding a button is NOT sufficient").

### Endpoint constants (`bootstrap/endpoint/staff-discipline.endpoint.ts`)

Document-only for this story (never called — permanently mock) but written
now so a future real-wiring story has the exact paths ready, matching
`AUTH_EP`-style constant object, prefixed `/core/api/v1/conduct/...` per
spec §6's 10 confirmed paths. Comment header explaining "never invoked while
`makeRepo()` force-mocks" (mirrors `discipline.di.ts`'s doc comment style).

### DI factory (`bootstrap/di/staff-discipline.di.ts`)

`server-only`; `makeRepo()` returns `new MockStaffDisciplineRepository(...)`
UNCONDITIONALLY (copy `discipline.di.ts`'s doc-comment justification verbatim,
adapted: "roster-UUID gap, no live staff-roster search endpoint resolves
`staffMemberId` → display name" — cite spec.md §8 constraint). 10
`make<UseCase>UseCase()` factories, one per use-case, all `async () =>
new XxxUseCase(await makeRepo())`. Also export `makeStaffDisciplineRepository()`
directly for the two list use-cases if the RSC page calls the repo directly
without a use-case wrapper (matches `US-E19.2`'s precedent of skipping a
use-case for pure passthrough reads — apply here too for
`listStaffViolations`/`listStaffConductNotes` if `fe-nextjs-engineer` finds
the use-case wrapper adds no value; not a hard requirement of this plan).

## 4. Presentation (`src/features/staff-discipline/presentation/staff-discipline-screen/`)

### Component tree

```
StaffDisciplineScreen (role-conditional container, 'use client')
├── tab bar (role="tablist") — Violations | Conduct Notes
├── SDViolationsTab
│   ├── filter bar (state/staff/severity — principal only, client-side narrowing)
│   ├── EduSkeleton (loading) / EduEmpty (2 variants) / EduError+retry
│   ├── violation rows: avatar + SDSeverityBadge + SDStateBadge + submit/approve/reject actions (role-gated)
│   ├── SDRejectPanel (inline, shared shape with conduct notes)
│   ├── SDSelfApprovedNote (annotation, never hidden)
│   └── create-violation dialog (principal only) — staff select (SD_STAFF_ROSTER, static), category, severity, occurredAt, description
└── SDConductNotesTab
    ├── term selector (principal only — AC-006.6) + staff filter
    ├── EduSkeleton / EduEmpty (2 variants) / EduError+retry
    ├── conduct-note rows: SDRatingBadge + SDStateBadge + submit/approve/reject actions (role-gated) + lock indicator on APPROVED
    ├── SDRejectPanel (shared with violations tab)
    ├── SDSelfApprovedNote (shared)
    └── set-conduct-note dialog (principal only, new/overwrite; MUST NOT open when target state===APPROVED — AC-007.4)
```

Shared leaf components (both tabs): `SDStateBadge`, `SDSelfApprovedNote`,
`SDRejectPanel`. Tab-specific: `SDSeverityBadge` (violations),
`SDRatingBadge` (conduct notes).

### ViewModel contract (`staff-discipline-screen.i-vm.ts`)

- `viewerRole: "principal" | "teacher"`, `viewerStaffMemberId?: string` (for
  teacher self-view, defensive — server already scopes, but VM carries it for
  UI copy/empty-state branching).
- `initialViolations: StaffViolationEntity[]`, `initialConductNotes:
  StaffConductNoteEntity[]`, `initialErrorKey?: StaffDisciplineFailure["type"]`
  (soft-fail per `discipline`'s RSC pattern — but per spec §5 "error not
  empty" distinction, do NOT silently swallow to empty list, preserve the key
  — same explicit divergence called out in the moderation plan's Phase 6).
- `staffRoster: StaffRosterEntry[]` (static, passed once from server, never
  refetched — enforces AC-002.2's "same static list, no network call").
- Server Action refs: `listViolationsAction`, `createViolationAction`,
  `submitViolationAction`, `approveViolationAction`, `rejectViolationAction`,
  `listConductNotesAction`, `setConductNoteAction`, `submitConductNoteAction`,
  `approveConductNoteAction`, `rejectConductNoteAction`.

### State classification (flag for `fe-state-engineer`)

- **Server state (TanStack Query)**: violations list, conduct-notes list —
  two independent query keys (`staffDisciplineKeys.violations(filter)`,
  `staffDisciplineKeys.conductNotes(filter)`), each with its own loading/error/
  empty per FR-008/AC-010.3 ("no carry-over error banner" when switching tabs
  — i.e. the two queries must NOT share one error boundary).
- **URL/local state**: active tab (client-only, FR-008 — no navigation), filter
  drafts (state/staff/severity for violations; term/staff for conduct notes —
  client-side narrowing per spec §8 OQ3, NOT server query params beyond
  `staffMemberId`/`termId`).
- **Mutations**: 8 mutating actions (create/submit/approve/reject × 2
  sub-resources) — each invalidates its OWN sub-resource's list key on
  success; NO optimistic UI (spec §5 explicitly: "No optimistic UI is required
  ... set-conduct-note form and both reject panels MUST NOT close until the
  request settles").
- **Local-form state**: create-violation dialog fields, set-conduct-note
  dialog fields, reject-panel textarea — plain form state, no query lib
  needed.

This is non-trivial enough (2 independent query-key families × filter-scoped
keys × 8 invalidation edges × the "no carry-over error per tab" requirement)
to warrant a dedicated `fe-state-engineer` pass — see §6.

## 5. Routes (`(app)/principal/staff-discipline/`, `(app)/teacher/staff-discipline/`)

- `(app)/principal/staff-discipline/page.tsx` (RSC) — reads no search params
  beyond an optional deep-link `tab` param (nice-to-have, not in spec's ACs —
  skip unless trivial); calls `makeStaffDisciplineRepository()` (or the two
  list use-cases) for both lists + `staffRoster` (static import, not a repo
  call), passes VM to `StaffDisciplineScreen role="principal"`.
- `(app)/teacher/staff-discipline/page.tsx` (RSC) — same shape,
  `role="teacher"`, `viewerStaffMemberId` resolved from session (however the
  existing `(app)/teacher/**` guard already resolves the caller's identity —
  reuse that, do not invent a new session-read).
- Shared `actions.ts` **cannot** literally be shared across the two route
  segments (Next.js Server Actions are file-scoped) — each route folder gets
  its own thin `actions.ts` that imports the SAME `bootstrap/di/staff-discipline.di.ts`
  factories (mirrors the `moderation` plan's "each consumer route writes its
  own thin action, DI factory is the one shared implementation" pattern,
  Phase-1 consumer-contract note). No new route-level guard — reuse the
  existing per-role-group RSC guard at `(app)/principal/**`/`(app)/teacher/**`.

## 6. Component-architect / state-engineer — YES to both

**Recommend both run before `fe-nextjs-engineer` starts implementation:**

- `fe-component-architect`: confirm/refine the `StaffDisciplineScreen` →
  `SDViolationsTab`/`SDConductNotesTab` → shared-badge component tree above,
  finalize prop contracts for `SDRejectPanel`/`SDSelfApprovedNote`/`SDStateBadge`
  (shared across both tabs — get the prop contract right ONCE, per
  `component-organization.md`'s "one component, one canonical home" rule,
  since these are composed components used by 2 tabs on day one, so they
  belong directly in this feature's presentation folder as shared
  sub-components, not promoted to `components/shared/` yet — only 1 screen
  uses them right now).
- `fe-state-engineer`: design `staffDisciplineKeys` (violations/conductNotes ×
  filter-scoped variants), the 8-edge mutation→invalidation graph, and confirm
  the "independent per-tab error state" requirement (AC-010.3) is satisfiable
  with two separate `useQuery`/`useInfiniteQuery` instances rather than one
  combined query — this is exactly the kind of non-trivial server-state
  design this role exists for.

## 7. TDD phase breakdown (red → green → refactor per layer)

### Phase 1 — Domain
- Files: `domain/entities/{staff-violation,staff-conduct-note,staff-roster}.entity.ts`,
  `domain/failures/staff-discipline.failure.ts`,
  `domain/repositories/i-staff-discipline.repository.ts`,
  `domain/use-cases/*.use-case.ts` (10) + `derive-self-approved.ts` +
  `is-rejection-reason-long-enough.ts`.
- Test first: one `.use-case.test.ts` per use-case (mock `IStaffDisciplineRepository`
  via `vi.fn()`) — happy path + every failure branch it's responsible for
  (client-side validation branches only; server-thrown failures just
  propagate). Plus standalone tests for `deriveSelfApproved` and
  `isRejectionReasonLongEnough` as pure functions.
- Done when: all 10 use-case tests + 2 pure-function tests green.

### Phase 2 — Infrastructure
- Files: `infrastructure/dtos/*.dto.ts`, `infrastructure/mappers/staff-discipline.mapper.ts`,
  `infrastructure/repositories/mocks/{staff-discipline.mock.repository.ts,fixtures.ts}`.
- Test first: mapper unit tests (DTO→entity incl. roster resolution); mock
  repository tests covering full state-machine transitions for BOTH
  sub-resources, PLUS the two load-bearing security tests called out in §8/
  Phase 8 below (write them here, not deferred).
- Done when: mapper + mock-repo tests green, including the forbidden-role and
  409-lock tests.

### Phase 3 — Bootstrap wiring
- Files: `bootstrap/endpoint/staff-discipline.endpoint.ts`,
  `bootstrap/di/staff-discipline.di.ts`.
- Test first: none required (thin wiring, no branching logic) — but confirm
  `bunx tsc --noEmit` clean and that the DI factory is importable only from
  `server-only` contexts (build-time enforcement, not a runtime test).
- Done when: factories compile and are consumed by Phase 6 actions.

### Phase 4 — Component architecture + state design (gate before Phase 5)
- `fe-component-architect` + `fe-state-engineer` deliverables per §6, added to
  this packet (component tree confirmation + query-key/invalidation design).
- Done when: both specialists sign off in the packet / to `fe-lead`.

### Phase 5 — Presentation
- Files: `presentation/staff-discipline-screen/{staff-discipline-screen.i-vm.ts,staff-discipline-screen.tsx}`
  + sub-components (`components/sd-state-badge.tsx`, `sd-severity-badge.tsx`,
  `sd-rating-badge.tsx`, `sd-reject-panel.tsx`, `sd-self-approved-note.tsx`,
  `sd-violations-tab.tsx`, `sd-conduct-notes-tab.tsx`, `create-violation-dialog.tsx`,
  `set-conduct-note-dialog.tsx`) + `.stories.tsx`.
- i18n: reuse `staffDiscipline.*` (already authored, DO NOT regenerate) +
  `discipline.errors.*` (9 shared codes) verbatim per spec §8's resolution —
  use `staffDiscipline.rejectDialog.*` as-authored (not a cross-reference to
  `discipline.leave.rejectDialog`).
- Test first: Storybook interaction stories per story.md's Validation table
  (loading/empty×2/error/success × both tabs × both dialogs × reject panel ×
  tab switcher × responsive 320/375/768/1280).
- Done when: all listed stories pass interaction assertions; design-review
  gate checklist ready (tokens/a11y/states).

### Phase 6 — Routes
- Files: `(app)/principal/staff-discipline/{page.tsx,actions.ts}`,
  `(app)/teacher/staff-discipline/{page.tsx,actions.ts}`.
- Test first: n/a at RSC layer typically (thin glue) — cover via Phase 5's
  Storybook + Phase 8's Playwright/role-gate proof; confirm `bun run build`
  succeeds with both routes present (Platform proof row).
- Done when: both routes render locally against mock data, existing role
  guards redirect wrong roles (manual + Phase 8 automated proof).

### Phase 8 — Security-grade proof sweep (NFR-008/NFR-009 — MANDATORY, release-blocking)

Per spec.md's "High-Risk-Grade Security Enforcement" section — this is its own
phase, explicitly checked off, not silently covered by "general testing":

- [ ] **Direct-invocation forbidden-role test**: a test that calls the mock
      repository (or the Server Action, whichever is the actual enforcement
      boundary chosen in Phase 2) directly with a forged non-`principal` role
      for EACH of the 6 mutating operations (create/submit/approve/reject
      violation, set/submit/approve/reject conduct note — group as needed) and
      asserts `VIOLATION_FORBIDDEN`/`STAFF_CONDUCT_NOTE_FORBIDDEN` — a
      UI-hidden-button test alone does NOT satisfy this (AC-009.2/.3/.5).
- [ ] **List-scope server-enforcement test**: teacher's list call, even when
      passed a different `staffMemberId` param, returns only their own record
      — proves server-side scoping, not client-side filtering (AC-009.4).
- [ ] **409 lock test**: a test against the dedicated `APPROVED`-locked
      conduct-note fixture asserts `setStaffConductNote` still throws
      `{ type: "locked" }`/409 even bypassing the client pre-check (AC-009.6).
- [ ] **`selfApproved` always-rendered test**: a Storybook/interaction
      assertion that `SDSelfApprovedNote` renders whenever
      `approverMemberId === authorMemberId`, with NO prop/condition able to
      suppress it (code-level: grep confirms no conditional wraps its render
      call beyond the equality check itself).
- [ ] `fe-tech-lead-reviewer` + a dedicated security-focused pass confirm all
      4 items above with concrete test file references before design-review
      gate.

### Phase 9 — Full TDD sweep + TEST_MATRIX flip
- Confirm every row in story.md's Validation table has a corresponding
  test/story; flip `docs/TEST_MATRIX.md` US-E09.5 proof columns via
  `harness-cli story update --id US-E09.5 --unit 1 --integration 1 --e2e 1 --platform 1`
  only once all layers are green (never before, per `.claude/rules/tdd.md`).
- `bunx tsc --noEmit` clean, `bun run build` succeeds with both routes.
- Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) + the dedicated
  Phase 8 security confirmation are BOTH release-blocking per spec §10.

## Risks, dependencies, open questions (carried from spec.md §8 — NOT resolved here)

1. **Pagination shape** unconfirmed for INT-002/INT-006 — plan treats both
   list mocks as unpaginated single-page arrays; revisit if real wiring lands.
2. **`VIOLATION_SAME_ACTOR` vs `selfApproved`** — mapped to a generic `same-actor`
   inline error in the failure union per spec §8 OQ2; do not over-build a
   dedicated UI for a code that may never fire in this tenant model.
3. **FR-012 filter mechanics** — only `staffMemberId`/`termId` are confirmed
   server params; `state`/`severity`/other filters are client-side narrowing
   in the mock (consistent with mock being unpaginated too).
4. **Audit-log emission** for approve/reject/set-note — explicitly out of
   scope per spec §1; flagged to `ba-lead`, not built here.
5. **Response echo on set-note overwrite** (`authorMemberId`/`createdAt` reset
   vs preserved) — mock repository plan: PRESERVE original `authorMemberId`/
   `createdAt` on overwrite (only `updatedAt`/`state`/fields change) as the
   more conservative/audit-honest default; flag this choice explicitly to
   `fe-lead`/`ba-lead` as a mock-only assumption, not a BE-confirmed fact.
6. **Description/note truncation UX** — no truncation spec'd beyond the
   5000-char hard cap on the note textarea; flag to `uiux-lead` only if a real
   long-text case surfaces during Storybook review, don't build speculative
   truncation now (YAGNI).
7. **`i-staff-discipline.repository.ts` one-vs-two-repos decision** (§1 above)
   is this plan's recommendation, not a locked-in fact — `fe-component-architect`
   should confirm before Phase 1 use-case signatures are finalized, since
   changing repo shape after use-cases are written means touching all 10
   use-case constructors.
8. **No design-system token gaps identified** for this story — all badge
   colors (`SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge`) reuse existing
   `--edu-success/warning/error/destructive` tokens per design-spec's
   `staffDiscipline.stateMachine.badge`/`violationsTab.severityBadge`/
   `conductNotesTab.ratingBadge` mappings (verbatim reuse of the student-
   violations severity mapping and the GPA/difficulty 3-tier convention) — no
   ADR needed.
