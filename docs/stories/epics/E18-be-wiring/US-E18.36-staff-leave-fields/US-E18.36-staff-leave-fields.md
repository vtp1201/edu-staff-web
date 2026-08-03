# US-E18.36 Staff-leave: department + leaveType fields (closes ask #41)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/staff-leave/`
- Shared contract/file: `StaffLeaveRequestResponse` (core)

## Product Contract

BE US-170 adds `department` + `leaveType` to `StaffLeaveRequestResponse`
(already persisted server-side, migration 046; NULLABLE per-user — closes ask
#41's open question: confirmed nullable, not required). This completes the
admin staff-leave screen's last missing field set.

**CORRECTED ground truth (fe-lead, 2026-08-03).** `src/bootstrap/di/staff-leave.di.ts`'s
existing doc comment already documents this precisely: staff-leave is
PERMANENTLY mock-first (US-E18.8), and its own revised rationale (US-E18.23)
says the ORIGINAL two blockers (no tenant-wide list; no IAM name lookup) are
BOTH ALREADY FALSE (closed by core US-149 + IAM US-144/`iam-directory`,
already reused elsewhere e.g. `staffing.di.ts`) — the ONLY remaining blocker
was `department`/`leaveType` having no wire source at all, while being
REQUIRED (non-nullable) on the FE entity/DTO
(`src/features/staff-leave/domain/entities/*.ts`,
`src/features/staff-leave/infrastructure/dtos/*.ts` both currently declare
`department: string; leaveType: StaffLeaveType` as REQUIRED).

Ground-truthed the exact nullability against `services/core/docs/openapi.yaml`
`StaffLeaveRequestResponse` (~line 10399-10419):
- `leaveType: string, enum: [ANNUAL, SICK, PERSONAL, FAMILY], nullable: true`
  — "`null` only for requests submitted BEFORE this field existed —
  pre-existing rows have no truthful value and are not backfilled. Every
  request submitted after this migration carries a non-null value (required
  at submit time)." So null is a LEGACY-ROW-ONLY state, expected to become
  rare over time.
- `department: string, nullable: true` — "the staff member's CURRENT
  department name... `null` whenever the staff member holds no ACTIVE
  department-scoped position assignment; this is a genuine, ONGOING business
  state (not every staff member is assigned to a department) and can occur
  INDEFINITELY, not only for legacy rows." Distinct nullability reason from
  `leaveType` — do not conflate "legacy gap, will disappear" with "ongoing
  valid state, will persist" in the UI/copy.

So this story: (1) widen BOTH fields to nullable on the FE
entity/DTO/mapper, (2) flip `bootstrap/di/staff-leave.di.ts` from permanent
mock to `USE_MOCK ? Mock : Real` (reusing whatever tenant-wide-list +
iam-directory-name-resolution composition `staffing.di.ts` already
established as precedent — check that file), (3) render each null case with
the CORRECT distinct copy (leaveType-null ≈ "loại nghỉ chưa ghi nhận" /
department-null ≈ "chưa có phòng ban" — not identical placeholder text for
two semantically different null-reasons).

## Relevant Product Docs

- Ask #41 in `docs/reports/2026-08-01-fe-to-be-asks.md` — mark RESOLVED.
- `src/bootstrap/di/staff-leave.di.ts`'s existing doc comment — the most
  valuable ground-truth artifact for this story, read it first.
- `src/bootstrap/di/staffing.di.ts` — precedent for composing the tenant-wide
  list + iam-directory name resolution this story reuses.

## Acceptance Criteria

- Admin staff-leave screen shows real `department`/`leaveType` per request in
  real mode; a null value renders an honest placeholder, not a crash/blank.
- `bootstrap/di/staff-leave.di.ts` flips whatever portion was blocked on these
  fields to `USE_MOCK ? Mock : Real` (confirm exact prior blocking scope —
  the packet may have been PARTIALLY real already per prior session notes
  ["staff-leave partial-unblock decision"] — read that precedent before
  assuming this is a full unblock).
- Zero regression to existing staff-leave screen tests/stories.

## Design Notes

- Commands: none affected.
- Queries: whatever staff-leave already calls — add the 2 new fields to the
  DTO/mapper/VM.
- API: `core` service.
- Domain rules: nullable fields render a placeholder, never crash.
- UI surfaces: `src/features/staff-leave/presentation/` (existing).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (both fields present + null cases) |
| Integration | repository test against the real DTO shape |
| E2E | Storybook: populated + null-placeholder stories |
| Platform | `bun build` clean both modes |
| Release | design-review gate N/A if zero visual change beyond new fields; a11y spot-check placeholder contrast |

## Harness Delta

Registered via `harness-cli story add --id US-E18.36`. Ask #41 → RESOLVED.

## Evidence

(fill after implementation)
