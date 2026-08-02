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

| Layer | Expected proof |
| --- | --- |
| Unit | mapper/repository tests for the tiered batch lookup (both grades + timetable consumers) |
| Integration | repository tests confirming only linked-child ids are requested |
| E2E | Storybook: real-name story replaces (or adds alongside) the existing ordinal-fallback story for both consumers |
| Platform | `bun build` clean both modes |
| Release | design-review gate N/A if zero visual change beyond real text; a11y spot-check the ordinal-fallback path still works |

## Harness Delta

Registered via `harness-cli story add --id US-E18.33`.

## Evidence

(fill after implementation)
