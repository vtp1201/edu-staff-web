# US-E18.24 Unseal-workflow + seal-status wiring — closes ADR 0055's 4th blocked operation set

## Status

planned

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

(fe-nextjs-engineer + fe-lead to fill in per-phase during implementation.)
