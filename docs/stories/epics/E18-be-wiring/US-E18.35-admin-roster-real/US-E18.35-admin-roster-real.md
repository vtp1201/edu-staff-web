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

**CORRECTED ground truth (fe-lead, 2026-08-03) — bigger than "add 2 fields",
this closes a PERMANENT force-mock.** `roster.repository.ts`'s
`getClassRoster`/`getSearchPool` are BOTH permanently mock-first (US-E18.5,
cross-repo ask #7/#9) with the exact stated reason: `GET /classes/{id}/students`
(`EnrollmentResponse`) carries ONLY `enrollmentId`/`classId`/
`studentMemberId`/`academicYearLabel`/`enrolledAt` — no name/dob/gender/status
— and "IAM has no batch/by-id profile lookup on the public API." **That IAM
gap is exactly what US-E18.33 already closed** (this epic's own prior story,
same batch): `src/features/iam-directory`'s `BatchResolveMembersUseCase`
(`GET /members?ids=`) now has an ADMIN caller = staff-tier, which per
`services/iam/docs/openapi.yaml` (~1417-1427) means dob/gender ARE included
(staff-tier only, optional per-user, ADR-0122) alongside displayName/email/
roles that were already available to admin.

**So `getClassRoster` can likely go REAL now** by composing `core`'s
enrollment list (authority for WHICH students are enrolled) with
`iam-directory`'s batch lookup (decoration: name/dob/gender) — the EXACT same
composition pattern US-E18.33 used for grades/timetable child names. REUSE
`BatchResolveMembersUseCase`, do not build a new client.

**`status` field has NO wire source at all** — `EnrollmentResponse` has no
status/active/transferred concept; ground-truth whether "every row returned
BY this endpoint is definitionally active" (a transferred/unenrolled student
would simply not appear in the list anymore) is the correct interpretation —
if so, `status` can be a constant `"active"` for every real-mode row, not an
invented field. Confirm this reading is sound before assuming it, and note
it explicitly if so (this is a real semantic decision, not a gap to force-mock
over).

**`getSearchPool` is a SEPARATE, still-genuinely-open gap** — "no core
endpoint exists for the unassigned-student search pool" is unrelated to the
dob/gender addition and is NOT closed by US-169. Keep `getSearchPool`
mock-first; do not conflate the two.

## Relevant Product Docs

- ADR-0122 (PII handling for dob/gender) — read before wiring; confirm no
  additional consent/redaction UI requirement beyond what's already built.
- `docs/stories/epics/E18-be-wiring/US-E18.33-parent-child-names-wiring/` —
  the sibling story that widened `iam-directory`'s DTO/entity for
  `email`/`roles` optional; THIS story extends the SAME widening for
  `dob`/`gender` optional (staff-tier only).

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
