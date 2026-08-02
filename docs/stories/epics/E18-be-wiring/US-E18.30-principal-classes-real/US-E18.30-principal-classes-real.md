# US-E18.30 Principal Classes: un-mock + class-list enrichment

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/bootstrap/di/principal-classes.di.ts`, `src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts` (listClasses), any OTHER consumer that fan-outs 2×N to get studentCount/homeroom (audit at implementation time)
- Shared contract/file: `ClassResponseDto` (core), `GetPrincipalClassesUseCase`

## Product Contract

BE US-164 grants `MANAGER` (web `principal`) tenant-wide read access to
`GET /classes` (`list_classes.go`'s `roleManager` branch — ground-truthed
directly). BE US-173 additionally enriches BOTH the list and get responses
with `studentCount` + `homeroomTeacherId`/`homeroomTeacherName` computed
server-side. This closes two things at once:
1. `bootstrap/di/principal-classes.di.ts`'s unconditional force-mock (US-E13.8,
   dated because it predates US-164) — flip to `USE_MOCK ? Mock : Real`.
2. Any consumer currently doing a 1+N or 2×N client-side fan-out to compute
   `studentCount`/homeroom display data for a class list (e.g.
   `list-my-classes.use-case.ts` in `features/teacher`, per the doc comment
   flagged during US-E13.9) should now get these fields directly from the
   enriched `ClassResponseDto` and DROP the extra fan-out calls where
   applicable — ground-truth EVERY such consumer before removing its fan-out
   (some may need the fan-out for OTHER data the enrichment doesn't provide).

## Relevant Product Docs

- `docs/product/screens.md` — Principal Classes row (US-E13.8)

## Acceptance Criteria

- `bootstrap/di/principal-classes.di.ts` is a plain `USE_MOCK ? Mock : Real`
  gate (no unconditional force-mock).
- Principal Classes screen shows real `studentCount`/homeroom teacher name for
  every class in real mode.
- Every existing consumer that previously computed `studentCount`/homeroom via
  a client-side fan-out is audited; those that can be satisfied purely by the
  enriched response drop their fan-out (perf win, fewer HTTP calls); those that
  need other per-class data the enrichment doesn't cover are left unchanged
  (documented why).
- Zero regression to existing Principal Classes screen tests/stories.

## Design Notes

- Commands: none.
- Queries: `GET /classes` (list, cursor-paginated) + `GET /classes/{id}` (get)
  — both now enriched. Ground-truth `ClassResponseDto`'s exact new field
  names/casing against `services/core/docs/openapi.yaml` before touching the
  mapper.
- API: `core` service.
- Domain rules: none new — enrichment is additive fields on an existing DTO.
- UI surfaces: `src/features/principal/presentation/classes/` (existing
  screen, US-E13.8) — should need zero visual change if it already renders
  `studentCount`/homeroom from its VM (verify).

## Validation

| Layer | Expected proof | Actual (2026-08-02) |
| --- | --- | --- |
| Unit | DI env-matrix test (mock/real gate); mapper test for the 2 new fields | ✅ `principal-classes.di.test.ts` rewritten (6 tests: mock at `true`, REAL at `false`/unset, `ensureFreshSession` called, no http client in mock mode, seed rows still enriched); `class-management.mapper.test.ts` covers id+name, id-set/name-null, id-null |
| Integration | repository test asserting the enriched fields round-trip | ✅ `class-management.repository.test.ts` + `teacher-class.repository.test.ts` — including CALL-COUNT assertions (see Evidence) |
| E2E | Storybook: no regression to existing Principal Classes stories | ✅ `bunx vitest run --config vitest.storybook.mts` — 157 files / 1185 tests passed; zero presentation files touched |
| Platform | `bun build` clean in both mock and real mode | ✅ `NEXT_PUBLIC_USE_MOCK=true bun run build` green; `bun run build` with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`, i.e. the REAL branch) green |
| Release | design-review gate N/A if zero visual change (confirm); a11y N/A if zero visual change | ✅ CONFIRMED zero visual change — no file under any `presentation/` was modified; the screen already rendered `studentCount`/`homeroomTeacherName` from its VM |

## Harness Delta

Registered via `harness-cli story add --id US-E18.30`.

## Evidence

### Ground truth (re-read at implementation time)

- `edu-api/services/core/docs/openapi.yaml` → `ClassResponse.required` now
  includes `studentCount`, `homeroomTeacherId`, `homeroomTeacherName`.
  Per-endpoint caveat read straight from the schema descriptions: **only
  `GET /classes` and `GET /classes/{classId}` are enriched — `POST`/`PATCH`
  return `0`/`null` unenriched.** That caveat drove the `renameClass` design
  (below).
- `homeroomTeacherName` may be `null` while `homeroomTeacherId` is set (the
  cross-service name lookup degrades independently, ADR 0124). The id is the
  authoritative presence signal.
- `services/core/internal/class/core/application/usecase/list_classes.go:61` →
  `if isAdmin(...) || hasRole(in.ActorRoles, roleManager)` — US-164's MANAGER
  branch, confirmed. Cross-repo ask **#39 RESOLVED**.
- `class_enrichment.go` → `enrichClassRows()` is called by BOTH the
  ADMIN/MANAGER branch AND the TEACHER branch of `ListClassesUseCase`, and by
  `get_class.go`. That is what makes the teacher-side fan-out removal safe.
- Re-verified the NON-resolution:
  `timetable/.../get_member_timetable.go`'s `authorize()` still has no MANAGER
  branch → `timetable-view.di.ts`'s principal force-mock STAYS (its stale
  "same remedy as principal-classes.di.ts" comment was corrected).

### Fan-out actually removed (call-count proof, not "it works")

| Path | Before | After | Guarding test |
| --- | --- | --- | --- |
| `ClassManagementRepository.listClasses` | 1 + **2×N** (`GET .../students` paginated to completion + `GET .../homeroom-teacher` per row) | **1** | `"issues EXACTLY ONE HTTP call for a multi-row page (no 2×N fan-out)"` → `expect(get).toHaveBeenCalledTimes(1)` on a 3-row page |
| `TeacherClassRepository.listMyClasses` | 1 + **N** (each class's roster drained just to `.length` it) | **1** | `"listMyClasses issues EXACTLY ONE HTTP call for a 3-class page (no 1+N roster fan-out)"` → `expect(get).toHaveBeenCalledTimes(1)` |
| `ClassManagementRepository.createClass` | 1 POST + hardcoded `0`/null | 1 POST, response mapped as-is | `expect(post).toHaveBeenCalledTimes(1)` + `expect(get).not.toHaveBeenCalled()` |
| `ClassManagementRepository.renameClass` | \[0–1 GET\] + PATCH + **2** enrichment calls | \[0–1 GET\] + PATCH + **1** enriched `GET /classes/{id}` | `expect(get).toHaveBeenCalledTimes(1)` (both fields given) / `2` (backfill path) |
| `PrincipalTeachersRepository.listClasses` | 1, but hardcoded `studentCount: 0` / null homeroom (documented KNOWN GAP) | 1, real values from the shared mapper | existing suite + mapper tests |

`renameClass` keeps ONE read-back on purpose: `PATCH`'s own response is
unenriched by BE construction, so mapping it directly would blank the
`studentCount` of the row the admin screen re-renders from the action result.
One enriched `GET /classes/{id}` replaces the old 2-call fan-out. Documented
in-code.

### Teacher `list-my-classes` audit outcome (AC #3)

FIXED, not left alone. `TeacherClassRepository` uses a different repository and
DTO (`TeacherClassResponseDto`) but `TEACHER_EP.classes === "/core/api/v1/classes"`
— the SAME endpoint and the same `ClassResponse` schema, and the teacher branch
runs the same `enrichClassRows`. So `studentCount` is now read off the wire and
the N roster drains are gone. `getClassStudents` still fetches the roster (it
needs the students themselves, not a count) and is untouched.

### Commands

- `bunx tsc --noEmit` → clean.
- `bun lint:fix` → clean (1 pre-existing unrelated warning in
  `message-context-menu.tsx`).
- `bun vitest run` → **462 files / 3321 tests passed** (baseline before this
  story: 462 / 3317 — net +4, zero regressions).
- `bunx vitest run --config vitest.storybook.mts` → 157 files / 1185 passed.
- `NEXT_PUBLIC_USE_MOCK=true bun run build` → green.
- `bun run build` (env from `.env.local`, `NEXT_PUBLIC_USE_MOCK=false` → REAL
  branch) → `✓ Compiled successfully`.
