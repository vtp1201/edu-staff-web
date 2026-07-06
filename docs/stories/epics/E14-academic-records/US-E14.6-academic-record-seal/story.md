# US-E14.6 Academic Record Seal (Admin Bulk-Seal + Two-ADMIN Unseal)

## Status

planned

## Lane

high-risk

## Dependencies

- Depends on: US-E14.4 (grade approval — ALL grades must be LOCKED before sealing allowed), US-E14.5 (academic record viewer — seal status indicator)
- Blocks: none
- Feature module(s) cham: `src/features/academic-records/` (shared with E14.5)
- Shared contract/file: `bootstrap/endpoint/academic-records.endpoint.ts`; AcademicRecordSealEntity

## Product Contract

Admin niêm phong hoc ba cho ca lop / ca truong theo hoc ky / nam hoc
(`/admin/academic-records`). Dieu kien: tat ca diem phai o trang thai LOCKED
(allLocked gate). Unseal yeu cau 2 admin xac nhan (data integrity).

**Bulk-seal screen:**
- Selector: chon lop + hoc ky + nam hoc.
- allLocked gate: kiem tra tat ca cot diem cua lop do o LOCKED chua.
  - OK: hien green indicator "Tat ca diem da duoc khoa" + nut "Niêm phong hoc ba".
  - NOT OK: hien warning "Con [N] diem chua duoc khoa" + danh sach mon con thieu + link "Khoa diem" -> E14.4.
- "Niêm phong hoc ba" -> confirm dialog "Sau khi niêm phong, hoc ba khong the chinh sua ma khong co xac nhan BGH kep." -> OK -> seal.
- Sau khi seal: thanh cong -> indicator "Da niêm phong" + ngay / nguoi niêm phong.

**Audit trail:**
- Bang lich su niêm phong: lop, hoc ky, nam hoc, nguoi niêm phong, ngay, trang thai (niêm phong / da mo phong).

**Two-ADMIN unseal (data integrity gate):**
- Chi hieu truong hoac admin cap tren co the khoi dong unseal.
- Buoc 1: Admin 1 yeu cau mo phong + nhap ly do (bat buoc).
- Buoc 2: Admin 2 (khac Admin 1) xac nhan mo phong. Neu chi co 1 admin -> show warning "Can them 1 admin xac nhan".
- Sau khi 2 admin xac nhan: unseal thanh cong -> trang thai tro ve co the chinh sua.
- [ASSUMPTION] Two-ADMIN confirmation: Admin 2 xac nhan qua man hinh pending-unseal-requests hoac trong cung session neu co 2 admin online.

RBAC: Chi admin (BGH). High-risk lane: data integrity critical.
Mock-first: `core` academic-record seal endpoints chua ship (US-064 BE planned).

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (academic-records seal — new row)
- `design_src/edu/academic-records.jsx` — AcademicRecordSealScreen (1506)
- US-E14.5 (record viewer — receives seal status from this story)
- US-E12.12 (audit log — records seal/unseal actions)

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load trang thai seal.
- AC-2 (allLocked gate — OK): Khi tat ca diem LOCKED -> green indicator + nut "Niêm phong" enabled; hien so mon / so hoc sinh.
- AC-3 (allLocked gate — NOT OK): Co diem chua LOCKED -> warning banner + danh sach mon chua khoa + link den grade-approval (E14.4); nut "Niêm phong" disabled.
- AC-4 (seal confirm dialog): "Niêm phong hoc ba" -> dialog canh bao ro rang -> OK -> seal action gui; toast "Da niêm phong hoc ba [lop] [hoc ky]".
- AC-5 (seal success): Sau khi seal -> indicator "Da niêm phong" + ten nguoi + ngay giay.
- AC-6 (audit trail): Bang lich su hien chinh xac: lop, hoc ky, nam hoc, nguoi seal, ngay, trang thai.
- AC-7 (unseal — step 1): Admin 1 click "Yeu cau mo phong" -> form nhap ly do (bat buoc >= 20 ky tu) -> submit -> pending state.
- AC-8 (unseal — step 2): Admin 2 (khac Admin 1) vao trang -> thay yeu cau pending -> xac nhan -> unseal thanh cong; neu Admin 2 cung la Admin 1 -> dialog bao loi "Can admin khac xac nhan".
- AC-9 (RBAC): Chi admin; teacher/student/parent -> redirect.
- AC-10 (a11y): Confirm dialog trap focus; warning banner co role="alert"; WCAG AA; lock icon co aria-label.
- AC-11 (i18n): Tat ca strings qua namespace `academicRecordSeal`.

## Design Notes

- Route: `/admin/academic-records`
- Design file: `design_src/edu/academic-records.jsx` — AcademicRecordSealScreen, AllLockedGate, SealConfirmDialog, UnsealWorkflow, AuditTrailTable
- Commands: `sealAcademicRecord`, `initiateUnseal`, `confirmUnseal`
- Queries: `getRecordSealStatus` (class x term x year), `getSealAuditTrail`, `getPendingUnsealRequests`
- API (mock-first — core planned US-064):
  - `GET  /core/api/v1/academic-records/seal-status?classId=&term=&year=`
  - `POST /core/api/v1/academic-records/seal`
  - `POST /core/api/v1/academic-records/unseal/initiate`
  - `POST /core/api/v1/academic-records/unseal/confirm`
  - `GET  /core/api/v1/academic-records/seal-audit-trail`
  - `GET  /core/api/v1/academic-records/unseal-requests?status=pending`
- Domain rules: allLocked gate: ALL grade batches for (class, term, year) must be LOCKED. Two-ADMIN unseal: Admin 2 != Admin 1 (server-enforced). Unseal reason min 20 chars. Seal/unseal actions append to audit-log (US-E12.12).
- UI surfaces: AllLockedGate (OK vs NOT OK states); SealConfirmDialog; UnsealInitiateForm; UnsealConfirmDialog; AuditTrailTable; ClassTermYearSelector

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sealAcademicRecord (ok/not-all-locked/already-sealed); initiateUnseal (ok/not-sealed/missing-reason); confirmUnseal (ok/same-admin-as-initiator/no-pending-request) |
| Integration | AcademicRecordSealRepository mock (seal, unseal-initiate, unseal-confirm, audit-trail, pending-requests) |
| E2E | Storybook: Loading / AllLockedGate_OK / AllLockedGate_NotOK / SealConfirmDialog / SealSuccess / UnsealInitiate / UnsealConfirm / UnsealSameAdminError / AuditTrail |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; security review for two-ADMIN gate (ADR candidate) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E14.6 (planned, high-risk)
- `docs/product/screens.md`: add Admin "Academic Record Seal" row -> design-ready
- [FLAG for ba-lead]: Two-ADMIN confirmation mechanism requires ADR (decision >= 0023). Session-based vs notification-based confirmation approach to be decided.

## Implementation Plan

### 0. Ghi chú xung đột + quyết định trước khi code

- **[DISCREPANCY — ADR 0037 vs AC-7]** ADR `0037` §Decision-1 viết "reason
  required, min 10 chars"; story AC-7 viết ">= 20 ky tu". **Nguon chuan de
  implement + test = AC-7 (>= 20 chars)** vi AC la spec testable da chot sau
  ADR (ADR prose xem nhu draft-time, AC la final). `fe-nextjs-engineer` PHAI
  dung `MIN_UNSEAL_REASON_LENGTH = 20` trong domain use-case; khong doc theo
  ADR. Flag lai cho `fe-lead` de note huy ADR (khong sua nguoc ADR trong story
  nay — chi annotate).
- **Mo hinh du lieu:** feature `academic-records` hien tai la per-STUDENT view
  (`AcademicRecord.years[].terms[]`, `TermStatus`). US-E14.6 la admin
  BULK/BATCH view theo (classId, term, year) — tai su dung `TermStatus`
  ("PENDING"|"SEALED"|"UNSEALED") lam vocabulary chung, KHONG tao enum song
  song. Entity moi la cap **batch-level** (nhieu student cung roster), map
  1-nhieu voi `TermRecord` da co qua `studentId`.
- **Self-approve fallback / "second admin" check:** khong co endpoint
  `/admin/list` san co trong repo. Dung mock-first query
  `listTenantAdmins(): Promise<{ id: string; name: string }[]>` tren chinh
  `IAcademicRecordsSealRepository` (khong tach feature admin-directory rieng —
  YAGNI, chi 1 caller). Mock tra co dinh 3 admin (giong seed jsx:
  `admin-1/2/3`) cho tenant thuong, va co the tra 1 admin cho 1 fixture rieng
  de test fallback path (xem Phase 2).
- Route can THEM (chua co): `/admin/academic-records` (moi, sibling voi
  `/admin/grades`, `/admin/staff-leave`). RBAC: **da co san** o
  `admin/layout.tsx` (`evaluateAdminAccess`) — khong can them guard rieng o
  page, chi can `requireRole(["admin"])` trong tung Server Action (dung pattern
  `grades/approval/actions.ts`).

### Phase 1 — Domain: entities, failures, repo interface, use-cases (TDD trước)

Files (moi, trong `src/features/academic-records/domain/`):

- `entities/seal-batch.entity.ts`
  ```ts
  export interface SealBatchKey { classId: string; term: "HK1" | "HK2"; year: string; }
  export interface SealBatchStatus extends SealBatchKey {
    subjectLabel: string;          // for gate messaging
    allLocked: boolean;
    totalStudents: number;
    unlockedStudents: number;
    unlockedSubjectNames: string[]; // for AC-3 "danh sach mon chua khoa"
    status: TermStatus;             // derived: PENDING (not sealed) | SEALED
    sealedAt: string | null;
    sealedBy: string | null;        // admin display name
  }
  export interface SealAuditEntry {
    id: string;
    classId: string; term: "HK1" | "HK2"; year: string;
    actorName: string;
    action: "SEAL" | "UNSEAL";
    occurredAt: string; // ISO
  }
  export interface UnsealRequest {
    id: string;
    studentId: string; studentName: string;
    classId: string; term: "HK1" | "HK2"; year: string;
    reason: string;
    requestedById: string; requestedByName: string; requestedAt: string;
    status: "PENDING" | "APPROVED";
    coSignerId: string | null;      // null until confirmed / self-approve
    coSignerName: string | null;
    confirmedAt: string | null;
    selfApproved: boolean;          // ADR 0037 fallback flag
  }
  export interface TenantAdminSummary { id: string; name: string; }
  ```
  (Reuses `TermStatus` from `academic-record.entity.ts` — import, do not redeclare.)

- `failures/academic-records.failure.ts` — EXTEND (additive, keep existing 4):
  ```ts
  export type AcademicRecordsFailure =
    | { type: "not-found" }
    | { type: "forbidden" }
    | { type: "network-error" }
    | { type: "unknown" }
    | { type: "not-all-locked" }        // seal blocked
    | { type: "already-sealed" }        // seal idempotency
    | { type: "not-sealed" }            // unseal-initiate on non-sealed record
    | { type: "reason-too-short" }      // < 20 chars (AC-7)
    | { type: "no-pending-request" }    // unseal-confirm target missing
    | { type: "same-admin-as-initiator" }; // AC-8
  ```

- `repositories/i-academic-records-seal.repository.ts` (NEW interface — separate
  from `i-academic-records.repository.ts`, own bounded concern, avoids bloating
  the student-viewer interface):
  ```ts
  export interface IAcademicRecordsSealRepository {
    getSealStatus(key: SealBatchKey): Promise<Result<SealBatchStatus>>;
    sealBatch(key: SealBatchKey, actorId: string): Promise<Result<SealBatchStatus>>;
    getSealAuditTrail(key?: Partial<SealBatchKey>): Promise<Result<SealAuditEntry[]>>;
    getPendingUnsealRequests(): Promise<Result<UnsealRequest[]>>;
    initiateUnseal(input: { studentId: string; classId: string; term: "HK1"|"HK2"; year: string; reason: string; initiatorId: string }): Promise<Result<UnsealRequest>>;
    confirmUnseal(requestId: string, coSignerId: string | null): Promise<Result<{ request: UnsealRequest; fallback: boolean }>>;
    listTenantAdmins(): Promise<Result<TenantAdminSummary[]>>;
  }
  // Result<T> = { ok: true; data: T } | { ok: false; error: AcademicRecordsFailure }
  ```

- Use-cases (one class each, mirrors `ApproveGradeBatchUseCase` shape):
  - `use-cases/get-seal-status.use-case.ts` — `execute(key): Promise<Result<SealBatchStatus>>`, pass-through.
  - `use-cases/seal-academic-record.use-case.ts` — `SealAcademicRecordUseCase.execute(key, actorId)`:
    fetch status first; if `!allLocked` → `{ ok:false, error:{type:"not-all-locked"} }`;
    if `status.status === "SEALED"` → `{ok:false, error:{type:"already-sealed"}}`; else `repo.sealBatch(...)`.
  - `use-cases/initiate-unseal.use-case.ts` — `InitiateUnsealUseCase.execute(input)`:
    validate `reason.trim().length >= 20` → else `reason-too-short`; delegate to repo.
    (Repo/mock separately validates target is actually SEALED → `not-sealed`.)
  - `use-cases/confirm-unseal.use-case.ts` — `ConfirmUnsealUseCase.execute(requestId, coSignerId, currentAdminId)`:
    if `coSignerId !== null && coSignerId === request.requestedById` → `same-admin-as-initiator`
    (fetch request via repo or accept as param — prefer repo enforces too, defense in depth);
    delegate `repo.confirmUnseal(requestId, coSignerId)`.
  - `use-cases/get-seal-audit-trail.use-case.ts`, `use-cases/list-pending-unseal-requests.use-case.ts`,
    `use-cases/list-tenant-admins.use-case.ts` — thin pass-throughs (query use-cases per CLAUDE.md orchestration-no-side-effects rule; still exist so presentation never talks to repo directly).

**Test first (Vitest, mock `IAcademicRecordsSealRepository`):**
`seal-academic-record.use-case.test.ts` (ok / not-all-locked / already-sealed),
`initiate-unseal.use-case.test.ts` (ok / reason-too-short at boundary 19 vs 20 chars / not-sealed bubbled from repo),
`confirm-unseal.use-case.test.ts` (ok-different-admin / same-admin-as-initiator / no-pending-request bubbled / self-approve fallback flag true when `coSignerId === null`).

**Done when:** `bun vitest run` green for these 3 files, matching Validation-table Unit row.

### Phase 2 — Infrastructure: DTOs, mapper additions, mock repo, fixtures, endpoint, DI

Files:

- `bootstrap/endpoint/academic-records.endpoint.ts` — ADD (keep `record`/`years`):
  ```ts
  export const ACADEMIC_RECORDS_EP = {
    record: (studentId: string) => `/core/api/v1/academic-records/${studentId}`,
    years: (studentId: string) => `/core/api/v1/academic-records/${studentId}/years`,
    sealStatus: () => `/core/api/v1/academic-records/seal-status`,          // GET ?classId=&term=&year=
    seal: () => `/core/api/v1/academic-records/seal`,                       // POST
    unsealInitiate: () => `/core/api/v1/academic-records/unseal/initiate`,  // POST
    unsealConfirm: () => `/core/api/v1/academic-records/unseal/confirm`,    // POST
    sealAuditTrail: () => `/core/api/v1/academic-records/seal-audit-trail`, // GET
    pendingUnsealRequests: () => `/core/api/v1/academic-records/unseal-requests?status=pending`, // GET
  } as const;
  ```
- `infrastructure/dtos/seal-batch-response.dto.ts`, `unseal-request-response.dto.ts`,
  `seal-audit-entry-response.dto.ts`, `tenant-admin-response.dto.ts` — camelCase, mirror entities.
- `infrastructure/mappers/seal-batch.mapper.ts` (+ unseal-request / audit-entry mappers) — DTO → entity,
  same file-per-mapper convention as `academic-record.mapper.ts`.
- `infrastructure/repositories/academic-records-seal.repository.ts` — `'server-only'`, implements
  `IAcademicRecordsSealRepository`, calls `ACADEMIC_RECORDS_EP.*`, casts `as unknown as <Dto>` per
  `api-integration.md` (BE US-064 not shipped — this class exists for contract-readiness but is
  NOT wired into DI while `USE_MOCK=true`; safe to stub with `throw new Error("not-implemented")`
  bodies until US-064 ships, matching decision `0014` mock-first pattern used elsewhere).
- `infrastructure/repositories/mocks/academic-records-seal.mock.repository.ts` — in-memory Map
  keyed by `${classId}|${term}|${year}` (reuse `arBatchKey`-style helper), implements full behavior:
  - `getSealStatus` — reads fixture batch state.
  - `sealBatch` — mutates in-memory state to SEALED + stamps `sealedAt`/`sealedBy`; appends a
    `SealAuditEntry` (action `"SEAL"`).
  - `initiateUnseal` — guards target is SEALED (else `not-sealed`); pushes a `PENDING` `UnsealRequest`.
  - `confirmUnseal` — finds request by id; if `coSignerId === null` → self-approve fallback
    (`selfApproved: true`); marks `APPROVED`, mutates the underlying batch/term back to `UNSEALED`
    (align with `TermRecord.status`), appends `SealAuditEntry` (action `"UNSEAL"`, `entity_type:
    "record"` — per ADR 0037 §Decision-2, store as a fixed literal on the entry, matching
    US-E12.12 audit-log shape).
  - `listTenantAdmins` — returns fixture list; **expose a second fixture constant with exactly 1
    admin** (e.g. export `MOCK_SINGLE_ADMIN_TENANT` toggle or a second mock class
    `MockAcademicRecordsSealRepository_SingleAdmin` — prefer a constructor flag
    `new MockAcademicRecordsSealRepository({ adminCount: 1 })`) so Storybook / unit tests can
    exercise the AC-8 self-approve-fallback path deterministically.
- `infrastructure/repositories/mocks/fixtures.ts` (seal-specific, e.g.
  `seal-fixtures.ts` alongside existing `fixtures.ts` to avoid merge conflicts on the shared file) —
  port `AR_BATCHES` / `AR_SEED_ROSTERS` / `AR_SEED_UNSEAL` / `AR_CURRENT_ADMIN` /
  `AR_OTHER_ADMINS` shapes from `design_src/edu/academic-records.jsx` lines 12-113 into typed
  fixtures (`MOCK_SEAL_BATCHES: SealBatchStatus[]`, `MOCK_UNSEAL_REQUESTS: UnsealRequest[]`,
  `MOCK_TENANT_ADMINS: TenantAdminSummary[]`).
- `bootstrap/di/academic-records.di.ts` — EXTEND (additive, same file, do not fork):
  add `makeAcademicRecordsSealRepository()` (USE_MOCK branch same pattern as `makeRepository`)
  + `makeGetSealStatusUseCase`, `makeSealAcademicRecordUseCase`, `makeInitiateUnsealUseCase`,
  `makeConfirmUnsealUseCase`, `makeGetSealAuditTrailUseCase`, `makeListPendingUnsealRequestsUseCase`,
  `makeListTenantAdminsUseCase`.

**Test first (Vitest integration):**
`academic-records-seal.mock.repository.test.ts` — seal (ok / not-all-locked short-circuit happens
in use-case not repo, so repo test only covers already-SEALED idempotency at repo layer if
applicable), unseal-initiate (ok / not-sealed), unseal-confirm (ok-different-admin / self-approve
fallback when `adminCount === 1` / no-pending-request for unknown id), audit-trail (returns entries
in reverse-chron order), pending-requests (filters to `PENDING` only).

**Done when:** mock repo test green; matches Validation-table Integration row.

### Phase 3 — Presentation, i18n, Storybook

Component tree (`src/features/academic-records/presentation/academic-record-seal-screen/`):

```
academic-record-seal-screen.i-vm.ts        # ViewModel + Actions contract
academic-record-seal-container.tsx         # 'use client' — owns tab state, calls Actions, TanStack Query
academic-record-seal-screen.tsx            # tabs shell (Seal | Unseal), receives VM
class-term-year-selector.tsx               # composed selector (classId/term/year) — feature-local (1 screen so far)
all-locked-gate.tsx                        # OK banner (green) vs NOT-OK banner (warning, role="alert", AC-3/AC-10)
seal-confirm-dialog.tsx                    # shadcn Dialog wrapper, focus-trap (AC-10) — uses components/ui/dialog
unseal-initiate-form.tsx                   # reason textarea, live char-count vs 20-char min, submit disabled until valid
unseal-confirm-dialog.tsx                  # co-signer picker OR self-approve fallback warning (ADR 0037)
audit-trail-table.tsx                      # reuse components/ui/table primitive; columns per AC-6
academic-record-seal-skeleton.tsx          # AC-1 loading
academic-record-seal-screen.stories.tsx
```

- Reuse `seal-status-badge.tsx` (already in `academic-record-screen/`) for the
  SEALED/PENDING/UNSEALED chip — **promote** it to `components/shared/status-badge/` only if this
  screen and the viewer screen would otherwise diverge; first check whether its current API
  (single `TermStatus` prop) already fits verbatim — if yes, import directly, do NOT copy
  (`component-organization.md`).
- `class-term-year-selector.tsx` stays feature-local (only this screen uses it now); promote to
  `components/shared/` on 2nd use per decision `0026`.
- `.i-vm.ts` sketch:
  ```ts
  export interface AcademicRecordSealActions {
    getSealStatus: (key: SealBatchKey) => Promise<Result<SealBatchStatus>>;
    seal: (key: SealBatchKey) => Promise<Result<SealBatchStatus>>;
    getAuditTrail: () => Promise<Result<SealAuditEntry[]>>;
    getPendingUnsealRequests: () => Promise<Result<UnsealRequest[]>>;
    initiateUnseal: (input: InitiateUnsealInput) => Promise<Result<UnsealRequest>>;
    confirmUnseal: (requestId: string, coSignerId: string | null) => Promise<Result<{request: UnsealRequest; fallback: boolean}>>;
    listTenantAdmins: () => Promise<Result<TenantAdminSummary[]>>;
  }
  export interface AcademicRecordSealScreenVM {
    currentAdminId: string; currentAdminName: string; // from session, threaded via page.tsx
  }
  ```
- State classification: server state (seal status, audit trail, pending requests, tenant admins) →
  TanStack Query (`useQuery`/`useMutation`), query keys `["academic-records","seal-status",classId,term,year]`,
  `["academic-records","seal-audit-trail"]`, `["academic-records","unseal-requests","pending"]`,
  `["academic-records","tenant-admins"]`; invalidate seal-status + audit-trail on seal mutation success,
  invalidate pending-requests + audit-trail on confirm-unseal success. Selector (classId/term/year) = URL
  state (searchParams) so a direct link to a batch is shareable. Reason textarea = local form state.
  No Zustand.

**Route wiring** (`src/app/[locale]/t/[tenant]/(app)/admin/academic-records/`):
- `page.tsx` (RSC) — mirrors `admin/grades/approval/page.tsx`: resolve `currentAdmin` from session
  (reuse whatever `me`/session accessor `grades/approval` or `staff-leave` uses — grep
  `getAccessToken`/`decodeRoleClaim` or an existing `getCurrentUser` DI helper before adding a new
  one), thread `actions` object + `currentAdminId`/`currentAdminName` into
  `AcademicRecordSealContainer`. RBAC already enforced by `admin/layout.tsx`.
- `actions.ts` — `'use server'`, each action calls `requireRole(["admin"])` first (pattern identical
  to `admin/grades/approval/actions.ts`), then the matching `make*UseCase()` DI factory, returns
  `{ok,data}`/`{ok:false,errorKey}`.

**i18n** — new namespace `academicRecordSeal` in both `messages/vi.json` and `messages/en.json`
(add key-for-key, vi authoritative): `title`, `subtitle`, `tabs.seal`, `tabs.unseal`,
`selector.class/term/year`, `gate.allLocked.title/subtitle`, `gate.notAllLocked.title/warning`,
`gate.notAllLocked.linkToApproval`, `sealButton`, `sealDialog.title/body/confirm/cancel`,
`sealSuccess.toast`, `sealSuccess.sealedByLabel`, `auditTrail.columns.*`, `unseal.initiateButton`,
`unseal.reasonLabel`, `unseal.reasonMinLengthError` (>= 20 chars), `unseal.pendingBadge`,
`unseal.confirmDialog.title/coSignerLabel/confirm`, `unseal.selfApproveFallback.warning` (ADR 0037
prose), `unseal.sameAdminError`, `unseal.success.toast`, `errors.*` mapped 1:1 to
`AcademicRecordsFailure["type"]` union (not-all-locked, already-sealed, not-sealed,
reason-too-short, no-pending-request, same-admin-as-initiator, plus existing 4).

**Test first (Storybook interaction, per AC + Validation-table E2E row):**
`Loading` (AC-1) / `AllLockedGate_OK` (AC-2) / `AllLockedGate_NotOK` (AC-3, asserts disabled seal
button + link to grade-approval) / `SealConfirmDialog` (AC-4, focus-trap assertion for AC-10) /
`SealSuccess` (AC-5) / `AuditTrail` (AC-6) / `UnsealInitiate` (AC-7, reason < 20 chars keeps submit
disabled) / `UnsealConfirm` (AC-8, different admin succeeds) / `UnsealSameAdminError` (AC-8, same
admin → error dialog) / `UnsealSelfApproveFallback` (ADR 0037, single-admin fixture → warning
banner + audit log entry asserted via play-function query into the mock repo call log).

**Done when:** all Storybook stories interaction-tested + a11y checks (role="alert" on warning
banner, aria-label on lock icon per AC-10) pass; design-review gate ready.

### Phase 4 — RBAC + audit-log integration check (cross-cutting, do alongside Phase 3)

- Confirm `admin/layout.tsx` guard already covers this new route (it does — layout wraps all
  `/admin/*`); AC-9 test = Storybook/Playwright asserting non-admin role hits
  `evaluateAdminAccess` redirect (reuse existing `role-guard.test.ts` pattern, add a case if the
  route needs any route-specific nuance — expected: none, generic guard suffices).
- Every `SEAL`/`UNSEAL` mutation path (`sealBatch`, `confirmUnseal` incl. self-approve fallback)
  MUST append an audit entry inside the mock repo (Phase 2) with `entity_type: "record"`,
  `action: "SEAL"|"UNSEAL"` per ADR `0037` — verify via the audit-trail test asserting entry count
  increments after each mutation (no separate US-E12.12 feature module exists yet in
  `src/features/` — this story owns its own audit-trail slice; do not block on a
  not-yet-built shared audit-log feature).

### Open questions for fe-lead / ADR follow-up

- [OPEN QUESTION] ADR `0037` min-reason-length (10) vs AC-7 (20) — plan uses AC-7; recommend
  fe-lead annotate ADR 0037 with a superseding note rather than editing its historical Decision
  text.
- [OPEN QUESTION] Is there an existing `getCurrentUser`/session-identity DI helper to source
  `currentAdminId`/`currentAdminName` for `page.tsx`, or does this story need to add one (e.g.
  decode from JWT claim via `decodeRoleClaim`-adjacent helper)? Engineer should grep
  `bootstrap/lib/jwt.ts` / `bootstrap/auth-guard` before adding a new accessor.
- [OPEN QUESTION] `co-signer picker` UX (AC-8 says "vao trang -> thay yeu cau pending -> xac
  nhan", i.e. Admin 2 self-navigates, no active picker UI) vs ADR 0037 mentions "co-signer picker".
  Plan follows AC-8 (pending-list model, no picker) as the simpler + more testable spec;
  `confirmUnseal(requestId, coSignerId)` still accepts an explicit `coSignerId` so a picker can be
  added later without a contract change.
- [OPEN QUESTION] Real BE US-064 not shipped — `academic-records-seal.repository.ts` (Phase 2,
  real HTTP impl) is scaffolded per `api-integration.md` mock-first convention but stays unused
  while `USE_MOCK=true`; confirm with fe-lead whether to even scaffold it now vs defer entirely to
  when US-064 ships (YAGNI risk both ways — leaning toward scaffolding the DTOs+endpoint constants
  now since they're cheap and contract-documenting, deferring the repository class body).

## Component Architecture (fe-component-architect — Phase 3 finalized)

Refines the Phase 3 sketch above. Grepped `components/ui`, `components/shared`,
`features/academic-records/presentation/academic-record-screen/` (sibling viewer),
`features/grades/presentation/grade-approval-screen/` (pattern parity, admin
approve/lock pipeline) before proposing anything new. No new shadcn primitive
needed — `dialog`, `alert-dialog`, `sheet`, `table`, `textarea`, `select`, `tabs`
all already exist under `components/ui/`.

### Contract gaps found vs the Phase 3 draft (fixed here)

1. **Class-list source missing.** The mockup's class picker (`SealFilters`)
   derives its options by filtering a client-side batch map by
   `(term, year)` — there is no such query on
   `IAcademicRecordsSealRepository`. Added `listAvailableClasses(filter:
   { term, year }): Promise<Result<ClassOption[]>>` to the Actions contract
   (Phase 1/2 owners: add the matching repo method + mock fixture; cheap,
   same fixture data as `MOCK_SEAL_BATCHES` grouped by key prefix).
2. **Sealed-student picker source missing.** `initiateUnseal` targets a
   specific `studentId` (per AC-8's `UnsealRequest.studentId`), but nothing
   in the domain/infra plan lists which sealed students are eligible to pick
   from (mockup's `ALL_SEALED_STUDENTS`). Added
   `listSealedStudents(filter?: Partial<SealBatchKey>): Promise<Result<SealedStudentOption[]>>`.
   Flag for `fe-lead`: confirm this is in-scope for E14.6 vs. the unseal
   trigger instead originating from the (already-built) US-E14.5 record
   viewer with the target pre-selected — either way the contract below works
   (the initiate form just needs `sealedStudentOptions` pre-filtered to one
   entry in the viewer-origin case).
3. **Scope trim vs. the mockup:** dropped the mockup's per-student
   `SealRoster` table + `RecordSnapshotSheet` (frozen grade drill-down) —
   no AC (AC-1..AC-11) requires a per-student roster or snapshot on *this*
   screen; AC-2/AC-3 only need the aggregate counts already on
   `SealBatchStatus` (`totalStudents`, `unlockedStudents`). Per-student
   frozen-record viewing is US-E14.5's job. Avoids scope creep + duplicate
   read surface for the same data.
4. **Two distinct unseal-confirm dialogs, not one.** The draft's single
   `unseal-confirm-dialog.tsx` doing "co-signer picker OR self-approve
   fallback" conflates two different action semantics: AC-8's same-admin
   case is a **blocking error** (no path forward, just acknowledge), while
   the ADR-0037 single-admin fallback is a **warning that still proceeds**
   on confirm. Split into `unseal-same-admin-dialog.tsx` (alert-only) and
   `unseal-self-approve-dialog.tsx` (confirm/cancel with the audit-entry
   preview block from the mockup) so each has one unambiguous action and a
   dedicated Storybook story per the Validation-table E2E row.

### Final component tree

```
src/features/academic-records/presentation/academic-record-seal-screen/
├── academic-record-seal-screen.i-vm.ts        # ViewModel + Actions contract (RSC↔client boundary)
├── academic-record-seal-container.tsx         # 'use client' — CONTAINER. Owns tab/selector/dialog
│                                               #   open-state, TanStack Query (queries+mutations),
│                                               #   builds AcademicRecordSealScreenVM, renders <AcademicRecordSealScreen vm={vm} />
├── academic-record-seal-screen.tsx            # 'use client' — PRESENTATIONAL shell. Props: { vm }.
│                                               #   Renders breadcrumb/title + Tabs (ui/tabs) + SealTab | UnsealTab.
│                                               #   Renders <AcademicRecordSealSkeleton /> when vm.isLoading (AC-1).
├── academic-record-seal-skeleton.tsx          # PRESENTATIONAL, no props — AC-1
├── components/
│   ├── class-term-year-selector.tsx           # PRESENTATIONAL, CONTROLLED — feature-local (confirmed below)
│   ├── seal-tab.tsx                           # PRESENTATIONAL — composes selector + AllLockedGate + SealConfirmDialog. Props: { vm: SealTabVM }
│   ├── all-locked-gate.tsx                    # PRESENTATIONAL — OK (green) vs NOT-OK (warning) banner, AC-2/AC-3/AC-10
│   ├── seal-confirm-dialog.tsx                # PRESENTATIONAL, CONTROLLED — wraps ui/dialog, AC-4. Radix Dialog gives focus-trap for free (AC-10)
│   ├── audit-trail-table.tsx                  # PRESENTATIONAL — AC-6, feature-local (confirmed below)
│   ├── unseal-tab.tsx                         # PRESENTATIONAL — composes toolbar + pending/resolved lists + initiate form + the two confirm dialogs. Props: { vm: UnsealTabVM }
│   ├── unseal-request-card.tsx                # PRESENTATIONAL — one pending/resolved request row (AC-8)
│   ├── unseal-initiate-form.tsx               # PRESENTATIONAL, CONTROLLED — wraps ui/sheet (slide-over, matches mockup's CreateUnsealSheet); student select + reason textarea + live 20-char counter (AC-7)
│   ├── unseal-same-admin-dialog.tsx           # PRESENTATIONAL, CONTROLLED — wraps ui/alert-dialog, AC-8 blocking error
│   └── unseal-self-approve-dialog.tsx         # PRESENTATIONAL, CONTROLLED — wraps ui/alert-dialog, ADR-0037 fallback (warn + proceed)
└── academic-record-seal-screen.stories.tsx
```

Query-key ownership (`academic-record-seal-keys.ts`, mirrors
`grade-approval-keys.ts`) and the exact `useQuery`/`useMutation` wiring inside
the container are `fe-state-engineer`'s call — this doc only fixes the
container/presentational **boundary** (props in/out) and the VM shape it must
produce.

### `academic-record-seal-screen.i-vm.ts` (ready to paste)

```ts
import type {
  SealBatchKey,
  SealBatchStatus,
  SealAuditEntry,
  UnsealRequest,
  TenantAdminSummary,
} from "../../domain/entities/seal-batch.entity";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";

type Term = "HK1" | "HK2";

/** Stable result shape returned by every seal/unseal Server Action. */
export type SealActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errorKey: AcademicRecordsFailure["type"] };

export interface ClassOption {
  classId: string;
  className: string;
}

export interface SealedStudentOption {
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  sealedAt: string; // ISO — for the "Sealed <date>" hint in the picker
}

export interface InitiateUnsealInput {
  studentId: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
}

/** Server Action signatures the container invokes (passed as props from page.tsx). */
export interface AcademicRecordSealActions {
  listAvailableClasses: (filter: {
    term: Term;
    year: string;
  }) => Promise<SealActionResult<ClassOption[]>>;
  getSealStatus: (
    key: SealBatchKey,
  ) => Promise<SealActionResult<SealBatchStatus>>;
  seal: (key: SealBatchKey) => Promise<SealActionResult<SealBatchStatus>>;
  getAuditTrail: (
    key?: Partial<SealBatchKey>,
  ) => Promise<SealActionResult<SealAuditEntry[]>>;
  listSealedStudents: (
    filter?: Partial<SealBatchKey>,
  ) => Promise<SealActionResult<SealedStudentOption[]>>;
  getPendingUnsealRequests: () => Promise<SealActionResult<UnsealRequest[]>>;
  initiateUnseal: (
    input: InitiateUnsealInput,
  ) => Promise<SealActionResult<UnsealRequest>>;
  confirmUnseal: (
    requestId: string,
    coSignerId: string | null,
  ) => Promise<SealActionResult<{ request: UnsealRequest; fallback: boolean }>>;
  listTenantAdmins: () => Promise<SealActionResult<TenantAdminSummary[]>>;
}

/** page.tsx (RSC) → AcademicRecordSealContainer props. */
export interface AcademicRecordSealContainerProps {
  actions: AcademicRecordSealActions;
  currentAdminId: string;
  currentAdminName: string;
}

export type SealTabId = "seal" | "unseal";

// ── Per-tab ViewModels (built by the container from TanStack Query state) ────

export interface SealTabVM {
  year: string;
  term: Term;
  classId: string | null;
  classOptions: ClassOption[];
  isClassOptionsLoading: boolean;
  onYearChange: (year: string) => void;
  onTermChange: (term: Term) => void;
  onClassChange: (classId: string) => void;

  batch: SealBatchStatus | null;
  isBatchLoading: boolean;
  batchError: AcademicRecordsFailure["type"] | null;

  isConfirmDialogOpen: boolean;
  onOpenConfirmDialog: () => void;
  onCloseConfirmDialog: () => void;
  onConfirmSeal: () => void;
  isSealing: boolean;

  auditTrail: SealAuditEntry[];
  isAuditTrailLoading: boolean;
}

export interface UnsealTabVM {
  currentAdminId: string;
  currentAdminName: string;
  tenantAdminCount: number; // drives the self-approve-fallback affordance (ADR 0037)

  pendingRequests: UnsealRequest[];
  resolvedRequests: UnsealRequest[];
  isRequestsLoading: boolean;

  isInitiateFormOpen: boolean;
  onOpenInitiateForm: () => void;
  onCloseInitiateForm: () => void;
  sealedStudentOptions: SealedStudentOption[];
  isSealedStudentOptionsLoading: boolean;
  onSubmitInitiate: (input: InitiateUnsealInput) => void;
  isInitiating: boolean;

  /** Admin2 confirms from the pending list (AC-8) — no active co-signer picker. */
  onConfirmRequest: (requestId: string) => void;
  isConfirming: boolean;
  /** Non-null → same-admin-as-initiator (AC-8); opens UnsealSameAdminDialog. */
  sameAdminErrorRequestId: string | null;
  onDismissSameAdminError: () => void;

  /** Non-null → opens UnsealSelfApproveDialog (ADR 0037 fallback, adminCount === 1). */
  selfApproveTargetRequestId: string | null;
  onRequestSelfApprove: (requestId: string) => void;
  onDismissSelfApprove: () => void;
  onConfirmSelfApprove: (requestId: string) => void;
}

export interface AcademicRecordSealScreenVM {
  activeTab: SealTabId;
  onTabChange: (tab: SealTabId) => void;
  pendingUnsealCount: number; // tab badge

  currentAdminName: string; // "signed in as" chip in the header
  isLoading: boolean; // AC-1 — true while the initial fetch is in flight
  error: AcademicRecordsFailure["type"] | null;

  seal: SealTabVM;
  unseal: UnsealTabVM;
}
```

### Prop interfaces — new presentational components

```ts
// class-term-year-selector.tsx
export interface ClassTermYearSelectorProps {
  year: string;
  term: "HK1" | "HK2";
  classId: string | null;
  classOptions: ClassOption[];
  isClassOptionsLoading: boolean;
  onYearChange: (year: string) => void;
  onTermChange: (term: "HK1" | "HK2") => void;
  onClassChange: (classId: string) => void;
}

// all-locked-gate.tsx
export interface AllLockedGateProps {
  batch: SealBatchStatus; // batch.allLocked branches OK vs NOT-OK internally
  onSeal: () => void; // OK branch — opens SealConfirmDialog
  onGoToApproval: () => void; // NOT-OK branch — link to E14.4 grade-approval route
}

// seal-confirm-dialog.tsx
export interface SealConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: SealBatchStatus;
  isPending: boolean;
  onConfirm: () => void;
}

// audit-trail-table.tsx
export interface AuditTrailTableProps {
  entries: SealAuditEntry[];
  isLoading: boolean;
}

// unseal-request-card.tsx
export interface UnsealRequestCardProps {
  request: UnsealRequest;
  currentAdminId: string;
  readonly: boolean; // true for the "Resolved" section
  onConfirm: (requestId: string) => void;
  onRequestSelfApprove: (requestId: string) => void;
  isConfirming: boolean;
}

// unseal-initiate-form.tsx
export interface UnsealInitiateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentOptions: SealedStudentOption[];
  isStudentOptionsLoading: boolean;
  isPending: boolean;
  onSubmit: (input: InitiateUnsealInput) => void;
}

// unseal-same-admin-dialog.tsx
export interface UnsealSameAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// unseal-self-approve-dialog.tsx
export interface UnsealSelfApproveDialogProps {
  open: boolean;
  request: UnsealRequest | null;
  currentAdminId: string;
  currentAdminName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (requestId: string) => void;
}
```

### Reuse strategy — verdicts

| Component | Verdict | Reasoning |
| --- | --- | --- |
| `seal-status-badge.tsx` | **Reuse verbatim, import from `academic-record-screen/`** — do NOT copy or promote yet. | Its API (`{ sealed: boolean }`) already fits every place this screen needs a sealed/unsealed chip. Only 2 call sites exist (this screen + the viewer) and both are in the same `academic-records` feature module, so `component-organization.md`'s "promote to `components/shared/` on 2nd use" trigger is about **cross-feature** reuse — a same-feature import isn't a duplication risk. Promote later only if a 3rd feature (outside `academic-records`) needs it. |
| `class-term-year-selector.tsx` | **Confirmed feature-local** (`presentation/academic-record-seal-screen/components/`), per Phase 3 draft. | Grepped `components/shared/` and the rest of `features/*/presentation/` for any class+term+year combo picker — none exists (grade-approval filters by status only, not class/term/year). Exactly one caller today. Promote to `components/shared/` the moment a 2nd screen (e.g. a future grade-export or report-card screen) needs the same triple selector — move, don't copy. |
| `audit-trail-table.tsx` | **Confirmed feature-local.** | `SealAuditEntry` shape (`classId/term/year/actorName/action/occurredAt`) is specific to this story's seal/unseal audit slice (Phase 4 note: this story owns its own audit-trail slice, no shared US-E12.12 feature module exists yet). Wraps the generic `components/ui/table` primitive (already reused) but the column set + row-rendering logic is local. Revisit only once a shared audit-log feature (US-E12.12) ships and a generic `AuditLogTable` shape emerges — do not pre-abstract now (YAGNI, `design-system.md`'s "no over-abstraction until 3+ instances"). |

### Composition & variant notes

- `seal-confirm-dialog.tsx`, `unseal-same-admin-dialog.tsx`,
  `unseal-self-approve-dialog.tsx` are controlled (`open`/`onOpenChange`) —
  state lives in the container, not inside the dialogs, matching
  `revision-request-dialog.tsx`'s pattern in `grade-approval-screen/`.
- `unseal-initiate-form.tsx` uses `components/ui/sheet` (Radix `Sheet` =
  `Dialog` primitive under the hood → same focus-trap guarantee) instead of
  a plain `Dialog`, matching the mockup's slide-over `CreateUnsealSheet` and
  this team's established "Sheet for panels" convention (messaging feature).
- No `cva` variant needed on any `ui/` primitive — `all-locked-gate.tsx`'s
  OK/NOT-OK branching is a **presentational component with two return
  branches**, not a primitive variant (it composes `StatusBadge`/icons/
  `Button`, it doesn't restyle one).
- `Result<T>` pattern in the domain (Phase 1) stays a **domain-internal**
  type; presentation only ever sees `SealActionResult<T>` (`{ok,data}` /
  `{ok:false,errorKey}`) returned by the Server Actions in
  `AcademicRecordSealActions` — same boundary convention as
  `GradeApprovalActions`/`ActionResult` in `grade-approval-screen.i-vm.ts`.

### Accessibility contract (AC-10 + `.claude/rules/accessibility.md`)

| Node | Requirement |
| --- | --- |
| `all-locked-gate.tsx` NOT-OK banner | `role="alert"` on the banner container (AC-10); the lock/warning icon is `aria-hidden` (decorative, message is in the text), matching `SealStatusBadge`'s existing `aria-hidden` icon pattern. |
| Lock icon used standalone (e.g. tab badge icon, unseal-request-card icon) | Per AC-10 "lock icon co aria-label" — any lock icon that is **not** paired with adjacent visible text needs `aria-label` (e.g. `<Icon aria-label={t("ariaLocked")} />`); icons inside a `Badge`/button that already has a visible text label stay `aria-hidden` (redundant announcement otherwise, per `SealStatusBadge`'s pattern of aria-label on the wrapping `StatusBadge`, `aria-hidden` on the inner icon). |
| `seal-confirm-dialog.tsx`, `unseal-same-admin-dialog.tsx`, `unseal-self-approve-dialog.tsx` | Radix `Dialog`/`AlertDialog` (via `components/ui/dialog` and `components/ui/alert-dialog`) provide focus-trap + `role="dialog"`/`role="alertdialog"` + `Esc`-to-close out of the box (AC-10) — do not override `onOpenAutoFocus`/`onEscapeKeyDown` without a reason. First focusable element on open = the primary action button (seal/confirm), matching `revision-request-dialog.tsx`. |
| `unseal-initiate-form.tsx` reason `Textarea` | `<Label htmlFor>` bound id; `aria-invalid` + `aria-describedby` pointing at the char-count/error text when `< 20` chars and the user has attempted submit — same pattern as `revision-request-dialog.tsx`'s `MIN_REVISION_NOTE_LENGTH` handling. |
| `class-term-year-selector.tsx` selects | Each `Select` has a bound `<Label>` (Năm học / Học kỳ / Lớp) — no bare `<select>` without a label. |
| Seal/unseal action buttons | Icon-only affordances (if any, e.g. a close "x" on the sheet) get `aria-label`; text buttons ("Niêm phong học bạ", "Xác nhận mở", …) need no extra label — visible text suffices. |
| Tab badge (pending-unseal count) | Announce via visually-hidden text or `aria-label` on the `TabsTrigger` (e.g. `aria-label={t("unsealTabWithCount", {count})}`) so screen readers get "Yêu cầu mở học bạ, 2 chờ xác nhận" rather than just reading the bare number. |

All strings above go under i18n namespace `academicRecordSeal` per AC-11 — no new namespace needed.
