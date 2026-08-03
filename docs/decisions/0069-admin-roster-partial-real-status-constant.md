# 0069 Admin roster: getClassRoster real (name/dob/gender decoration), status is a constant, search pool stays separately mocked

Date: 2026-08-03

## Status

Accepted

## Context

`src/features/admin-roster`'s `getClassRoster`/`getSearchPool` were both
permanently mock-first (US-E18.5, cross-repo ask #7/#9) because
`GET /classes/{classId}/students` (`EnrollmentResponse`) carries only
`enrollmentId`/`classId`/`studentMemberId`/`academicYearLabel`/`enrolledAt` —
no name/dob/gender/status — and IAM previously had no batch/by-id lookup any
admin caller could use to resolve display fields.

BE US-167/US-169 (2026-08 batch) closed the IAM half of this gap: the same
tiered `GET /members?ids=` batch lookup US-E18.33 already wired for grades/
timetable now ALSO returns `dob`/`gender` for a staff-tier caller (ADMIN is
staff-tier). This lets `getClassRoster` compose `core`'s enrollment list
(authority for WHICH students, cursor-paginated) with `iam-directory`'s
`BatchResolveMembersUseCase` (decoration: name/dob/gender) — the same pattern
US-E18.33 established for `ParentChildListRepository`.

Two things this composition surfaced that need a durable record:

1. **`status` (active/transferred) has no wire source at all.**
   `EnrollmentResponse` has no status field, and unenrolling/transferring a
   student is a HARD DELETE of the enrollment row
   (`RemoveStudentFromClassUseCase` → `enroll.Remove(...)`, BE ADR 0049) — a
   transferred student's row simply stops appearing in the list. So "returned
   by this endpoint" IS "currently enrolled" by construction; there is no
   wire signal to distinguish anything else.
2. **`getSearchPool` is a genuinely SEPARATE, still-open gap** — no core
   endpoint exists for the unassigned-student search pool at all (unrelated
   to the dob/gender/name resolution this story closes). It stays
   permanently mocked, now for a narrower and more precisely-scoped reason
   than before.

## Decision

- `bootstrap/di/admin-roster.di.ts`'s `getClassRoster` flips to
  `USE_MOCK ? Mock : Real`, composing `core`'s enrollment list with
  `iam-directory`'s `BatchResolveMembersUseCase` (reused, not duplicated).
- Every REAL-mode roster row's `status` is the constant `"active"` — this is
  not an approximation or a default, it is the correct semantics of the
  endpoint (a hard-delete-on-unenroll model has no other status to report).
  `"transferred"` remains a real, reachable value ONLY in mock mode (which
  models a richer, hypothetical soft-delete state for demo/dev purposes) —
  this asymmetry between mock and real is deliberate and documented, not a
  bug to reconcile.
- `getSearchPool` stays permanently mock-first, now understood as a fully
  independent gap from the one this story closes (no core endpoint for the
  unassigned-student pool exists at all) — do not conflate the two blockers
  in future references.
- A student "code"/"studentNumber" field does not exist in ANY BE contract
  (core or iam) — rather than print a raw member uuid under a "Mã học sinh"
  column, the field is optional and absent in real mode, rendering the same
  shared "data legitimately absent" marker (`components/shared/absent-value/`,
  promoted in this same story from two near-duplicate feature-local
  components) used for missing dob/gender.
- IAM's `gender: OTHER` value has no dedicated design-system tone; it reuses
  the existing neutral badge pair (no new token minted) with the letter +
  `aria-label` carrying the actual meaning. A dedicated tone/token for this
  value is a product/design decision, not made here — flagged as a
  follow-up, not invented unilaterally.

## Alternatives Considered

1. **Infer "transferred" client-side** (e.g. by diffing against a previous
   fetch, or a heuristic on `enrolledAt`). Rejected — there is no reliable
   signal; a hard-deleted row simply vanishes, so there is nothing to diff
   against a stale local cache that would be meaningfully more correct than
   "not present."
2. **Keep `getClassRoster` mock-first until `getSearchPool`'s gap also
   closes**, to avoid a screen with a mixed real/mock data model. Rejected —
   the roster LIST (browsing/viewing, the majority of the screen's traffic)
   is now genuinely real and valuable; gating it on an unrelated blocker
   (the search pool used only by the enroll/transfer sub-flow) would
   needlessly delay real value.
3. **Invent a design token for `gender: OTHER`** unilaterally. Rejected —
   this is a product/design call (what tone communicates "other" without
   implying a value judgment), correctly escalated rather than decided by
   an engineering story.

## Consequences

Positive:
- Admin (and principal, via the read-only US-E13.10 reuse) roster screens
  show real, correctly-attributed students in production, with honest
  placeholders for legitimately-missing PII — no invented data, no raw uuids
  rendered as names/codes.
- `components/shared/absent-value/` is now the single canonical "data
  legitimately absent, not an error" marker for the whole app (promoted from
  2 near-duplicate copies found in this and the moderation story), available
  to any future feature with the same need.
- The mock/real `status` asymmetry is a DOCUMENTED, deliberate choice, not a
  silent gap a future engineer might "fix" by trying to invent a status
  signal that doesn't exist on the wire.

Tradeoffs:
- Enroll/unenroll/transfer (the write side) stays unusable against a live
  backend until `getSearchPool`'s separate gap closes (cross-repo ask #9
  remains open).
- No student code/number is shown for a real-mode student — a UI regression
  from the mock's invented field, but an honest one (the field never existed
  on any contract).
- `gender: OTHER` has a generic neutral badge rather than a dedicated tone,
  pending a product decision.

## Follow-Up

- Cross-repo ask: `core`'s `ListStudentsInClassUseCase.authorize()` has no
  MANAGER branch (principal's roster read 403s tenant-wide) — same recurring
  "MANAGER missing from a specific use case's RBAC allow-list" pattern as
  asks #39/#43; filed as a new numbered ask.
- Cross-repo ask #9 (`getSearchPool`, unassigned-student search pool
  endpoint) remains open, now understood as fully independent of the
  dob/gender/name gap this story closed.
- Product decision needed: a dedicated design-system tone for
  `gender: OTHER`, and whether a student-facing "code"/number field should
  exist on any BE contract at all.
