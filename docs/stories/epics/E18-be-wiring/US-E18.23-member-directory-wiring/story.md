# US-E18.23 Member-directory wiring (IAM US-144 + core US-149)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none (BE contracts already merged to edu-api `origin/main`: IAM
  `GET /iam/api/v1/tenants/{id}/members`, `GET /iam/api/v1/members?ids=`;
  core `GET /core/api/v1/conduct/staff-leave-requests?status=` tenant-wide).
- Blocks: none known.
- Feature module(s) chạm:
  - NEW shared `src/features/iam-directory/` (member-directory + batch-lookup
    domain/infra — consumed by the three callers below via their own DI, not
    duplicated 3×).
  - `src/features/admin/class-management/` (`listTeachers` un-mock).
  - `src/features/admin/staffing/` (assignment `memberName` resolution).
  - `src/features/staff-leave/` (audit only — see Design Notes residual gap).
- Shared contract/file: `bootstrap/endpoint/iam-member.endpoint.ts` (add
  directory + batch routes), `bootstrap/lib/mock.ts` (`USE_MOCK` per decision
  `0014`), `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (asks #6/#7/#9/#13
  registry rows updated in the same commit).

## Product Contract

Un-mock the three repositories the epic has been carrying as
permanently-or-hybrid mock-first specifically because IAM had no member
listing/lookup: `class-management.listTeachers`, `staffing`'s assignment
member-name display, and (audit only) `staff-leave`'s tenant-wide list.
No new screens, no ViewModel shape change for class-management/staffing —
real data now flows through the exact same contracts. `staff-leave` gets a
documented decision (wire or stay mock) based on whether its residual
`department`/`leaveType` gap (below) is shippable.

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (asks #6, #7, #9, #13)
- `../edu-api/services/iam/docs/INTEGRATION.md` footnote ⁹ (member directory,
  US-144) + `services/iam/docs/openapi.yaml` (`MemberListItem`,
  `MemberBatchItem`, tags `Members`)
- `../edu-api/services/iam/docs/ERROR_CODES.md` (`member_list_forbidden`,
  `too_many_member_ids` — both lowercase, per the existing IAM-caveat
  precedent from US-E18.6)
- `../edu-api/services/core/docs/INTEGRATION.md` (staff-leave tenant-wide list,
  US-149) + `services/core/docs/openapi.yaml` (`StaffLeaveRequestResponse`)

## Acceptance Criteria

### `iam-directory` (new shared module)

- Given a caller whose tenant `memberRoles` include ADMIN/MANAGER/TEACHER,
  When the module lists the tenant member directory with an optional
  `role`/`search` filter, Then it follows `nextCursor` until
  `meta.pagination.hasMore` is `false`, treating short pages (even
  zero-length ones) as **not done** — never stopping early on a short page.
- Given a caller without directory-reader RBAC (STUDENT/PARENT/STAFF), When
  the module lists the directory, Then it surfaces a `forbidden` failure
  mapped from IAM's lowercase `member_list_forbidden` (not `FORBIDDEN`).
- Given a set of ≤50 member ids, When the module batch-resolves display
  names, Then it returns a name (or graceful fallback) only for ids IAM
  actually resolves — unknown/other-tenant/malformed ids are silently
  omitted by BE, never surfaced as a per-id error.
- Given >50 ids requested, When batch-resolving, Then the module either
  chunks the request transparently (≤50 per call) or surfaces `too_many_member_ids`
  as a clear failure — document which and why.

### `class-management.listTeachers`

- Given `USE_MOCK=false` and a caller with directory RBAC, When
  `listTeachers({ search })` is called, Then it queries the real directory
  with `role=TEACHER` (+ `search` forwarded) and returns real `TeacherMember[]`
  — no more permanent mock delegation.
- Given the directory call 403s (RBAC denial) or network-errors, Then the
  existing `ClassManagementFailure` union surfaces the right typed failure
  (extend the union only if a genuinely new failure case is needed).

### `staffing` assignment display names

- Given a `PositionAssignmentResponseDto.memberId`, When the assignments
  screen renders, Then `memberName` resolves via the batch-lookup (not the
  raw `memberId` fallback) whenever the id is resolvable; unresolvable ids
  keep the existing raw-id fallback (documented, not a regression).

### `staff-leave` (audit — wire or document why not)

- Given BE US-149 now offers a tenant-wide `status`-filterable list and
  US-144 offers batch name resolution, When auditing `StaffLeaveRepository`,
  Then either (a) it is wired real with `department`/`leaveType` gracefully
  degraded (documented placeholder, no invented data) and `approve`/`reject`
  pass the now-real `staffMemberId` query param, or (b) it stays mock-first
  with an updated (not stale) blocking rationale + a new cross-repo ask for
  the missing `department`/`leaveType` fields. Either outcome must be
  reflected in `staff-leave.di.ts`'s doc comment and the EPIC-OVERVIEW ask
  #13 row — no silent leave of the stale rationale.

## Design Notes

- Commands: none new (existing use-cases unchanged in shape).
- Queries: `iam-directory` search/batch-lookup use-cases (new); existing
  `listTeachers`/staffing assignment list use-cases unchanged in signature.
- API:
  - `GET /iam/api/v1/tenants/{tenantId}/members?role=&search=&cursor=&limit=`
  - `GET /iam/api/v1/members?ids=a,b,c` (max 50/call, scoped to active tenant
    claim — no tenant id in the path)
  - `GET /core/api/v1/conduct/staff-leave-requests?status=&cursor=&limit=`
    (no `staffMemberId` = tenant-wide, ADMIN/MANAGER/SUPER_ADMIN only, else
    `403 VIOLATION_FORBIDDEN`)
- Domain rules: `memberId === userId` on the list endpoint (no surrogate id);
  `LEFT` members excluded from the list but included in batch lookup
  (historical rows keep names). IAM error codes are raw lowercase on the wire
  (`member_list_forbidden`, `too_many_member_ids`) — map explicitly, do not
  assume UPPER_SNAKE like `core`/`social` (US-E18.6 caveat, still true here).
- UI surfaces: `(app)/admin/classes` (homeroom/teacher picker),
  `(app)/admin/staffing` (assignment list), `(app)/admin/staff-leave`
  (audit only) — confirm exact routes during planning.
- **Residual gap carried forward, NOT closed by this US:** `EnrollmentResponse`
  (admin roster) still has zero display fields and `MemberListItem` still has
  no `dob`/`gender` — ask #9 stays open; do not attempt to wire
  `getClassRoster`/`getSearchPool` under this US.
- **Residual gap carried forward, NOT closed by this US:** PARENT-facing
  child-switcher display names — PARENT gets 403 on both directory endpoints
  (ask #20). Do not wire those.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `iam-directory` use-cases (pagination-until-hasMore-false, RBAC-403 mapping, batch chunking/limit); `class-management` `listTeachers` real-repo test; `staffing` mapper/repository name-resolution test; `staff-leave` decision (wired: repo test; stays mock: unchanged, doc-only). |
| Integration | Repository↔HTTP envelope/pagination/error-code mapping tests (mocked HTTP client) per the above. |
| E2E | Storybook/Playwright only if a ViewModel/UI state genuinely changes (e.g. staff-leave department/leaveType degraded state) — N/A if pure data-source swap with unchanged VM shape. |
| Platform | `tsc --noEmit`, `bun build`, full `bun vitest run`. |
| Release | Design-review gate verdict or explicit N/A rationale; EPIC-OVERVIEW asks #6/#7/#9/#13 rows updated. |

## Harness Delta

- Register story via `harness-cli story add --id US-E18.23 --lane normal`.
- Update `docs/TEST_MATRIX.md` with new rows for `iam-directory` +
  `class-management.listTeachers` + `staffing` name-resolution (+ `staff-leave`
  row updated in place if wired).
- Update `EPIC-OVERVIEW.md` cross-repo request rows #6, #7, #9 (partial —
  note dob/gender still missing), #13 (resolve or refine); add a new ask
  (≥ #41) only if `staff-leave`'s `department`/`leaveType` gap needs a fresh
  BE request.

## Evidence

(added after validation exists)

## Implementation Plan

_fe-planner, 2026-08-01. Research-only — no production code written. Grounded
against current `main` state of `class-management`/`staffing`/`staff-leave`
(read directly, paths confirmed below) + `../edu-api/services/iam/docs/`._

### Key decision 1 — where the shared directory/batch-lookup capability lives

**Decision: a real, new `src/features/iam-directory/` feature module
(`domain/` + `infrastructure/`, NO `presentation/` — no screen owns this data),
with its own `bootstrap/di/iam-directory.di.ts` exporting two public use-case
factories.** The three consumers (`class-management`, `staffing`,
conditionally `staff-leave`) do **not** call IAM HTTP directly — their own DI
factories **compose** `iam-directory`'s use-cases, mirroring the exact
established precedent this epic already set for cross-feature composition:
`src/bootstrap/lib/resolve-current-term.ts` (US-E18.11/US-E18.12) composes
`calendar`'s already-public `ListYearsUseCase` from `bootstrap/di`, with the
comment "`bootstrap/di` — not a feature's domain — is exactly where composing
across features is allowed (decision 0017 one-repo-per-service...)".

Why NOT the `resolve-current-term.ts` shape (a bare `bootstrap/lib/*.ts`
function calling into an *existing* feature)? Because there is no existing
`iam-member`-listing feature to compose — this is genuinely NEW domain: two
entities (`DirectoryMember`, `MemberSummary`), a new failure union
(`member_list_forbidden`/`too_many_member_ids` lowercase-code mapping — a
third lowercase-IAM taxonomy after US-E18.6/`iam-member.repository.ts`), a
non-trivial pagination-loop algorithm, and a batching/chunking algorithm. That
is exactly the "composed, dùng ≥2 screen"-equivalent bar from
`component-organization.md` applied to backend capability, not a one-line
resolver. Per `.claude/CLAUDE.md`'s layer table + decision `0017`
(one-repo-per-service — a repository never spans two services), the correct
home for real *new* domain+infra is a feature module, and the correct home for
the *cross-feature composition glue* (each consumer's DI importing this
module's use-case) is `bootstrap/di/`, exactly like `resolve-current-term.ts`.

Rejected alternative: 3 independent inline HTTP calls in each repository
(`class-management.repository.ts`, `staffing.repository.ts`,
`staff-leave.repository.ts`). Rejected because the shared logic is materially
non-trivial and identical across all 3 callers (pagination-until-`hasMore`,
RBAC-403→`forbidden` mapping, >50-id chunking, lowercase-code mapping) —
tripling it risks exactly the drift `component-organization.md` warns about
(3 near-identical implementations that diverge on the next BE contract nudge).

No new ADR needed — this reuses decision `0017`'s existing composition
allowance, already precedented in this exact epic by `resolve-current-term.ts`.
Flag to `fe-lead`: confirm this reading before `fe-nextjs-engineer` starts (no
architecture surprise expected, but it's the first time this epic mints a
brand-new shared *feature* module rather than composing an existing one).

### Key decision 2 — staff-leave: wire or stay mock

**Recommendation: (b) stay mock-first, with an updated (not stale) rationale
+ new cross-repo ask #41.** Confirmed by reading
`src/features/staff-leave/presentation/staff-leave-screen/staff-leave-request-card.tsx`
line 83: `const leaveMeta = LEAVE_TYPE_META[request.leaveType]` — a **required,
non-optional** lookup keyed by `StaffLeaveType` (`"annual"|"sick"|"personal"|"family"`),
and line 141: `· {request.department}` interpolated directly, no fallback.
`StaffLeaveRequestEntity` declares both as non-optional (`entities/staff-leave-request.entity.ts`).
Neither field, nor an equivalent, exists anywhere on `StaffLeaveRequestResponse`
(ground-truthed, 0 candidate fields) — this is not a "raw-id-fallback"-class
gap (like staffing's `memberName`) where a real id can substitute for a name;
it is an outright **missing enum/category concept** on the wire. Wiring (a)
would force one of: inventing a `leaveType` value (explicitly forbidden — "no
invented data" per the AC), rendering a broken badge lookup (`undefined`
crash), or a genuine component/design change (make the badge conditional,
placeholder-chip for unknown type, redesign the department line) — which
pulls in `fe-component-architect` + a design-review pass for what is supposed
to be a "normal" lane, no-new-screen wiring US. That is disproportionate to
this US's scope; better to keep the existing shipped UX (mock, unchanged) and
file the precise, narrow ask.

Partial improvement note (do NOT half-wire): `staffName` IS now resolvable via
the new batch-lookup, and the list/approve/reject/`staffMemberId` gaps from
ask #13 are otherwise closed by US-149. But since `department`/`leaveType`
alone still block a fully-real entity, and the repository/entity/UI are not
built to tolerate partial-real+partial-mock rows, do not attempt a
half-real hybrid (`StaffLeaveRepository` serving list-with-real-staffName but
fabricated department/leaveType) — that's worse than either clean option.

**UI/design-review consequence: NONE for this US** (staying mock — zero
ViewModel/entity/component change). If a future ask #41 resolution adds
`department`/`leaveType` to the wire, THAT follow-up US will need
`fe-component-architect` only if the fields come back optional/nullable
(forcing a placeholder-state design decision); if they land as required
non-null strings/enum, it's a pure data-source swap like class-management.
Flag this explicitly so `fe-lead` doesn't route this US through
component-architect/state-engineer.

### Failure-union extensions needed

- `ClassManagementFailure` already has `{ type: "forbidden" }` and
  `{ type: "unknown" }` (`domain/failures/class-management.failure.ts`) — no
  new case needed. Map IAM's `member_list_forbidden` → `forbidden`;
  `too_many_member_ids` should never surface here (the module caps its own
  request size before calling IAM — see Phase 1).
- `StaffingFailure` already has `{ type: "forbidden" }` — no new case needed
  for the batch-lookup path (batch-lookup failures degrade to the existing
  raw-id fallback per AC, never surfaced as a per-row error — see Phase 3).
- New `IamDirectoryFailure` (feature-local, `iam-directory/domain/failures/`):
  `{ type: "forbidden" }` (← `member_list_forbidden`), `{ type: "too-many-ids" }`
  (← `too_many_member_ids`, only reachable if a caller bypasses the module's
  own chunking — kept for defensive completeness / the module's own unit
  tests), `{ type: "network-error" }`, `{ type: "unknown" }`. Consumers map
  this failure back into their OWN union at the composition point in
  `bootstrap/di/<consumer>.di.ts` (thin translation, not a repo-to-repo throw).
- `StaffLeaveFailure`: unchanged (staying mock — see decision 2).

### Routes confirmed (no rediscovery needed)

- `src/app/[locale]/t/[tenant]/(app)/admin/classes/{page.tsx,actions.ts}` —
  homeroom/teacher picker consumer.
- `src/app/[locale]/t/[tenant]/(app)/admin/staffing/{page.tsx,actions.ts}` —
  assignment list consumer.
- `src/app/[locale]/t/[tenant]/(app)/admin/staff-leave/{page.tsx,actions.ts}` —
  audit only, no change this US (decision 2).
- **ViewModel/prop-shape change: NONE for class-management or staffing** —
  both are pure data-source swaps (`TeacherMember[]`/`PositionAssignment[]`
  shapes are unchanged; only *how* `memberName`/teacher list is populated
  changes, inside the repository). No `fe-component-architect`/
  `fe-state-engineer` needed for Phases 2–3. Confirmed by reading both
  entities (`TeacherMember`, `PositionAssignment`) — neither has a
  wire-shape-dependent field this changes.

### Phase 1 — `iam-directory` shared module (new)

Files:
```
src/bootstrap/endpoint/iam-member.endpoint.ts   # ADD: directoryMembers(tenantId), batchMembers(ids)
src/features/iam-directory/domain/entities/directory-member.entity.ts   # {memberId, userId, displayName, email, roles, status}
src/features/iam-directory/domain/entities/member-summary.entity.ts     # {memberId, displayName, email, roles} — batch result
src/features/iam-directory/domain/failures/iam-directory.failure.ts
src/features/iam-directory/domain/repositories/i-iam-directory.repository.ts
src/features/iam-directory/domain/use-cases/search-members.use-case.ts        # loops nextCursor until hasMore=false; params {tenantId, role?, search?}
src/features/iam-directory/domain/use-cases/batch-resolve-members.use-case.ts # chunks ids into ≤50-id calls, merges results, silently drops unresolved
src/features/iam-directory/infrastructure/dtos/member-list-item.dto.ts
src/features/iam-directory/infrastructure/dtos/member-batch-item.dto.ts
src/features/iam-directory/infrastructure/mappers/iam-directory.mapper.ts
src/features/iam-directory/infrastructure/repositories/iam-directory.repository.ts   # 'server-only'
src/bootstrap/di/iam-directory.di.ts    # makeSearchMembersUseCase(), makeBatchResolveMembersUseCase() — 'server-only'
```
Test first (red): `search-members.use-case.test.ts` — mock `IIamDirectoryRepository`
asserting the use-case loops pages (2-page fixture: page1 `hasMore:true` +
zero-length page2-then-page3 edge case per AC "never stop early on a short
page", terminate only on `hasMore:false`) and aggregates. Then
`batch-resolve-members.use-case.test.ts` — 120-id input → asserts 3 chunked
calls (50/50/20), merges, and that unresolved ids are silently absent (not an
error). Then `iam-directory.repository.test.ts` — HTTP-mocked, asserts
`member_list_forbidden`→`forbidden`, `too_many_member_ids`→`too-many-ids` (only
reachable via a direct >50 call, defensive), `NETWORK_ERROR`→`network-error`,
raw-flag-at-top-level (per US-E18.19 regression class) for the paginated list
call, camelCase DTO fields.
Done when: all iam-directory unit+integration tests green; `memberId === userId`
asserted in the mapper test (no surrogate id); LEFT-member inclusion-in-batch /
exclusion-from-list documented in a mapper test comment (BE-side behavior, not
web-testable without a live fixture — assert the mapper doesn't filter status
itself).

### Phase 2 — `class-management.listTeachers` un-mock

Files:
```
src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts   # implement listTeachers (was: fail unknown stub)
src/bootstrap/di/class-management.di.ts   # remove the permanent mock-delegation wrapper for listTeachers; compose iam-directory.di's makeSearchMembersUseCase(role:"TEACHER")
```
Test first (red): extend `class-management.repository.test.ts` —
`listTeachers({search})` calls the composed search with `role: "TEACHER"` +
forwarded `search`, maps `DirectoryMember[]`→`TeacherMember[]`; a 403 maps to
`{type:"forbidden"}`; a network error maps to `{type:"network-error"}`. Then a
`class-management.di.test.ts` (if a DI-level test convention exists for this
feature — else cover via the repository test with an injected mock
`iam-directory` use-case) confirming the hybrid-mock wrapper is gone (real
branch now serves ALL methods, not just 5 of 6).
Done when: `USE_MOCK=false` real branch has zero remaining hybrid delegation;
existing `(app)/admin/classes` Storybook/E2E states unchanged (pure
data-source swap, no new state to add) — spot-check
`class-management.repository.test.ts` full suite green + `bunx tsc --noEmit`.

### Phase 3 — `staffing` assignment name-resolution

Files:
```
src/features/admin/staffing/infrastructure/repositories/staffing.repository.ts   # toAssignment(): resolve memberName via batch lookup, fall back to memberId only for unresolved ids
src/bootstrap/di/staffing.di.ts   # makeRepo() composes iam-directory.di's makeBatchResolveMembersUseCase() into StaffingRepository's constructor (or a setter/injected fn)
```
Design note: `listAssignments`/`getAssignment`/`createAssignment` each call
`toAssignment` per-row today; batch-resolve should run ONCE per
`listAssignments` call (collect all `memberId`s on the page, one batch call,
map results), not once per row — avoids an N-call fan-out. `getAssignment`
(single) and `createAssignment` (single, already-known id) can call
batch-resolve with a 1-element array (still correct, still a single HTTP call
via chunking of 1).
Test first (red): extend `staffing.repository.test.ts` —
`listAssignments` resolves `memberName` from the injected batch-lookup for
resolvable ids; an id NOT present in the batch response falls back to the raw
`memberId` (existing documented behavior, now only for the *unresolvable*
subset, not all rows); assert exactly ONE batch-lookup call per `listAssignments`
invocation (not N).
Done when: `staffing.mapper.test.ts`/`staffing.repository.test.ts` green;
`(app)/admin/staffing` screen unchanged (no VM/prop change, confirmed above).

### Phase 4 — `staff-leave` decision documentation (no wiring)

Files:
```
src/bootstrap/di/staff-leave.di.ts                                    # update doc comment: US-149 closed the list/staffMemberId gap; department/leaveType remains the sole blocker; still force-mocks; cite ask #41 (not stale #13 text)
src/features/staff-leave/infrastructure/repositories/staff-leave.repository.ts  # update class doc comment same way; toFailure() unchanged (already correct per US-E18.8)
docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md                     # ask #13 row: mark "partially resolved by US-149 (list/staffMemberId gap closed); department/leaveType gap remains open, see ask #41"; add ask #41 (department/leaveType fields on StaffLeaveRequestResponse)
```
No test-first here (docs-only, no behavior change — `toFailure()` stays as
ground-truthed in US-E18.8, no new codes to add since `GET` still 403s the
same way whether tenant-wide or per-member).
Done when: doc comments no longer describe the pre-US-149 "no tenant-wide list
exists" state (now false) while still correctly stating why the repo can't be
wired (department/leaveType).

### Phase 5 — EPIC-OVERVIEW + TEST_MATRIX sync

Files:
```
docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md   # US-E18.23 row (Wave 4c+ table); ask #6/#7 rows: mark resolved by iam-directory (member listing + batch lookup now exist); ask #9 row: note it is STILL open (EnrollmentResponse/roster gap is a DIFFERENT, unresolved gap — do not mark #9 fully closed, only the member-listing/lookup HALF of it); ask #13 per Phase 4; NEW ask #41
docs/TEST_MATRIX.md                                  # new rows: iam-directory use-cases/repo, class-management.listTeachers, staffing name-resolution; staff-leave row annotated (unchanged implementation, updated rationale only)
```
Done when: `harness-cli story update --id US-E18.23 --status implemented ...`
proof fields all point to real test files/counts; ask registry has no stale
"no listing/lookup exists" language left in ask #6/#7 (those are now PARTIALLY
resolved, ask #9's roster-specific gap stays open, ask #13 partially resolved
+ #41 opened).

### Component + state sketch

No new component, no new screen, no TanStack Query key changes (existing
server-action → RSC data flow for all 3 consumer screens is unchanged — only
the repository's internal data source changes). `fe-component-architect` /
`fe-state-engineer` are **not needed** for this US.

### Risks / open questions

- [OPEN QUESTION] Should `iam-directory`'s `batch-resolve-members.use-case.ts`
  cache within a single request (e.g. dedupe ids across `listAssignments`'
  page + any concurrent caller in the same RSC render)? Recommend: no —
  each DI factory call is already scoped per-request (decision's existing
  per-request DI pattern); premature to add a cache layer for a single-page
  admin screen. Revisit only if profiling shows it matters.
- [OPEN QUESTION] Exact `role` query value for `class-management`'s
  `listTeachers` — confirm `"TEACHER"` (not `"teacher"`) against
  `MemberListItem`'s `roles` enum casing in `openapi.yaml` before
  `fe-nextjs-engineer` implements (I did not re-open `openapi.yaml` in this
  planning pass beyond the story packet's own footnote reference — flagged
  so the engineer ground-truths the exact casing at implementation time).
- Ask #41 wording (Phase 4) should explicitly ask BE whether `leaveType`
  becomes a required enum or optional/nullable — that answer determines
  whether the eventual wiring US needs `fe-component-architect` or not
  (flagged above).
- No new design token, no ADR needed for this US (pure wiring + one new
  feature module following an established composition pattern).
