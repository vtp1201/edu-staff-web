# US-E18.35 Admin roster: real dob/gender via staff batch lookup

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/admin-roster/` (US-E18.5's staff-tier
  batch lookup consumer)
- Shared contract/file: `iam` staff-tier batch member lookup

## Product Contract

BE US-169 adds `dob`/`gender` (OPTIONAL PER-USER — ADR-0122 governs this as
PII, not every user record has it populated) to the staff-tier batch lookup
response. This closes US-E18.5's stated reason for permanent-mock ("no
display fields on the wire").

## Relevant Product Docs

- ADR-0122 (PII handling for dob/gender) — read before wiring; confirm no
  additional consent/redaction UI requirement beyond what's already built.

## Acceptance Criteria

- Admin roster screen shows real `dob`/`gender` per student in real mode when
  present; a MISSING per-user `dob`/`gender` (legitimately absent per
  ADR-0122) renders an honest "—"/"chưa cập nhật" placeholder, NOT an error
  and NOT a blank crash.
- `bootstrap/di/admin-roster.di.ts`'s roster-lookup path flips from permanent
  mock to `USE_MOCK ? Mock : Real` for whichever piece was blocked (confirm
  exact scope — the packet's earlier research found `getClassRoster`/
  `getSearchPool` mock-first for EVERY caller; confirm this US-169 addition
  actually unblocks them, or if a different call is involved).
- Zero regression to existing admin-roster AND principal-roster (US-E13.10,
  which reuses admin-roster read-only) screens/tests.

## Design Notes

- Commands: none affected (enroll/unenroll/transfer stay as-is, this is a
  read-field addition only).
- Queries: whichever staff-tier batch lookup `admin-roster` already calls —
  ground-truth the exact endpoint/DTO in
  `src/features/admin-roster/infrastructure/repositories/roster.repository.ts`
  before touching it.
- API: `iam` service.
- Domain rules: dob/gender absence is a legitimate per-user state, not a
  failure.
- UI surfaces: `src/features/admin-roster/presentation/student-roster-screen/`
  (existing) + the read-only `principal-roster-screen/` (US-E13.10) —
  both consume the same repository, verify BOTH render correctly.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (dob/gender present + absent-per-user cases) |
| Integration | repository test against the real DTO shape |
| E2E | Storybook: dob/gender populated + missing-placeholder stories, both roster screens |
| Platform | `bun build` clean both modes |
| Release | design-review gate + a11y (placeholder text contrast, not color-only) |

## Harness Delta

Registered via `harness-cli story add --id US-E18.35`.

## Evidence

(fill after implementation)
