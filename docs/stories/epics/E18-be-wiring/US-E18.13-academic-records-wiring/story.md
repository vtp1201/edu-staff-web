# US-E18.13 Academic-records seal remap — real batch-seal, permanently-blocked unseal + viewer

## Status

in-progress

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

_To be filled in by `fe-planner` — see delegation below._

## Test Matrix

See `docs/TEST_MATRIX.md` US-E18.13 row (added `planned`, before any code,
per `.claude/rules/tdd.md`).

## Evidence

_Filled in on completion — gate verdicts, proof counts, harness update._
