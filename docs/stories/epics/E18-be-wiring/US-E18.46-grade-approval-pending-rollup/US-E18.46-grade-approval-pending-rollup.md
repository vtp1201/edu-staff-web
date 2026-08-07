# US-E18.46 Grade-approval pending rollup + approve action (BE US-186)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E18.44 (grade reject flow — shares `src/features/grades/`, the approver VM/screens, and `IGradeRejectionRepository`)
- Blocks: none
- Feature module(s) chạm: `src/features/grades/` (approver surfaces only — `grade-entry-screen`, DI, endpoint, domain)
- Shared contract/file: `GRADES_EP`, `ClassSubjectTermKey`, `build-approver-grade-vm.ts`, `admin/grade-book` + `principal/grade-book` pages/actions

## Ground truth (fe-lead, verified before delegating against `edu-api` local checkout, commit `f9ff7e72`+ area, US-186)

`edu-api/services/core/docs/openapi.yaml` (~L2689) + `.../usecase/list_pending_approval_batches.go`:

- NEW top-level, tenant-wide route (deliberately NOT nested under
  `/classes/{classId}/...`): `GET /api/v1/grade-entries/pending-approval?cursor=&limit=`.
- Auth: `isAdminOrManager` — the SAME gate as `.../approve` and `.../reject`
  (tenant `ADMIN`, `MANAGER`, or `SUPER_ADMIN`).
- `limit`: optional, `<=0` clamps to 20, `>100` clamps to 100 (clamped, not
  rejected).
- Response: `items: [{classId, subjectId, termId, pendingCount, submittedAt}]`
  + `nextCursor`/`hasMore` — cursor-paginated, **oldest-`submittedAt`-first,
  tenant-wide** (not grouped-then-unsorted). `400 GRADE_ENTRY_INVALID_CURSOR`
  on an undecodable cursor.
- **This response has NO per-entry ids and NO `batchId` concept** — "drilling
  into a batch's actual entries" is explicitly NOT part of this response; the
  openapi doc says to use the EXISTING gradebook GET
  (`GET /classes/{classId}/subjects/{subjectId}/terms/{termId}/grades`) with
  the batch's own `classId`/`subjectId`/`termId`. This is a DISCOVERY/rollup
  endpoint only, not a detail endpoint.

**Also found while ground-truthing (not asked for by the coordinator's list,
but directly enables the same workflow the rollup is FOR — see Scope below):**
`src/bootstrap/endpoint/grades.endpoint.ts` already has an `approveEntry`
constant (`POST .../grades/{studentId}/columns/{columnId}/approve`) with a
comment: *"dormant real branch, no current UI caller (`grade-approval-screen`
stays mock, ADR 0054)"*. This mirrors `rejectEntry` exactly (same path shape,
one segment different) and is confirmed real+live in `edu-api`
(`approve_grade.go`, `ApproveGradeUseCase`, `isAdminOrManager` gate, already
existed before this baty — NOT new to US-186).

## Current state (read before designing anything)

- **`IGradeApprovalRepository`/`grade-approval-screen`/`admin/grades/approval`
  route — DO NOT TOUCH.** This is the SEPARATE, permanently-mocked BATCH-level
  admin dashboard (`GradeApprovalBatch`, keyed by an invented `batchId` with
  no wire source at all). US-186's rollup does NOT give a `batchId` — it
  confirms that construct still doesn't exist on the real contract. Ask #18
  is NOT "wire the batch dashboard" — it's "give the admin/principal APPROVER
  screens (US-E18.44's `admin/grade-book`+`principal/grade-book`, which
  operate on the REAL per-cell `ClassSubjectTermKey` model) a way to discover
  which tuples have pending work, instead of requiring the admin to already
  know classId+subjectId+termId before opening the screen."
- `src/features/grades/domain/repositories/i-grade-rejection.repository.ts`
  (`IGradeRejectionRepository`) — currently ONE method, `rejectEntry`. Read
  its own doc-comment reasoning (actor split, smallest port, capability-as-
  presence) before deciding whether `approveEntry` joins this interface or a
  new one — the SAME three reasons apply to approve (also ADMIN/MANAGER-only,
  also per-cell `(studentId, columnId)` addressed).
- `src/features/grades/presentation/grade-entry-screen/build-approver-grade-vm.ts`
  — pure function shared by both approver routes; currently takes a manually
  operated `classSubjects: ClassSubjectOption[]` + `selectedClassId`/
  `selectedSubjectId`/`selectedTerm` picker with NO auto-discovery. This is
  exactly the picker the rollup should help populate/prioritize.
- `src/app/[locale]/t/[tenant]/(app)/admin/grade-book/page.tsx` +
  `principal/grade-book/page.tsx` — the two approver routes from US-E18.44.

## Scope

1. **New repository method for the rollup**: add
   `listPendingApprovalBatches(cursor?, limit?)` returning
   `{items: PendingApprovalBatch[], nextCursor, hasMore}` where
   `PendingApprovalBatch = {classId, subjectId, termId, pendingCount,
   submittedAt}`. Decide whether this lives on `IGradeRejectionRepository`
   (renamed to something more accurate, e.g. `IGradeApprovalActionsRepository`
   — a genuine rename since it's no longer JUST reject) or a new sibling
   interface — same DIP/actor-split reasoning as before, your call, document
   it. Wire real in `grades.repository.ts` + `grades.di.ts`; add
   `GRADES_EP.pendingApprovalBatches` endpoint constant (path is
   `/core/api/v1/grade-entries/pending-approval`, no path params).
2. **Wire the dormant `approveEntry` real branch** into the same
   interface/use-case pattern as `rejectEntry` (mirror
   `reject-column-entry.use-case.ts` → e.g. `approve-column-entry.use-case.ts`,
   same error-mapping conventions, same Server Action + `requireRole`
   pattern as `rejectEntryAction`). This is a deliberate fe-lead scope
   decision, not scope creep: the rollup only has value if the admin can act
   on what it discovers (approve OR reject), and the endpoint was already
   ground-truthed + a placeholder left specifically for this. Update
   `ApproverGradeEntryVM` to carry both `rejectEntryAction` and a new
   `approveEntryAction`. Reuse the SAME reason-confirm affordance pattern
   already on cells for reject; approve needs no reason (bare POST, mirror
   `sealBatch`'s "no body" precedent) — a simple confirm, not a text-reason
   dialog (check if a plain confirm variant already exists, e.g.
   `DestructiveConfirmDialog` used elsewhere, vs. always requiring
   `ReasonConfirmDialog` — approve is not destructive, don't force a reason
   field into it).
3. **Wire the rollup into the two approver screens** (`admin/grade-book`,
   `principal/grade-book`): add a compact "pending approval" list/section
   above or beside the existing class/subject/term picker, each row showing
   `pendingCount` + how long it's been waiting (`submittedAt`), clickable to
   jump straight to that tuple (auto-select the picker, load the sheet) —
   replacing the "must already know the tuple" friction. Reuse EXISTING
   component patterns (this repo's `StatCard`/badge/list conventions,
   `ListError`/`ListSkeleton` for loading/error/empty) rather than inventing
   new visual language — this is wiring + minor UI, not a new design
   language. Cursor-paginate (reuse the established "drain via hasMore"
   pattern OR a simple "load more" — your call, this list is likely small in
   practice but must not silently truncate).
4. Error mapping: ground-truth `400 GRADE_ENTRY_INVALID_CURSOR` + reuse
   existing `GradesFailure`/rejection failure codes for approve (likely
   `GRADE_ENTRY_NOT_PENDING_APPROVAL` applies to a failed approve too — check
   the Go source for which codes `ApproveGradeUseCase`/`entry.Approve()` can
   return, don't assume it's identical to reject's error set).
5. Update `docs/product/screens.md` if the admin/principal grade-book rows
   need a note about the new pending-rollup surface.

## NOT in scope

- `IGradeApprovalRepository`/`admin/grades/approval` (batch dashboard) — stays
  fully mocked, untouched. This story does NOT close that screen's gap.
- `lockTerm` — untouched, already real since US-E18.12/US-E18.44.

## Acceptance Criteria

- Real mode: `admin/grade-book` and `principal/grade-book` both show a
  pending-approval discovery list (paginated, oldest-first) an approver can
  click to jump to a specific class-subject-term sheet.
- An approver can APPROVE a `PENDING_APPROVAL` cell (new capability) in
  addition to the existing REJECT capability.
- `USE_MOCK=true` unchanged/extended consistently (mock repo gains the new
  method(s) with plausible fixtures).
- Privacy/RBAC guarantees from US-E18.44 (staff-only field stripping,
  `requireRole`, nav reachability) remain intact — zero regression on that
  story's own tests.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | new repository/mapper/use-case tests (rollup pagination, approve success/failure, error-code mapping) |
| Integration | real interceptor pipeline test if pagination needs `raw:true`/`parseEnvelope` |
| E2E | Storybook interaction — rollup list render, click-to-jump, approve action end-to-end |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted; high-risk-adjacent (mutation + RBAC) — run reviewer + a11y before merge |

## Harness Delta

- TEST_MATRIX row for the rollup + approve action.
- Close ask #18 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 7 row.
- `docs/product/screens.md` note if UI surface changes materially.

## Evidence

### Implementation (fe-nextjs-engineer, 2026-08-07)

**Interface-placement decision (the packet asked for it explicitly).** Two
ports, not one and not three:

1. `IGradeRejectionRepository` → **RENAMED** `IGradeDecisionRepository`
   (`i-grade-decision.repository.ts`) and given `approveEntry`. All three
   reasons that split reject out of `IGradesRepository` in US-E18.44 apply to
   approve verbatim (actor split, smallest port, capability-as-presence), and
   approve/reject additionally share the SAME BE gate (`isAdminOrManager`), the
   SAME per-cell `(key, studentId, columnId)` addressing and the SAME lifecycle
   state they consume — so a separate one-method approve port would add a port
   without adding a distinction. The rename is genuine: the port is no longer
   "rejection", it is the approver's decision.
2. The rollup got a **NEW sibling** `IPendingApprovalRepository` +
   `PendingApprovalRepository`. It differs on all three axes the pair does not:
   addressing (tenant-wide, NO `ClassSubjectTermKey` — the endpoint is
   deliberately top-level and the tenant comes from the JWT claim), kind (a
   cursor-paginated read, not a mutation) and construction (the per-cell
   concrete repo is built per-key with a resolved assessment scheme + publish
   mode; the rollup needs neither, so it is an http-only class instead of being
   forced through a key-shaped factory with dummy arguments).

**Not touched, as scoped.** `IGradeApprovalRepository` / `GradeApprovalBatch` /
`grade-approval-screen` / `admin/grades/approval` are untouched and still
force-mocked. US-186 in fact CONFIRMS why: its response carries no `batchId` and
no per-entry ids at all, so the batch dashboard's invented key still has no wire
source. `lockTerm` untouched.

**Reachability (the US-E18.44 lesson, deliberately not repeated).** Every new
affordance is mounted on the two routes that were ALREADY reachable and already
nav-linked for the authorized roles — `(app)/admin/grade-book` (guard
`role === "admin"`) and `(app)/principal/grade-book` (guard
`role === "principal"`, where BE ADMIN+MANAGER both land via `ROLE_ENUM_TO_APP`).
No new route, no new nav entry, no orphan surface; `teacher/grades` gains
nothing (its VM type has no approve field at all).

**RBAC — same rigor as reject/lock.** Both new Server Actions live in
`admin/grade-book/actions.ts` (shared by both routes) and re-check
`requireRole(["principal","admin"])` BEFORE any DI/HTTP call. That includes the
READ (`loadPendingApprovalPageAction`): the rollup discloses tenant-wide which
classes have outstanding grade work, which is exactly the oversight scope BE
restricts. Forge-role tests assert zero use-case construction for both. The VM's
possession of an action decides UI VISIBILITY only.

**Honest degrade.** A failed rollup read is returned as a failure KEY on an
empty page (`loadPendingApprovalSeed`), never thrown: the section collapses to a
retryable `ListError` and the grade sheet below still renders. Proven both as an
RSC-props test and as a Storybook story.

**UI (wiring + minor UI, no new visual language).** A "Đang chờ duyệt" section
ABOVE the picker (it is what tells the approver which tuple to open), built from
the canonical shared components — `ListSkeleton`, `ListError`, `LoadMoreButton`,
`StatusBadge` — with each row a single full-width button whose `aria-label`
states class, subject, term and pending count in one string, jumping all three
searchParams at once. Explicit "load more" rather than auto-drain: the queue
must never silently truncate, but draining every page up front would spend N
round-trips on a list whose first page is already the triage priority. No
`StatCard` was added: every available total (sum of the LOADED pages) would be a
number that changes as you paginate, and a misleading aggregate is worse than
none. Approve uses the canonical non-destructive `PublishConfirmDialog` (approve
IS a publish) — deliberately NOT `ReasonConfirmDialog`, since approval is
unqualified and no reason field should be forced into it; a story asserts the
dialog contains no textbox.

**Promote, don't copy (decision 0026).** `formatRelativeTime`/
`formatAbsoluteTime` moved from `features/feed/.../feed-time.ts` to
`src/shared/relative-time.ts` on its 2nd consumer; the two feed call sites were
repointed (no copy left behind).

**Files changed**

- domain: `pending-approval-batch.entity.ts` (new), `grades.failure.ts`
  (+`invalid-cursor`), `i-grade-decision.repository.ts` (renamed from
  `i-grade-rejection.repository.ts`, +`approveEntry`),
  `i-pending-approval.repository.ts` (new), `approve-column-entry.use-case.ts`
  (new), `list-pending-approval-batches.use-case.ts` (new).
- infrastructure (`'server-only'`): `pending-approval-batch-response.dto.ts`
  (new), `pending-approval-batch.mapper.ts` (new),
  `pending-approval.repository.ts` (new), `mocks/pending-approval.mock.repository.ts`
  (new), `mocks/fixtures.ts` (+`MOCK_PENDING_APPROVAL_BATCHES`),
  `grades.repository.ts` (+`approveEntry`), `mocks/grades.mock.repository.ts`
  (+`approveEntry`).
- bootstrap: `endpoint/grades.endpoint.ts` (+`pendingApprovalBatches`,
  `approveEntry` comment corrected — no longer dormant), `di/grades.di.ts`
  (+`makeApproveColumnEntryUseCase`, +`makeListPendingApprovalBatchesUseCase`,
  +`makePendingApprovalRepo`).
- app: `admin/grade-book/actions.ts` (+`approveEntryAction`,
  +`loadPendingApprovalPageAction`), `admin/grade-book/load-pending-approval.ts`
  (new, shared RSC seed), `admin/grade-book/page.tsx`,
  `principal/grade-book/page.tsx`.
- presentation (`'use client'`): `grade-entry-screen.i-vm.ts`
  (+`approveEntryAction`, +`pendingApproval`, +`loadPendingApprovalPage`,
  +`PendingApprovalVM`/`PendingApprovalPageResult`),
  `build-approver-grade-vm.ts`, `components/pending-approval-list.tsx` (new),
  `components/build-pending-approval-rows.ts` (new, pure),
  `grade-entry-screen.tsx` (approve mutation + `PublishConfirmDialog` + rollup
  section), `grade-entry-table.tsx` (+`onApproveCell`),
  `grade-entry-screen.stories.tsx` (+8 stories), plus `invalid-cursor` added to
  two unrelated exhaustive failure maps (`grade-approval-container.tsx`,
  `grade-book-screen.tsx`).
- shared: `src/shared/relative-time.ts` (moved from feed).
- i18n: 18 keys in BOTH `vi.json` and `en.json` (`gradeEntry.pending*`,
  `gradeEntry.approve*`, `errorInvalidCursor`).
- docs: `TEST_MATRIX.md` row, `docs/product/screens.md` (both grade-book rows).

**TDD order.** Domain, mapper, repository, mock-repository and the pure row
builder were all written test-first and observed RED (6 suites, "Cannot find
module") before any implementation existed. The Server-Action and RSC-page
tests were written immediately AFTER their (small) implementations rather than
before — flagged honestly, not claimed as red-first.

**Proof actually run (from the worktree)**

| Command | Result |
| --- | --- |
| `bun vitest run` | **493 files / 3758 tests pass**, 0 fail (baseline 484/3619) |
| `bunx vitest run --config vitest.storybook.mts` | **156 files / 1225 tests pass**, 0 fail |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing repo-wide warning + 1 info in `messaging`) |
| `bun run build` (real) | ✓ compiled |
| `bun run build` (`NEXT_PUBLIC_USE_MOCK=true`) | ✓ compiled |

One transient Storybook failure appeared on the first full run
(`principal-classes-screen.stories.tsx > Keyboard Only`, an UNTOUCHED file) — it
passes in isolation both with and without this branch's changes, and the next
full run was 1225/1225 green. Recorded as a load-dependent flake, not chased.

**Flagged for `fe-lead`**
1. `IGradeRejectionRepository` was renamed — a cross-file rename inside
   `features/grades` only (5 files); no ADR raised because no contract,
   architecture or token decision changed, only a name that had become wrong.
2. `formatRelativeTime` promotion touched two `features/feed` files (imports
   only). It is the decision-0026 "move, don't copy" rule, but it IS outside the
   grades module — call it out if the lane cares.
3. Relative wait-time is computed client-side from `Date.now()` (the same
   convention `feed` already uses), so an SSR/hydration text mismatch is
   theoretically possible at a minute/hour boundary.
4. Live-BE dependency: US-186's `grade_entries_pending_by_tenant` clone +
   its reconciler must exist on the target environment; the endpoint 404s
   otherwise (the failure maps to `unknown`, rendering the retryable error card).
