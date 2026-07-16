# US-E18.13 Academic-records seal remap — real batch-seal, permanently-blocked unseal + viewer

## Status

implemented

## Lane

high-risk (irreversible data-integrity action — sealing freezes a grade
snapshot into a legal học bạ record; unseal is a two-admin compliance gate
per Nghị định 13/2023).

## Scope

Wire the `academic-records` feature (`src/features/academic-records/`) to the
real `core` service per the epic's Wave 3 remap. Full ground-truthed contract
decision + rationale: `docs/decisions/0055-academic-records-seal-wiring-contract.md`.

**In scope:**

- `IAcademicRecordsSealRepository.sealBatch(key, actorId)` → wired REAL
  against `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/seal`.
- New reactive failure taxonomy replacing the old client-pre-check gates:
  `unlocked-grades-exist` (422 `ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST`,
  replaces `not-all-locked`), `too-many-reseals` (422
  `ACADEMIC_RECORD_TOO_MANY_RESEALS`, new). `already-sealed` is **removed**
  as a blocking pre-check — reseal is idempotent on the real contract
  (`resealCount` increments, surfaced in the seal result).
- `getSealStatus` stays mocked but is re-scoped to **decorative-only**
  display (approximate "X/Y locked" hint) — VM/prop naming must make this
  non-authoritative status explicit (e.g. `isApproximate: true` or a comment
  at the ownership boundary) so a future maintainer doesn't treat it as a
  hard gate.
- `ensureFreshSession()` wired into the real branch of `academic-records.di.ts`
  for `sealBatch` (playbook step 6, mandatory for every DI factory flipped to
  real).
- Ground-truthed error taxonomy for the whole feature (9 codes total,
  UPPER_SNAKE, confirmed via `codeFromKey` in `pkg/kit/response/error.go`):
  `ACADEMIC_RECORD_FORBIDDEN`, `ACADEMIC_RECORD_NOT_FOUND`,
  `ACADEMIC_RECORD_ALREADY_SEALED`, `ACADEMIC_RECORD_NOT_SEALED`,
  `ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST`,
  `ACADEMIC_RECORD_TOO_MANY_RESEALS`, `UNSEAL_REQUEST_NOT_FOUND`,
  `UNSEAL_REQUEST_ALREADY_APPROVED`, `UNSEAL_REASON_REQUIRED`. All 9 kept
  correct + unit-tested even where the operation stays mock-first (dormant
  real-mode branch, matching US-E18.8/US-E18.9/US-E18.12 precedent).
- Update the mock repository to model the corrected (idempotent, reactive)
  seal semantics truthfully — mocks must not lie relative to the real
  contract now documented.
- Same-commit i18n additions for any new failure-key copy (reuse the
  existing `academicRecordSeal` namespace — do NOT create a parallel one).

**Explicitly OUT of scope (stays permanently mock-first, force-mocked
regardless of `USE_MOCK` — see ADR 0055 for full rationale):**

- `initiateUnseal`, `confirmUnseal`, `getPendingUnsealRequests`,
  `listTenantAdmins` — real BE has POST create + POST approve but **no GET
  listing endpoint** for pending unseal requests at all (cross-repo ask #21,
  confirms the recurring "no discovery endpoint" gap a 7th time). A second
  admin, in a different session, has no way to discover a pending
  `requestId` to approve against the real backend — the workflow is
  practically unreachable even though the individual POSTs exist.
- `listAvailableClasses`, `getSealAuditTrail`, `listSealedStudents` — no BE
  equivalent (already flagged by the epic table; audit-log has no exposed
  endpoint anywhere in the epic, per EPIC-OVERVIEW.md's "KHÔNG thuộc wave
  này" list).
- `IAcademicRecordsRepository` (`getRecord`/`listYears` — the read-only
  student/parent viewer screen) — no wire year-grouping concept, no fixed
  `tx1`/`tx2`/`giuaKy`/`cuoiKy` column shape (real `GradeSnapshotItemResponse`
  is a dynamic column array matching US-E18.7's real model), no student-
  identity fields on this endpoint. Zero UI/model change to this screen in
  this US — that would be a `uiux`/`ba`-level redesign, not a wiring remap.
- No new screens. Existing `academic-record-seal-screen` (admin) and
  `academic-record-screen` (viewer) keep their current layout; only the seal
  action's error surface changes (reactive vs pre-check) — this is a
  **workflow-state change**, not a new screen, but per EPIC-OVERVIEW.md
  "Design Source" note, US-E18.13 IS one of the four E18 stories flagged for
  design-review gate (seal-flow state changes) — run the gate.

## Dependencies

- Depends on US-E18.12 (grades wiring) for term-lock semantics — **confirmed
  unaffected** (ADR 0054's Follow-Up section): seal reads `GradeEntryStatus`
  per the same real enum US-E18.12 already wired; the
  `HasUnlockedEntriesForClassTerm` check happens server-side inside the real
  `Seal` use-case, not something the web needs to call directly.
- `class-term-year-selector.tsx` (existing) already sources class/term
  selection — reuse as-is; term dimension already resolves through the real
  `calendar` feature (US-E18.1) per existing wiring, no change needed there.
- No dependency on any in-flight US at claim time (`git fetch --prune` at
  session start showed only `origin/main`).

## BE Contract (ground-truthed, edu-api `core` service)

Source: `edu-api/services/core/docs/openapi.yaml` (`AcademicRecords` tag,
lines ~3583–3761) + Go source
(`internal/assessment/core/application/usecase/{seal_academic_record,
request_unseal,approve_unseal}.go`, `domain/entity/unseal_request.go`,
`domain/error/academic_record.go`).

| Operation | Method + path | Real? |
| --- | --- | --- |
| Seal | `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/seal` | **YES** |
| Request unseal | `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/unseal-requests` | Exists but unreachable (no discovery) — stays mock |
| Approve unseal | `POST /api/v1/academic-records/unseal-requests/{requestId}/approve` | Exists but unreachable (no discovery) — stays mock |
| Get one record | `GET /api/v1/classes/{classId}/terms/{termId}/students/{studentId}/academic-record` | Not used this US (viewer stays mock) |
| List records for student | `GET /api/v1/members/{memberId}/academic-records` | Not used this US (viewer stays mock) |

`SealAcademicRecordResponse`: `{sealedCount: int, failedCount: int, errors?: string[]}`.
Role gate: `isAdmin(IsSuperAdmin, ActorRoles)` server-side
(`seal_academic_record.go:57`) — web keeps its existing client-side gate as
defense-in-depth.

Full 9-code error taxonomy — see Scope section above.

## Plan (fe-planner to detail phases in this section)

Grounded in ADR `0055` + current code
(`src/features/academic-records/**`, `src/bootstrap/di/academic-records.di.ts`,
`src/app/[locale]/t/[tenant]/(app)/admin/academic-records/actions.ts`). No new
screens; `academic-record-seal-screen` reused. `IAcademicRecordsRepository`
(viewer) and 4 unseal-surface methods are untouched code (confirm force-mock,
no edits needed beyond a comment).

### Key design calls (fe-planner decisions — flag disagreement before Phase 1)

1. **Hybrid DI = two repo instances behind a delegating facade**, not a
   single mock-or-real swap. `HybridAcademicRecordsSealRepository` (new,
   `infrastructure/repositories/academic-records-seal-hybrid.repository.ts`)
   implements `IAcademicRecordsSealRepository`; constructor takes
   `(real: AcademicRecordsSealRepository, mock: MockAcademicRecordsSealRepository)`;
   `sealBatch` delegates to `real`, every other method delegates to `mock`.
   Chosen over "one repo class with an internal if-branch per method" because
   it keeps `AcademicRecordsSealRepository` a pure HTTP adapter (only
   `sealBatch` gets a real implementation, the rest stay `notImplemented()`
   dead code, same scaffold shape already in the file) and keeps
   `MockAcademicRecordsSealRepository` the single source of truth for every
   mocked method's in-memory state — mirrors how `grades.di.ts` composes
   `GradeBookRepository` with an injected `resolveSchemeFor` callback rather
   than branching per-method inside one class.
2. **`sealBatch`'s return shape changes** from `SealBatchStatus` to a new
   `SealBatchResult` entity (`{ sealedCount, failedCount, errors }`, 1:1 with
   the real `SealAcademicRecordResponse`). Verified safe: the container's
   `sealMutation` never reads seal-result fields for the UI — the seal-tab's
   displayed `batch` (status/sealedAt/sealedBy) comes from the separate
   `getSealStatus` query, which the mutation's `onSuccess` merely
   invalidates. Only the success toast copy needs updating (can interpolate
   `sealedCount`/`failedCount` instead of `batchKey.classId`+`term`, or keep
   the existing copy — presentation's call, not blocking).
3. **`already-sealed` is dropped**; **`not-all-locked` is renamed/replaced**
   by `unlocked-grades-exist` (keep `not-all-locked` OUT of the union — it
   described a client pre-check that no longer runs). `too-many-reseals` is
   added. `not-sealed` (unseal-initiate gate) is UNRELATED to seal and stays
   untouched (still force-mocked surface).
4. **`getSealStatus`'s "X/Y locked" hint stops being a hard gate.**
   `AllLockedGate`'s NOT-OK branch currently hides the Seal button entirely
   (link-to-approval only). It must now show a warning banner AND a Seal
   button (decorative-not-blocking), matching the "reactive gate" pattern.
   Reseal (batch already `SEALED`) must also stop disabling the Seal button.
   Both reactive failures (`unlocked-grades-exist`, `too-many-reseals`) are
   surfaced by the existing `showError(res.errorKey)` → `toast.error` path in
   `academic-record-seal-container.tsx` (generic over
   `AcademicRecordsFailure["type"]` already — no dialog restructuring
   needed). This is the UI-touch-minimal choice per EPIC-OVERVIEW precedent;
   flag to fe-lead if a dedicated inline error slot in
   `seal-confirm-dialog.tsx` is preferred instead of toast.

### Phase 1 — Domain (failure union + use-case rewrite + entity)

Files:
- `domain/failures/academic-records.failure.ts` — remove `not-all-locked`,
  `already-sealed`; add `unlocked-grades-exist`, `too-many-reseals`.
- `domain/entities/seal-batch.entity.ts` — add
  `export interface SealBatchResult { sealedCount: number; failedCount: number; errors: string[] }`.
- `domain/repositories/i-academic-records-seal.repository.ts` — change
  `sealBatch(...): Promise<SealResult<SealBatchStatus>>` →
  `Promise<SealResult<SealBatchResult>>`.
- `domain/use-cases/seal-academic-record.use-case.ts` — DELETE the
  `getSealStatus` pre-check block entirely; `execute()` becomes a thin
  pass-through: `return this.repo.sealBatch(key, actorId)`. Update the class
  doc-comment (currently claims it "enforces the two hard gates" — that's
  now false).

Test first (red before rewrite):
- `seal-academic-record.use-case.test.ts` — replace the 4 existing cases:
  - "seals without calling getSealStatus first" (spy/throw in
    `getSealStatus` mock to prove it's never invoked).
  - "does not block when batch is already sealed" (repo mock's `sealBatch`
    returns `{sealedCount, failedCount:0, errors:[]}` even if fed a
    pre-sealed key — use-case just forwards it).
  - "bubbles `unlocked-grades-exist` from the repo" (repo mock's `sealBatch`
    returns `{ok:false, error:{type:"unlocked-grades-exist"}}`).
  - "bubbles `too-many-reseals` from the repo".
  - Delete the `not-all-locked`/`already-sealed` cases (behavior no longer
    exists in the use-case).
- Fixed `makeRepo()` test helper: keep the full-interface fake shape (per
  new `sealBatch` return type), drop nothing else.

Done when: `bun vitest run seal-academic-record.use-case.test.ts` green,
`bunx tsc --noEmit` green (catches every call-site still expecting
`SealBatchStatus` from `sealBatch`).

### Phase 2 — Infrastructure (real sealBatch, hybrid DI, mock update)

Files:
- `bootstrap/endpoint/academic-records.endpoint.ts` (new — endpoint constants
  didn't exist for this feature yet; magic-string rule in CLAUDE.md) — add
  `sealBatch: (classId: string, termId: string) => \`/classes/${classId}/terms/${termId}/academic-records/seal\``.
  (Confirm no existing endpoint file for this feature via grep before adding —
  if `AcademicRecordsSealRepository` already inlines the path, replace the
  inline string with this constant.)
- `infrastructure/dtos/seal-response.dto.ts` — add
  `SealAcademicRecordResponseDto { sealedCount: number; failedCount: number; errors?: string[] }`.
- `infrastructure/mappers/seal-batch.mapper.ts` — add
  `sealBatchResultMapper(dto): SealBatchResult` (`errors: dto.errors ?? []`).
- `infrastructure/repositories/academic-records-seal.repository.ts` —
  implement `sealBatch` for real: `POST` to the new endpoint with
  `{ actorId }` body (confirm exact body shape against
  `seal_academic_record.go` — ADR 0055 doesn't specify a request body beyond
  path params + implicit actor-from-JWT; if the real endpoint takes NO body,
  drop `actorId` from the request, it's inferred server-side from the
  Bearer token same as every other US-E18.x real-mode POST). Catch/normalize
  errors via `errorCodeOf`/`statusOf` (`@/bootstrap/lib/api-envelope`) →
  `AcademicRecordsFailure`:
  - `ACADEMIC_RECORD_FORBIDDEN` / 403 → `forbidden`
  - `ACADEMIC_RECORD_NOT_FOUND` / 404 → `not-found`
  - `ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST` / 422 → `unlocked-grades-exist`
  - `ACADEMIC_RECORD_TOO_MANY_RESEALS` / 422 → `too-many-reseals`
  - `NETWORK_ERROR` / 5xx → `network-error`
  - else → `unknown`
  Keep every other method `notImplemented()` (dead — hybrid never calls
  them) but update the class doc-comment: no longer "scaffold only, BE
  hasn't shipped" — `sealBatch` IS real now, only the other 8 methods are
  permanently dormant.
- `infrastructure/repositories/academic-records-seal-hybrid.repository.ts`
  (new) — the facade from design-call #1.
- `infrastructure/repositories/mocks/academic-records-seal.mock.repository.ts`
  — rewrite `sealBatch` to model the corrected contract: no `not-all-locked`/
  `already-sealed` blocks; if `!match.allLocked` → reactive
  `unlocked-grades-exist`; track a `resealCount` field per batch (extend
  `SealBatchStatus` fixture data — check `seal-fixtures.ts` first, add
  `resealCount` there), increment on each successful reseal, return
  `too-many-reseals` at `resealCount >= 5`; success path returns
  `{sealedCount: match.totalStudents, failedCount: 0, errors: []}` and still
  updates `match.status`/`sealedAt`/`sealedBy`/audit trail (so the decorative
  `getSealStatus` hint stays coherent for the demo/mock experience).
  `getSealStatus` unchanged (still returns `SealBatchStatus`, still
  decorative — comment update only, noting it's approximate now for real
  mode too).
- `bootstrap/di/academic-records.di.ts` — replace `makeSealRepository()`'s
  single if/else with the hybrid composition:
  ```ts
  async function makeSealRepository(): Promise<IAcademicRecordsSealRepository> {
    const mock = new MockAcademicRecordsSealRepository();
    if (USE_MOCK) return mock;
    await ensureFreshSession(); // decision 0018, playbook step 6
    const real = new AcademicRecordsSealRepository(await createServerHttpClient());
    return new HybridAcademicRecordsSealRepository(real, mock);
  }
  ```
  Add a one-line comment on `makeRepository()` (the viewer factory)
  confirming it stays untouched/force-mock-eligible per ADR 0055 §viewer.

Test first (red before code):
- `academic-records-seal-hybrid.repository.ts` unit test (new) — construct
  with fake real/mock stubs, assert `sealBatch` calls only the real stub and
  every other method calls only the mock stub (spy counts).
- `academic-records-seal.repository.ts` — add a `sealBatch` integration test
  (envelope success → `sealBatchResultMapper` shape; each of the 4 error
  codes above → correct failure type; confirm `notImplemented()` still
  throws for one other method, e.g. `getSealAuditTrail`, proving the class
  hasn't accidentally gone fully real).
- `academic-records-seal.mock.repository.test.ts` — update/add cases: reseal
  succeeds (no `already-sealed`), `unlocked-grades-exist` on `!allLocked`,
  `too-many-reseals` after 5 successful seals on the same key.

Done when: new + updated unit/integration tests green; `bun vitest run` full
suite green; `bunx tsc --noEmit` green.

### Phase 3 — Presentation (reactive gate UI + decorative labeling + i18n)

Files:
- `presentation/academic-record-seal-screen/components/all-locked-gate.tsx`
  — NOT-OK branch: keep the warning banner, ADD the Seal button (same
  `onSeal` handler) instead of only the "go to approval" link; both branches
  now always render a Seal button. Reseal: OK branch's Seal button — remove
  `disabled={alreadySealed}` (idempotent reseal allowed); button label may
  switch to a "reseal" copy when `batch.status === "SEALED"` (nice-to-have,
  confirm with design-review).
- `presentation/academic-record-seal-screen/components/seal-confirm-dialog.tsx`
  — no structural change if toast is the agreed error surface (design call
  #4); if fe-lead prefers inline, add an `errorKey` prop rendered above the
  footer, mirroring how `unseal-same-admin-dialog.tsx` surfaces its gate
  (check that file's pattern before choosing).
- `presentation/academic-record-seal-screen/academic-record-seal-screen.i-vm.ts`
  — `SealActionResult<SealBatchStatus>` on the `seal` action signature →
  `SealActionResult<SealBatchResult>`; import `SealBatchResult`. Add a
  comment on `SealTabVM.batch` making the decorative/approximate nature of
  `getSealStatus` explicit (e.g. `/** Decorative "X/Y locked" hint only —
  NOT authoritative; the real seal action's reactive result is the source of
  truth. */`).
- `app/[locale]/t/[tenant]/(app)/admin/academic-records/actions.ts` —
  `sealAction`'s return type annotation → `SealActionResult<SealBatchResult>`
  (body unchanged, generic `result.ok ? {data: result.data} : {errorKey}`
  already forwards whatever shape the use-case returns).
- `presentation/academic-record-seal-screen/academic-record-seal-container.tsx`
  — no structural change (already generic `showError(errorKey)`); optionally
  enrich `sealSuccess.toast` copy with `sealedCount`/`failedCount` from
  `res.data` if design wants it (open question, not blocking).
- i18n (`src/bootstrap/i18n/messages/{vi,en}.json`, `academicRecordSeal`
  namespace): under `errors.*` — REMOVE `already-sealed`, `not-all-locked`
  keys (dead union members after Phase 1); ADD `unlocked-grades-exist`,
  `too-many-reseals` (Vietnamese source first, mirror English). Suggested vi
  copy: `unlocked-grades-exist`: "Còn điểm chưa được khoá — vui lòng khoá
  toàn bộ điểm trước khi ký học bạ." / `too-many-reseals`: "Đã đạt giới hạn
  số lần ký lại (tối đa 5 lần) cho học bạ này." Update
  `gate.notAllLocked.*` copy if the NOT-OK banner's wording needs to soften
  from "chưa thể ký" (blocking) to a warning-but-still-actionable tone, given
  the Seal button now also renders there.

Test first (red before code):
- `academic-record-seal-screen.stories.tsx` — add/update interaction stories:
  "seal succeeds when decoratively not-all-locked (reactive gate allows
  attempt, mock action returns error, toast shows unlocked-grades-exist)",
  "reseal on an already-SEALED batch succeeds", "too-many-reseals surfaces
  via toast". Existing "not-all-locked hides seal button" story (if any) —
  update to "not-all-locked still shows seal button + warning".
- i18n key check: `bunx tsc --noEmit` fails if a removed key is still
  referenced anywhere (typed messages) — run after removing
  `already-sealed`/`not-all-locked` from `vi.json` to confirm no dangling
  reference in code/tests.

Done when: Storybook interaction tests green; a11y unchanged (banner still
`role="alert"` where applicable, Seal button meets 44px touch target
already established); ready for design-review gate.

### Phase 4 — Review + gates

- `fe-tech-lead-reviewer` + `fe-accessibility-auditor` (parallel): verify
  hybrid DI facade doesn't leak `infrastructure/` into `presentation/`,
  verify no raw color introduced, verify `already-sealed`/`not-all-locked`
  fully purged (grep clean) vs. intentionally-kept `not-sealed` (unrelated
  surface) not accidentally touched.
- Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) — REQUIRED
  per EPIC-OVERVIEW.md's "Design Source" flag for US-E18.13 (seal-flow
  workflow-state change: NOT-OK banner now co-exists with an actionable Seal
  button — verify hierarchy/contrast reads as "warning, not blocked").
- `fe-qa-playwright` — Storybook interaction coverage for Phase 3 stories +
  Playwright E2E smoke on the seal flow if the existing E2E suite already
  covers this screen (check `e2e/` for an existing academic-record-seal
  spec before writing a new one).
- Harness proof: `docs/TEST_MATRIX.md` US-E18.13 row → `implemented` only
  after unit (Phase 1) + integration (Phase 2) + Storybook (Phase 3) proof
  all exist; `scripts/bin/harness-cli story update` per parallel-workflow.md
  step 4; merge `feat/us-e18.13-academic-records-wiring` → `main` per
  decision `0025`.

### Open questions — RESOLVED by fe-lead (2026-07-16)

- **Real `sealBatch` request body: NO body.** Re-ground-truthed directly:
  `openapi.yaml`'s `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/seal`
  operation declares only `parameters: [ClassId, TermId]` — no
  `requestBody` block at all. The Go handler
  (`academic_record_handler.go`'s `Seal()`) does not call
  `bindAndValidate`/read any body (unlike `RequestUnseal`, which does bind a
  body) — it builds `SealAcademicRecordInput` purely from path params +
  `actorFrom(c)` (JWT-derived). **Decision: bare POST, no request body.**
  `actorId` stays a parameter of the domain-level `sealBatch(key, actorId)`
  signature (still needed by the mock repo for its audit-actor-name
  lookup) but the REAL repository must NOT put it on the wire.
- **Error surface: toast, not an inline dialog slot.** Approved — zero
  structural change, consistent with the screen's existing generic
  `showError(errorKey)` → `toast.error` path for every other reactive
  failure. No new prop on `seal-confirm-dialog.tsx`.
- **Reseal button copy:** approved — switch label to "Ký lại học bạ" when
  `batch.status === "SEALED"`, "Ký học bạ" otherwise. Non-blocking UX
  nicety; keep if it fits cleanly, otherwise a single static label is
  acceptable — engineer's call, flag in Evidence either way.

Engineer: proceed with Phases 1–4 as written above, applying the three
resolutions in this section.

## Test Matrix

See `docs/TEST_MATRIX.md` US-E18.13 row (added `planned`, before any code,
per `.claude/rules/tdd.md`).

## Evidence

Implemented Phases 1–3 (Phase 4 = review/design-review/QA gates, owned by
fe-lead) strict-TDD (red → green → refactor) on
`feat/us-e18.13-academic-records-wiring`.

### Proof counts (zero regression)

- Baseline on `main` (re-confirmed this session): **301 files / 1852 tests**.
- After: **303 files / 1866 tests**, all passing (`bun vitest run`).
- Delta = +2 test files, +14 tests:
  - NEW `academic-records-seal.repository.test.ts` (10 — real `sealBatch`
    integration: bare-POST path + no body, result mapper, 6-case error matrix,
    bare-5xx, dormant-method guard).
  - NEW `academic-records-seal-hybrid.repository.test.ts` (2 — `sealBatch`→real
    only, all 8 other methods→mock only, via spy stubs).
  - UPDATED `seal-academic-record.use-case.test.ts` (4 → 5; getSealStatus spy
    throws to prove it's never called; bubbles both new reactive failures +
    forbidden; dropped the `not-all-locked`/`already-sealed` cases).
  - UPDATED `academic-records-seal.mock.repository.test.ts` (12 → 13; idempotent
    reseal, reactive `unlocked-grades-exist`, `too-many-reseals` after 5 seals).
- `bunx tsc --noEmit`: clean (caught every stale `SealBatchStatus`-from-`sealBatch`
  call-site + the missing i18n keys in BOTH dynamic-lookup namespaces).
- `bun lint`: clean for all touched files (the only remaining 1 warning + 1 info
  are pre-existing in `messaging/message-context-menu.tsx`, untouched here).
- `NEXT_PUBLIC_USE_MOCK= bun run build`: ✓ Compiled successfully (real-mode guard).
- Storybook interaction (`bun run vitest:storybook run` on the seal-screen
  stories): 16/16 pass, incl. the flipped `AllLockedGate_NotOK` (Seal button now
  present + clickable) and new `AllLockedGate_Reseal` (reseal label + enabled).

### Per-phase

- **Phase 1 (domain):** dropped `already-sealed`/`not-all-locked`, added
  `unlocked-grades-exist`/`too-many-reseals` (kept `not-sealed` untouched — it is
  the unrelated unseal-initiate surface). Added `SealBatchResult`
  (`{sealedCount, failedCount, errors}`) + optional decorative `resealCount?` on
  `SealBatchStatus`. `sealBatch` interface return → `SealResult<SealBatchResult>`.
  `SealAcademicRecordUseCase` is now a thin pass-through (pre-check block deleted,
  doc-comment corrected).
- **Phase 2 (infra):** real `sealBatch` = **bare POST, no body** to
  `/core/api/v1/classes/{classId}/terms/{termId}/academic-records/seal`
  (new `ACADEMIC_RECORDS_EP.sealBatch(classId, termId)`); result via new
  `sealBatchResultMapper` (`errors ?? []`); errors normalised via
  `errorCodeOf`/`statusOf` → the full ground-truthed matrix (FORBIDDEN/403,
  NOT_FOUND/404, UNLOCKED_GRADES_EXIST, TOO_MANY_RESEALS, NETWORK_ERROR/5xx,
  else unknown). New `HybridAcademicRecordsSealRepository` facade (real
  `sealBatch` + mock for the other 8). Mock `sealBatch` rewritten to model the
  idempotent/reactive contract (no block on reseal; `!allLocked` →
  `unlocked-grades-exist`; `resealCount` cap 5 → `too-many-reseals`; returns
  `SealBatchResult` while still updating status/audit for the decorative hint).
  `ensureFreshSession()` wired into the real branch of `makeSealRepository()`
  (playbook step 6, first time for this factory).
- **Phase 3 (presentation + i18n):** `AllLockedGate` NOT-OK branch now renders a
  Seal button alongside the warning + approval link (decorative-not-blocking);
  reseal never disabled; label switches `sealButton`↔`resealButton`. VM `seal`
  action signature → `SealActionResult<SealBatchResult>`; `sealAction` return
  annotation updated; decorative/non-authoritative comment added to
  `SealTabVM.batch`. Container/dialog unchanged (toast surface = the existing
  generic `showError`). i18n: removed dead `already-sealed`/`not-all-locked` keys
  and added `unlocked-grades-exist`/`too-many-reseals` + `resealButton` in BOTH
  namespaces that do a full-union dynamic `t()` lookup (`academicRecord.error`
  AND `academicRecordSeal.errors`), vi source + en mirror; softened the NOT-OK
  `warning` copy from blocking to advisory.
- **Phase 4 (review + gates):**
  - `fe-tech-lead-reviewer`: **APPROVED**, zero blocking findings. Independently
    re-ground-truthed the bare-POST-no-body contract + UPPER_SNAKE error codes
    against `edu-api`'s `openapi.yaml` + Go source. Two non-blocking follow-ups
    (resolved by fe-lead, see below): viewer `makeRepository()` force-mock
    question, and a `key.term` vs real `termId` code-comment note (added).
  - `fe-accessibility-auditor`: **PASS with 1 should-fix (A11Y-001)** — the
    NOT-OK banner's `role="alert"` wrapped both action buttons (ARIA APG
    discourages nesting focusable controls in an assertive live region,
    risk from `sealStatusQuery`'s `staleTime:0` refetch-on-focus). Fixed
    same-branch (commit `da40911`): `role="alert"` now scopes to the
    message-only content; both buttons moved to a sibling div. Re-verified
    PASS — contrast computed (11.6:1 title, 5.14:1 subtitle, 10.65:1 icon,
    all ≥ AA thresholds), keyboard/focus/touch-target/motion all held, no
    new regression.
  - Design-review gate (`docs/DESIGN_REVIEW.md`): **PASS** — scoped
    self-review (workflow-state change only, no new screen/tokens/layout
    to redesign, matching US-E18.12's precedent). Tokens-only confirmed by
    both reviewers (`bg-edu-warning/success`, `text-edu-*`, no raw color,
    no new token). Hierarchy reads as "warning, not blocked": both branches
    render an equally-styled primary Seal button; the NOT-OK branch adds a
    warning banner + secondary outline link alongside it, not instead of
    the action. States (OK/NOT-OK/reseal, loading/error via existing
    generic toast path) all covered.
  - `fe-qa-playwright`: **GO**. Independently re-verified every engineer
    claim (bare-POST-no-body, `getSealStatus` non-invocation, hybrid
    spy-count routing, i18n hygiene) rather than trusting the report — all
    held. Found and closed one genuine gap: the NOT-OK gate's new second
    button had no responsive-layout proof at 320–375px — added
    `AllLockedGate_NotOK_Mobile375` (real 375×812 viewport,
    `getBoundingClientRect` proof of vertical stacking + no horizontal
    overflow + touch-target floor), commit `959ac76`. Final counts:
    **303 files / 1866 tests** (unit/integration, zero regression vs
    301/1852 baseline); Storybook interaction full suite **109/126 files,
    668/739 tests** — same 17 pre-existing-failure files as before
    (unrelated router/env-context Storybook-harness gap, byte-identical to
    established E18.x baseline), `academic-record-seal-screen.stories.tsx`
    NOT among them (17/17 pass in that file after the addition). One
    non-blocking observation: reactive-error toast rendering has no
    container-level test harness anywhere in this repo (pre-existing,
    codebase-wide gap, not specific to this US) — the error-key routing
    itself is fully proven end-to-end.
  - **Non-blocking follow-ups resolved/logged by fe-lead:** amended ADR
    0055 (commit `285ae11`) — corrected a misstatement (the viewer DI
    factory was never force-mocked on `main`, so leaving it unchanged was
    correct, not a compliance gap) and logged two explicit internal
    follow-ups (force-mock the viewer factory to match staff-leave/
    teaching-plan precedent; the `key.term`-vs-real-`termId` gap once the
    class/term selector is wired to the real calendar feature).

### Final verdict

All gates green. Zero blocking findings anywhere in the pipeline. Merged to
`main` per decision `0025` (see commit `chore(academic-records): merge
feat/us-e18.13-academic-records-wiring (US-E18.13)`).

### 3 lead-resolved open questions — implemented exactly as specified

1. **Bare POST, no request body** — `AcademicRecordsSealRepository.sealBatch`
   calls `http.post(url)` with no body; `actorId` stays on the domain signature
   (mock audit-actor lookup) but is NOT on the wire. Integration test asserts
   `post` called with the path only.
2. **Toast, not an inline dialog slot** — no structural change to
   `seal-confirm-dialog.tsx`; both reactive failures surface through the
   existing generic `showError(errorKey)` → `toast.error` path (type-checked
   against the new union keys via `tsc`).
3. **Reseal button copy** — kept: label is `resealButton` ("Ký lại học bạ") when
   `batch.status === "SEALED"`, else `sealButton` ("Ký học bạ"). Fit cleanly;
   covered by the new `AllLockedGate_Reseal` story.

### Notes for reviewers

- **Plan-vs-ADR wording (viewer DI):** the lead scope reminder assumed
  `makeRepository()` (viewer) "already force-mocks correctly", but on `main` it
  was `USE_MOCK ? mock : real`. Plan Phase 2 says keep it "untouched + add a
  comment", so I left the `if/else` as-is and added the ADR-0055 §viewer comment
  (no behaviour change; the viewer stays mock in mock-mode as before). If the
  lead wants the viewer literally force-mocked (per ADR 0055's "FORCE-MOCKED"
  wording, matching US-E18.8/E18.9/E18.11 precedent), that's a one-line follow-up
  — flagged rather than silently changed since it's out of the stated scope.
- **term vs termId:** the real seal path takes `{termId}`; `SealBatchKey` only
  carries `term` ("HK1"/"HK2"), so the real repo passes `key.term` as the term
  dimension (per Plan design-call #2). The selector feeding these values is
  itself mock-sourced, so a real seal is only meaningfully reachable once the
  class/term selector is also wired — consistent with ADR 0055's framing.
