# US-E18.33 Parent child-switcher: real names via tiered batch lookup

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/components/shared/child-switcher/` (promoted
  US-E20.5), `src/features/grades/` (`get-child-list.use-case.ts`,
  ADR 0054 permanent-mock), `src/features/timetable/` (`TimetableChild`,
  ask #20 residual name gap), `src/features/parent/` (children-overview,
  US-E20.4 — already has real names via `parent-links`, NOT this gap)
- Shared contract/file: `iam` `GET /members?ids=` batch lookup

## Product Contract

BE US-167 introduces a TIERED batch member lookup: `GET /members?ids=` is now
callable by PARENT/STUDENT roles (previously ADMIN/staff-tier only per
US-E18.23's `iam-directory`), returning `memberId` + `displayName` for the
requested ids — but explicitly WITHOUT email/roles/dob/gender (field ABSENCE
is the tier signal distinguishing a parent/student caller's response shape
from an admin/staff caller's). This resolves the two OPEN, previously-accepted
name gaps:
- `features/grades`'s `get-child-list.use-case.ts` (ADR 0054, permanently
  mocked because "no directory endpoint any PARENT can call resolves a
  student's name").
- `features/timetable`'s `TimetableChild.name` (ask #20 residual — optional,
  ordinal-fallback UI because no such endpoint existed).

`features/parent`'s children-overview (US-E20.4) is UNAFFECTED — it already
has real names via `parent-links`' `LinkedStudentSummary`, a different,
already-real endpoint; do not touch it, just confirm it's still the preferred
source (real names > this new tiered lookup, if both exist, prefer the
existing simpler path).

**REUSE — do not build a new batch-lookup client (fe-lead ground-truth,
2026-08-02):** `src/features/iam-directory/` ALREADY has exactly this tool —
`BatchResolveMembersUseCase` (chunks ≤50 ids/call, drops unresolvable ids,
used today by US-E18.29's invitations `invitedBy` resolution). Ground-truthed
`edu-api/services/iam/docs/openapi.yaml` `GET /api/v1/members` (~line 535):
comma-separated `ids` param, max 50, `MemberBatchItem` schema — **tiered by
caller role (ADR-0120)**: staff tier (ADMIN/MANAGER/TEACHER/SUPER_ADMIN) gets
`memberId+displayName+email+roles`; every OTHER caller (STAFF/STUDENT/PARENT)
gets `memberId+displayName` ONLY — `email`/`roles`/`dob`/`gender` keys are
ABSENT from the JSON (not empty), which is the tier signal.

**Important — the EXISTING `MemberBatchItemDto` (`iam-directory/infrastructure/dtos/member-batch-item.dto.ts`) currently
declares `email`/`roles` as REQUIRED** (written when this endpoint was
staff-tier-only via US-144/US-E18.23). If a PARENT/STUDENT caller now hits the
SAME use-case, the real JSON will legitimately omit those keys — the current
DTO/mapper would silently produce `undefined` cast to a required type. This
DTO/`MemberSummary` entity/mapper must be WIDENED (email/roles → optional)
to be safe for BOTH tiers, without breaking the EXISTING staff-tier callers
(invitations `invitedBy`, any staffing/roster usage) — this is a "widen a
shared contract for a new caller" job, same shape as this session's other
promotions (US-E15.3's `TimetableRole`, US-E20.4's `ChildIdentityHeader`).

## Relevant Product Docs

- Ask #20 (residual, timetable), ADR 0054 (grades child-list mock).
- `src/features/iam-directory/` — REUSE `BatchResolveMembersUseCase` for
  BOTH grades and timetable's child-name resolution; do not build a second
  batch-lookup client.

## Acceptance Criteria

- `features/grades`'s child-switcher shows real child names in real mode
  (un-mock `get-child-list.use-case.ts`'s backing repository via the new
  tiered `GET /members?ids=` call).
- `features/timetable`'s child-picker (parent's schedule view, US-E15.1) shows
  real names in real mode — `TimetableChild.name` is no longer `undefined`;
  the ordinal-fallback UI (`"Con thứ N"`) becomes dead-in-real-mode but MUST
  remain for a genuinely missing-name edge case (defensive, not deleted).
- The batch call requests ONLY `memberId`s the parent's own linked-children set
  already resolved (from `parent-links`, or wherever the parent's child-id set
  is currently sourced) — never an arbitrary/unverified id list.
- No email/roles/dob/gender is read from this tier's response even if present
  (contract says absent, but code should not assume presence either way —
  type the DTO to only have `memberId`/`displayName`).
- Zero regression to existing grades/timetable screen tests/stories.

## Design Notes

- Commands: none (read-only lookup).
- Queries: `GET /members?ids=id1,id2,...` (`iam` service) — ground-truth exact
  query-param shape/limits against `services/iam/docs/openapi.yaml` and
  `INTEGRATION.md` before wiring (batch size limits, csv vs repeated param).
- API: `iam` service.
- Domain rules: tiered-response DTO must NOT structurally include
  email/roles/dob/gender fields for this caller tier (type-level enforcement,
  not just "don't read them").
- UI surfaces: no new UI — this un-mocks two EXISTING pickers' name
  resolution only.

## Validation

| Layer | Expected proof | Actual |
| --- | --- | --- |
| Unit | mapper/repository tests for the tiered batch lookup (both grades + timetable consumers) | ✅ `iam-directory.mapper.test.ts` (both tiers, key-absence), `parent-child.mapper.test.ts` (7 new), `linked-student.mapper.test.ts` (+4) |
| Integration | repository tests confirming only linked-child ids are requested | ✅ `parent-child-list.repository.test.ts` (9), `real-weekly-timetable.repository.test.ts` (+4), `iam-directory.repository.test.ts` (+1), DI env-matrix `grades-child-list.di.test.ts` (5) + `timetable-view-child-names.di.test.ts` (3), RSC `parent/attendance/page.test.ts` (4) |
| E2E | Storybook: real-name story alongside the existing ordinal-fallback story for both consumers | ✅ `TimetableView/ParentView_RealMode_ResolvedNames` + `Shared/ChildSwitcher/ParentView_RealMode_ResolvedNames` (both drive the REAL mapper, not fixtures); the ordinal/degraded stories are KEPT and re-documented as defensive |
| Platform | `bun build` clean both modes | ✅ real (`.env.local`, `USE_MOCK=false`) and `NEXT_PUBLIC_USE_MOCK=true` both compile |
| Release | design-review gate N/A if zero visual change beyond real text; a11y spot-check the ordinal-fallback path still works | ✅ zero component/markup change; `ParentView_RealMode_NoNameFallback` still asserts the fallback card is operable by keyboard/click |

## Harness Delta

Registered via `harness-cli story add --id US-E18.33`.

## Evidence

### Contract re-ground-truthing (2026-08-02)

- `edu-api/services/iam/docs/openapi.yaml` `GET /api/v1/members` (~L535) +
  `MemberBatchItem` (~L1387) — CONFIRMS the brief: comma-separated `ids`
  (max 50), tiered by caller role (ADR-0120). `required: [memberId,
  displayName]`; `email`/`roles`/`dob`/`gender` are staff-tier only and
  ABSENT (not empty) otherwise. `dob`/`gender` are additionally optional PII
  (ADR-0122) and are deliberately NOT declared in the web DTO at all.
- **CORRECTION to the brief's timetable speculation.**
  `edu-api/services/core/docs/openapi.yaml` `LinkedStudentItemResponse`
  (L9588) carries `linkId`, `parentMemberId`, `studentMemberId`, `createdAt`,
  `classId?`, `className?` — and NO name field. Timetable's `getChildren()`
  was NOT "already calling a name-bearing endpoint and failing to read it";
  the name genuinely is not on the wire, so timetable DOES need the IAM batch
  lookup, same as grades.
- **CORRECTION to the brief's US-E20.4 premise.** `parent-links`'
  `LinkedStudentSummary.fullName` is NOT real data: `bootstrap/di/parent-consent.di.ts`
  serves `MockParentConsentRepository` under `USE_MOCK`, and the real
  `ParentConsentRepository` targets best-effort guessed `core` paths
  (`parent-links.endpoint.ts` documents "`core` is NOT built yet"). So
  US-E20.4's children-overview names are mock names, and there was no
  "existing simpler real path" to prefer. Left untouched (out of scope) —
  flagged as a follow-up below.

### Mechanism

- **Shared contract (commit `ce945d9`)** — `MemberBatchItemDto.email/roles`
  and `MemberSummary.email/roles` widened to optional; `toMemberSummary`
  spreads them CONDITIONALLY so a narrowed row never materialises
  `email: undefined` (presence IS the tier signal).
- **grades (commit `547dbfe`)** — new `ParentChildListRepository` implementing
  a new `IChildListRepository = Pick<IGradeBookRepository, "getChildList">`
  slice; `makeGetChildListUseCase` drops ADR 0054's unconditional mock for the
  standard `USE_MOCK ? Mock : Real` shape.
- **timetable (commit `d06cb2a`)** — `RealWeeklyTimetableRepository` gains an
  OPTIONAL 4th ctor arg (name resolver) so ~30 existing wire-level tests keep
  their 3-arg construction; `toTimetableChildren` takes an optional name map.
- Both consumers compose the SAME `BatchResolveMembersUseCase` via
  `bootstrap/di` (decision 0017). No second batch-lookup client was created.
- Both name lookups are best-effort (empty map on failure, never throws);
  grades degrades a row to its raw memberId, timetable leaves `name` absent so
  the `"Con thứ N"` ordinal label — explicitly KEPT — covers it.

### Zero regression to the existing staff-tier caller

`admin-invitations` (`invitedBy` resolution, US-E18.29), `staffing` and
`academic-records` all read only `displayName`; required → optional is
backward-compatible for them. Their suites pass UNMODIFIED (27 files / 237
tests across `iam-directory` + the three consumers).

### Proof commands (all run on this branch)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning, unrelated file) |
| `bun vitest run` | **471 files / 3447 tests passed** (baseline before this story: 467 / 3412 → +4 files, +35 tests, zero regressions) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1199 tests passed** (baseline 1198 → +1... 2 new stories, 1 net new test id) |
| `bun run build` (`.env.local`, `NEXT_PUBLIC_USE_MOCK=false`) | compiled successfully |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | compiled successfully |

### Known gaps / follow-ups (NOT done here — out of scope)

1. `app/[locale]/t/[tenant]/(app)/parent/grades/page.tsx` still hardcodes
   `MOCK_CHILD_ID = "child-1"` as the default `childId` and renders no
   child-switcher. Now that the roster is real, that default 404s/403s in real
   mode. Small follow-up: default to the first linked child.
2. `ChildSummary.className` is a REQUIRED string, so a child with no current
   enrollment renders an empty caption line (the shared `ChildSwitcher` has no
   "chưa có lớp" fallback, unlike timetable's picker). Kept as-is to honour
   "zero new UI"; worth a follow-up if the empty line is unacceptable.
3. `parent-links` (US-E20.2/E20.4) is still entirely mock-first — its
   `fullName` is seed data, not real. Un-mocking it is a separate story.
