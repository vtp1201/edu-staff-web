# US-E18.44 Grade reject/request-revision flow (BE US-184)

## Status

planned

## Lane

high-risk

> Hard-gate flags: mutation on a grading record (RBAC ADMIN/MANAGER-only),
> free-text rendering (`rejectionReason`, staff-entered, must be escaped),
> role-discriminated field visibility (STAFF-only fields stripped on
> STUDENT/PARENT reads — a real security/privacy boundary, not just UX).

## Dependencies

- Depends on: none (BE US-184, merged `edu-api` main `1042aa94`, 2026-08-05). **Migration `047_grade_entries_rejection` (core) must run on the target BE environment before this is live** — mock/unit tests are unaffected, note this in Evidence only.
- Blocks: none
- Feature module(s) chạm: `src/features/grades/`
- Shared contract/file: `IGradesRepository`/`IGradeBookRepository` (new method), `GradeCell`/`GradeEntry` shape, `POST .../grades/{studentId}/columns/{columnId}/reject`

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-05-be-to-fe-response.md` §"#19 (reject/request-revision
GradeEntry) → US-184":

- New route: `POST /core/api/v1/classes/{classId}/subjects/{subjectId}/terms/{termId}/grades/{studentId}/columns/{columnId}/reject`
  (ADMIN/MANAGER), body `{"reason": "..."}` — reason REQUIRED, ≤500 chars.
- Transition: `PENDING_APPROVAL → DRAFT` (mirrors conduct-grade reject —
  request-revision semantics, teacher fixes and resubmits normally). **There
  is NO new `REJECTED` state** — do not add one to `GradeEntryStatus`.
- 200 response → `GradeEntryResponse` now ALSO carries `rejectionReason` /
  `rejectedBy` / `rejectedAt` (latest-cycle only; NOT cleared on resubmit —
  the approver keeps seeing the last rejection reason even after the teacher
  fixes and resubmits).
- Errors: `409 GRADE_ENTRY_NOT_PENDING_APPROVAL`, `422
  GRADE_REJECTION_REASON_REQUIRED`.
- ⚠️ **These 3 new fields are STAFF-ONLY** — always stripped by BE on
  student/parent reads (`GET /members/{id}/grades`,
  `GET /members/{id}/grade-report`). Do NOT model them anywhere in the
  student/parent presentation path (`getMyGrades`/`getChildGrades`
  call-sites) — they must never even be TYPED as present there (make the
  absence a compile-time guarantee, same pattern this repo has used before
  for role-discriminated fields — check `dob`/`gender`'s conditional-presence
  handling in `admin-roster`'s recent stories for the established idiom:
  optional field, absent ≠ empty string, never defaulted).
- Escape `rejectionReason` when rendering (free text, staff-entered — this is
  a real XSS-adjacent concern, not just formatting; confirm the presentation
  layer already escapes all rendered text by default via React's normal JSX
  text-node escaping — do NOT use `dangerouslySetInnerHTML` for this under
  any circumstance).
- No notification/event fires on reject (matches conduct's precedent) —
  teacher discovers the rejection by seeing `DRAFT` status + `rejectionReason`
  when they reopen the gradebook. No new SSE/notification wiring needed here.
- **Known BE bug (US-185, already registered on BE side, NOT your concern):**
  a stale-clone bug in `grade_entries_by_student` can make a student's OWN
  grade view lag behind the teacher's gradebook after the FIRST score entry.
  If QA sees a real-mode mismatch between a teacher's gradebook and a
  student's grade view, that is the KNOWN BE bug — do not chase it, do not
  "fix" it client-side, just note it if observed.

## Current state (read before designing anything)

This is a genuinely NEW capability, not a data-source swap. Ground truth on
the existing model:

- `GradeEntryStatus` (`grade-entry-status.entity.ts`) — `DRAFT →
  (PUBLISHED|PENDING_APPROVAL) → PUBLISHED → LOCKED`, comment explicitly says
  "Strictly forward, no reject/reverse transition exists" — THIS COMMENT IS
  NOW STALE, update it (the reverse `PENDING_APPROVAL → DRAFT` transition now
  exists, added by BE US-184).
- `IGradesRepository` (`i-grades.repository.ts`) — teacher entry: only
  `getGradeSheet`/`saveScore`/`submitScore`. No reject method exists anywhere
  on this interface.
- `IGradeApprovalRepository` (`i-grade-approval.repository.ts`) — **DO NOT
  confuse this with what you're building.** This is the SEPARATE, permanently
  mocked, BATCH-level admin oversight dashboard (`GradeApprovalBatch`,
  keyed by an invented `batchId` that has no wire source — ask #18, still
  OPEN per BE's 2026-08-05 report: "cần design story - chưa có read path
  tenant-wide"). It already HAS `approveGradeBatch`/`requestGradeRevision`
  methods, but they operate on a fictional `batchId` construct that BE US-184
  does NOT provide a source for. **US-184's real endpoint is per-cell**
  (`studentId`+`columnId`, scoped by classId/subjectId/termId — i.e. exactly
  the `ClassSubjectTermKey` + per-row/per-column addressing already used by
  `IGradesRepository`/`GradeCell`), not per-batch. Do not wire this new
  endpoint into `IGradeApprovalRepository` — that repository stays fully
  mocked, untouched, ask #18 stays open.
- `GradeCell` (`grade-sheet.entity.ts`): `{value, status}`. This is the
  correct place for the new fields conceptually (per-cell), but check how
  `GradeSheet`/`StudentScoreRow`/`GradeBook` (used for the multi-role READ
  path, `grade-book.entity.ts`) differ from `GradeCell`/`GradeSheet` (used for
  the teacher ENTRY path, `grade-sheet.entity.ts`) — there may be TWO parallel
  cell shapes (entry-side vs read-side) that both need the new optional
  fields, staff-view only. Read both entity files fully before deciding.
- Precedent for "reject with reason" dialog UI: `src/features/discipline/presentation/discipline-screen/components/reject-leave-dialog.tsx`
  exists in this repo (different feature, permanently-mocked discipline
  domain, but the UI PATTERN — reason-required dialog, min-length validation
  hint, destructive-tone confirm — is exactly what's needed here). Also check
  `components/shared/` for a generic `DestructiveConfirmDialog` (used
  elsewhere in this epic per prior sessions, e.g. moderation/content-report
  flows) before building a new one-off dialog — reuse per decision 0026 if
  the shape fits; extend via prop/variant, don't fork.

## Scope

1. Add `rejectionReason?: string`, `rejectedBy?: string`, `rejectedAt?:
   string` to whichever cell/entry entity is used on the STAFF (teacher
   admin/manager) side — `GradeCell` and/or the `GradeEntry`-adjacent shape
   the real repository already maps from `GradeEntryResponse`. Confirm these
   are STRUCTURALLY ABSENT (not present-but-null/empty) on the student/parent
   read path's own entity/DTO (do not widen `GradeBook`'s student-facing
   type with these fields at all, if the read paths use a distinct type from
   the entry-side one — if they SHARE one type, make the fields optional and
   never populate them on the mapper branch that serves `getMyGrades`/
   `getChildGrades`).
2. Add a new repository method for the reject action — decide (and document
   your reasoning) whether it belongs on `IGradesRepository` directly
   (alongside `submitScore`) or a new narrow interface (mirroring
   `IGradesTermRepository`'s precedent of "separate interface for an
   ADMIN/MANAGER action orthogonal to the teacher-entry flow" — but note
   US-184's action IS per-cell like `submitScore`, not per-term-bulk like
   `lockTerm`, so the term-repository precedent may not fit exactly; use your
   judgment and state it).
3. New use-case mirroring `submit-column-scores.use-case.ts`'s shape/tests —
   e.g. `RejectColumnEntryUseCase`, validating `reason.trim().length <= 500`
   AND non-empty client-side (defense-in-depth; BE 422s anyway) before
   calling the repository.
4. Real repository: wire the new endpoint
   (`ACADEMIC... ` — actually the grades feature's own endpoint file, check
   `bootstrap/endpoint/grades.endpoint.ts` for the existing path-building
   convention for `submitScore` and mirror it exactly for `.../reject`).
   Map `409 GRADE_ENTRY_NOT_PENDING_APPROVAL` and `422
   GRADE_REJECTION_REASON_REQUIRED` to new failure types (branch on
   `error.code`, decision 0008).
5. Update `MockGradesRepository`/whatever mock backs `USE_MOCK=true` to
   support the reject transition (PENDING_APPROVAL→DRAFT + populate the 3
   fields) so Storybook/dev-mode can demo it.
6. UI: an ADMIN/MANAGER-visible reject action on cells currently
   `PENDING_APPROVAL` in the teacher/admin gradebook grid (check
   `grade-entry-table.tsx`/`grade-entry-container.tsx` — where does the
   viewer's role gate what actions are available per cell? Follow that
   existing pattern for a new reject affordance). Reason dialog (reuse
   existing pattern per §"Current state" above). Escape `rejectionReason`
   wherever displayed (standard JSX text rendering already does this —
   confirm no bypass). A visible badge/indicator for
   "rejected — <reason>" state on a `DRAFT` cell that carries a
   `rejectionReason` (distinguishing it from a never-submitted `DRAFT` cell)
   — check `GradeEntryStatusBadge` (mentioned in US-E18.12's story as already
   built for per-cell status) for whether it needs a variant, or a separate
   small indicator is more appropriate.
7. i18n: new copy keys (reject action label, reason dialog, validation
   message, rejected-state indicator) in `messages/{vi,en}.json`.
8. Fix the stale "no reject/reverse transition exists" comment on
   `GradeEntryStatus`.

## NOT in scope

- `IGradeApprovalRepository`'s batch dashboard — untouched, stays fully
  mocked, ask #18 stays open (tenant-wide rollup still has no BE source).
- Any notification/event wiring for the reject action (BE confirms none
  exists).
- Chasing the known BE bug US-185 (student-view staleness) if observed during
  QA — note it, don't fix it.

## Acceptance Criteria

- Real mode: an ADMIN/MANAGER can reject a `PENDING_APPROVAL` cell with a
  required reason (≤500 chars); the cell returns to `DRAFT`, and the teacher
  sees the rejection reason when they reopen the gradebook.
- Empty/missing reason is blocked both client-side (defense-in-depth) and by
  the real `422 GRADE_REJECTION_REASON_REQUIRED` mapping.
- Rejecting a cell NOT in `PENDING_APPROVAL` maps `409
  GRADE_ENTRY_NOT_PENDING_APPROVAL` to a clear, non-generic failure.
- `rejectionReason`/`rejectedBy`/`rejectedAt` NEVER appear (not even as
  `undefined` fields rendered blank) on the student self-view or
  parent-linked-child view.
- `rejectionReason` is rendered safely (no HTML injection possible).
- `USE_MOCK=true` fully demoable (mock supports the transition).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | use-case validation test (reason length), mapper test (fields present staff-side / absent student-parent-side), entity/status test |
| Integration | repository contract test (409/422 mapping), real interceptor pipeline test |
| E2E | Storybook interaction test for the reject dialog + rejected-state indicator; a11y pass on the new dialog/badge |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted (high-risk lane: tech-lead reviewer MUST explicitly verify the role-stripping boundary is enforced, not just self-reported) |

## Harness Delta

- TEST_MATRIX row for grade-reject flow.
- Close ask #19 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 6 row + note migration 047 dependency for live BE testing.
- Note ask #18 stays open (batch dashboard rollup — separate, unaddressed).

## Evidence

### Implementation (fe-nextjs-engineer, 2026-08-05)

**Interface-placement decision (flagged for `fe-lead`):** the reject method went
onto a NEW narrow `IGradeRejectionRepository`, NOT onto `IGradesRepository`.
Reasoning: (1) actor split — `IGradesRepository` is the TEACHER-entry contract
(enter → submit); reject is an APPROVER capability, the same reasoning that
already put `lockTerm` on `IGradesTermRepository`; (2) smallest port — the new
use-case needs exactly one method, and depending on the 3-method entry contract
would force every existing `IGradesRepository` test double to stub a method it
never answers; (3) capability-as-presence — the DI factory hands the port out
only where the actor is authorized. Noted explicitly: unlike
`IGradesTermRepository` the addressing here IS per-cell like `submitScore`, so
the split is by ACTOR/capability, not by granularity. Both interfaces are
implemented by the same concrete `GradesRepository`/`MockGradesRepository`.

**Staff-only field boundary (STRUCTURAL, not conventional).** The 3 wire fields
map onto one grouped optional `GradeRejection` on a NEW `StaffGradeCell`
(`GradeCell` + `rejection?`). Only the entry path uses it
(`StudentScoreRow.scores`, `IGradesRepository` write returns, `rejectEntry`).
The student-self / parent-linked read path (`GradeBook`/`GradeBookRow` →
`getMyGrades`/`getChildGrades`) keeps the narrower `GradeCell`, so those
surfaces cannot reference the field at all. Proof:
- compile-time: `domain/entities/staff-rejection-privacy.test.ts` — two
  `@ts-expect-error` assertions on `GradeCell.rejection` and
  `GradeBookRow.scores.ck.rejection`; if either type is ever widened the
  directive becomes unused and `bunx tsc --noEmit` FAILS.
- runtime (defense in depth): `grades.mapper.test.ts` "PRIVACY: mapGradeCell …
  drops the fields even when present on the wire" +
  `grade-book.mapper.test.ts` "PRIVACY: drops staff-only rejection fields even
  if the self-view wire leaks them" (asserts `Object.keys` and that the
  serialized book contains no `reject`/reason/approver substring).
- two mappers on purpose: `mapGradeCell` (read path, narrow) vs
  `mapStaffGradeCell` (staff, conditional spread). Both carry a "do not merge
  these" comment.

**Free-text safety.** `rejectionReason` is rendered only as a JSX text node
(`RejectionIndicator` in `grade-entry-table.tsx`); no
`dangerouslySetInnerHTML` anywhere on this path (repo-wide grep: the only
occurrences remain unrelated pre-existing ones). Story
`RejectedDraftIndicatorEscapesReason` feeds `<img src=x onerror=...>` as the
reason and asserts the literal text renders while `querySelector("img")` is
null.

**RBAC.** Two independent gates plus BE's own 403: (a) the VM's
`rejectEntryAction` is only bound when `getSessionRole()` ∈
{`principal`, `admin`} (BE `ADMIN`+`MANAGER` both collapse to `principal` via
the canonical `ROLE_ENUM_TO_APP`), so a teacher's DOM has no reject control and
no dialog at all; (b) `rejectEntryAction` (a publicly callable Server Action)
re-checks `requireRole(["principal","admin"])` BEFORE any DI/HTTP call.

**Mock mode.** `MockGradesRepository.rejectEntry` implements the transition with
an injected clock, enforces guard order (existence → state → reason), keeps only
the LATEST cycle, and PRESERVES the rejection across save/resubmit (BE does not
clear it) — so `USE_MOCK=true` demos the approver experience faithfully.

**Not touched (as scoped):** `IGradeApprovalRepository` / the batch dashboard /
`grade-approval-screen` stay fully mock; `makeApprovalRepo`'s doc comment was
corrected to state that US-184 retires only ONE of its force-mock reasons (the
missing `batchId` source and the missing tenant-wide rollup both stand — ask #18
stays OPEN).

**Files changed**

- domain: `grade-entry-status.entity.ts` (stale comment fixed),
  `grade-sheet.entity.ts` (`GradeRejection`, `StaffGradeCell`),
  `grades.failure.ts` (+`rejection-reason-required`,
  +`rejection-reason-too-long`), `i-grade-rejection.repository.ts` (new),
  `i-grades.repository.ts` (staff-cell returns),
  `reject-column-entry.use-case.ts` (new, +`MAX_REJECTION_REASON_LENGTH`),
  `save-score.use-case.ts` (result type).
- infrastructure (`'server-only'`): `grades-response.dto.ts` (3 optional
  staff-only fields + `RejectGradeEntryRequestDto`), `grades.mapper.ts`
  (`mapStaffGradeCell`), `grades.repository.ts` (`rejectEntry` + 422 code),
  `mocks/grades.mock.repository.ts` (`rejectEntry`, rejection-preserving
  save/submit, injected clock).
- bootstrap: `endpoint/grades.endpoint.ts` (`rejectEntry`),
  `di/grades.di.ts` (`makeRejectColumnEntryUseCase`, widened `makeRepo` type,
  corrected approval-factory comment).
- app: `teacher/grades/actions.ts` (`rejectEntryAction` + `requireRole`),
  `teacher/grades/page.tsx` (role-gated capability binding).
- presentation (`'use client'`): `grade-entry-screen.i-vm.ts`
  (`rejectEntryAction?`), `grade-entry-screen.tsx` (reject mutation + dialog +
  rejection-preserving optimistic patch), `grade-entry-table.tsx`
  (reject control, `RejectionIndicator`, `aria-describedby` composition),
  `grade-entry-screen.stories.tsx` (+4 stories),
  `grade-approval-container.tsx` / `grade-book-screen.tsx` (exhaustive
  failure-map entries only).
- shared component: `components/shared/reason-confirm-dialog/` (new —
  component + pure `validate-reason.ts` + test + 8 stories + `index.ts`).
- i18n: 14 keys added to BOTH `messages/vi.json` and `messages/en.json`
  (`gradeEntry.reject*`, `gradeEntry.rejected*`,
  `errorRejectionReason{Required,TooLong}`, `errorNotPendingApproval`).
- docs: `TEST_MATRIX.md` row.

**Proof actually run (from the worktree)**

| Command | Result |
| --- | --- |
| `bun vitest run` | **481 files / 3590 tests pass**, 0 fail |
| `bun vitest run --config vitest.storybook.mts` | 156 files / 1210 tests pass (1 initial failure — clicking a disabled button — fixed, affected files re-run green) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing repo-wide warning + 1 info, unrelated `messaging`) |
| `bun run build` (real, `NEXT_PUBLIC_USE_MOCK` unset) | ✓ compiled |
| `bun run build` (`NEXT_PUBLIC_USE_MOCK=true`) | ✓ compiled |

TDD order honoured: all reject tests written and observed RED (20 failing) before
any implementation existed.

**Deviations / flags for `fe-lead`**
1. The `TEST_MATRIX.md` row was added at the END of implementation, not as
   `planned` before coding (no row existed when the packet was handed over).
2. `reason-confirm-dialog` is a NEW canonical shared component. Four
   PRE-EXISTING reason-dialog forks remain (`discipline`'s
   `reject-leave-dialog`, grades' `revision-request-dialog`,
   `staff-discipline`'s `sd-reject-panel`, `staff-leave`'s request card).
   Migrating them is deliberately OUT of scope here (cross-feature blast radius
   on 4 features' interaction stories) — recommend a follow-up story.
3. `IGradesRepository.saveScore`/`submitScore` return types widened
   `GradeCell → StaffGradeCell` so a resubmit response keeps the (uncleared)
   rejection visible to the approver. Assignability is preserved, so no caller
   broke.
4. Live-BE: core migration `047_grade_entries_rejection` must have run;
   BE bug US-185 (student-view staleness) is BE's, not chased here.

### Routing fix — reject affordance made reachable (fe-nextjs-engineer, 2026-08-06)

`fe-tech-lead-reviewer` returned **Revision Required** on exactly one blocking
defect: the reject affordance was mounted ONLY inside `GradeEntryContainer`,
which had exactly one route — `(app)/teacher/grades`. That route's layout
(`teacher/layout.tsx` → `evaluateNamespaceAccess`) gates on STRICT EQUALITY
`role === "teacher"`, so a `principal`/`admin` session is redirected away before
the page renders, while a `teacher` session renders it but is never granted
`canReject`. Nothing was insecure (everything failed closed) but **AC-1 was
impossible to exercise: no reachable route existed for the roles BE US-184
authorizes.**

**Fix — reuse the already-guarded approver routes, do not invent a new one:**

| Route | Guard | Before | After |
| --- | --- | --- | --- |
| `(app)/principal/grade-book` | `role === "principal"` (MANAGER + ADMIN collapse here via `ROLE_ENUM_TO_APP`) | `getGradeBook()` → `GradeBookScreen` | `getGradeSheet()` → `GradeEntryScreen` **approver mode** |
| `(app)/admin/grade-book` | `role === "admin"` | same | same |
| `(app)/teacher/grades` | `role === "teacher"` | entry + dead `canReject` wiring | entry only (dead wiring removed) |

Both approver routes now read the **staff** shape (`GradeSheet` /
`StaffGradeCell`). That was the necessary change, not an incidental one: the
multi-role `GradeBook`/`GradeBookRow` path is built from the narrower
`GradeCell` *precisely so* a student/parent surface cannot express a rejection —
which also means it cannot carry one for an approver. The privacy boundary is
untouched: `getMyGrades`/`getChildGrades`/`GradeBookRow` were not modified in
any way, and `staff-rejection-privacy.test.ts` still compiles as the proof.

**Role-discriminated VM (not a bag of booleans).** `GradeEntryScreenVM` is now a
union:

- `TeacherGradeEntryVM` — `saveScoreAction` + `submitScoresAction`, and NO
  `rejectEntryAction` field at all;
- `ApproverGradeEntryVM` — `rejectEntryAction` (required) + optional
  `lockTermAction` + display labels, and NO save/submit fields at all.

So "an approver cannot edit a score" and "a teacher cannot reject" are both
COMPILE errors, not policies a screen has to remember to check. `tsc` rejected
every mis-shaped VM literal in the stories while this was wired up (observed).
`GradeEntryTable` follows the same capability-as-presence idiom the reject
control already used: without `onSaveScore` a DRAFT cell renders as read-only
text, and the row-submit column is dropped from `<thead>` AND `<tbody>` (an
empty trailing column would be announced as a real one).

**Moved, not copied (decision 0026).** The two affordances the approver routes
already had moved WITH them:

- `RankDistributionChart` → `features/grades/presentation/components/`
  (rendered by both grade screens now). `calculateRankDistribution` was widened
  from `GradeBookRow[]` to a structural `RankedRow[]` (`{ average }` only — the
  sole field it ever read) so ONE implementation serves both read shapes.
- Term lock → `features/grades/presentation/components/lock-term-control.tsx`,
  extracted verbatim from `grade-book-screen.tsx` (A11Y-102 errorSlot behaviour
  preserved) and REMOVED from `GradeBookScreenVM` — its only two routes moved,
  and teacher/student/parent never had it. Its 4 interaction stories moved to
  `grade-entry-screen.stories.tsx` with them.

**Security fix found while writing the moved action's tests:** `lockTermAction`
(irreversible bulk lock, ADR 0054 §4) had NO `requireRole` guard of its own — it
relied entirely on the route layout, which a direct Server-Action invocation
bypasses. It now fails closed on `requireRole(["principal","admin"])`, proven by
a forge-role test asserting zero use-case construction. `rejectEntryAction` moved
from `teacher/grades/actions.ts` to `admin/grade-book/actions.ts` (consumed by
both approver routes, revalidating both paths) and keeps its own guard.

**Reviewer CONSIDER items — both closed:**
- stale comment in `grade-entry-screen.tsx` claiming `rejectTarget` carries
  display labels (it carries identity only) — corrected;
- `revision-request-dialog.tsx` (same-feature fork) — DELETED, call site now
  uses the canonical `ReasonConfirmDialog`, which gained an opt-in `minLength` +
  `tooShortMessage` for the ≥10-char revision-note rule. `maxLength` was ALSO
  made optional rather than inventing a cap for a field with no documented
  server maximum. Copy unchanged (no new i18n keys); the field gains
  `role="alert"` errors and focus-return for free. This retires 1 of the 4 forks
  flagged in the previous round.

**Consequence to accept explicitly:** the approver table is the entry table, so
the `conductGrade` column no longer renders on those two routes. On the REAL
path that column was never real data — `grade-book.mapper.ts` hardcodes
`DEFAULT_CONDUCT_GRADE = "TB"` for every row because conduct has no source on
the `GradeEntry`/`GradeReport` wire. Removing a fabricated column is not a data
loss, but it IS a visible change to the US-E13.6 read-only view and is called
out here rather than buried. Everything else those screens had is preserved:
roster, per-cell status badges, score colours, weighted average, five-band
distribution, class/subject/term pickers, term lock, loading/empty/error states.

**One new i18n key** (vi + en): `gradeEntry.titleApprover` — the approver route
is a grade BOOK view, not a "nhập điểm" (grade entry) view. Lock + distribution
copy stayed in the `gradeBook` namespace (moved screens, unchanged meaning, no
duplicate keys minted).

**Proof actually run (from the worktree, after the fix)**

| Command | Result |
| --- | --- |
| `bun vitest run` | **484 files / 3619 tests pass**, 0 fail (branch baseline 481/3590 → +3 files, +29 tests) |
| `bunx vitest run --config vitest.storybook.mts` ×3 | run 1 **156/1214 pass**, run 2 **1 fail**, run 3 **156/1214 pass** |
| `bunx tsc --noEmit` | clean |
| `bun lint` | 1 warning + 1 info — byte-identical to the un-modified branch baseline (verified by `git stash`), both pre-existing in `messaging` |
| `bun run build` (real, `NEXT_PUBLIC_USE_MOCK` unset) | ✓ compiled; both `principal/grade-book` + `admin/grade-book` routes emitted |
| `bun run build` (`NEXT_PUBLIC_USE_MOCK=true`) | ✓ compiled in 9.7s |

**Storybook flake investigation (reviewer SHOULD-FIX).** The one failure in run 2
was `staff-discipline-screen.stories.tsx > Create Violation Dialog Staff Member
Static Select` (1331 ms). Characterisation:

- the file is in an UNRELATED feature and was not touched by this story;
- isolated re-runs: **3/3 pass**;
- full-suite runs 1 and 3: pass;
- the un-modified branch HEAD (`git stash -u`) full suite: **156/1210 pass**, so
  the flake is not introduced by this change.

Mechanism: that play function opens a Radix `Select` TWICE, each time awaiting
`findAllByRole("option")` immediately after the click, with a `waitFor` on the
trigger text between them. Under parallel load the portal mount / previous
listbox exit-animation can push the second open past the default query timeout —
the same load-dependent class of flake seen elsewhere in this session, and the
likely identity of the reviewer's unattributed 1/1210. **Deliberately not
"fixed" here** (unrelated file, no production defect); recommended follow-up if
it recurs: assert on the listbox via `findByRole("listbox")` before querying
options, or raise that story's timeout.

**Flags for `fe-lead`**
1. **Latent bug, pre-existing, NOT fixed (out of assigned scope):**
   `teacher/grades/page.tsx` passes locally-defined `async () => ({ ok: false,
   … })` stubs as `saveScoreAction`/`submitScoresAction` when no class-subject-
   term is selected — i.e. on the route's default load. A plain function cannot
   be handed from an RSC to a Client Component; that is a render-time serialization
   error, not something `bun run build` catches. It predates this story
   (US-E18.12) and I did not touch it since teacher/grades was to stay
   unchanged. The new approver builder deliberately does NOT copy the pattern —
   it binds the real Server Action with an empty-string key instead. Worth a
   small follow-up story to confirm and fix.
   → **CLOSED in the reachability round below** (reviewer reproduced it
   empirically as an HTTP 500; it sits on this story's own AC-1 reopen path, so it
   was pulled into scope rather than deferred).
2. `GradeBookRole` still includes `"principal"`/`"admin"` (the shared
   `GradeBookTable` accepts them, and its stories/tests cover them). The
   `GradeBookScreen` principal story was renamed to
   `PrincipalReadOnlyContract` with a pointer to the live approver stories
   rather than deleted, so the read-only rendering contract stays pinned.
3. Ask #18 (batch dashboard rollup) untouched as instructed:
   `IGradeApprovalRepository` and its force-mocked DI factory were not modified.
   Only that screen's dialog COMPONENT changed (fork → canonical).

### Reachability + a11y round (fe-nextjs-engineer, 2026-08-06)

Second `fe-tech-lead-reviewer` pass confirmed the security/privacy/architecture
work of the routing fix, and raised two NEW **reachability** defects — both about
a capability existing but being impossible (or fatal) to actually reach. Plus two
findings from a fresh a11y pass. All four addressed here.

**MUST-FIX 1 — the default load of `/teacher/grades` was an HTTP 500.** The
latent bug flagged (and deferred) in the previous round was reproduced
empirically by the reviewer: with no `classId`/`subjectId`/`term` query params —
i.e. the route's DEFAULT load — the page handed locally-defined async closures to
`GradeEntryContainer`, and Next.js refuses to serialize a plain function across
the RSC→client boundary ("Functions cannot be passed directly to Client
Components unless you explicitly expose it by marking it with 'use server'").
That is exactly the code path AC-1 requires: a teacher must REOPEN the gradebook
to read a rejection reason, and reopening lands on the no-selection default.

Fix mirrors the idiom `buildApproverGradeVm` already established in this story —
bind the REAL Server Actions to a placeholder key instead of stubbing them:

```ts
const boundKey: ClassSubjectTermKey = key ?? {
  classId: selectedClassId ?? "", subjectId: selectedSubjectId ?? "",
  termId: selectedTerm ?? "", academicYearLabel,
};
saveScoreAction:    saveScoreAction.bind(null, boundKey),
submitScoresAction: submitScoresAction.bind(null, boundKey),
```

Nothing can invoke them in that state (no sheet ⇒ no input, no submit control),
and server-side key validation is the backstop.

**Why the regression lock had to be a unit test.** `tsc` accepts the closures
(they satisfy the VM type), `bun run build` compiles them, and Storybook never
crosses an RSC boundary — so none of the three gates can see this class of bug.
New `app/[locale]/t/[tenant]/(app)/teacher/grades/page.test.tsx` (7 tests, same
awaited-element/props technique as the sibling `principal/grade-book/page.test.tsx`)
asserts the no-selection VM's `saveScoreAction`/`submitScoresAction` **delegate to
the mocked action-module exports** with the empty-string key — an assertion a
local closure fails by construction (observed RED: "Number of calls: 0"). It also
pins teacher-mode capability shape (`"rejectEntryAction" in vm === false`), the
AC-1 rejection-on-reopen read, and the typed-failure path.

**MUST-FIX 2 — neither approver route had a nav entry.** `/principal/grade-book`
and `/admin/grade-book` were pre-existing nav-less orphans on `main`; the routing
fix made them the SOLE home of the reject capability, so a principal/admin session
could only reach the new flow by typing a URL. Added to
`components/layout/app-shell/sidebar/nav-config.ts`, reusing the EXISTING
`shell.nav.grades` label key (`/teacher/grades` already uses it) — **no new i18n
key**:

- `principal`: after `/principal/classes`, before `/principal/schedule` — groups
  with the other academic-record entries and keeps `/messages` + `/profile` as the
  tail (`nav-config.test.ts` asserts `/profile` is LAST for non-admin roles);
- `admin`: directly after `/admin/assessment` (the scheme these grades are graded
  against), before `/admin/staffing`.

`nav-config.test.ts` updated: the hardcoded `NAV_BY_ROLE.admin.length` assertion
12 → **13** (there is no equivalent length assertion for `principal`, verified),
plus 2 NEW tests — one asserting both approver hrefs exist, one asserting all
three grade entries share `labelKey: "grades"` (locks the "no new key" decision).
Observed RED: 3 failing.

**A11Y-001 (was still open) — reject button now describes its stale rejection.**
BE US-184 does not clear `rejection` when a teacher resubmits, so a
`PENDING_APPROVAL` cell in the READ-ONLY (approver) branch can render the
"rejected + why" indicator AND a live reject button side by side. The button
carried no `aria-describedby`, so a screen-reader user heard "Từ chối …" with no
hint that a prior reason was displayed beside it. Added
`aria-describedby={rejection ? rejectionId : undefined}` to that specific button
(the editable-branch input was already fixed in the first round). New interaction
story `ApproverRejectButtonDescribedByStaleRejection` covers the previously
uncovered COMBINED state and asserts the id resolves to the reason text — and, to
prove the wiring is scoped rather than blanket, that the two rejection-free
pending cells' buttons have NO `aria-describedby`. Observed RED before the fix.

**A11Y-002 (touch target) — the auditor considered it resolved in practice**
(text-label button clears 44×44 via `min-h-11` + padding). Took the optional
defensive step anyway: added `min-w-11` alongside the existing `min-h-11`.

**Files changed this round**

- app (RSC): `teacher/grades/page.tsx` (bound-action fix),
  `teacher/grades/page.test.tsx` (NEW — 7 tests).
- layout: `app-shell/sidebar/nav-config.ts` (+2 nav entries),
  `app-shell/sidebar/nav-config.test.ts` (12→13 + 2 new tests).
- presentation (`'use client'`): `grade-entry-table.tsx`
  (`aria-describedby` + `min-w-11` on the read-only reject button),
  `grade-entry-screen.stories.tsx` (+1 interaction story).
- No i18n keys added; no tokens touched; no repository/DI/domain change.

**Proof actually run (from the worktree, after this round)**

| Command | Result |
| --- | --- |
| `bun vitest run` | **485 files / 3628 tests pass**, 0 fail (previous round 484/3619 → +1 file, +9 tests) |
| `bunx vitest run --config vitest.storybook.mts` | **156 files / 1215 tests pass**, 0 fail (previous 1214 → +1 story) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean after `bun lint:fix` (1 formatting fix in the new story); the 1 warning + 1 info remain the pre-existing unrelated `messaging` pair |
| `bun run build` | ✓ compiled in 9.5s; `/principal/grade-book` + `/admin/grade-book` + `/teacher/grades` all emitted |

Note on `bunx tsc --noEmit`: a stale `.next/dev/types/validator.ts` referencing a
deleted `src/app/closure-probe/page` (left behind by the reviewer's empirical
reproduction) reported one phantom TS2307. `rm -rf .next` cleared it; tsc is clean
on the real source tree, and `src/app/closure-probe/` does not exist.

**Not touched (as instructed):** `IGradeApprovalRepository`/batch dashboard (ask
#18 stays open), student/parent grade paths (privacy boundary still zero-diff),
`staff-discipline-screen.stories.tsx` flake (unrelated/pre-existing), the packet's
`## Status` field (fe-lead flips it), `docs/reports/*` + `EPIC-OVERVIEW.md`
(fe-lead owns them).
