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

`fe-planner` to detail phases here (domain entities/failures/use-cases →
infra DTOs/mappers/repositories/hybrid-facade/DI → presentation pagination +
rollup display + i18n → review/design-review/QA gates), grounded in the
contract + design calls above and the existing code:
`src/features/academic-records/**`, `src/bootstrap/di/academic-records.di.ts`,
`src/bootstrap/di/iam-directory.di.ts`,
`src/bootstrap/endpoint/academic-records.endpoint.ts`.

## Test Matrix

`docs/TEST_MATRIX.md` — US-E18.24 row added `planned` before any code, per
`.claude/rules/tdd.md`.

## Evidence

(fe-nextjs-engineer + fe-lead to fill in per-phase during implementation.)
