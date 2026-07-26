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

Implemented 2026-07-26 (`fe-nextjs-engineer`), branch
`feat/us-e18.21-academic-records-wiring`. Strict red→green: both test files were
written and run FIRST against unmodified source (12 failures, correct reasons —
`cookies` called outside a request scope + `createServerHttpClient` called twice
from the viewer factories under `USE_MOCK=false`; `toFailure is not a function`;
`listYears` returning `unknown` from the live catch path), then the three source
files were changed and the same tests went green.

**Files touched (5 source + 3 docs):**

| Layer | File | Change |
| --- | --- | --- |
| `bootstrap/di` | `academic-records.di.ts` | `makeRepository()` now returns `MockAcademicRecordsRepository` unconditionally (dropped the `USE_MOCK` branch + the now-unused `AcademicRecordsRepository` import); doc comment rewritten citing ADR 0055 §Context 6 + US-E18.21. `makeSealRepository()` UNTOUCHED (still hybrid, `sealBatch` real). |
| `infrastructure` | `academic-records.repository.ts` | `AcademicRecordsRepository` converted to a permanent blocked stub mirroring `staff-leave.repository.ts`: `getRecord`/`listYears` resolve `{ok:false, error:{type:"network-error"}}` with **zero** HTTP calls; constructor kept for signature parity (`biome-ignore noUselessConstructor`); `toFailure` kept, now **exported** and unit-tested (dormant reference mapping). Endpoint/DTO/mapper imports dropped. |
| `bootstrap/endpoint` | `academic-records.endpoint.ts` | Doc comments only, zero behavior/path change: file-level doc + per-constant `DEAD (US-E18.21)` notes marking `record`/`years` and the unseal/seal-legacy constants permanently unreachable, per the "kept accurate for documentation" convention of `staff-leave.endpoint.ts`. `sealBatch` comment untouched. |
| test | `academic-records.repository.test.ts` (new) | Dormant-method guard (style of `academic-records-seal.repository.test.ts`): both methods resolve the blocked failure and the spy `http.get` (which throws if invoked) is `not.toHaveBeenCalled()`; + 7 `it.each` cases pinning `toFailure`'s 404/403/NETWORK_ERROR/fallthrough mapping. **9 tests.** |
| test | `academic-records-force-mock.di.test.ts` (new) | Mirrors US-E18.20's `feed-moderation-force-mock.di.test.ts`: both viewer use-cases resolve `MockAcademicRecordsRepository` under all 3 `USE_MOCK` states (`"true"`, `"false"`, unset) via `constructor.name` after `vi.resetModules()`; `createServerHttpClient` never called; **plus a seal regression guard** — `makeSealAcademicRecordUseCase()` still yields `MockAcademicRecordsSealRepository` under `USE_MOCK=true` and `HybridAcademicRecordsSealRepository` (with `ensureFreshSession` + `createServerHttpClient` called) under `USE_MOCK=false`. **6 tests.** |
| docs | `docs/decisions/0055-*.md` | §Follow-Up — appended a `**Closed (2026-07-26, US-E18.21):**` line under the internal follow-up bullet (original text preserved); notes ask #21 stays open. |
| docs | `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` | US-E18.13 row — appended a one-line US-E18.21 addendum (the follow-up is closed; the row's earlier "viewer stays mock" claim was only true while the app-wide flag stayed `true`). |
| docs | this packet | this §Evidence. |

**Proof (all run in the worktree, none bypassed):**

- `bun vitest run` — **428 files / 2915 tests passed**, baseline before the
  change was **426 files / 2900 tests** (Δ +2 files, +15 tests; zero
  regressions, zero pre-existing failures).
- `bunx tsc --noEmit` — clean, no output.
- `bun lint` (Biome, 2262 files) — no errors; the only 1 warning + 1 info are
  pre-existing and in `src/features/messaging/presentation/message-context-menu/`
  (untouched by this US). `bunx biome check` scoped to the 5 touched source
  files: clean.
- `NEXT_PUBLIC_USE_MOCK= bun run build` — **succeeded** (`✓ Compiled
  successfully in 10.2s`, all routes generated). This is the exact scenario the
  fix protects: with the app-wide mock flag empty, the viewer no longer
  constructs a real HTTP repository at all.

**Not run (by design, fe-lead's gate):** Storybook interaction suite (zero UI
change — no presentation, mock repo, entity, mapper, DTO or i18n file touched),
design-review/a11y gate (no UI surface), and no git merge/push.

**Assumptions:** the blocked-stub failure type is `network-error` (not
`unknown`) — chosen to match `staff-leave.repository.ts`'s precedent and because
`AcademicRecordsFailure`'s `unknown` is already this feature's mapper-fallthrough
meaning, whereas `network-error` is its "not reachable" case. No new ADR, no new
i18n key, no new token.
