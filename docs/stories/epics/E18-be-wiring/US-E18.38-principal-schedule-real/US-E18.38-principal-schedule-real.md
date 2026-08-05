# US-E18.38 Un-mock /principal/schedule (MANAGER now authorized)

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none (BE US-175, `edu-api` main HEAD `1042aa94`, already merged)
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/`, `src/bootstrap/di/timetable-view.di.ts`
- Shared contract/file: `GET /api/v1/members/{memberId}/timetable` (core, `get_member_timetable.go`)

## Ground truth (fe-lead, verified before delegating)

BE report `docs/reports/2026-08-04-be-to-fe-response.md` §"P1 — MANAGER RBAC
(#43, #46) → US-175": `get_member_timetable.go`'s `authorize()` now grants
**MANAGER** admin-tier read (line ~120, `roleManager` branch added), alongside
the pre-existing SUPER_ADMIN/ADMIN/self/PARENT-linked branches. This closes ask
#43 exactly as it was filed (`US-E15.3-principal-member-schedule/story.md`
§"MUST-FIX 1").

Current code (`src/bootstrap/di/timetable-view.di.ts`,
`makeGetMemberTimetableForPrincipalUseCase`): **force-mocked unconditionally**,
NOT gated by `USE_MOCK`, with a long doc-comment citing the (now stale)
"MANAGER matches NO branch" finding. This is the ONLY factory in the module
that bypasses the `USE_MOCK ? Mock : Real` shape — every sibling factory
(`makeGetMyTimetableUseCase`, `makeGetMyTeachingScheduleUseCase`,
`makeGetChildListUseCase`, `makeGetChildTimetableUseCase`) already calls the
shared `makeRepo()` which IS gated normally and already composes
`ensureFreshSession()` + `resolveCurrentTermId` + child-name batch resolve.

## Scope

- Delete `makeGetMemberTimetableForPrincipalUseCase`'s force-mock; make it call
  the shared `makeRepo()` like every sibling factory (or delete the factory
  entirely and repoint `(app)/principal/schedule/actions.ts` to
  `makeGetMemberTimetableUseCase`/whichever shared factory is idiomatic — pick
  whichever keeps the smallest diff and follow existing naming).
- Update/delete the stale doc-comment block describing the permanent 403.
- Remove `bootstrap/di/timetable-view-principal.di.test.ts`'s "force-mock env
  matrix" tests (that behavior no longer exists) — replace with a test proving
  the principal path now goes through the same `USE_MOCK` gate as siblings.
- Re-check `US-E15.3-principal-member-schedule/story.md` for any other
  documented behavior (teacher-picker error copy, roster-empty fallback) that
  assumed a permanent 403 and update it if now stale.
- **Hygiene note (US-174, coordinator instruction)**: this is exactly one of
  the paths that was force-mocked BECAUSE of the missing-`memberId`-claim root
  cause (fixed by IAM US-174, deployed + merged before this BE batch). No code
  workaround needed — token refresh is an operational concern, not something
  to encode in this story. Just note it in Evidence if a real-mode smoke test
  is run.

## NOT in scope

- `getByClass` stays mock (documented, unrelated, US-E18.11/US-E18.26 territory).
- Teacher-picker itself (`class-management.listTeachers`) — already real since
  US-E18.23, untouched here.

## Acceptance Criteria

- `/principal/schedule` real mode: a MANAGER-role principal can fetch a
  teacher's timetable via `GET /members/{memberId}/timetable` and see it
  render (no forced empty/mock state).
- `USE_MOCK=true` unchanged: same mock data as before (zero regression).
- No permanently-force-mocked factory remains in `timetable-view.di.ts` unless
  a genuinely-still-blocked operation (`getByClass`) — confirm and document.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `timetable-view.di.test.ts` (gate now matches siblings), existing `get-member-timetable.use-case.test.ts` untouched |
| Integration | none new — real repo path already covered by US-E18.26 |
| E2E | none new — screen behavior unchanged, only the DI gate flips |
| Platform | `bun vitest run` full suite zero-regression, `bun run build` (mock + real) |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row update: `/principal/schedule` real-mode status.
- `docs/reports/2026-08-03-fe-to-be-open-asks.md` (or successor) — close #43.
- `EPIC-OVERVIEW.md` Wave 6 row.

## Evidence

### BE ground truth re-verified in the Go source (edu-api `c7726993`)

`services/core/internal/timetable/core/application/usecase/get_member_timetable.go`
`authorize()` now reads:

```go
if isAdmin(in.ActorIsSuperAdmin, in.ActorRoles) || hasRole(in.ActorRoles, roleManager) {
    return nil
}
if in.ActorMemberID == "" { return domainerror.ErrTimetableForbidden() }
```

Two details worth recording:

- the `roleManager` grant sits **before** the `ActorMemberID == ""` guard, so a
  MANAGER token authorizes even without a `memberId` claim — the IAM US-174
  hygiene note is genuinely irrelevant to this path;
- `shared.go` adds `roleManager = "MANAGER"` but deliberately keeps it OUT of
  `isAdmin()`, which also gates the timetable WRITE use-cases. So this is a
  READ-only grant; nothing here implies principal write access.

### Change

`bootstrap/di/timetable-view.di.ts` —
`makeGetMemberTimetableForPrincipalUseCase()` body is now
`new GetMemberTimetableUseCase(await makeRepo())`, i.e. the identical shape as
every sibling factory. `GetMemberTimetableUseCase`'s constructor is repo-only, so
no extra collaborator was needed and no rename happened. The 36-line
"INTENTIONALLY NOT GATED BY `USE_MOCK`" block is replaced by a 12-line note
citing BE US-175 / ask #43 as the closing event. `timetable-view.di.ts` now has
**no unconditional force-mock at all**; the only mock routing left is
`HybridWeeklyTimetableRepository.getByClass`, which is mock because nothing calls
it (documented in the repository, unchanged, out of scope).

Comment-only follow-ups in the same commit (three sites whose rationale prose
claimed a permanent 403): `principal/schedule/actions.ts`,
`mocks/weekly-timetable.mock.repository.ts`, `mocks/fixtures.ts`,
`mocks/weekly-timetable.mock.repository.test.ts`. The teacher-keyed mock
fixtures are NOT dead code — they still drive mock/demo mode, so they stay.

### Tests (red → green)

`bootstrap/di/timetable-view-principal.di.test.ts` rewritten from the old
6-test force-mock env matrix into a 5-test gate proof:

1. `USE_MOCK=true` → `MockWeeklyTimetableRepository` **and**
   `createServerHttpClient` never called;
2. + 3. `NEXT_PUBLIC_USE_MOCK` unset / `"false"` → `HybridWeeklyTimetableRepository`
   and the http client IS created;
4. repository-identity **parity** with the authorized sibling
   `makeGetChildTimetableUseCase()` — a bespoke gate reappearing in this factory
   fails here;
5. mock-mode end-to-end `execute("t-001")` still returns `ok` (zero regression).

Red proven against the pre-change DI: 3/5 failed
(`expected 'MockWeeklyTimetableRepository' to be 'HybridWeeklyTimetableRepository'`).

### Proof commands

- `bun vitest run` → **477 files / 3550 tests passed** (baseline 477/3551; the
  net −1 is the old 6-test matrix replaced by 5 gate tests — zero regressions).
- `bunx vitest run --config vitest.storybook.mts` → **158 files / 1206 tests
  passed** (unchanged baseline; no presentation file touched).
- `bunx tsc --noEmit` → clean.
- `bun lint` → clean (1 pre-existing warning + 1 info, repo-wide).
- `env -u NEXT_PUBLIC_USE_MOCK bun run build` → ✓ compiled successfully.
- `NEXT_PUBLIC_USE_MOCK=true bun run build` → ✓ compiled successfully.
- No live-BE smoke test was run (no session against a MANAGER account from this
  branch).

### Residual gap (pre-existing, NOT introduced or fixed here)

The screen's own roster source is still unwireable: `makeGetPrincipalTeachersUseCase`
→ `PrincipalTeachersRepository.listTeachers()` → `CLASS_EP.principalTeachers`
= `/core/api/v1/teachers`, which has **no path in `core`'s `openapi.yaml`**
(re-grepped at edu-api `c7726993` — still absent). That DI is a plain
`USE_MOCK ? Mock : Real` gate, so in real mode `/principal/schedule` renders the
roster error banner and the (now real) timetable factory is never reached. Same
gap that already affects the shipped US-E13.5 principal-teachers screen; it is a
separate cross-repo ask, unrelated to #43.

### Doc claims now factually wrong (flagged to fe-lead, NOT amended here)

`docs/stories/epics/E15-schedule-views/US-E15.3-principal-member-schedule/US-E15.3-principal-member-schedule.md`:

- §"CORRECTED ground truth" (~L32–58) — "there is no `MANAGER` branch anywhere in
  this use-case" and "**Fixed** by force-mocking this one principal-scoped call":
  both true when written, both stale now.
- Validation table L112–113 — "6 tests (force-mock env matrix)" and "the
  principal route no longer reaches it (force-mock)".
- File table L613 — "`makeGetMemberTimetableForPrincipalUseCase()` (**force-mocked**,
  does NOT reuse `makeRepo()`)".
- §"Fix round" MUST-FIX 1 (~L650–680) — the whole remedy paragraph.
- §"Known limitation (real mode, whole screen)" (~L730–740) — condition (b)
  ("`core` grants `MANAGER` on `GET /members/{id}/timetable`") is now SATISFIED;
  condition (a) (the principal-teachers endpoint) still blocks the screen, so the
  section's conclusion survives but its reasoning is half stale.

No code changes follow from any of these: the teacher-picker error copy and the
roster-empty fallback were always generic error handling (`toTimetableErrorKey`
maps the full principal failure union; `resolveRetryTarget` gates the retry on a
valid id), never 403-specific.
