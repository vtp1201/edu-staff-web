# US-E18.39 Un-mock /principal/students (MANAGER now authorized)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none (BE US-175, `edu-api` main `1042aa94`, already merged)
- Blocks: US-E18.41 (same feature module — sequence after this one)
- Feature module(s) chạm: `src/features/admin-roster/`, `src/app/[locale]/t/[tenant]/(app)/principal/students/page.tsx`
- Shared contract/file: `GET /classes/{classId}/students` (core, `list_students_in_class.go`)

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-04-be-to-fe-response.md` §"P1 — MANAGER RBAC (#43, #46)
→ US-175": `list_students_in_class.go`'s `authorize()` now grants MANAGER
admin-tier read. This closes ask #46 exactly as filed.

**Important: this is almost entirely a documentation/test fix, NOT a
repository code change.** Read `src/bootstrap/di/admin-roster.di.ts` — the
whole file, `getClasses()` and `getClassRoster()` are ALREADY a plain
`USE_MOCK ? Mock : Real` gate (no hybrid/force-mock special-casing for
MANAGER). The 403 principal-role users previously hit was a NATURAL
consequence of the real BE authorize() rejecting MANAGER — it flowed through
`toRosterFailure()` → `{type: "forbidden"}` like any other real error, and the
page (`(app)/principal/students/page.tsx`) already has a generic,
already-correct `errorVm()` path for ANY fetch failure (not MANAGER-specific
code). Once BE grants MANAGER, that SAME generic error path simply never
triggers for this cause anymore — nothing to "remove", because there was
never a special-cased "honest degrade" branch, only a natural error flow.

## Scope

1. **`page.tsx` doc-comment.** The extensive doc-comment in
   `src/app/[locale]/t/[tenant]/(app)/principal/students/page.tsx` (lines
   ~30-49) explains, in detail, that a MANAGER-principal gets a real 403 on
   every class roster read. This is now STALE (BE US-175 fixed it) — rewrite
   it to state the CURRENT ground truth: MANAGER is now granted on
   `list_students_in_class.go` (closing ask #46), so both ADMIN-principal and
   MANAGER-principal read normally. Keep the surrounding architecture notes
   (Suspense composition, no `actions.ts`/mutation import = read-only proof)
   — only the stale RBAC claim needs correcting.
2. **`page.test.tsx`.** Find the "MANAGER-principal 403" test scenario (per
   the doc-comment's own reference, `page.test.tsx` and/or
   `principal-roster-screen.stories.tsx`'s `ForbiddenError` story) — this
   test currently PINS the 403 as expected/correct behavior for a
   MANAGER-role actor. That assumption is now false. Update the test to
   reflect the real (now-passing) behavior: a MANAGER-principal successfully
   reads the roster. Do NOT delete the general `ForbiddenError` story/test
   coverage itself (a generic 403 error state is still a legitimate thing to
   test for OTHER causes) — just stop asserting MANAGER specifically triggers
   it.
3. **`docs/stories/epics/E13-teacher-workspace/US-E13.10-principal-students-roster/`**
   (if it exists and documents this MANAGER-403 assumption) — check it and
   flag (don't necessarily rewrite yourself) any stale claim for fe-lead to
   sync into EPIC-OVERVIEW.md.
4. Re-verify (don't just assume) by re-reading the CURRENT
   `list_students_in_class.go`'s `authorize()` if the edu-api source is
   available locally — confirm the MANAGER branch is actually present before
   changing any test/doc assertion. If the edu-api repo isn't available in
   this environment, trust the BE report's citation (`docs/reports/2026-08-04-be-to-fe-response.md`)
   as ground truth (already independently verified by fe-lead against the
   coordinator's message, which cross-checked `edu-api` main HEAD `1042aa94`).

## NOT in scope

- `getSearchPool` (unassigned-student search pool) — separate gap (ask #9),
  handled by US-E18.41, sequenced AFTER this story on the same branch/module.
- Any repository/DI code change — genuinely none expected. If your
  investigation finds the repository DOES need a change (e.g. a
  MANAGER-specific special-case you discover that isn't documented above),
  stop and note it clearly — that would mean the ground truth above is
  incomplete.

## Acceptance Criteria

- Real mode: a MANAGER-role principal can read a class roster successfully
  (no 403, no error card, no missing class picker) via `/principal/students`.
- `USE_MOCK=true` unchanged.
- No stale doc-comment or test claims a permanent MANAGER 403 anymore.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `page.test.tsx` updated scenario |
| Integration | none new — real repo path unchanged |
| E2E | Storybook `ForbiddenError` story updated if it was MANAGER-specific |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for `/principal/students` real-mode.
- Close ask #46 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 6 row.

## Evidence

### Ground truth re-verified in the edu-api working copy (not only the report)

`/Users/vietthangpham/thang.pham/Work/edu-staff/edu-api` (HEAD `c7726993`),
`services/core/internal/class/core/application/usecase/list_students_in_class.go:68`:

```go
// authorize allows ADMIN/SUPER_ADMIN/MANAGER, or a TEACHER assigned to the class.
if isAdmin(in.ActorIsSuperAdmin, in.ActorRoles) || hasRole(in.ActorRoles, roleManager) {
	return nil
}
```

`git log` for that file shows `011b82b2 fix(core): US-175 grant MANAGER read
access to timetable+roster use cases`. `list_classes.go`'s `roleManager` const
comment now itself names the widened scope ("US-164: list_classes; US-175:
list_students_in_class, get_member_enrollment, get_student_enrollment") and still
keeps `roleManager` OUT of the shared `isAdmin` helper, so MANAGER gained NO
write access — pinned BE-side by
`manager_read_access_test.go:TestUpdateClassUseCase_Execute_ForbidsManager`.
Ask #46 is closed exactly as filed.

### Confirmed: doc/test-only — no repository or DI change was made

`src/bootstrap/di/admin-roster.di.ts` was read in full. `getClasses` and
`getClassRoster` are both plain real-branch bindings behind the single
`if (USE_MOCK) return new MockRosterRepository()` gate; the only special case in
the file is `getSearchPool` (a DIFFERENT, still-open gap — ask #9, US-E18.41).
There was never a MANAGER-specific branch to remove, so the file is untouched.
The pre-US-175 403 was a natural real error: repository `toRosterFailure()` →
`{type: "forbidden"}` → the page's generic `errorVm()`. That path is unchanged
and still correct for callers who genuinely lack the grant.

### Changes

1. `src/app/[locale]/t/[tenant]/(app)/principal/students/page.tsx` — doc-comment
   only. The stale block asserting a permanent MANAGER 403 is replaced with the
   current ground truth (both reads grant `isAdmin(...) || hasRole(..., roleManager)`;
   US-164 for the class list, US-175 for the roster) and reframes `fetchError` as
   the generic role-agnostic failure path it always was. Suspense composition and
   the "no `actions.ts` / no mutation import = read-only proof" notes kept verbatim.
2. `…/principal/students/page.test.tsx` — the "MANAGER-principal 403" scenario's
   premise is now false, so it is split:
   - NEW `"reads the roster with the class picker intact for a principal actor
     (BE US-175 MANAGER grant)"` — asserts `fetchError === null`, `vm.classes`
     (both ids), `currentClass`, and roster length. The picker assertion is the
     regression guard: the old MANAGER failure rendered `errorVm()`, i.e.
     `classes: []` + `currentClass: null`.
   - RETITLED `"degrades honestly when the roster read is 403'd (class list still
     OK)"` — identical assertions, MANAGER attribution removed; generic 403
     coverage deliberately KEPT (still reachable for e.g. a TEACHER holding no
     assignment to the class).
3. `src/features/admin-roster/presentation/principal-roster-screen/principal-roster-screen.stories.tsx`
   — `ForbiddenError` kept as-is (its play function never mentioned MANAGER); a
   doc-comment re-scopes it as the role-agnostic 403 state.
4. `docs/TEST_MATRIX.md` — new US-E18.39 row; the US-E18.35 row's "ask #46 filed"
   sentence now marks the ask closed and its MANAGER-403 degrade historical.

### TDD note (honest)

There is no production behavior change on the FE side (the fix shipped in BE), so
a conventional failing-then-passing red step is not available. The new assertion
was instead proven to BITE by mutation: temporarily replacing the page's success
return with `<PrincipalRosterScreen vm={errorVm("forbidden")} />` (the exact shape
of the old MANAGER failure) turned 4 of the 8 tests red, including the new one;
the mutation was then reverted and the file verified restored.

### Proof commands (run in the worktree)

| Command | Result |
| --- | --- |
| `bun vitest run "src/app/…/principal/students/page.test.tsx"` | 8/8 pass (was 7) |
| mutation check (success → `errorVm("forbidden")`) | 4 failed / 4 passed → reverted |
| `bun vitest run` (full) | **477 files / 3551 tests pass**, zero regression |
| `bunx vitest run --config vitest.storybook.mts …principal-roster-screen.stories.tsx` | 8/8 pass |
| `bunx tsc --noEmit` | clean |
| `bun lint` | 1 warning + 1 info, both pre-existing repo-wide (unrelated backdrop `biome-ignore`) |
| `bun run build` | succeeded |

### Flagged for fe-lead (stale MANAGER-403 claims in already-merged docs — NOT rewritten here)

- `docs/stories/epics/E18-be-wiring/US-E18.35-admin-roster-real/US-E18.35-admin-roster-real.md`
  lines ~131-134 and ~191-202 — states `list_students_in_class.go` "allows only
  `isAdmin(...)`" and documents the MANAGER-403 degrade as the intended end state.
- `docs/stories/epics/E18-be-wiring/US-E18.11-timetable-wiring/story.md:143` —
  "itself ADMIN/assigned-TEACHER-only per `list_students_in_class.go`".
- `docs/stories/epics/E13-teacher-workspace/US-E13.10-principal-students-roster/US-E13.10-principal-students-roster.md`
  lines ~33-35 — cites `services/core/docs/openapi.yaml` as documenting the roster
  read for "ADMIN/SUPER_ADMIN, or a TEACHER with any assignment" (BE reports the
  prose was widened in US-175/US-178). Its later MANAGER remarks (lines ~43,
  ~183, ~360, all about `getClasses`) are still accurate.
