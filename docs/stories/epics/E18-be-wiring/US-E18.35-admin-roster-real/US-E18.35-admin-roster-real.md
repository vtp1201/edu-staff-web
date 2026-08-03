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

| Layer | Expected proof | Result (2026-08-03) |
| --- | --- | --- |
| Unit | mapper test (dob/gender present + absent-per-user cases) | ✅ `iam-directory.mapper.test.ts` (+4 cases: dob/gender present, staff-tier-unset key-set, narrowed tier), `roster.mapper.test.ts` (+8 cases: join, 3-value gender map, absent keys, no invented code, `status:"active"`, TZ-safe dob, unparseable dob) |
| Integration | repository test against the real DTO shape | ✅ `roster.repository.test.ts` (+9: call-count 1 list + 1 batch, exact id list, cursor follow, `raw:true` placement, empty-class skips IAM, IAM-throws degrade, 403/404/transport, real-interceptor pipeline), `iam-directory.repository.test.ts` (+2), `bootstrap/di/admin-roster.di.test.ts` (new, 8: env matrix ×3 for both methods) |
| E2E | Storybook: dob/gender populated + missing-placeholder stories, both roster screens | ✅ `RealModeWithMissingFields` on BOTH `student-roster-screen.stories.tsx` (admin) and `principal-roster-screen.stories.tsx` (read-only) — rows built by CALLING the real mapper, not a fixture |
| Platform | `bun build` clean both modes | ✅ `bun run build` (`.env.local`, `NEXT_PUBLIC_USE_MOCK=false`) and `NEXT_PUBLIC_USE_MOCK=true bun run build` both compiled successfully |
| Release | design-review gate + a11y (placeholder text contrast, not color-only) | ✅ placeholder = `text-edu-text-secondary` (5.48:1) with `aria-hidden` em dash + sr-only "Chưa cập nhật"; `OTHER` gender badge uses `bg-muted`/`text-edu-text-secondary` (no new token) and conveys meaning via letter + `aria-label`. Gate itself is `fe-lead`'s to run. |

## Harness Delta

Registered via `harness-cli story add --id US-E18.35`.

## Evidence

**Contract re-verified against edu-api (2026-08-03), not assumed:**

- `services/iam/docs/openapi.yaml` `MemberBatchItem` (L1387-1429) + Go
  `MemberBatchItemResponse` (`membership/adapter/http/dto/member_dto.go` L53-60):
  `DOB *time.Time` → RFC3339 date-time, `Gender *string` → `MALE|FEMALE|OTHER`,
  both `omitempty` and both written ONLY inside the `tier == tierStaff` branch
  of `batch_get_members.go` (which itself tolerates a failed PII read by leaving
  them nil). So absence has two causes and neither is an error.
- `services/core/docs/openapi.yaml` `EnrollmentResponse` (L7706-7723): five
  fields, no status, no name, no student code. `GET /classes/{classId}/students`
  is cursor-paginated (`limit` ≤ 100, default 20) and admits ADMIN/SUPER_ADMIN
  or a TEACHER assigned to the class; core `list_classes.go` also grants MANAGER
  the admin tier, which is why the principal screen works unchanged.
- **`status: "active"` reasoning verified**, not assumed: `DELETE
  /classes/{classId}/students/{studentMemberId}` is documented as
  "Removes the enrollment link (hard-delete)" and
  `RemoveStudentFromClassUseCase` calls `enroll.Remove(...)` (ADR 0049) — there
  is no soft-delete/status column anywhere. A transferred or unenrolled student
  therefore stops appearing in the list. "Returned by this endpoint" ==
  "currently enrolled", so the constant is the semantics of the list, not an
  invented field. `transferred` remains reachable in MOCK mode only.
- **No student code exists anywhere**: `grep studentCode|studentNumber|memberCode`
  across every service's `docs/*.yaml` returns nothing. Hence the new optional
  `code` (absent in real mode) instead of printing a member uuid under a
  "Mã học sinh" header.

**Scope note — this was NOT "add 2 fields".** `getClassRoster` was permanently
force-mocked; it is now `USE_MOCK ? Mock : Real`. `getSearchPool` was left
force-mocked ON PURPOSE (missing endpoint, a different gap) and its doc comments
in `roster.repository.ts`, `admin-roster.endpoint.ts` and `admin-roster.di.ts`
were corrected to stop conflating the two.

**Proof commands (all run on `feat/us-e18.35-admin-roster-real`):**

| Command | Result |
| --- | --- |
| `bun vitest run` (baseline, before changes) | 471 files / 3460 tests passed |
| `bun vitest run` (after) | **472 files / 3492 tests passed** — +32 tests, zero regressions |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1201 tests passed** (one unrelated `principal-classes-screen` Select story flaked on the first run and passed in isolation + on a clean re-run of the full suite) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning in `messaging/message-context-menu.tsx`, untouched) |
| `bun run build` (real, `.env.local` `NEXT_PUBLIC_USE_MOCK=false`) | compiled successfully |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | compiled successfully |

**Both roster screens verified.** They share `RosterTable`, so the widened
entity lands on both: the admin `student-roster-screen` (mutation affordances
intact on degraded rows — asserted) and the read-only `principal-roster-screen`
(US-E13.10; zero checkboxes on degraded rows — asserted). The principal RSC page
test (`principal/students/page.test.tsx`) mocks the DI factory, so un-mocking did
not break it.

**Flagged to `fe-lead` (no ADR taken unilaterally):**

1. IAM `gender: OTHER` has no design-system token. The badge uses the existing
   neutral pair (`bg-muted` / `text-edu-text-secondary`) rather than minting one.
   If design wants a dedicated tone → ADR + `tokens.css` first.
2. Residual BE gap: no student code on any contract, so the "Mã học sinh" column
   is a placeholder in real mode. Candidate cross-repo ask.
3. `getSearchPool` (Add-student panel) is still mock-only, so the enroll/transfer
   flow is not usable against a live backend. Still-open cross-repo ask #9.
