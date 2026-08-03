# US-E18.35 Admin roster: real dob/gender via staff batch lookup

## Status

implemented

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
  or a TEACHER assigned to the class.
  **Corrected in review round 1:** the earlier claim that "core `list_classes.go`
  also grants MANAGER the admin tier, which is why the principal screen works
  unchanged" conflated two use cases. The US-164 MANAGER grant is scoped to
  `list_classes.go` ALONE (its own comment: "admin-tier read access on THIS use
  case only … deliberately not folded into the shared isAdmin helper").
  `list_students_in_class.go` `authorize()` allows only `isAdmin(...)`
  (SUPER_ADMIN/ADMIN, per `usecase/shared.go`) or an assigned TEACHER — there is
  NO MANAGER branch. Web's `principal` appRole maps from BOTH ADMIN and MANAGER,
  so a MANAGER-principal gets a real 403 `roster_access_forbidden` on every class
  roster read. See review-fix 1 below.
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
| `bun vitest run` (after review round 1) | **474 files / 3502 tests passed** — +2 files / +10 tests, zero regressions |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1201 tests passed** (one unrelated `principal-classes-screen` Select story flaked on the first run and passed in isolation + on a clean re-run of the full suite) |
| `bunx vitest run --config vitest.storybook.mts` (after review round 1) | **158 files / 1205 tests passed** |
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

### Review fixes — round 1 (2026-08-03)

Three MUST-FIX + one SHOULD-FIX from `fe-tech-lead-reviewer`. All fixed on the
same branch; `## Status` untouched (`fe-lead` owns Harness sync).

**1. MANAGER-principal 403 — false BE authorization claim removed, degrade now
tested.** `principal/students/page.tsx`'s header comment claimed core's
`ListStudentsInClassUseCase` "grants the same admin tier the class list does".
Re-read of `list_students_in_class.go` `authorize()` (+ `shared.go` `isAdmin`,
+ `list_classes.go`'s own scoping comment, + `enrollment.go`
`ErrRosterAccessForbidden` = 403 `roster_access_forbidden`) disproves it. The
comment now states the real gate and names the MANAGER 403 explicitly. Behaviour
was already correct — `toRosterFailure` maps 403 → `forbidden`, `errorVm()`
carries it, and `PrincipalRosterScreen` renders `ListError` with `showRetry=false`
for `forbidden`/`unauthorized`. That path is now LOCKED by a test rather than
holding incidentally: `principal/students/page.test.tsx` → "degrades honestly
when a MANAGER-principal is 403'd on the roster read (class list still OK)"
(class list succeeds, roster 403 → `fetchError === "forbidden"`, empty roster,
no current class), paired with the pre-existing `ForbiddenError` story that proves
the retry control is absent from the DOM. No BE workaround attempted — the gap is
a cross-repo ask for `fe-lead` (same shape as asks #39/#43).

**2. Admin roster false-empty closed.** `admin/roster/page.tsx` used
`rosterResult.ok ? … : []`, unreachable while the method was force-mocked and
newly live now. Added `fetchError: RosterFailure["type"] | null` to
`student-roster-screen.i-vm.ts`; the RSC page threads the failure key; the screen
renders the shared `ListError` with the existing `adminRoster.errors.*` copy
(no new i18n keys) and `showRetry` false for `forbidden`/`unauthorized`. In that
state ClassInfoCard, RosterTable and AddStudentPanel are all suppressed — no
enroll/transfer/bulk-remove affordance can be reached on a roster we could not
read; the class picker stays so the operator is not dead-ended. Proof: NEW
`admin/roster/page.test.tsx` (6 cases: default class, `?classId=`, genuinely
empty class keeps `fetchError: null`, 403 → `fetchError` not empty roster,
transient key, pool-only failure does not blank a loaded roster) + stories
`RosterReadFailed` (alert text, empty-state copy ABSENT, retry present, zero
checkboxes, no enroll search box) and `RosterReadForbidden` (no retry button,
picker survives).

**3. Duplicate placeholder component promoted.** `admin-roster`'s `MissingValue`
and `moderation`'s `UnavailableValue` (US-E18.32) were structurally identical
(toned span + `aria-hidden` em dash + sr-only text, both resolving to
`--edu-text-secondary`). Promoted to ONE canonical
`src/components/shared/absent-value/` (folder + `index.ts` + `.stories.tsx` +
`.test.tsx`) taking a pre-translated `label` prop, so each feature keeps its own
copy ("Chưa cập nhật" vs "Không có dữ liệu"). All 6 call sites moved
(`roster-table.tsx` ×3, `report-table.tsx`, `report-card.tsx`, `stat-row.tsx`,
`report-detail-sheet.tsx`); BOTH originals deleted, no leftovers
(`grep MissingValue|UnavailableValue` → only historical doc comments).
Moderation's US-E18.32 tests/stories pass unchanged (they assert the announced
text, never the component identity or class list).

**4. SHOULD-FIX — batch-lookup comment corrected.** `roster.repository.ts` said
the IAM decoration happens "in ONE batched call". `BatchResolveMembersUseCase`
chunks at 50, so a 51+ student class costs `ceil(n/50)` sequential calls, and it
`return`s on the FIRST failing chunk — so one chunk failure degrades EVERY row,
not just that chunk's. Comment now says exactly that. The abort-all behaviour
itself (US-E18.29/US-E18.33) is unchanged by this story.

**Review-round proof:** `bunx tsc --noEmit` clean · `bun lint` clean (same single
pre-existing `messaging` warning) · `bun vitest run` 474 files / 3502 tests passed
· `bunx vitest run --config vitest.storybook.mts` 158 files / 1205 tests passed ·
`bun run build` green with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`) AND with
`NEXT_PUBLIC_USE_MOCK=true`.

**New follow-up spotted (not fixed — out of review scope):** on the same admin
page a `getClasses` FAILURE still falls back to `[]` and the content returns
`null`, i.e. a blank screen with no explanation. Pre-existing (that read has been
real since US-E18.5), but it is the same false-empty family and deserves its own
story.
