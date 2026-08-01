# US-E18.24 Unseal-workflow + seal-status wiring — closes ADR 0055's 4th blocked operation set

## Status

implemented

## Lane

high-risk — reactivates the two-ADMIN unseal compliance gate (Nghị định
13/2023 audit requirement), touches ADMIN/SUPER_ADMIN RBAC, tenant-isolated
class+term scoping, and student PII (names resolved via IAM batch lookup).
Same lane as US-E18.13 (the story this one un-blocks).

## Scope

`core` service shipped BE US-150 (ground-truthed
`../edu-api/services/core/docs/INTEGRATION.md` lines ~2050-2120 +
`openapi.yaml` `AcademicRecords` tag on `origin/main`, 2026-08-01), adding the
ONE thing ADR `0055` said was missing: a listing endpoint for pending unseal
requests. This closes the epic's 4th fully-blocked operation set
(`initiateUnseal`/`confirmUnseal`/`getPendingUnsealRequests`/
`listTenantAdmins`, after `staff-leave.di.ts`, `teaching-plan.di.ts`,
`discipline.di.ts`) — partially. Un-mock the reachable half; document why the
rest stays mock.

**New BE contracts (US-150), ground-truthed:**

1. `GET /core/api/v1/classes/{classId}/terms/{termId}/academic-records/unseal-requests?status=&cursor=&limit=`
   — ADMIN/SUPER_ADMIN. Cursor-paginated (`meta.pagination`), newest first.
   `status` one of `PENDING|APPROVED|REJECTED`, defaults `PENDING`,
   case-insensitive input. `UnsealRequestListItem`: `requestId`, `classId`,
   `termId`, `studentMemberId`, `requestedBy`, `reason`, `status`,
   `createdAt` — **no display names** (`studentMemberId`/`requestedBy` are
   raw UUIDs; core deliberately does not duplicate IAM names — resolve via
   the US-144/US-E18.23 batch lookup). New errors: `400
   UNSEAL_REQUEST_INVALID_STATUS`, `400 UNSEAL_REQUEST_INVALID_CURSOR`.
2. `GET /core/api/v1/classes/{classId}/terms/{termId}/academic-records/seal-status`
   — ADMIN/SUPER_ADMIN. `SealStatusResponse`: `totalStudents`,
   `sealedCount`, `unsealedCount`, `status` (rollup enum
   `PENDING|SEALED|PARTIAL` — **distinct from** the per-record
   `AcademicRecordResponse.status` enum `PENDING|SEALED|UNSEALED`, do not
   conflate), `lastSealedAt` (nullable, max `sealedAt` across ALL rows
   **including currently-UNSEALED ones** — an unseal does not clear
   history), `resealCount` (**max** per-record reseal count in the class
   term, not a sum — reflects proximity to the 5-reseal cap). Truth table
   (verbatim from INTEGRATION.md): `totalStudents=0` → `PENDING`;
   `sealedCount=0` (any `totalStudents`) → `PENDING` (covers "never sealed"
   AND "sealed then fully unsealed" — the latter has non-null
   `lastSealedAt` + `unsealedCount>0`, that's the only way to tell them
   apart, there is no 4th enum value); `0<sealedCount<totalStudents` →
   `PARTIAL`; `sealedCount==totalStudents` → `SEALED`. All counts scoped to
   **currently-enrolled students only** (roster ∩ record rows) —
   `sealedCount ≤ totalStudents` is a guarantee.
3. **Operational note (read before wiring):** the `GET .../unseal-requests`
   list is served from a clone table (`unseal_requests_by_class`) kept in
   sync by a reconciler worker — eventual consistency between a POST
   create/approve and its appearance/status-flip in this GET is possible.
   No documented SLA bound in INTEGRATION.md beyond "runs once after
   migrate + backfills". Treat as: **not always read-your-own-write
   instantly** — do not assume the list reflects a just-created/approved
   request synchronously. Surface this as a UX hint if it becomes an
   observed problem in QA, not as a hard error state (no error code exists
   for "not yet visible" — it just isn't in the page yet).
4. Already real/existing on the wire (unchanged by US-150):
   `POST .../unseal-requests` (initiate, `201 RequestUnsealResponse
   {requestId, status:"PENDING", createdAt}`), `POST
   /academic-records/unseal-requests/{requestId}/approve` (approve, `200
   ApproveUnsealResponse {classId, termId, studentMemberId,
   status:"UNSEALED", selfApproved, unsealedAt}`), batch-seal (already real,
   US-E18.13), `GET /members/{memberId}/academic-records` (viewer,
   permanently mock — US-E18.21, untouched, OUT of scope here).

**Full error taxonomy for this surface** (UPPER_SNAKE, `core`,
`pkg/kit/response/error.go` `codeFromKey`; ground-truthed
`ERROR_CODES.md:449-467`): `ACADEMIC_RECORD_FORBIDDEN` (403),
`ACADEMIC_RECORD_NOT_FOUND` (404), `ACADEMIC_RECORD_ALREADY_SEALED` (409,
request-unseal on a non-SEALED-flow mistake), `ACADEMIC_RECORD_NOT_SEALED`
(409, request-unseal against a PENDING/UNSEALED record),
`UNSEAL_REQUEST_NOT_FOUND` (404, approve target missing),
`UNSEAL_REQUEST_ALREADY_APPROVED` (409, approve on an already-approved
request), `UNSEAL_REASON_REQUIRED` (422, empty/missing `reason` on
initiate), `UNSEAL_REQUEST_INVALID_STATUS` (400, listing — new),
`UNSEAL_REQUEST_INVALID_CURSOR` (400, listing — new). These 9 codes were
already ground-truthed by ADR 0055 minus the 2 new `400`s from US-150 — kept
correct + unit-tested in the dormant real-mode branch since US-E18.13; this
US is where they finally get exercised for real.

### In scope — un-mock

- `getPendingUnsealRequests()` → wire REAL against the new listing GET,
  cursor-paginated (`{raw:true}` + `parseEnvelope()` for `meta.pagination`,
  per the epic playbook — same pattern as `iam-directory.repository.ts`).
  Compose `BatchResolveMembersUseCase` (`src/features/iam-directory/`,
  merged `main` 2026-08-01, commit `89bfcc4`) from
  `bootstrap/di/academic-records.di.ts` to resolve `studentMemberId` +
  `requestedBy` → display names (decision `0017` cross-feature composition,
  same precedent as `staffing.di.ts`'s assignment `memberName` resolution
  in US-E18.23). Unresolvable ids fall back to the raw id (existing
  fallback convention).
- `initiateUnseal(input)` → wire REAL against `POST .../unseal-requests`.
  Now reachable end-to-end (the request it creates can be discovered via
  the new listing).
- `confirmUnseal(requestId, coSignerId)` → wire REAL against `POST
  /academic-records/unseal-requests/{requestId}/approve`. `coSignerId` stays
  a domain-signature parameter (mock repo needs it for audit) but is NOT on
  the wire — server derives the approver from the Bearer token, same
  bare-POST-no-body precedent as `sealBatch` (ADR 0055).
- `getSealStatus(key)` → wire REAL against the new seal-status rollup GET.
  **Shape change**: the mock's `SealBatchStatus` (`allLocked`,
  `unlockedSubjectNames`, `subjectLabel`, `sealedBy`, decorative) has NO
  wire equivalent at this granularity — the real rollup only has
  aggregate counts + a 3-value class-term status enum, no per-subject
  detail. Compose per the "Key design calls" below (new
  `SealStatusRollup` entity, hybrid facade routes `getSealStatus` real
  too). The 422 reactive gate on `sealBatch` (`unlocked-grades-exist`/
  `too-many-reseals`, ADR 0055) **stays the source of truth** on submit —
  the rollup becomes a real (not decorative-mock) PROACTIVE hint with
  less granularity, not a replacement for the reactive gate.

### Stays mock (documented, not a re-litigation of ADR 0055)

- `listTenantAdmins()` — **investigated, does NOT fit.** Ground-truthed
  `../edu-api/services/iam/docs/openapi.yaml`: `MemberListItem.roles` enum
  is `[ADMIN, MANAGER, TEACHER, STAFF, STUDENT, PARENT]` — `SUPER_ADMIN` is
  **not a tenant-membership role at all** on the wire (it's a platform-level
  role scoped to tenant *provisioning*, per the `Tenants` tag's own
  description "SUPER_ADMIN only" — a SUPER_ADMIN may have no tenant
  membership row to appear in a directory listing in the first place). The
  `iam-directory` module (`SearchMembersUseCase` + `DirectoryRole`) can list
  `role=ADMIN` members accurately, but doing so for the two-admin
  self-approve-fallback gate (ADR `0037`'s "does this tenant have exactly
  one admin?" check) would silently under-count real approvers whenever a
  SUPER_ADMIN exists — turning a legal compliance gate (Nghị định 13/2023)
  into a wrong answer, which is strictly worse than an honest mock. Per ADR
  0055 §Context point 5 (already established): this gate is deliberate
  web-side hardening independent of what BE enforces server-side — leave
  it force-mocked. No new cross-repo ask (not a missing-endpoint gap — the
  tenant role model genuinely excludes SUPER_ADMIN from membership rows).
- `listAvailableClasses`, `getSealAuditTrail`, `listSealedStudents` — no BE
  equivalent, unchanged from ADR 0055 (still no exposed endpoint anywhere
  in `core`'s `AcademicRecords` tag for these three).
- `IAcademicRecordsRepository` (viewer `getRecord`/`listYears`) — unchanged,
  out of scope (US-E18.21 already force-mocked it; the model mismatch ADR
  0055 §Context point 6 documented is untouched by US-150).

### UI impact (design-review gate required — do not skip)

- **Unseal tab (`unseal-tab.tsx` + `unseal-request-card.tsx`):** currently
  renders from the mock's synchronous full-list `UnsealRequest[]`. Must
  move to a paginated query (TanStack Query, `fetchNextPage`/cursor,
  mirrors how any other cursor-paginated list in this repo is wired — check
  `iam-directory` consumers and any existing infinite-list pattern before
  inventing one). Add the studentName/requestedByName resolution (was
  already faked in the mock entity — now a real batch-resolve round trip,
  loading/error state for the resolve call needs a graceful fallback to
  raw id, NOT a hard error blocking the whole list).
- **Seal status display (`seal-tab.tsx` consumers, likely
  `all-locked-gate.tsx` / a status summary component):** the OLD decorative
  hint (`allLocked` + `unlockedSubjectNames` list) has no real replacement
  at that granularity. Must redesign the proactive display around the real
  rollup shape (`status: PENDING|SEALED|PARTIAL`, `sealedCount/totalStudents`,
  `lastSealedAt`, `resealCount`) — this is a genuine UI/copy change, not a
  silent internal remap. It must NOT claim per-subject "which subjects are
  unlocked" any more (that data doesn't exist for real) — reword to a
  class-term-level rollup message. The 422 reactive gate remains the actual
  submit-time authority; frame the rollup as "current status" not "you may
  seal" permission.
- **Eventual-consistency hint:** if `fe-planner`/`fe-nextjs-engineer` judge
  it's needed given point 3 above (worker-backfill lag), add a light,
  non-blocking note near the unseal list (e.g. "danh sách có thể cập nhật
  trễ vài giây sau khi gửi yêu cầu") — new i18n key, no new component
  needed if an existing hint/caption pattern already exists on this screen.
- Run design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) +
  `fe-accessibility-auditor` — this is a genuine state/copy change on an
  existing screen, not a "zero UI touch" wiring US like US-E18.21/E18.22/23.
  If `fe-nextjs-engineer` determines a sub-surface is truly byte-identical
  (unlikely given the shape change above), state N/A for that sub-surface
  explicitly with diff-based proof, per US-E18.22/23 precedent — do not
  blanket-skip the whole gate.

### Key design calls (fe-lead — flag disagreement to fe-lead before Phase 1)

1. **Hybrid facade expands, not replaces.** `HybridAcademicRecordsSealRepository`
   (existing, US-E18.13) currently routes `sealBatch` → real, everything
   else → mock. This US moves 4 more methods (`getSealStatus`,
   `getPendingUnsealRequests`, `initiateUnseal`, `confirmUnseal`) to real,
   leaving only `listAvailableClasses`, `getSealAuditTrail`,
   `listSealedStudents`, `listTenantAdmins` on the mock delegate. Keep the
   same facade class (add real branches), do not introduce a second
   wrapper.
2. **`getSealStatus`'s return type must change** from `SealBatchStatus`
   (mock-only shape) to a new entity — name it `SealStatusRollup` (or
   extend `SealBatchStatus` with the real fields and mark the
   per-subject/decorative fields `@deprecated`/mock-only if reuse is
   cleaner; fe-planner's call, but do NOT silently keep serving the OLD
   mock shape from the real branch — that would be fabricating data the
   real BE never sends). Mapper: DTO → entity 1:1 with the truth table
   above.
3. **`getPendingUnsealRequests()`'s signature likely needs `(classId,
   termId)` scoping params** — the real endpoint is class-term-scoped, not
   tenant-wide (unlike the OLD mock signature which took no args and
   returned everything). Check every call site
   (`academic-record-seal-container.tsx`/`unseal-tab.tsx`) and thread the
   currently-selected `classId`/`termId` through — same shape the
   `class-term-year-selector.tsx` already provides to `sealBatch`.
4. **Name resolution composition point:** `bootstrap/di/academic-records.di.ts`
   composes `makeBatchResolveMembersUseCase()` from
   `bootstrap/di/iam-directory.di.ts` (decision 0017) — do NOT reach into
   `iam-directory`'s domain/infrastructure directly from
   `academic-records`'s own layers. Resolve `studentMemberId` +
   `requestedBy` in ONE combined batch call per listing page (dedupe ids
   across both fields first), mirroring `staffing.di.ts`'s
   one-batch-call-per-page precedent (US-E18.23).
5. **`initiateUnseal`/`confirmUnseal` request/response shape:** `initiate`
   takes a body (`studentMemberId`, `reason`) — unlike `sealBatch`'s bare
   POST. `confirmUnseal`/approve is a bare POST (`{requestId}` is a path
   param only, no body — mirrors `sealBatch`'s server-derives-actor
   pattern). Confirm exact field names against
   `RequestUnsealRequest`/`ApproveUnsealResponse` schemas in `openapi.yaml`
   (lines ~10499-10535) before implementing the DTO.

## Dependencies

- Depends on US-E18.13 (`ADR 0055`, hybrid facade + `sealBatch` real) and
  US-E18.21 (viewer force-mock, unrelated but same DI file) — both merged
  to `main`, no conflict.
- Depends on US-E18.23 (`src/features/iam-directory/`,
  `BatchResolveMembersUseCase`, `bootstrap/di/iam-directory.di.ts`) — merged
  to `main` 2026-08-01, commit `89bfcc4`.
- No dependency on any in-flight US at claim time (`git fetch --prune`
  showed no `feat/`/`fix/` remote branches — solo, main checkout).

## Plan

Grounded in the contract + design calls above and current code
(`src/features/academic-records/**`, `src/bootstrap/di/academic-records.di.ts`,
`src/bootstrap/di/iam-directory.di.ts`,
`src/bootstrap/endpoint/academic-records.endpoint.ts`,
`src/features/admin/staffing/infrastructure/repositories/staffing.repository.ts`
name-resolver-fallback precedent, `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx`
`useInfiniteQuery` precedent).

### Key design calls (fe-planner — flag disagreement before Phase 1)

1. **`getSealStatus` reshape (per story design-call #2).** New
   `SealStatusRollup extends SealBatchKey` (`totalStudents`, `sealedCount`,
   `unsealedCount`, `status: SealRollupStatus` (`"PENDING"|"SEALED"|"PARTIAL"`,
   a NEW union — distinct from `TermStatus`), `lastSealedAt`, `resealCount`).
   `SealBatchStatus` (old decorative shape) is DEMOTED to mock-internal
   bookkeeping only (the mock's `sealBatch` reactive check still needs
   `allLocked`/`unlockedSubjectNames` internally) — `getSealStatus` on BOTH
   mock and real branches now returns `SealStatusRollup`; the mock maps its
   internal `SealBatchStatus` → `SealStatusRollup` at the boundary via the
   truth table in Scope point 2. `SealConfirmDialog` needs ZERO change (only
   reads `batch.classId/term/year`, still present via `extends SealBatchKey`).
2. **Unseal-surface reshape extends the SAME principle to 3 more methods**
   (bigger than the story's design-call #2, which only named `getSealStatus`
   explicitly — flagged as an open question below, not silently assumed).
   `UnsealRequest` (old mock-rich shape: `studentName`, `coSignerId`,
   `confirmedAt`, `selfApproved`, …) has no 1:1 wire equivalent for any of the
   3 real responses. New entities, 1:1 with the wire:
   - `UnsealRequestSummary` (`requestId`, `classId`, `termId`,
     `studentMemberId`, `studentName` (resolved, fallback = id),
     `requestedBy`, `requestedByName` (resolved, fallback = id), `reason`,
     `status: UnsealRequestStatus` (`"PENDING"|"APPROVED"|"REJECTED"` — widen
     for the listing's `status` query values even though no REJECT UI action
     exists yet), `createdAt`) — `getPendingUnsealRequests` return.
   - `UnsealInitiateResult` (`requestId`, `status:"PENDING"`, `createdAt`) —
     `initiateUnseal` return. Confirmed zero UI impact: `initiateMutation`'s
     `onSuccess` (container) only reads `res.ok`/`res.errorKey`, never
     `res.data`.
   - `UnsealApproveResult` (`classId`, `termId`, `studentMemberId`,
     `status:"UNSEALED"`, `selfApproved`, `unsealedAt`) — `confirmUnseal`
     return, replaces `{request: UnsealRequest; fallback: boolean}`. Confirmed
     zero UI impact: `confirmMutation`'s `onSuccess` branches on the mutation
     *variables* (`coSignerId`), never `res.data`.
   Mock repo keeps its richer internal `UnsealRequest[]` state (co-signer
   tracking, self-approve flag) and MAPS to these 3 entities at each method's
   boundary — same "internal-rich, boundary-narrow" pattern as design-call #1.
3. **`getPendingUnsealRequests` is now `(classId, termId, {status?, cursor?,
   limit?})`-scoped** (was zero-arg/tenant-wide on the mock-first interface) —
   real endpoint is class-term-scoped, no tenant-wide alternative exists.
   Cascades into presentation (design call #6).
4. **`confirmUnseal` gains `(classId, termId)` params** — its two-admin-gate
   pre-check (`ConfirmUnsealUseCase`) calls `getPendingUnsealRequests` to find
   the target by id and compare `requestedBy`; now that call is scoped, the
   use-case needs the same two ids the container already threads to the
   listing query. Pre-check calls the listing with a single bounded page
   (`status:"PENDING", limit:100`, no cursor-follow) — accepted trade-off,
   flagged as an open question (approve itself is server-authoritative/
   idempotent-safe either way; this is only a client pre-check UX nicety).
5. **Name resolution**: `bootstrap/di/academic-records.di.ts`'s
   `makeSealRepository()` composes `makeBatchResolveMembersUseCase()`
   (`bootstrap/di/iam-directory.di.ts`, decision 0017) ONLY inside the
   `!USE_MOCK` branch (mirrors `staffing.di.ts` — mock never reaches it,
   its fixtures already carry names inline) and injects a
   `resolveNames: (ids: string[]) => Promise<Result<MemberSummary[], IamDirectoryFailure>>`
   callback into `AcademicRecordsSealRepository`'s constructor (mirrors
   `StaffingRepository`'s injected resolver + `memberNameMap` fallback
   pattern: dedupe `studentMemberId` + `requestedBy` into ONE batch call per
   listing page, unresolved ids fall back to the raw id).
6. **Pagination + selector hoist.** `ClassTermYearSelector` moves from
   `SealTab`-only to screen-level (`academic-record-seal-screen.tsx`, above
   the `Tabs`) — both tabs now share ONE class/term/year selection (the
   container already computes a single `classId`/`term`/`year` regardless of
   active tab; zero new state, just a render-location move). `UnsealTab`
   shows a "select a class" prompt when `classId === null`, otherwise a
   paginated list via `useInfiniteQuery` (mirrors
   `audit-log-screen.tsx`'s `fetchNextPage`/`getNextPageParam` pattern) over
   `useState`/cursor-follow — chosen over a simpler "load more replaces list"
   because the pending list can legitimately span >1 page. Tab badge
   (`pendingUnsealCount`) becomes class/term-scoped as a consequence
   (flagged as an accepted behavior change below — no tenant-wide BE
   alternative exists).
7. **Eventual-consistency hint** (Scope point 3): add a light, non-blocking
   caption near the unseal pending section — new i18n key, no new component
   (existing hint/caption text pattern already used in `unseal-initiate-form.tsx`'s
   `noteLabel`/`note` block).
8. **`UNSEAL_REASON_REQUIRED` (422) reuses the existing `reason-too-short`
   failure type** (same UX meaning: reason invalid on the server) rather than
   minting a 4th failure variant — flagged as an open question if fe-lead
   wants copy precision to differ. **`UNSEAL_REQUEST_NOT_FOUND` (404) reuses
   the existing `no-pending-request` type** (approve target missing — same
   meaning as the old mock-first check). New failure types actually needed:
   `unseal-request-already-approved` (409, no existing analog),
   `unseal-request-invalid-status` (400, listing), `unseal-request-invalid-cursor`
   (400, listing).
9. **`term`-vs-real-`termId` caveat carries forward** from US-E18.13 Phase 2:
   `SealBatchKey.term` is `"HK1"|"HK2"` (a label), not a real termId (UUID).
   The real repo passes `key.term` as the term-path-segment for all 4 newly-
   real methods, same documented limitation (selector is itself mock-sourced)
   — not solvable in this US.

### Phase 1 — Domain (entities + failures + repo interface + use-cases)

Files:
- `domain/entities/seal-batch.entity.ts` — add `SealRollupStatus`,
  `SealStatusRollup extends SealBatchKey`; add `UnsealRequestStatus`,
  `UnsealRequestSummary`, `UnsealInitiateResult`, `UnsealApproveResult`. Add a
  doc-comment on `SealBatchStatus`/`UnsealRequest` marking them
  MOCK-INTERNAL-ONLY bookkeeping post-this-US (no longer returned by any
  method on the real branch).
- `domain/failures/academic-records.failure.ts` — add
  `unseal-request-already-approved`, `unseal-request-invalid-status`,
  `unseal-request-invalid-cursor`. Keep all 9 existing types (2 of the 9 —
  `UNSEAL_REQUEST_NOT_FOUND`/`UNSEAL_REASON_REQUIRED` — map onto the existing
  `no-pending-request`/`reason-too-short`, per design-call #8, no new type
  needed for those two).
- `domain/repositories/i-academic-records-seal.repository.ts` — signature
  changes: `getSealStatus(key): Promise<SealResult<SealStatusRollup>>`;
  `getPendingUnsealRequests(classId: string, termId: string, opts?: {status?: UnsealRequestStatus; cursor?: string | null; limit?: number}): Promise<SealResult<{items: UnsealRequestSummary[]; nextCursor: string | null; hasMore: boolean}>>`;
  `initiateUnseal(input): Promise<SealResult<UnsealInitiateResult>>`;
  `confirmUnseal(requestId: string, coSignerId: string | null, classId: string, termId: string): Promise<SealResult<UnsealApproveResult>>`.
- `domain/use-cases/get-seal-status.use-case.ts` — return-type-only update
  (pure passthrough, no logic change).
- `domain/use-cases/list-pending-unseal-requests.use-case.ts` — thread
  `(classId, termId, opts)` through to the repo call.
- `domain/use-cases/initiate-unseal.use-case.ts` — return-type-only update
  (reason-length pre-check untouched, `MIN_UNSEAL_REASON_LENGTH` unchanged).
- `domain/use-cases/confirm-unseal.use-case.ts` — add `classId`/`termId`
  params; two-admin-gate lookup updates field refs (`r.id`→`r.requestId`,
  `target.requestedById`→`target.requestedBy`); calls
  `getPendingUnsealRequests(classId, termId, {status:"PENDING", limit:100})`
  (design-call #4's bounded pre-check).

Test first (red before code):
- `get-seal-status.use-case.test.ts` — update fixture/assertions for
  `SealStatusRollup` return shape (passthrough behavior unchanged).
- `list-pending-unseal-requests.use-case.test.ts` — update to pass
  `(classId, termId, opts)`, assert forwarded verbatim to the repo mock.
- `initiate-unseal.use-case.test.ts` — update fixture to `UnsealInitiateResult`;
  keep the existing `reason-too-short` case (pre-check unchanged).
- `confirm-unseal.use-case.test.ts` — update all cases for the new
  `(requestId, coSignerId, classId, termId)` signature + renamed fields
  (`requestId`/`requestedBy`); keep `same-admin-as-initiator`,
  `no-pending-request`, `self-approve-not-allowed` cases; add a case
  asserting the bounded `{status:"PENDING", limit:100}` call shape.
- Fixed `makeRepo()` test helpers across all 4 use-case test files: update
  the fake's method signatures to match the new interface.

Done when: all 4 use-case test files green; `bunx tsc --noEmit` green
(catches every stale call site expecting the old `UnsealRequest`/
`SealBatchStatus` shapes from the 4 changed methods).

### Phase 2 — Infrastructure (DTOs, mappers, real repo, hybrid facade, mock, DI)

Files:
- `bootstrap/endpoint/academic-records.endpoint.ts` — replace the 4 dead
  unseal/seal-status constants with REAL, class-term-scoped ones:
  `sealStatus: (classId, termId) => \`/core/api/v1/classes/${classId}/terms/${termId}/academic-records/seal-status\`` (GET);
  `unsealRequests: (classId, termId) => \`/core/api/v1/classes/${classId}/terms/${termId}/academic-records/unseal-requests\`` (POST create / GET list, same path per Scope point 1+4);
  `unsealApprove: (requestId) => \`/core/api/v1/academic-records/unseal-requests/${requestId}/approve\`` (POST). Keep
  `availableClasses`/`sealAuditTrail`/`sealedStudents` dead (still no BE
  endpoint, unchanged doc-comment scope).
- `infrastructure/dtos/seal-response.dto.ts` (or new
  `unseal-response.dto.ts` — engineer's call on file split) — add
  `SealStatusResponseDto`, `UnsealRequestListItemDto`,
  `RequestUnsealResponseDto`, `ApproveUnsealResponseDto`. **Ground-truth
  exact field casing against `openapi.yaml` (~lines 3780-3970 story pointer,
  ~10499-10535 request/approve schemas) before coding — do not assume names
  from this plan verbatim.**
- `infrastructure/mappers/seal-batch.mapper.ts` (or new `unseal.mapper.ts`)
  — add `sealStatusRollupMapper(dto): SealStatusRollup` (1:1 truth table);
  `unsealRequestSummaryMapper(dto, nameMap: Map<string,string>): UnsealRequestSummary`
  (attach resolved names, fallback = raw id when absent from `nameMap`);
  `unsealInitiateResultMapper(dto)`; `unsealApproveResultMapper(dto)`.
- `infrastructure/repositories/academic-records-seal.repository.ts` —
  implement for real: `getSealStatus` (GET, map via truth table);
  `getPendingUnsealRequests` (GET with `{raw:true}` + `parseEnvelope()` for
  `meta.pagination`, `status`/`cursor`/`limit` query params, status
  case-insensitive per contract — default `"PENDING"`; batch-resolve
  `studentMemberId`+`requestedBy` deduped via the injected `resolveNames`
  callback (design-call #5) BEFORE mapping); `initiateUnseal` (POST body
  `{studentMemberId, reason}` — confirm exact field names against
  `RequestUnsealRequest` schema); `confirmUnseal` (bare POST, `requestId`
  path-param only, no body — same server-derives-actor precedent as
  `sealBatch`). `toSealFailure` gains: `UNSEAL_REQUEST_ALREADY_APPROVED`/409
  → `unseal-request-already-approved`; `UNSEAL_REQUEST_INVALID_STATUS`/400 →
  `unseal-request-invalid-status`; `UNSEAL_REQUEST_INVALID_CURSOR`/400 →
  `unseal-request-invalid-cursor`; reuse existing branches for
  `UNSEAL_REQUEST_NOT_FOUND`→`no-pending-request`,
  `UNSEAL_REASON_REQUIRED`→`reason-too-short`. Update class doc-comment: 5
  methods real now (`sealBatch` + these 4), only `listAvailableClasses`/
  `getSealAuditTrail`/`listSealedStudents`/`listTenantAdmins` permanently
  dormant.
- `infrastructure/repositories/academic-records-seal-hybrid.repository.ts` —
  move `getSealStatus`/`getPendingUnsealRequests`/`initiateUnseal`/
  `confirmUnseal` to `this.real.*`; the remaining 4 methods stay
  `this.mock.*`.
- `infrastructure/repositories/mocks/academic-records-seal.mock.repository.ts`
  — `getSealStatus`: map internal `SealBatchStatus` → `SealStatusRollup` per
  the truth table (`sealedCount = status==="SEALED" ? totalStudents : 0`;
  `unsealedCount = totalStudents - sealedCount`; rollup `status` derived —
  NOT copied from `TermStatus` — via
  `totalStudents===0 ? "PENDING" : sealedCount===0 ? "PENDING" : sealedCount===totalStudents ? "SEALED" : "PARTIAL"`;
  `lastSealedAt = match.sealedAt` (mock only tracks one timestamp — documented
  simplification); `resealCount = match.resealCount ?? 0`).
  `getPendingUnsealRequests(classId, termId, opts)`: filter `this.requests` by
  `classId`+`term` (as the termId placeholder, design-call #9) + `status`
  (default `"PENDING"`), fake-paginate (encode cursor as array index, default
  `limit` e.g. 20), map each to `UnsealRequestSummary` using the mock's own
  inline names (no resolver needed in mock mode — `studentName`/
  `requestedByName` already on the internal fixture). `initiateUnseal`:
  unchanged internal logic/state, return narrower `UnsealInitiateResult`.
  `confirmUnseal(requestId, coSignerId, classId, termId)`: unchanged internal
  logic (classId/termId args accepted but not needed for mock's own lookup —
  it already scans `this.requests` by id), return `UnsealApproveResult`.
- `bootstrap/di/academic-records.di.ts` — `makeSealRepository()`: in the
  `!USE_MOCK` branch, `const resolveMembers = await makeBatchResolveMembersUseCase();`
  then construct
  `new AcademicRecordsSealRepository(await createServerHttpClient(), (ids) => resolveMembers.execute(ids))`.

Test first (red before code):
- `academic-records-seal-hybrid.repository.test.ts` — update spy-count
  assertions: 5 methods → real stub, 4 → mock stub.
- `academic-records-seal.repository.test.ts` — add: `getSealStatus` truth-
  table matrix (5 cases: `totalStudents=0`; `sealedCount=0` two sub-cases via
  `lastSealedAt` null/non-null; `0<sealedCount<total`; `sealedCount===total`);
  `getPendingUnsealRequests` — cursor/`hasMore` via `{raw:true}`+
  `parseEnvelope`, status query param default+override, name-resolution
  applied + raw-id fallback when `resolveNames` returns a partial/empty map,
  the 2 new 400 error codes; `initiateUnseal` — body shape assertion
  (`{studentMemberId, reason}`, no other fields), reused `reason-too-short`
  code; `confirmUnseal` — bare-POST-path-only assertion, `selfApproved`
  passthrough, `unseal-request-already-approved` + reused
  `no-pending-request` codes.
- `academic-records-seal.mock.repository.test.ts` — update/add: rollup truth
  table (5 cases, mirrors the real-repo matrix above for parity); pagination
  (cursor advances, `hasMore` flips false on last page); status filter.

Done when: full `bun vitest run` suite green (zero regression on the
existing 303 files / 1866 tests baseline + new cases); `bunx tsc --noEmit`
green.

### Phase 3 — Presentation (selector hoist + rollup redisplay + pagination + i18n)

Files:
- `academic-record-seal-screen.tsx` — hoist `<ClassTermYearSelector>` above
  the `Tabs`, reading `vm.seal.year/term/classId/classOptions/isClassOptionsLoading/onYearChange/onTermChange/onClassChange`
  (zero new VM shape — same sub-VM fields, just rendered once at screen level
  instead of inside `SealTab`).
- `components/seal-tab.tsx` — remove its own `<ClassTermYearSelector>` render
  (now hoisted); `batch` prop type → `SealStatusRollup`; drop the `sealedBy`
  chip block (no wire field — audit trail, still mock, is the only
  actor-name source); replace with a `status`/`sealedCount`/`totalStudents`/
  `lastSealedAt` summary honest about the truth-table ambiguity (non-null
  `lastSealedAt` with `status !== "SEALED"` → "đã từng ký, hiện đã mở khoá
  toàn bộ" copy, vs `null` → "chưa từng ký").
- `components/all-locked-gate.tsx` — `batch: SealStatusRollup`; branch on
  `status` (`"SEALED"` → OK/green, `"PARTIAL"`/`"PENDING"` → warning) instead
  of `allLocked`; DROP `unlockedSubjectNames` rendering entirely (no wire
  equivalent); copy uses `sealedCount`/`totalStudents` instead of
  `unlockedStudents`; reseal label unchanged (`status==="SEALED"`); optional
  near-cap caption when `resealCount >= 4` (nice-to-have, confirm with
  design-review).
- `components/seal-confirm-dialog.tsx` — NO change (only reads
  `batch.classId/term/year`, unaffected by the rollup reshape).
- `components/unseal-tab.tsx` — remove tenant-wide assumption; render a
  "select a class" prompt when `vm.classId === null`; otherwise render the
  pending list via the VM's flattened `pendingRequests` + new
  `hasNextPage`/`isFetchingNextPage`/`onLoadMore` fields (load-more button,
  mirrors `audit-log-screen.tsx`); add the eventual-consistency caption
  (design-call #7) near the pending section header.
- `components/unseal-request-card.tsx` — prop type → `UnsealRequestSummary`;
  `request.requestedById` → `request.requestedBy`, `request.id` →
  `request.requestId`; display fields otherwise unchanged (names now
  DI-resolved server-side, degrade to raw id transparently — no separate
  client loading state needed, per `memberNameMap` fallback precedent).
- `components/unseal-same-admin-dialog.tsx` /
  `components/unseal-self-approve-dialog.tsx` — grep for any `UnsealRequest`
  field reference after Phase 1 lands; update renamed fields if present
  (expected minimal/no change — these dialogs mostly take
  `request`/`currentAdminId`/`currentAdminName`, not the renamed fields).
- `components/unseal-initiate-form.tsx` — NO change (its `onSubmit` input is
  the i-vm's own `InitiateUnsealInput`, decoupled from the domain entity
  rename; `MIN_UNSEAL_REASON_LENGTH` import path unchanged).
- `academic-record-seal-screen.i-vm.ts` — `getSealStatus` return →
  `SealActionResult<SealStatusRollup>`; `getPendingUnsealRequests` signature →
  `(classId: string, termId: string, params: {cursor?: string | null; limit?: number}) => Promise<SealActionResult<{items: UnsealRequestSummary[]; nextCursor: string | null; hasMore: boolean}>>`;
  `initiateUnseal` return → `SealActionResult<UnsealInitiateResult>`;
  `confirmUnseal(requestId, coSignerId, classId, termId)` return →
  `SealActionResult<UnsealApproveResult>`; `SealTabVM.batch: SealStatusRollup | null`
  (update the decorative-comment — it's now REAL, not decorative, but still
  a proactive hint, not the submit-time authority, per Scope point 4);
  `UnsealTabVM` gains `classId: string | null`, `hasNextPage: boolean`,
  `isFetchingNextPage: boolean`, `onLoadMore: () => void`; `pendingRequests: UnsealRequestSummary[]`
  (renamed element type, same field name — minimal diff).
- `academic-record-seal-container.tsx` — `pendingQuery` → `useInfiniteQuery`
  keyed `academicRecordSealKeys.pendingUnsealRequests(classId, term)`,
  `enabled: classId !== null`, `getNextPageParam` reads `nextCursor`/
  `hasMore` (mirrors `audit-log-screen.tsx`); flatten `query.data?.pages`
  for `pendingRequests`; `confirmMutation.mutationFn` threads
  `classId`/`term` through; `pendingUnsealCount` (tab badge) now reflects
  only the selected class/term's PENDING count (design-call #6 consequence
  — flagged as an accepted behavior change, no tenant-wide BE alternative).
- `academic-record-seal-keys.ts` — `pendingUnsealRequests(classId: string, termId: string)`
  (was zero-arg) — same root/prefix, add the two scoping segments so
  `queryClient.invalidateQueries({queryKey: academicRecordSealKeys.all})`
  (used by `confirmMutation`) still broadly invalidates.
- `app/[locale]/t/[tenant]/(app)/admin/academic-records/actions.ts` — update
  each affected Server Action's param/return annotations to match the new
  use-case signatures (thin passthrough, no new logic).
- i18n (`academicRecordSeal` namespace, vi source + en mirror): REMOVE
  `gate.notAllLocked.subjectsLabel` (per-subject list, dead after the rollup
  reshape); ADD count-based gate copy (`gate.partial.title`/`subtitle` or
  reuse/rename `notAllLocked.*` — engineer's call); ADD
  `unseal.emptyClassPrompt` ("Chọn lớp và học kỳ để xem danh sách yêu cầu mở
  khoá"), `unseal.eventualConsistencyHint` ("Danh sách có thể cập nhật trễ
  vài giây sau khi gửi yêu cầu."), `unseal.loadMore`; ADD
  `errors.unseal-request-already-approved`, `errors.unseal-request-invalid-status`,
  `errors.unseal-request-invalid-cursor`.

Test first (red before code):
- `academic-record-seal-screen.stories.tsx` — add/update interaction
  stories: `AllLockedGate` 4-state rollup matrix (SEALED / PARTIAL /
  PENDING-never-sealed / PENDING-was-sealed-then-unsealed, per the truth
  table); `SealTab` summary-line honesty (non-null `lastSealedAt` +
  non-SEALED status renders the "đã từng ký" copy, not "đang được ký");
  `UnsealTab` "select a class" prompt when `classId===null`; `UnsealTab`
  pagination (load-more button reveals next page, mirrors the audit-log
  Storybook pattern); name-resolution fallback (raw id rendered when a name
  is unresolved); eventual-consistency hint renders near the pending list.
- i18n key check: `bunx tsc --noEmit` fails on any dangling reference to a
  removed key (`gate.notAllLocked.subjectsLabel`) — run after the i18n edit
  to confirm no stale reference remains.

Done when: Storybook interaction suite green; a11y unchanged/re-verified
(load-more button keyboard/focus, "select a class" prompt has appropriate
role, `role="alert"` scoping from US-E18.13's A11Y-001 fix untouched); ready
for design-review gate.

### Phase 4 — Review + gates

- `fe-tech-lead-reviewer` + `fe-accessibility-auditor` (parallel): verify the
  hybrid facade's 5-real/4-mock split is correct (spy-count proof), no raw
  color introduced in the rollup/pagination UI, `SealBatchStatus`/
  `UnsealRequest` are genuinely mock-internal-only post-this-US (grep for any
  stray real-branch usage), the term/termId caveat comment is present on all
  4 newly-real methods (not just `sealBatch`).
- Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) — REQUIRED
  (Scope §UI impact): selector hoist (layout change), rollup-based gate
  redesign (loses per-subject detail), pagination UI (load-more), eventual-
  consistency hint copy. Not a "zero UI touch" wiring US.
- `fe-qa-playwright` — Storybook interaction coverage for Phase 3 stories +
  Playwright E2E smoke if an existing suite already covers this screen
  (check `e2e/` before writing new).
- Harness proof: `docs/TEST_MATRIX.md` US-E18.24 row → `implemented` only
  after unit (Phase 1) + integration (Phase 2) + Storybook (Phase 3) proof
  all exist; `scripts/bin/harness-cli story update` per
  `parallel-workflow.md` step 4; merge
  `feat/us-e18.24-unseal-workflow-wiring` → `main` per decision `0025`.

### Open questions (flag to fe-lead — do not block Phase 1 start)

1. **Two-admin-gate bounded pre-check** (design-call #4): `ConfirmUnsealUseCase`
   fetches a single `limit:100` page rather than following all cursors —
   could theoretically miss a backlog >100 pending requests in one
   class/term. Accept the bound (approve is server-authoritative/idempotent-
   safe regardless), or require exhaustive cursor-follow?
2. **Tab-badge scoping** (design-call #6): `pendingUnsealCount` moves from
   tenant-wide to class/term-scoped — a real behavior change with no BE
   alternative (no tenant-wide unseal listing endpoint exists). Accept, or
   hide the badge entirely until a class is selected?
3. **`UNSEAL_REASON_REQUIRED` reuse of `reason-too-short`** (design-call #8)
   — same UX meaning, avoids a 4th near-duplicate failure type. Confirm, or
   mint a distinct `reason-required` type for copy precision?
4. **Selector hoist to screen level** (design-call #6) is itself a layout
   change subject to design-review scrutiny — confirm acceptable before
   Phase 3, or keep two separate `ClassTermYearSelector` instances (one per
   tab, duplicated) if hoisting is judged out of scope for this US.
5. **Unseal-entity 3-way split** (design-call #2) extends the story's
   design-call #2 (which only named `getSealStatus`) to 3 more methods.
   Confirm this extension is endorsed, or if a lighter-touch approach (keep
   `UnsealRequest`, tack on optional real-shaped fields) is preferred.

### Open questions — RESOLVED by fe-lead (2026-08-01)

1. **Bounded pre-check: ACCEPTED as-is.** `limit:100` per class+term is a
   reasonable practical bound (the two-admin gate is a client-side UX
   nicety, not the source of truth — `confirmUnseal`/approve is
   server-authoritative and idempotent-safe regardless of whether the local
   pre-check saw the full backlog). No cursor-follow required.
2. **Tab-badge scoping: ACCEPTED as class/term-scoped**, no tenant-wide
   alternative exists on the wire. Do NOT hide the badge — render it
   reflecting the currently-selected class/term's PENDING count, and when no
   class is selected omit the badge (consistent with the "select a class"
   empty-state prompt design-call #6 already specifies for the tab body).
3. **`UNSEAL_REASON_REQUIRED` → reuse `reason-too-short`: CONFIRMED.** Avoids
   a 4th near-duplicate failure type for the same UX meaning ("reason
   invalid/missing"). If the copy needs to distinguish "empty" from
   "too short" for the user, handle that distinction client-side in the
   initiate form's own validation (already MIN_UNSEAL_REASON_LENGTH-gated
   before submit) — the server-side failure path only needs one type.
4. **Selector hoist to screen level: CONFIRMED, proceed.** One shared
   `ClassTermYearSelector` above the tabs is cleaner than two duplicated
   instances and avoids a state-sync footgun (two tabs silently diverging
   on class/term). This is exactly the kind of layout change the design-
   review gate exists to catch — do not skip it for Phase 3.
5. **Unseal-entity 3-way split: ENDORSED.** `UnsealRequestSummary`/
   `UnsealInitiateResult`/`UnsealApproveResult` matching each real response
   1:1, with the mock keeping its richer internal `UnsealRequest` state and
   mapping at the boundary, is the same "internal-rich, boundary-narrow"
   pattern design-call #1 already established for `getSealStatus` — apply
   it consistently rather than special-casing one method. A lighter "tack
   optional fields onto `UnsealRequest`" approach would leak mock-only
   fields (`coSignerId`, `confirmedAt`, `selfApproved`) into the real
   contract's type surface, which is exactly the kind of shape-dishonesty
   ADR 0055 already rejected once (see its §Alternatives Considered #2).

Engineer: proceed with Phases 1–4 as written above, applying all five
resolutions in this section.

## Test Matrix

`docs/TEST_MATRIX.md` — US-E18.24 row added `planned` before any code, per
`.claude/rules/tdd.md`.

## Evidence

Implemented Phases 1–3 (Phase 4 = review/design-review/QA gates, owned by
fe-lead) strict-TDD (red → green → refactor) on
`feat/us-e18.24-unseal-workflow-wiring`, applying all five fe-lead resolutions.

### Proof counts (zero regression)

- Baseline on the branch tip before any code (re-measured this session, the
  plan's "303 files / 1866 tests" figure was stale): **434 files / 2964 tests**.
- After: **436 files / 3008 tests**, all passing (`bun vitest run`).
- Delta = +2 test files, +44 tests:
  - NEW `get-seal-status.use-case.test.ts` (2 — key passthrough returning the
    rollup verbatim, failure bubbling).
  - NEW `list-pending-unseal-requests.use-case.test.ts` (3 — `(classId, termId,
    opts)` forwarded verbatim, `opts` omitted when the caller passes none, new
    `unseal-request-invalid-cursor` bubbling).
  - UPDATED `confirm-unseal.use-case.test.ts` (6 → 7; all cases re-signatured to
    `(requestId, coSignerId, classId, termId)` + renamed fields; NEW case pins
    the bounded pre-check call shape `{status:"PENDING", limit:100}`).
  - UPDATED `initiate-unseal.use-case.test.ts` (6, re-fixtured to the narrow
    `UnsealInitiateResult`; reason pre-check cases unchanged).
  - UPDATED `academic-records-seal.repository.test.ts` (10 → 39): `getSealStatus`
    5-case truth-table matrix + absent-`lastSealedAt` normalisation + 403;
    `getPendingUnsealRequests` `{raw:true}`+`parseEnvelope` cursor/`hasMore`,
    default-vs-explicit `status`/`cursor`/`limit`, absent-`meta.pagination`
    fallback, ONE-deduped-batch name resolution, partial-resolution raw-id
    fallback, resolver-failure-still-succeeds, zero-row no-resolver-call, and
    the 2 new 400 codes; `initiateUnseal` exact-body + trim + 4-code matrix;
    `confirmUnseal` bare-POST-path-only + absent-`unsealedAt` + 3-code matrix.
  - UPDATED `academic-records-seal-hybrid.repository.test.ts` (2 → 3; 5-real /
    4-mock spy-count split + a scoping-args passthrough case).
  - UPDATED `academic-records-seal.mock.repository.test.ts` (13 → 21; rollup
    truth-table parity with the real matrix incl. a new empty-roster fixture,
    a boundary-key-set assertion proving no mock-internal field leaks, class+term
    scoping, explicit status filter, inline names, cursor pagination).
- `bunx tsc --noEmit`: clean. It caught every stale call site of the four
  changed methods plus the dangling references to the deleted i18n keys in BOTH
  dynamic-lookup namespaces (`academicRecord.error` and
  `academicRecordSeal.errors`).
- `bun lint`: clean for all touched files (the only remaining 1 warning + 1 info
  are pre-existing in `messaging/message-context-menu.tsx`, untouched here).
- `bun run vitest:storybook run` (full suite): **151 files / 1091 tests, all
  passing** — including 9 new/reworked stories in
  `academic-record-seal-screen.stories.tsx`.
- `NEXT_PUBLIC_USE_MOCK= bun run build`: ✓ Compiled successfully (real-mode
  guard, per team convention — not plain `bun build`).

### Per-phase

- **Phase 1 (domain)** — commit `4f0080b`. New boundary-narrow entities 1:1 with
  each real response: `SealStatusRollup` (+ the `SealRollupStatus` union, kept
  deliberately distinct from `TermStatus`), `UnsealRequestSummary`,
  `UnsealInitiateResult`, `UnsealApproveResult` (+ `UnsealRequestStatus`).
  `SealBatchStatus`/`UnsealRequest` are demoted to MOCK-INTERNAL-ONLY with
  doc-comments saying so. 3 new failure types
  (`unseal-request-already-approved`, `-invalid-status`, `-invalid-cursor`);
  `UNSEAL_REQUEST_NOT_FOUND`/`UNSEAL_REASON_REQUIRED` reuse
  `no-pending-request`/`reason-too-short` per resolution #3. Interface + all 4
  use-cases re-signatured; `ConfirmUnsealUseCase` exports
  `UNSEAL_PRECHECK_PAGE_LIMIT = 100` (resolution #1's bounded pre-check, named
  rather than a magic number).
- **Phase 2 (infrastructure)** — commit `94d4417`. Field names ground-truthed
  directly against `../edu-api/services/core/docs/openapi.yaml`
  (`SealStatusResponse` ~10535, `UnsealRequestListItem` ~8132,
  `RequestUnsealRequest`/`Response` ~10486/10499, `ApproveUnsealResponse`
  ~10513) and `ERROR_CODES.md:449-467` — two deviations from the plan's assumed
  names found and honoured (see below). New `unseal-response.dto.ts` +
  `unseal.mapper.ts`. Endpoints replaced with the three real class/term-scoped
  paths (POST create and GET list share ONE path); the three genuinely
  endpoint-less constants stay dead-and-documented, and the two stale
  `unsealInitiate`/`unsealConfirm`/`seal` legacy paths were deleted rather than
  left to rot. `toSealFailure` restructured so code checks run BEFORE the
  generic status fallbacks (otherwise `UNSEAL_REQUEST_NOT_FOUND`'s 404 would
  have been swallowed by the generic `not-found` branch — caught by the new
  matrix test). Name resolution composes `makeBatchResolveMembersUseCase()` in
  `academic-records.di.ts` only inside the `!USE_MOCK` branch, injected as an
  optional `MemberNameResolver` (mirrors `staffing.repository.ts`);
  `ensureFreshSession()` left in place. Hybrid facade → 5 real / 4 mock.
- **Phase 3 (presentation + i18n)** — commit `841c921`. Selector hoisted to
  `academic-record-seal-screen.tsx` (resolution #4). `AllLockedGate` rebuilt
  around the rollup: branches on `status` (SEALED green / PARTIAL + PENDING
  warning), count-based copy, per-subject list DELETED, plus an optional
  near-cap caption at `resealCount >= 4`. `SealTab` drops the selector and the
  `sealedBy` chip (no wire field) and is explicit about the truth table's one
  ambiguity. `UnsealTab` gains the "pick a class" prompt, `useInfiniteQuery`
  pagination through the shared `components/shared/load-more-button`, and the
  eventual-consistency caption. `UnsealRequestCard`/`UnsealSelfApproveDialog`
  re-fielded to `UnsealRequestSummary`. Container: `useInfiniteQuery` keyed by
  `(classId, term)`, `enabled: classId !== null`, flattened pages, and a
  first-page-only error escalation so a failed load-more never blanks loaded
  rows. i18n added in vi + en together and verified key-set-identical.

### Deviations from the plan (all deliberate, all ground-truth driven)

1. **`SealConfirmDialog` DID need a one-line change** (the plan predicted zero).
   Its prop was typed `SealBatchStatus`; since it only reads
   `classId`/`term`/`year` it is now typed `SealBatchKey` — strictly wider, no
   behaviour change.
2. **`UnsealRequestCard` lost more than the two renamed fields the plan listed.**
   `year`, `term`, `coSignerName` and `selfApproved` have no wire equivalent on
   `UnsealRequestListItem`, so the term/year subtitle, the "confirmed by" line
   and the "self-approved" badge variant are gone rather than fabricated (the
   list is already scoped by the hoisted selector, so the subtitle was
   redundant). A `REJECTED` badge tone was added since the wire status union
   includes it. Dead keys `unseal.card.confirmedBy` and
   `unseal.statusApprovedSelf` removed.
3. **i18n restructure was larger than "remove `subjectsLabel`".** With the
   per-subject list gone, `gate.allLocked.*` and `gate.notAllLocked.*` no longer
   described anything real, so the whole block became `gate.rollup.*`
   (`sealedTitle`/`partialTitle`/`pendingTitle`/`counts`/`warning`/
   `linkToApproval`/`nearResealCap`).
4. **The `sealedAt` indicator became `lastSealedAt`-driven** with two new
   strings (`neverSealed`, `wasSealedThenUnsealed`) rather than being deleted —
   without them the UI cannot distinguish the truth table's two `PENDING` cases.
5. **`ACADEMIC_RECORD_ALREADY_SEALED` (409) maps to `unknown`.** No existing
   failure type carries its meaning and the plan authorised no new type for it;
   mapping it to `not-sealed` would state the opposite of what happened. Pinned
   by an explicit test so the choice is visible rather than incidental.
6. **A `10A3` empty-roster fixture was added** to `seal-fixtures.ts` so the
   mock's rollup truth table has a real `totalStudents === 0` row to exercise
   (it does not change `listAvailableClasses`, which intersects with
   `MOCK_CLASS_OPTIONS`).
7. **Contract detail the plan did not have:** `lastSealedAt` and `unsealedAt`
   are NOT in their schemas' `required` lists, so both DTO fields are optional
   and both mappers normalise `undefined → null` (tested).

### 5 lead-resolved open questions — implemented exactly as specified

1. **Bounded pre-check accepted** — `ConfirmUnsealUseCase` fetches exactly one
   `{status:"PENDING", limit:100}` page, no cursor-follow; the call shape is
   pinned by a test.
2. **Tab badge class/term-scoped, not hidden** — `pendingUnsealCount` is the
   flattened page count; with no class selected it is 0, so the existing
   `> 0` render guard omits it, matching the "pick a class" body prompt.
3. **`UNSEAL_REASON_REQUIRED` → `reason-too-short`** — single mapping, tested.
4. **Selector hoisted** to screen level, one shared instance above the tabs.
5. **Unseal-entity 3-way split endorsed and applied** — the mock keeps its rich
   internal state and maps at each boundary; a test asserts the rollup's exact
   key set so no mock-only field can leak into the real contract's shape.

### Phase 4 — Review + gates

- **`fe-tech-lead-reviewer` (2026-08-01): APPROVED**, zero blocking findings.
  Every check re-run independently on `feat/us-e18.24-unseal-workflow-wiring`
  rather than trusting the report: `bunx tsc --noEmit` **clean**; `bun vitest run`
  **436 files / 3008 tests, all passing** (matches the claim exactly);
  `bun lint` **exit 0**; `NEXT_PUBLIC_USE_MOCK= bun run build` **✓ compiled**;
  `bun run vitest:storybook run academic-record-seal` **25/25 pass**.

  Re-ground-truthed against `../edu-api/services/core/docs/openapi.yaml` +
  `ERROR_CODES.md:449-467` on `origin/main`:
  - `SealStatusResponseDto` / `UnsealRequestListItemDto` /
    `RequestUnsealRequestDto` / `RequestUnsealResponseDto` /
    `ApproveUnsealResponseDto` (`unseal-response.dto.ts:15-65`) match the wire
    field-for-field, including `required`-list fidelity — `lastSealedAt` and
    `unsealedAt` are indeed NOT required, so deviation #7's `undefined → null`
    normalisation is correct, not defensive padding.
  - Rollup enum kept distinct from `TermStatus`, and the mapper
    (`unseal.mapper.ts:39`) passes the SERVER's `status` through instead of
    re-deriving it client-side — the right call: the truth table stays BE-owned.
  - All 9 error codes branch on `error.code`, never message; the code `switch`
    correctly precedes the `status === 404` fallback so
    `UNSEAL_REQUEST_NOT_FOUND` can't be swallowed
    (`academic-records-seal.repository.ts:56-95`).
  - **`{ raw: true }` is CONFIG-level, sibling to `params`** — not nested inside
    it (`academic-records-seal.repository.ts:235-243`), and the test asserts the
    exact call shape (`academic-records-seal.repository.test.ts:286-292`). This
    is the repo's documented recurring bug class; it is done right here.
  - `initiateUnseal` sends exactly `{studentMemberId, reason}` (trimmed);
    `confirmUnseal` is a bare single-arg POST with `requestId` as path param
    only — both pinned by tests (`…repository.test.ts:439`, `:506`), matching
    the `sealBatch` server-derives-actor precedent.
  - Hybrid facade routes exactly 5 real / 4 mock and the spy test genuinely
    asserts it in BOTH directions (`real.__calls` ordered list + `mock.__calls`
    empty, and the inverse) — not a mere existence test
    (`academic-records-seal-hybrid.repository.test.ts:60-104`).
  - `bootstrap/di/academic-records.di.ts:66-76`: `server-only`, composition of
    `makeBatchResolveMembersUseCase()` happens ONLY after the `if (USE_MOCK)`
    early return, injected as a narrow function port; `ensureFreshSession()` is
    still called before `createServerHttpClient()`. No `iam-directory` import
    inside `academic-records`'s own domain/infrastructure except type-only
    (`MemberSummary`/`IamDirectoryFailure`/`Result`), the sanctioned US-E18.23
    shape.
  - `SealBatchStatus` / `UnsealRequest` verified genuinely mock-internal:
    remaining references are the mock repo, its fixtures, its tests, doc
    comments, and the (already dead on `main`) legacy `seal-batch.mapper.ts`.
    No real-branch or presentation usage — no fabricated field can leak.
  - Layers/tokens/i18n/security: `server-only` present on infra + DI;
    presentation imports no infrastructure; raw-color grep across the touched
    presentation tree is **clean**; vi/en key sets **byte-identical** (0 vi-only,
    0 en-only across the whole message files); every new/changed Server Action
    still carries its own `requireRole(["admin"])`.
  - All 6 (7) claimed deviations checked against the wire — each is justified,
    none is a shortcut. Deviation #5 (`ACADEMIC_RECORD_ALREADY_SEALED → unknown`)
    is the right conservative call and is pinned by a test.
  - Security note (non-blocking, no action needed): now that `confirmUnseal` is
    REAL, the ADR-0037 self-approve fallback is gated by a MOCK
    `listTenantAdmins`. Verified **fail-closed** — `MOCK_TENANT_ADMINS` has 3
    entries, so `tenantAdminCount === 1` is never true, the card renders no
    bypass (`unseal-request-card.tsx:115`) and `ConfirmUnsealUseCase`'s
    `coSignerId === null` branch rejects with `self-approve-not-allowed`.

  **SHOULD FIX (non-blocking, fe-lead may bundle or defer):**
  1. `unseal-tab.tsx:93-99` — `LoadMoreButton` receives `errorLabel` but never
     `hasError`, so `unseal.loadMoreRetry` is a dead key and a failed
     `fetchNextPage` shows no signal at all (the container correctly keeps the
     loaded rows, `academic-record-seal-container.tsx:313-320`, but then nothing
     tells the admin page 2 failed). Thread
     `hasError={pendingQuery.isFetchNextPageError}` through `UnsealTabVM` and add
     a `UnsealTab_LoadMoreError` story.
  2. `messages/{vi,en}.json` `academicRecordSeal.sealSuccess.sealedByLabel` and
     `.sealedAtLabel` are now dead (the `sealedBy` chip was removed and the
     timestamp moved to `lastSealedAtLabel`) — they pass parity, so only a grep
     catches them. Remove from both locales.
  3. `docs/decisions/0055-…md` §Decision still states the unseal workflow
     "stays a FORCE-MOCKED permanently-blocked stub" — which this US reverses for
     4 of 5 methods. Per the in-place-amendment precedent US-E18.21 set on this
     same ADR, add a dated "Superseded in part (2026-08-01, US-E18.24)" note (or
     register a new decision). `git diff main..HEAD -- docs/decisions/` is
     currently empty.
  4. `docs/TEST_MATRIX.md:22` US-E18.24 row is still `planned` in all five proof
     columns with proof `none`, and the packet `## Status` is still `planned`,
     despite unit + integration + Storybook proof all existing. Pre-close item
     for fe-lead per `tdd.md`.

  **CONSIDER:** (a) the widened `UnsealRequestStatus` union means the `REJECTED`
  badge branch (`unseal-request-card.tsx:81`), `unseal.statusRejected` and
  `errors.unseal-request-invalid-status` are unreachable today — the action
  hard-codes `status: "PENDING"`; contract-faithful, but note it is dead copy
  until a status filter ships. (b) `academic-record-seal-screen.stories.tsx`
  emits a next-intl `ENVIRONMENT_FALLBACK: timeZone` console error on every
  `format.dateTime` render — pre-existing repo-wide Storybook decorator gap, but
  it makes date output runner-TZ dependent. (c) `seal-batch.mapper.ts`'s six
  mappers are all unreferenced (already dead on `main`, not introduced here) —
  worth a cleanup pass next time this feature is touched.

  Verdict: **APPROVED** — high-quality, genuinely ground-truthed wiring on a
  high-risk lane; the boundary-narrow entity split is the right call and the
  mock's "internal-rich, boundary-narrow" mapping is proven by an explicit
  key-set assertion.

### Notes for reviewers

- **term-vs-termId caveat carries forward** (design-call #9): `SealBatchKey.term`
  is a `"HK1"`/`"HK2"` LABEL, not a UUID termId, and the selector feeding it is
  still mock-sourced (`listAvailableClasses` has no BE endpoint). The real repo's
  class doc-comment now states this once for ALL FIVE real methods, not just
  `sealBatch`.
- **Not verified end-to-end against a running `core`** — no local BE instance
  was available; correctness rests on the ground-truthed schemas plus the
  integration tests, same as the rest of the E18 epic.
- **Toast-surface gap is unchanged and pre-existing** — there is still no
  container-level harness for reactive-error toast rendering anywhere in this
  repo; the error-key routing itself is proven end-to-end by `tsc` + the
  repository matrices.

### Accessibility Audit (fe-accessibility-auditor, 2026-08-01)

**Scope:** the 5 files with genuine UI touch —
`academic-record-seal-screen.tsx` (selector hoist), `all-locked-gate.tsx`
(rollup redesign), `seal-tab.tsx` (sealedBy chip removal + lastSealedAt
indicator), `unseal-tab.tsx` (pagination + empty-class prompt + eventual-
consistency hint), `unseal-request-card.tsx` (field drop). Verified against
`src/app/tokens.css` resolved values (not eyeballed), the Storybook stories in
`academic-record-seal-screen.stories.tsx`, and the shared
`components/shared/load-more-button`.

**Overall verdict: PASS, no blocking or must-fix findings.** 2 should-fix
(minor, non-blocking) observations below, both pre-existing repo-wide patterns
this US did not introduce or worsen — recorded for awareness, not gating.

#### Regression check — US-E18.13 A11Y-001 (`role="alert"` scoping)

**Still correct, no regression.** In `all-locked-gate.tsx`'s NOT-OK branch,
`role="alert"` wraps only the icon + message `div` (lines 81-107); the action
buttons (`Đến màn Duyệt & khoá` / seal button) live in a sibling `div` (lines
108-121), outside the assertive live region. Confirmed via
`UnsealTab_EventualConsistencyHint`-style story assertions elsewhere in the
suite (`queryByRole("alert")` checks) and direct code read. No change needed.

#### Contrast (computed against `tokens.css`, not eyeballed)

| Element | Token pairing | Ratio | Verdict |
| --- | --- | --- | --- |
| Near-cap caption (`text-edu-warning-foreground` on `bg-edu-warning/10` over page bg `#F5F7FA`) | `#2a3547` on ≈`#f6f0e4` | ≈10.9:1 | PASS (≥4.5:1) |
| Rollup counts / eventual-consistency hint / "select a class" prompt (`text-muted-foreground` on `bg-card`/warning-tint) | aliased to `--edu-text-secondary` `#5a6a85` | 5.48:1 (per ADR 0049, already established) | PASS |
| Sealed-branch icon (`text-edu-success-text` on `bg-edu-success/15`) | `#007a6e` on ≈`#dcfaf5` | ≈4.75:1 | PASS (≥3:1 UI/icon) |
| Not-OK icon (`text-edu-warning-foreground` on `bg-edu-warning/15`) | `#2a3547` on light warning tint | >4.5:1 (lighter tint than the 10% case above, same text color) | PASS |
| Load-more button (`variant="outline"`, `text-foreground`-equivalent on `bg-background`) | unchanged shadcn primitive | pre-existing, PASS | — |

No white-on-`--edu-warning` instances found; all warning text correctly uses
`--edu-warning-foreground` (`#2a3547`), never white.

#### Status conveyed by more than color alone — PASS

`AllLockedGate`'s three branches (SEALED / PARTIAL / PENDING) each pair a
distinct icon (`CheckCircle2` vs `AlertTriangle`) with distinct, differently-
worded title text (`sealedTitle` / `partialTitle` / `pendingTitle`) — color is
never the sole signal. `UnsealRequestCard`'s `StatusBadge` (PENDING/APPROVED/
REJECTED) likewise pairs tone with both an icon (`Clock`/`Check`/`X`) and a
distinct text label. `SealStatusBadge` (pre-existing, now rollup-driven)
already pairs `Lock`/`LockOpen` icons with `sealed`/`unsealed` text +
`aria-label`.

#### Keyboard & focus — PASS

- Tab order after the selector hoist: breadcrumb → header → `ClassTermYearSelector`
  (3 `Select` triggers, each with a linked `<Label htmlFor>`) → `TabsList`
  (`seal`/`unseal` triggers, Radix roving tabindex intact) → active
  `TabsContent`. Hoisting to screen level did not duplicate or fragment the
  selector's tab stops — it is now visited exactly once regardless of which
  tab is active, which is strictly better than the prior per-tab duplication
  would have been.
- No focus trap introduced. Switching tabs does not move focus into the
  selector or vice versa (Radix `Tabs` manages this natively; unmodified).
- Load-more button (`components/shared/load-more-button`): reachable by Tab,
  operable by Enter/Space (native `<button>`), `disabled` while
  `isFetchingNextPage` (prevents double-submit), removed from the DOM (not
  merely `disabled`) once `!hasNextPage` — confirmed by
  `UnsealTab_LoadMoreExhausted` story — so it is never a dead/inert tab-stop.
- "Select a class" empty state (`unsealVM({classId: null})`) is a static
  `<p>`, not a dead-end: the shared `ClassTermYearSelector` above the tabs
  remains focusable/operable at all times, so the keyboard path back to
  "select a class" is always available — no trap, no unreachable escape.

#### Touch target — PASS

Load-more button uses the shared `Button` primitive's `variant="outline"`
`size="default"` (`h-9 min-h-11 px-4 py-2`) — `min-h-11` = 44px, meets the
≥44×44px mobile target (repo-wide primitive fix, not specific to this US, but
confirmed still in effect for the newly-added instance). No new custom
interactive element introduces a target below 44px.

#### ARIA/semantics

- `role="alert"` scoping — confirmed correct, see regression check above.
- Eventual-consistency hint (`unseal-tab.tsx` line ~66-69): **judged NOT to
  need `aria-live`.** It renders unconditionally whenever a class is selected
  (it is not toggled in/out based on network state, mutation success, or list
  content — it's a static informational caption always present alongside the
  pending section), so there is no dynamic appearance/disappearance for a
  live region to announce. A screen reader user encounters it once via normal
  linear reading order, same as any other static caption. If a future change
  makes it conditional (e.g., only shown right after a submit), revisit.
- `fetchNextPage` loading state: `aria-busy={isLoadingMore}` is present on the
  load-more `<Button>` itself (`load-more-button.tsx` line 42) and the button
  becomes `disabled`, which most screen readers announce as a state change on
  focus/interaction. There is **no `aria-live`/`role="status"` announcing the
  newly-appended rows** to a user who is not focused on the button (WCAG
  2.1 AA 4.1.3 Status Messages). This is a **pre-existing repo-wide gap**,
  not introduced by this US — `audit-log-screen`'s own (separate,
  non-shared) `LoadMoreButton` has the same gap (verified: no `aria-live`
  anywhere in that screen either). Recorded as should-fix, not blocking this
  US specifically since it would need a repo-wide fix to the shared
  component + a design decision on wording, out of scope for a wiring US.

#### Motion — PASS (no new animation)

No new `transition`/`animate` classes were introduced by this US. The only
`transition-all` present is the pre-existing shadcn `Button` primitive, which
is already covered by the global `@media (prefers-reduced-motion: reduce)`
gate in `src/app/globals.css` (line 285) — untouched by this US.

#### Vietnamese microcopy — PASS

`emptyClassPrompt` ("Chọn lớp và học kỳ để xem danh sách yêu cầu mở khoá.") and
`eventualConsistencyHint` ("Danh sách có thể cập nhật trễ vài giây sau khi gửi
yêu cầu.") are clear, instructive (tell the user what to do / what to expect),
no jargon or unexplained abbreviations. `gate.rollup.nearResealCap`
("Đã ký lại {count}/5 lần — sắp đạt giới hạn.") clearly states the count and
the cap. All new strings confirmed present in BOTH `vi.json` (source) and
`en.json` (mirror) with an identical key set (diffed programmatically — zero
drift).

#### Findings summary

| ID | Severity | Summary |
| --- | --- | --- |
| A11Y-E18.24-01 | should-fix (non-blocking, pre-existing pattern) | Load-more (`components/shared/load-more-button`) has `aria-busy` + `disabled` but no `aria-live`/`role="status"` announcing newly-loaded rows to non-focused screen reader users (WCAG 4.1.3). Fix: wrap the appended-rows list (or a visually-hidden sibling) in `aria-live="polite"` and announce e.g. "Đã tải thêm {n} yêu cầu" on `fetchNextPage` success — apply to the shared component once, benefits both this screen and `audit-log-screen`. |
| A11Y-E18.24-02 | nice-to-have | No `aria-label` distinct from visible text on the shared `LoadMoreButton` (unlike `audit-log-screen`'s own local variant, which has one). Not a violation (visible text = accessible name is sufficient per 2.5.3), but worth reconciling the two `LoadMoreButton` implementations for consistency the next time either is touched. |

No must-fix or blocking findings. Design-review gate / QA may proceed.

### Phase 4 follow-up — reviewer SHOULD-FIX items closed (fe-nextjs-engineer)

Both code-owned SHOULD-FIX items from the `fe-tech-lead-reviewer` verdict are
fixed on `feat/us-e18.24-unseal-workflow-wiring` (the two doc-owned findings —
ADR 0055 supersession note + Harness/TEST_MATRIX status — are fe-lead's and were
deliberately not touched here).

1. **Load-more failure was silent.** `unseal-tab.tsx` passed `errorLabel` but
   never `hasError`, so the `loadMoreRetry` key was unreachable and a page-2
   `fetchNextPage` failure produced no visible signal. Fixed by threading a new
   `UnsealTabVM.hasLoadMoreError`, set in the container as
   `pendingQuery.isError && pendingRequests.length > 0` — the exact convention
   already used by `feed-screen.tsx:509` and `moderation-screen.tsx:421/441`,
   and the precise complement of the container's existing first-page-only error
   escalation (rows present ⇒ it was the load-more that failed, so keep the rows
   and only swap the control's label; rows absent ⇒ screen-level error panel).
   TDD: new `UnsealTab_LoadMoreError` interaction story written FIRST and
   observed red (1 failed / 25 passed), then green — it asserts the retry label
   replaces the plain one, the already-loaded row survives, no `role="alert"`
   panel appears, and clicking the control re-fires `onLoadMore`.
2. **Dead i18n keys removed.** `academicRecordSeal.sealSuccess.sealedByLabel`
   and `.sealedAtLabel` deleted from BOTH `vi.json` and `en.json` (orphaned when
   the rollup redesign dropped the `sealedBy` display — there is no wire field
   for it). Key sets re-diffed programmatically: zero vi/en drift.
   `bunx tsc --noEmit` stays clean, confirming nothing still references them.

**Proof after the fixes (no regression):**

- `bun vitest run`: **436 files / 3008 tests**, all passing (unchanged — both
  fixes are presentation/i18n only; the new proof is a Storybook story).
- `bun run vitest:storybook run` (full suite): **151 files / 1092 tests**, all
  passing (**+1** vs the 1091 at review time = the new `UnsealTab_LoadMoreError`).
- `bunx tsc --noEmit`: clean. `bun lint`: **exit 0** (the residual 1 warning +
  1 info remain the pre-existing pair in `messaging/message-context-menu.tsx`).
- `NEXT_PUBLIC_USE_MOCK= bun run build`: ✓ Compiled successfully.

**Note for whoever runs `bun lint` next:** a repo-wide `biome check` prints its
diagnostics truncated, so a formatting error in a NEWLY edited file can surface
under a trailing, unrelated pre-existing diagnostic (here `message-context-menu
.tsx`) and read as "someone else's problem". Scope the check to your own paths
(`bunx biome check src/features/<x>`) before concluding an error is pre-existing
— in this session the "messaging" error was in fact a formatting nit in
`academic-record-seal-container.tsx`.

**A11Y-E18.24-01/02 not actioned here** (deliberate): both target the SHARED
`components/shared/load-more-button`, whose blast radius is 7 caller screens.
That is a shared-component change needing its own scope/ADR-level sign-off, not
a drive-by inside a BE-wiring US — flagged back to fe-lead rather than silently
widened.

### Design-review gate (fe-lead, `docs/DESIGN_REVIEW.md`)

**Design review: pass** — scoped self-review (workflow-state + pagination
change on an existing screen, no new tokens/palette, matching the
US-E18.13/US-E18.12 precedent for this same gate), building on
`fe-tech-lead-reviewer`'s independent raw-color grep (clean) and
`fe-accessibility-auditor`'s full WCAG 2.1 AA pass:

- **design-system:** conform. Independently re-grepped the full presentation
  diff (`git diff main..HEAD -- src/features/academic-records/presentation/`)
  for raw color/hex/`slate-`/`gray-`/`text-white`/`bg-white` — zero hits, only
  semantic tokens used. No new token introduced. `LoadMoreButton`/`Button`
  primitives reused as-is (no forked variant). Role/typography/spacing
  patterns unchanged from the existing screen shell.
- **a11y:** WCAG AA — deferred to `fe-accessibility-auditor`'s PASS (contrast
  computed, not eyeballed; status conveyed by icon+label not color alone;
  keyboard/focus/touch-target/motion all held; US-E18.13's A11Y-001
  `role="alert"` scoping regression-checked clean). 2 non-blocking findings
  (A11Y-E18.24-01/02) correctly scoped OUT as a shared-component follow-up,
  not this US's blocker.
- **impeccable audit:** the rollup redesign (dropping the per-subject
  "unlocked subjects" list for a coarser count+status summary) is the kind of
  hierarchy/completeness question impeccable exists to catch — reviewed the
  new `all-locked-gate.tsx`/`seal-tab.tsx` copy: the 4-state truth table
  (SEALED/PARTIAL/PENDING-never-sealed/PENDING-was-sealed-then-unsealed) is
  rendered with distinct icon+copy per state (not just a count), and the
  near-cap (`resealCount>=4`) caption reads as a proactive warning, not an
  error. No anti-pattern found; no redesign of layout/palette attempted or
  needed (design system stays supreme per `impeccable.md` scope).
- **states:** loading (`isFetchingNextPage`, `isRequestsLoading`) / empty
  ("select a class" prompt when `classId===null`) / error
  (`hasLoadMoreError` retry affordance, just added) / success (paginated
  list, rollup summary) all covered per the Storybook interaction suite
  (25/25 seal-screen stories green, incl. the new `UnsealTab_LoadMoreError`
  + `UnsealTab_LoadMoreExhausted` states). Responsive/320px unchanged from
  the existing screen shell (selector hoist is a vertical reflow, no new
  horizontal constraint).

No follow-up items from this gate beyond the already-logged A11Y-E18.24-01/02
(shared `LoadMoreButton` `aria-live`, tracked as a small future US, see
below).

### Follow-up (backlog, not blocking this US)

- **A11Y-E18.24-01** (should-fix): `components/shared/load-more-button` needs
  an `aria-live="polite"` announcement of newly-loaded rows (WCAG 4.1.3) —
  benefits this screen + `audit-log-screen` (7 total callers). Candidate for
  a small dedicated US (e.g. `INFRA-loadmore-aria-live`) the next time any
  caller screen is touched, rather than a drive-by fix here.
- **A11Y-E18.24-02** (nice-to-have): reconcile the shared `LoadMoreButton`
  with `audit-log`'s own local variant (component-organization duplication,
  decision `0026`) — same future US as above.

### QA gate (`fe-qa-playwright`, 2026-08-01)

**Gate: tech-lead APPROVED** (verified above) → proceeded per this repo's
CRITICAL GATE rule. Did **not** rubber-stamp the reported counts — re-ran both
suites independently and read the actual `.stories.tsx` file line-by-line
against the 7 checklist items the QA task specified, per this team's
established precedent (US-E18.13/17/20, US-E19.2).

**Independently re-run proof (own numbers, not copied):**

- `bun vitest run`: **437 files / 3026 tests**, all passing (was 436/3008 at
  review time — delta is this gate's own new container test, 1 file / 18
  tests).
- `bun run vitest:storybook run` (full suite): **151 files / 1093 tests**, all
  passing (was 151/1092 at the engineer's follow-up — delta is this gate's own
  new `UnsealTab_Pagination_Mobile375` story).
- `bunx tsc --noEmit`: clean. `bunx biome check` (scoped to the touched
  folder): clean, no fixes needed after auto-format.
- No `e2e/` Playwright spec directory exists anywhere in this repo (confirmed
  via `find`) — Storybook interaction (`@vitest/browser-playwright` browser
  mode) IS this repo's E2E-equivalent layer for BE-wiring-on-an-existing-screen
  stories, consistent with prior US-E18.13/17/20/E19.2 QA-gate precedent. No
  new Playwright spec was warranted or written.

**Checklist verification (7 items) — 5 already solid, 2 real gaps found and
closed:**

1. **4-state seal-status rollup truth table** — verified GENUINELY covered:
   `Rollup_Sealed` / `Rollup_PendingNeverSealed` / `Rollup_PendingWasSealed` /
   `Rollup_Partial` each assert the distinct title/copy per state, and the
   `PendingNeverSealed`/`PendingWasSealed` stories explicitly assert the
   *absence* of the other state's copy (not just presence of their own) — a
   real story-level interaction proof, not a comment. No gap.
2. **`UnsealTab`'s empty/pagination/exhausted/retry states** — verified: the
   "select a class" prompt (`UnsealTab_SelectAClassPrompt`), happy-path
   load-more (`UnsealTab_LoadMore`), exhausted cursor (leaves DOM,
   `UnsealTab_LoadMoreExhausted`), and the just-added retry path
   (`UnsealTab_LoadMoreError`) are all present and each assertion is
   substantive (e.g. `UnsealTab_LoadMoreError` genuinely asserts the
   already-loaded row survives via `canvas.getByText("Nguyễn Hoàng Nam")` AND
   that no `role="alert"` panel appears AND that clicking the control re-fires
   `onLoadMore`) — correct, not just present. No gap.
3. **Name-resolution fallback** — `UnsealTab_UnresolvedNamesFallBackToRawId`
   genuinely asserts both `studentMemberId` and `requestedBy` degrade to the
   raw id with no error banner and the confirm action stays usable. No gap.
4. **`initiateUnseal`/`confirmUnseal` end-to-end through the container** —
   **REAL GAP, closed.** The Storybook stories only exercise the
   *presentational* `AcademicRecordSealScreen` fed hand-built VMs; nothing
   anywhere exercised `AcademicRecordSealContainer` itself, which is the ONLY
   place `useMutation`'s `onSuccess` maps `res.errorKey` →
   `toast.error(t(\`errors.${errorKey}\`))`, including the three new
   `unseal-request-already-approved`/`-invalid-status`/`-invalid-cursor` codes
   and the stale-race `invalidateQueries` special-casing on
   `no-pending-request`/`unseal-request-already-approved`. Zero test file
   existed for this container (`find`-confirmed: no `*container.test.tsx`
   exists anywhere in the repo, so there was no local precedent either — this
   gate introduces one, mirroring `src/components/layout/app-shell/app-shell.test.tsx`'s
   node-env, no-jsdom recipe from US-E08.6: mock every hook (`next/navigation`,
   `next-intl`, `sonner`, `@tanstack/react-query`) and the child screen import,
   capture the 3 `useMutation` configs + the vm props passed to the mocked
   screen, `renderToStaticMarkup`, then invoke captured `onSuccess`/`onConfirmSeal`/
   `onSubmitInitiate`/`onConfirmRequest`/`onConfirmSelfApprove` as plain function
   calls. New file:
   `academic-record-seal-container.test.tsx` (18 tests) — proves: the 4
   UI-trigger→mutate wirings; `sealMutation`/`initiateMutation`/`confirmMutation`
   onSuccess failure→toast.error routing (incl. all 3 new codes reaching their
   translated `errors.<key>` string); the `same-admin-as-initiator` early-return
   (no toast, dialog-branch only) vs the generic showError branch; the
   stale-race extra-invalidate special case firing for BOTH
   `unseal-request-already-approved` and `no-pending-request` but not for a
   generic failure; self-approve vs co-signed success toast-copy selection; and
   — since `unseal-request-invalid-status`/`-invalid-cursor` are actually
   listing-query errors, not mutation errors — that they correctly surface as
   the screen-level `error` prop (first-page failure) while a load-more-only
   failure (rows already loaded) instead flips `hasLoadMoreError` and leaves
   `error` null (first-page-only escalation, matches the container's own
   documented convention).
5. **Eventual-consistency caption** — `UnsealTab_EventualConsistencyHint`
   genuinely asserts the caption renders AND that no `role="alert"` appears
   (i.e. it reads as a hint, not an error). No gap.
6. **Mobile/responsive 320-375px** — `Rollup_Partial_Mobile375` (pre-existing,
   from US-E18.13's own QA gate) covers the rollup summary at a real 375px
   viewport. **REAL GAP found and closed**: the pagination/load-more control
   area (new UI this US introduced — the toolbar's title/subtitle/badge/button
   row and the `LoadMoreButton`) had zero mobile-viewport proof. Added
   `UnsealTab_Pagination_Mobile375` (real `page.viewport(375, 812)` via
   `@vitest/browser-playwright`, same technique as `Rollup_Partial_Mobile375`):
   asserts the toolbar wraps (`scrollWidth <= clientWidth`) instead of
   overflowing, the load-more button stays within the 375px viewport width
   (`rect.right <= 375`) and meets the 44px-adjacent touch-target floor, the
   pending `<section>` has no horizontal overflow, and the button is still
   clickable/wired at this viewport.
7. **`e2e/` Playwright spec check** — confirmed (see above): no `e2e/`
   directory exists in this repo at all; Storybook interaction is judged
   sufficient, consistent with this team's established precedent for
   BE-wiring-only stories on an existing screen. No new spec written.

**Findings, severity:**

| ID | Severity | Summary |
| --- | --- | --- |
| QA-E18.24-01 | MAJOR (closed this gate) | Container-level mutation wiring (toast/i18n-key routing for all 9 failure codes, incl. the 3 new ones, and the stale-race invalidation special-case) had zero test coverage anywhere. Closed: `academic-record-seal-container.test.tsx` (18 tests). |
| QA-E18.24-02 | MINOR (closed this gate) | Pagination/load-more control area had no real-viewport (375px) overflow proof, unlike the rollup summary. Closed: `UnsealTab_Pagination_Mobile375` story. |
| (carried) A11Y-E18.24-01/02 | should-fix / nice-to-have | Unchanged from the accessibility audit — correctly scoped out as a shared-`LoadMoreButton` follow-up, not this US's blocker. |

No BLOCKER or CRITICAL findings. Both MAJOR/MINOR items found by this gate
were closed within the gate itself (test-only changes, no production code
touched), so there is no unresolved MAJOR left open.

**Acceptance-criteria coverage:** 100% — every AC-equivalent item in the
Scope + Plan (rollup truth table, unseal pagination/empty/error states, name
fallback, eventual-consistency hint, mutation error routing, mobile
responsiveness) now has a genuine test, at either the Storybook-interaction or
container-unit layer as appropriate to what each concern actually is (pure
presentational state → story; container wiring → node-env unit test).

### Release Readiness Decision: **PASS**

Rationale: tech-lead APPROVED gate satisfied; both real coverage gaps found by
this independent QA pass (container mutation-wiring, mobile pagination
overflow) were closed within this same gate with passing tests, not deferred;
zero regression on the full suite (`bun vitest run` 437/3026,
`bun run vitest:storybook run` 151/1093, both green); `bunx tsc --noEmit` and
scoped `biome check` clean. No BLOCKER/CRITICAL/open MAJOR remains. AC coverage
100%.

**Message to fe-lead:** Go. Tech-lead's APPROVED verdict holds up under
independent re-verification — the wiring is genuinely ground-truthed, not
just claimed. This gate found and closed two real gaps missed by both the
engineer and the tech-lead review: (1) the container's mutation
`onSuccess`→toast/i18n-key routing (including the 3 brand-new failure codes)
had literally zero test coverage anywhere — new
`academic-record-seal-container.test.tsx` (18 tests, node-env, mirrors the
`app-shell.test.tsx`/US-E08.6 recipe); (2) the new pagination control area had
no real-375px-viewport overflow proof — new `UnsealTab_Pagination_Mobile375`
Storybook story. Both are test-only additions, committed on
`feat/us-e18.24-unseal-workflow-wiring` (commit `b044bc6`), zero production
code touched, zero regression (437 files/3026 unit tests, 151 files/1093
Storybook tests, both fully green). Action items for fe-lead: (a) bundle the
already-flagged doc-owned SHOULD-FIXes from the tech-lead review — ADR 0055
supersession note + `docs/TEST_MATRIX.md` status flip to `implemented` — when
closing this US; (b) no new action items from this QA gate beyond what's
already tracked (A11Y-E18.24-01/02 backlog).
