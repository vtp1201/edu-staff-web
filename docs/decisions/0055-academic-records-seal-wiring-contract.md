# 0055 Academic-records seal wiring contract — real batch-seal, permanently-blocked unseal + viewer

Date: 2026-07-16

## Status

Accepted

## Context

US-E18.13 (epic `E18-be-wiring`) wires `academic-records` to the real `core`
service. Ground-truthing `edu-api/services/core/docs/openapi.yaml` (lines
~3583–3761, `AcademicRecords` tag) plus the Go source
(`internal/assessment/core/application/usecase/{seal_academic_record,
request_unseal,approve_unseal}.go`, `domain/entity/unseal_request.go`,
`domain/error/academic_record.go`) against the web's mock-first model
(`IAcademicRecordsRepository` viewer + `IAcademicRecordsSealRepository` admin
seal/unseal, both from US-E14.5/US-E14.6) found drift beyond the epic table's
one-line summary ("BE seal theo class+term; ... unseal-requests+approve;
seal-status/sealed-students/audit-trail giữ mock").

1. **Seal action matches almost exactly what the web already models.** The
   real endpoint is `POST /classes/{classId}/terms/{termId}/academic-records/seal`
   — a class+term batch, same shape as the web's existing `SealBatchKey`
   (`{classId, term, year}` minus `year`, which the real contract doesn't
   need — `termId` alone scopes it, matching US-E18.1's calendar term model).
   Response is `{sealedCount, failedCount, errors[]}` (per-student string
   messages, not structured), a plain success-report — no per-student status
   detail beyond a free-text error string.
2. **Seal is idempotent, NOT blocked on re-seal.** `Seal()` on an already-
   `SEALED` record is explicitly allowed and increments `resealCount` (capped
   at 5, `ACADEMIC_RECORD_TOO_MANY_RESEALS` at the cap). The web's current
   `SealAcademicRecordUseCase` treats "already sealed" as a hard blocking
   error (`already-sealed`) before ever calling the repo — this is *more*
   restrictive than the real workflow and must be dropped in favor of the
   real idempotent behavior (this is a correction, not a "weakening" of
   validation — the real backend was always going to allow it; the client
   was wrong to have invented a stricter block).
3. **The "all grades LOCKED" pre-check has no dedicated read endpoint.**
   There is no `seal-status` GET on the wire at all — the real `Seal` call
   itself does the check server-side and returns `422
   ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST` if any grade entry for the
   class+term isn't `LOCKED`. The web's current design calls a (mocked)
   `getSealStatus` *before* attempting the seal and blocks client-side with
   `not-all-locked`. Mirrors the exact precedent from US-E18.11's whole-school
   conflict check → per-slot `409 TIMETABLE_TEACHER_CONFLICT`: the proactive
   client pre-check has no wire source, so the gate moves to a **reactive**
   error surfaced from the real POST's response.
4. **The unseal workflow's two POST endpoints exist, but there is NO GET to
   list pending requests.** `openapi.yaml` defines exactly two methods for
   the unseal surface: `POST .../unseal-requests` (create) and
   `POST /academic-records/unseal-requests/{requestId}/approve`. There is no
   `GET .../unseal-requests` anywhere in the spec (confirmed by a full-file
   grep for `unseal-requests` — only the two `POST` blocks reference it).
   The entire point of the two-admin async confirmation (Admin A requests
   now; Admin B, in a different session — possibly a different day —
   discovers the pending request and approves it) depends on a second admin
   being able to **discover** the `requestId` without already knowing it.
   With no listing endpoint, that discovery is impossible against the real
   backend — the real POST/approve endpoints exist but are practically
   unreachable for the multi-session workflow the feature exists to serve.
   This is the same shape of gap as cross-repo asks #6/#7/#9/#13/#15/#18/#20
   (a recurring "no listing/discovery endpoint" class of gap), now confirmed
   an 7th time for academic-records specifically.
5. **`listTenantAdmins()` (used by the client-side self-approve-fallback gate,
   ADR `0037`) has no wire source either** — IAM has no member-listing
   endpoint at all (cross-repo ask #7, MAJOR). Separately: the real BE does
   **not** enforce the two-admin gate server-side at all —
   `UnsealRequest.Approve()` unconditionally allows `approverID ==
   requestedBy`, only setting `selfApproved: true` as an audit flag. The
   web's ADR-0037 hard client-side gate (blocking self-approve unless the
   tenant has exactly one admin) is *stricter* than what the real backend
   permits — this is intentional defense-in-depth for the Nghị định 13/2023
   two-admin compliance requirement, and is kept even though it can never be
   wired to a real admin-count check (no source) — see Decision §3.
6. **The read-only viewer (`getRecord`/`listYears`, powering the student/
   parent `academic-record-screen`) has no wire equivalent at all.** The real
   `AcademicRecordResponse` is keyed by `(classId, termId, studentMemberId)`
   — no `yearId`/`yearLabel` grouping concept exists anywhere on the wire
   (`ListStudentAcademicRecordsResponse` is a flat array of these, one per
   class-term, with no year field to group by). `GradeSnapshotItemResponse`
   is a dynamic array of `{subjectId, columnId, columnName, columnType,
   coefficient, value}` entries (matching US-E18.7's real, dynamic assessment
   column model) — there is no fixed `tx1`/`tx2`/`giuaKy`/`cuoiKy` slot
   concept, which the web's entire multi-year timeline UI is built around.
   Student identity fields (`studentName`/`studentCode`/`dateOfBirth`) are
   not present on this endpoint, and (per ask #9, confirmed again) there is
   no batch/by-id profile lookup for an arbitrary student. `currentClassId`/
   `currentSchoolYear` also have no self-scope discovery source for
   STUDENT/PARENT roles (ask #15's gap, confirmed again).

## Decision

Split by wireability, matching the epic's established pattern (`0053` grade-
scale, `0054` grades):

- **`sealBatch` → wired REAL** against `POST .../academic-records/seal`. The
  hard "not all locked" / "already sealed" gates move from a client-side
  pre-check (against mocked data) to **reactive** failures surfaced from the
  real call's response: new `unlocked-grades-exist` (422) replaces
  `not-all-locked`; `already-sealed` is **dropped** as a blocking gate
  (idempotent reseal is now allowed, matching the real contract); new
  `too-many-reseals` (422, cap 5) is added. `getSealStatus` stays mocked and
  is re-scoped to **decorative-only** display (an approximate "X/Y locked"
  hint before the admin clicks Seal) — never a hard gate — and is clearly
  labeled as such in the ViewModel/ownership boundary so a future maintainer
  doesn't mistake it for authoritative.
- **The entire unseal workflow (`initiateUnseal`, `confirmUnseal`,
  `getPendingUnsealRequests`, `listTenantAdmins`) stays a FORCE-MOCKED
  permanently-blocked stub**, regardless of `USE_MOCK` — the epic's fourth
  fully-blocked operation set after `staff-leave.di.ts` (US-E18.8),
  `teaching-plan.di.ts` (US-E18.9), and timetable's student/parent self-view
  (US-E18.11). Reason: `initiateUnseal` alone COULD be fired for real (its
  response is self-contained: `requestId`/`status`/`createdAt`), but doing so
  while the pending-requests list it must appear in stays mock-sourced would
  create a real request that no session (including the initiator's own,
  post-reload) could ever discover or approve for real — strictly worse than
  staying consistently mock. The real, ground-truthed 5-code error taxonomy
  for this surface (`ACADEMIC_RECORD_ALREADY_SEALED`,
  `ACADEMIC_RECORD_NOT_SEALED`, `UNSEAL_REASON_REQUIRED`,
  `UNSEAL_REQUEST_NOT_FOUND`, `UNSEAL_REQUEST_ALREADY_APPROVED`) is kept in
  the repository's dormant real-mode branch, unit-tested, for the day a
  listing endpoint unblocks it.
- **The viewer repository (`IAcademicRecordsRepository`) stays a FORCE-
  MOCKED permanently-blocked stub** — the epic's fifth such factory. No
  redesign of the multi-year timeline UI is in scope for this US (that would
  be a `uiux`/`ba`-level model change, not an `fe`-wiring remap); the screen
  keeps its current mock-backed behavior unchanged.
- ADMIN/MANAGER role gate for `sealBatch` (`isAdmin(IsSuperAdmin,
  ActorRoles)`, ground-truthed from `seal_academic_record.go` line 57) is
  enforced server-side; the web keeps its existing client-side role gate on
  the seal screen as defense-in-depth (unchanged pattern from every prior
  US in this epic).

## Alternatives Considered

1. Fan out a full-tenant scan to rebuild a pending-unseal-requests list
   (e.g. iterate every sealed record and probe for a request). Rejected — no
   endpoint exists to even enumerate "all sealed records," let alone probe
   each one for a pending unseal request; unbounded cost with no natural
   entry point (same class of rejection as US-E18.5/US-E18.8/US-E18.9's fan-
   out gaps).
2. Wire `initiateUnseal` for real while keeping `getPendingUnsealRequests`
   mocked, accepting that a real request becomes invisible. Rejected — this
   silently loses the audit-relevant unseal request BE-side (compliance
   surface, Nghị định 13/2023) while the UI still shows a fabricated pending
   list; worse than staying honestly mock end-to-end.
3. Drop the client-side two-admin/self-approve-fallback gate (ADR 0037)
   since the real BE doesn't enforce it. Rejected — this compliance gate is
   a deliberate web-side hardening for a legal audit requirement, independent
   of what the BE happens to allow; removing it would be a genuine
   regression, not a wiring correction.

## Consequences

Positive:

- The one action genuinely central to "seal" (batch-sealing a class+term) —
  and the one most exposed to concurrent-admin race risk — runs on the real
  contract with a correct, reactive, idempotent-aware error surface.
- The unseal workflow and viewer stay honestly mock (documented, ground-
  truthed error taxonomy ready) instead of a partially-real screen built on
  a request nobody could ever discover.

Tradeoffs:

- `getSealStatus`'s "X/Y locked" hint becomes explicitly decorative/
  approximate — must be labeled as such in the VM so a future change doesn't
  treat it as authoritative.
- Unseal workflow and viewer remain mock-first indefinitely, same category
  as staff-leave/teaching-plan — this US does not close the epic's seal
  story fully end-to-end, only the batch-seal action itself.

## Follow-Up

Cross-repo ask (added to `EPIC-OVERVIEW.md` §Cross-repo requests, #21): add a
`GET /api/v1/classes/{classId}/terms/{termId}/academic-records/unseal-requests`
(or tenant-wide) listing endpoint — without it, the unseal two-admin
confirmation workflow cannot be wired to the real backend at all, regardless
of how the two existing `POST` endpoints are used.
