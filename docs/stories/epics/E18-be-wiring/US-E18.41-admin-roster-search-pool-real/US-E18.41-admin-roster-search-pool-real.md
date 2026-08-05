# US-E18.41 Admin roster search-pool real (BE US-182, ADR 0125)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E18.39 (same feature module `src/features/admin-roster/`, `src/bootstrap/di/admin-roster.di.ts` — sequence after, do not run in parallel on the same branch/worktree)
- Blocks: none
- Feature module(s) chạm: `src/features/admin-roster/`, `src/bootstrap/di/admin-roster.di.ts`
- Shared contract/file: `iam-directory`'s `SearchMembersUseCase` (reuse, do not fork), new `GET /core/api/v1/enrollments/student-ids?academicYear=`

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-05-be-to-fe-response.md` §"#9 (phần còn lại — search
pool chưa enroll) → US-182 + ADR 0125": BE confirmed FE-COMPOSE (ADR 0125 in
`edu-api`, not this repo). Recipe:

1. Directory: `GET /iam/api/v1/tenants/{tenantId}/members?role=STUDENT`
   (US-144, already shipped — reuse `iam-directory`'s `SearchMembersUseCase`,
   the app's ONE directory client. See
   `src/features/iam-directory/domain/use-cases/search-members.use-case.ts` —
   it already drains the FULL paginated directory via `hasMore`, do not
   re-implement draining).
2. Enrolled set: **`GET /core/api/v1/enrollments/student-ids?academicYear=2025-2026`**
   (NEW, ADMIN/SUPER_ADMIN/MANAGER) → `{academicYear, studentMemberIds:
   [uuid…]}` — dedup, unpaginated, ids-only (no PII on this call).
3. Pool = directory (1) MINUS enrolled-ids (2), by `memberId`/`studentMemberId`
   set difference.
4. **Caveats (do not "fix" these, they're accepted by BE):**
   - Students in an ARCHIVED class still count as "enrolled" (won't
     re-appear in the pool). If product wants otherwise, that's a NEW ask,
     out of scope here.
   - Stale-window race between call (1) and (2) is harmless: a duplicate
     enroll attempt is blocked server-side by LWT per-year uniqueness → `409`,
     which the existing `enrollStudent` failure mapping ALREADY handles
     (confirm, don't assume — check `toRosterFailure` for a 409 branch).

## Current state (read before touching anything)

`src/features/admin-roster/infrastructure/repositories/roster.repository.ts`:
`getSearchPool(_classId)` is a permanent stub —
`return { ok: false, error: { type: "unknown" } }`.
`src/bootstrap/di/admin-roster.di.ts`'s `makeRosterRepository()` composes an
ANONYMOUS class that binds every real method except `getSearchPool`, which is
explicitly bound to `mock.getSearchPool` with a one-line "MISSING ENDPOINT"
comment — this is where the fix lands, NOT a hybrid-repository-class file
(there is no `HybridRosterRepository` type here, just this inline anonymous
composition — follow that existing pattern rather than introducing a new
class).

`SearchStudent` entity (`search-student.entity.ts`):
`{id, name, currentClassId: string | null, currentClassName: string | null}`.
The NEW compose source gives you: STUDENT directory members (`memberId`,
`displayName`, possibly `dob`/`gender` if STAFF-tier — confirm what fields
`SearchMembersUseCase`/`DirectoryMember` actually carries for a `role:
"STUDENT"` filter, since the tiered-response rules mean STAFF-tier callers get
different fields than narrower callers — this admin/principal caller IS
staff-tier so should get full fields) MINUS the enrolled-ids set. Note the
enrolled-ids endpoint gives NO `currentClassId`/`currentClassName` at all (it
is IDS-ONLY) — but by definition, everyone left in the POOL (after subtracting
enrolled ids) is UNASSIGNED, so `currentClassId`/`currentClassName` should
simply be `null` for every pool member. Do not attempt a second lookup to
populate them.

## Scope

1. Compose the two calls in `bootstrap/di/admin-roster.di.ts` (decision 0017
   — cross-feature composition belongs here, mirroring
   `class-management.di.ts`'s `makeSearchMembersUseCase()` precedent and this
   SAME file's own existing `resolveStudentDetails` batch-lookup composition
   for `getClassRoster`).
2. Add the new endpoint constant (`GET /core/api/v1/enrollments/student-ids`)
   to whichever endpoint file owns core enrollment paths (check
   `admin-roster.endpoint.ts` first — it may already have an `enrollments`
   section given the roster's other enroll/unenroll/transfer calls).
3. Implement the real `getSearchPool` — inject the composed source (directory
   fetch + enrolled-ids fetch + set difference) the SAME way
   `resolveStudentDetails` is injected today (a callback passed into
   `RosterRepository`'s constructor, or directly compute in the DI factory
   and pass a ready-made pool-fetch callback — pick whichever keeps
   `RosterRepository` itself free of cross-feature imports, per decision
   0017/Clean Architecture layer rules: `infrastructure/` repos may only
   import their OWN feature's DTOs/domain + `bootstrap/endpoint`+`bootstrap/lib/http`,
   never another feature's use-case directly — that's why `bootstrap/di` is
   where the composition must live, exactly like the existing
   `resolveStudentDetails` pattern).
4. `_classId` param on `getSearchPool` — check ALL current callers (the
   enroll/transfer UI flow) for what it's used for today (e.g. filtering out
   students already in the class being enrolled INTO — but if they're
   unassigned by definition they can't already be in ANY class, so this may
   become a no-op parameter, OR the classId is used to filter something else
   like same-grade-level; check the presentation layer's usage before
   assuming). Confirm and document whether the param stays meaningful.
5. `academicYear` — how is the current academic year determined elsewhere in
   the app? Check the `calendar`/`academic-years` feature (US-E18.1) for an
   existing "current academic year label" resolver before inventing a new one
   — reuse if it exists (same precedent class as `resolveCurrentTermId`).
6. Update `MockRosterRepository.getSearchPool` if needed for consistency (it
   likely already returns a plausible mock pool — verify it stays correct for
   `USE_MOCK=true`, no change expected unless the entity shape changes).
7. Error mapping: ground-truth the enrollments/student-ids endpoint's error
   surface (`services/core/docs/{openapi.yaml,ERROR_CODES.md}`) — likely just
   generic 403/network, confirm.

## NOT in scope

- `getClassRoster`/`getClasses`/enroll/unenroll/transfer — already real,
  untouched.
- Widening `iam-directory`'s shared entities beyond what's already there for
  a STUDENT-role, staff-tier caller (should already be sufficient — this is
  the SAME tier/role combination `class-management.di.ts` already uses for
  TEACHER, just a different `role` filter value).

## Acceptance Criteria

- Real mode: the admin roster's "add student to class" search pool returns
  real unassigned students (directory MINUS enrolled), not a permanent
  `unknown` error.
- Students in an ARCHIVED class do NOT appear in the pool (matches BE's
  documented behavior — do not add client-side ACTIVE-only filtering unless
  a story explicitly asks for it later).
- `USE_MOCK=true` unchanged.
- This closes cross-repo ask #9 FULLY (both the earlier dob/gender half from
  US-E18.35 and this listing half).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | set-difference composition test (directory ∪ enrolled-ids → pool), mapper/DTO test for the new endpoint |
| Integration | repository contract test, `SearchMembersUseCase` reuse confirmed (no duplicate draining logic) |
| E2E | none new unless the enroll-flow UI needs a new empty/loading state |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for search-pool real-mode.
- Close ask #9 FULLY in the FE→BE report (mark both halves resolved).
- EPIC-OVERVIEW.md Wave 6 row.

## Evidence

### What was built (per layer)

- **endpoint** — `ROSTER_EP.enrolledStudentIds = "/core/api/v1/enrollments/student-ids"`
  added; the placeholder `ROSTER_EP.searchPool` (`/core/api/v1/students/unassigned`,
  an endpoint that never existed on any server) DELETED.
- **infrastructure/dtos** — NEW `enrolled-student-ids-response.dto.ts`
  (`{academicYear, studentMemberIds}`), ground-truthed against the Go source
  (`enrollment_pool_handler.go` + `dto/class.go`), not only `openapi.yaml`.
  DELETED `search-students-response.dto.ts` (`SearchStudentDto`) — it described the
  never-existing endpoint's response.
- **infrastructure/mappers** — `toSearchStudent` DELETED (same reason); the pool has
  no wire DTO, it is composed. Replaced by a comment recording why.
- **infrastructure/repositories** — `RosterRepository` gains a 3rd optional
  collaborator `SearchPoolSources { searchStudentDirectory, resolveAcademicYear }`
  (same injection shape as `resolveStudentDetails`, so the repository still spans
  no second service itself). Real `getSearchPool` = year → parallel(directory,
  enrolled-ids) → set difference → `SearchStudent[]` with `currentClassId`/
  `currentClassName` structurally `null`. Absent collaborators ⇒ fail closed
  (`unknown`) with zero HTTP. `fromDirectoryFailure()` translates
  `IamDirectoryFailure` → `RosterFailure` once (class-management precedent).
- **bootstrap/di** — the anonymous per-method composition class is GONE; the factory
  is a plain `USE_MOCK ? Mock : Real` gate again, wiring
  `searchMembers.execute({tenantId, role: "STUDENT"})` (tenant id from the token via
  `decodeTenantId`) and `resolveCurrentAcademicYear` as a LAZY callback.
- **presentation** — new `poolError` VM key; `AddStudentPanel` renders the shared
  `ListError` in place of the result list when set (retry omitted for
  `forbidden`/`unauthorized`). No new i18n keys — reuses `adminRoster.errors.*` +
  `Common.confirmDialog.retry`.

### Decisions recorded

- **`_classId` is now genuinely a no-op in real mode.** Callers: only
  `admin/roster/page.tsx` passes `currentClass.id`. The subtracted set spans EVERY
  class of the academic year, so students already in the target class are excluded
  by the subtraction itself, and everyone remaining is unassigned in every class.
  Proven by a test asserting two different classIds return an identical pool. The
  parameter survives on the interface because `MockRosterRepository` still uses it
  (its seed additionally offers transfer candidates from other classes — the real
  pool never does).
- **Existing academic-year resolver REUSED**, not reinvented:
  `resolveCurrentAcademicYear()` in `src/bootstrap/lib/resolve-current-term.ts`
  (US-E18.12), which composes calendar's `ListYearsUseCase` (US-E18.1). Passed lazily.
- **409 confirmed, not assumed**: `toRosterFailure` maps
  `ROSTER_STUDENT_ALREADY_ENROLLED` → `already-enrolled`, so the stale-window race
  between the two reads is already handled.
- **Honest degrade added** (beyond the literal scope, same defect class US-E18.35's
  review caught): a failed pool read no longer renders as "no candidates".

### Proof (all run in this worktree)

| Command | Result |
| --- | --- |
| `bun vitest run` | 479 files / **3622 tests pass**, 0 failures (no re-run needed) |
| `bunx vitest run --config vitest.storybook.mts <student-roster-screen.stories.tsx>` | 11/11 pass (incl. the 2 new pool-failure stories) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean — 1 pre-existing unrelated warning (`message-context-menu.tsx` suppression) + 1 info |
| `bun run build` (real, flag unset) | success |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | success |

Red→green was real: the 11 new/rewritten pool tests failed first (`getSearchPool
returns the dead-code stub` / mock delegation), then passed after the endpoint +
DTO + repository + DI changes.

### Cross-repo ask #9 — CLOSED FULLY

Both halves are now real: the dob/gender display half (US-E18.35, IAM
US-144/ADR-0120/US-169) and the listing half (this story, core US-182 / ADR 0125).
No force-mock remains on `makeRosterRepository()`.
