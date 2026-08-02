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

## Relevant Product Docs

- Ask #41 in `docs/reports/2026-08-01-fe-to-be-asks.md` — mark RESOLVED.

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
