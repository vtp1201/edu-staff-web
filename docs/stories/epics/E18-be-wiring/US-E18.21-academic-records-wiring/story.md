# US-E18.21 Academic-records viewer — close ADR 0055 force-mock follow-up

## Status

planned

## Lane

normal (in-repo hardening, zero UI/domain/behavior change for any real user;
narrows an already-latent dead-code path — reduces risk, doesn't introduce
auth/RBAC/token/PII/new-token exposure).

## Scope

Re-ground-truthed the `core` service's `AcademicRecords` tag
(`edu-api/services/core/docs/openapi.yaml` lines ~3585–3761 +
`academic_record_handler.go`/`routes.go`) per this US's brief, confirming BE
now exposes: `POST .../unseal-requests` (create), `POST
/unseal-requests/{requestId}/approve`, `GET
.../students/{studentId}/academic-record` (single record), `GET
/members/{memberId}/academic-records` (list-by-member). **This exact ground
truth was already fully analyzed by US-E18.13 / ADR `0055`** (dated
2026-07-16/17, same 4 endpoints, same conclusion) — nothing new to wire:

- Seal (`sealBatch`) — already wired REAL (US-E18.13). Untouched.
- Unseal create+approve — real endpoints exist but there is still **no GET
  listing endpoint** for pending unseal requests (confirmed again, full-file
  grep). Wiring create+approve while the pending list stays mock-sourced
  would create a real request no session could ever discover/approve, or
  worse, let a UI showing mock-fabricated pending requests fire a real
  `approve` call against a fake mock `requestId` (would 404). ADR 0055
  §Alternatives #2 already rejected this exact shape. **Stays force-mocked.**
- Viewer (`getRecord`/`listYears`) — real `AcademicRecordResponse` is keyed
  by `(classId, termId, studentMemberId)` with a dynamic `gradeSnapshot`
  column array (`GradeSnapshotItemResponse`), no year-grouping concept, no
  fixed `tx1`/`tx2`/`giuaKy`/`cuoiKy` slots, no student-identity fields. The
  member-list endpoint (`GET /members/{memberId}/academic-records`) is a flat
  array of the same per-class-term shape — it does NOT restore a year index
  either. Remapping the viewer's multi-year gradebook UI to this shape is a
  `uiux`/`ba`-level model redesign, not a wiring remap (unchanged conclusion
  from ADR 0055 §Context point 6). **Stays mock.**

**The one genuine gap ADR 0055 left open** (§Follow-Up, internal, not
cross-repo): `makeRepository()` in `academic-records.di.ts` (the viewer
factory) was `USE_MOCK ? mock : real` — i.e., NOT force-mocked, unlike the
established permanently-blocked-DI-factory pattern (`staff-leave.di.ts`,
`teaching-plan.di.ts`, `feed.di.ts`/`moderation.di.ts` from US-E18.20). If the
app-wide `NEXT_PUBLIC_USE_MOCK` flag is ever flipped to `false` globally, this
factory would silently start firing real HTTP calls to a **wrong path shape**
(`/core/api/v1/academic-records/{studentId}` — not ground-truthed, doesn't
match any real route) and 404 instead of behaving like every other
permanently-blocked feature in the epic.

**In scope (this US):**

1. `bootstrap/di/academic-records.di.ts` — `makeRepository()` always returns
   `MockAcademicRecordsRepository`, regardless of `USE_MOCK` (matches
   `staff-leave.di.ts`/`teaching-plan.di.ts`/US-E18.20's pattern exactly).
2. `infrastructure/repositories/academic-records.repository.ts` — convert
   `AcademicRecordsRepository` from a live (but wrong-path) HTTP caller into a
   **permanent blocked stub** (mirrors `staff-leave.repository.ts`): kept only
   to satisfy `IAcademicRecordsRepository` for the day this unblocks; every
   method returns a deterministic blocked result, never makes an HTTP call.
   `toFailure` stays correct/tested (useful reference for a future unblock).
3. `bootstrap/endpoint/academic-records.endpoint.ts` — correct the doc
   comments on `record`/`years` (and the dead unseal-initiate/confirm
   constants) to cite the REAL ground-truthed paths for documentation
   accuracy (mirrors `staff-leave.endpoint.ts`'s "kept accurate for
   documentation" convention), without wiring them — they remain unreachable
   dead constants.
4. New DI test (`academic-records-force-mock.di.test.ts`, mirrors
   US-E18.20's `feed-moderation-force-mock.di.test.ts`) asserting
   `makeRepository()` returns `MockAcademicRecordsRepository` under all 3
   `USE_MOCK` states (`"true"`, `"false"`, unset), via `constructor.name`.
5. Amend ADR `0055` — close the internal Follow-Up item, reference this US.
6. `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — mark the internal
   follow-up resolved.

**Explicitly OUT of scope:**

- No change to `sealBatch` (already real, US-E18.13) or the seal screen.
- No change to the unseal surface (create/approve stay force-mocked, no new
  real wiring attempted — ADR 0055's rejection of this shape stands).
- No change to `IAcademicRecordsRepository`'s interface, the mock repository,
  the mapper, the entity, or ANY presentation file — the viewer screen's
  behavior in mock mode (the only mode it has ever actually run in) is
  byte-identical before/after. Zero UI change.
- No new ADR — this amends `0055`, it doesn't introduce a new decision class.

## Dependencies

- Extends/closes ADR `0055` (US-E18.13). No dependency on any in-flight US —
  `git fetch --prune` at claim time showed no other `feat/us-e18.21*` branch;
  a parallel `/fe` session is reported working on US-E12.13
  (`admin/subjects` module) — disjoint feature module, no shared file beyond
  `docs/TEST_MATRIX.md` (section-level only) and `messages/{vi,en}.json`
  (different namespace) — no conflict.

## BE Contract (re-confirmed, no new wiring — see ADR 0055 for full ground-truth)

| Operation | Method + path | Real? |
| --- | --- | --- |
| Seal | `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/seal` | **YES** (US-E18.13, unchanged) |
| Request unseal | `POST /api/v1/classes/{classId}/terms/{termId}/academic-records/unseal-requests` | Exists, unreachable (no listing) — stays mock |
| Approve unseal | `POST /api/v1/academic-records/unseal-requests/{requestId}/approve` | Exists, unreachable (no listing) — stays mock |
| Get one record | `GET /api/v1/classes/{classId}/terms/{termId}/students/{studentId}/academic-record` | Shape mismatch (see Scope §3) — stays mock |
| List records for member | `GET /api/v1/members/{memberId}/academic-records` | Shape mismatch (no year-grouping) — stays mock |

## Test Matrix

See `docs/TEST_MATRIX.md` US-E18.21 row (added `planned` below, before code).

## Evidence

(fe-nextjs-engineer fills in after TDD; fe-lead records gate verdicts.)
