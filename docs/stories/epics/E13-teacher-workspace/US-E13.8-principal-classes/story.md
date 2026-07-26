# US-E13.8 Principal Classes — School-Wide Class List (Read)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E13.5 (principal-teachers-management — ships `GetPrincipalClassesUseCase` / `IPrincipalTeachersRepository.listClasses()` this US reuses), US-E12.10 (class-management — canonical `Class` entity + real core wiring)
- Blocks: none
- Feature module(s) chạm: `src/features/principal/presentation/classes/`, `src/features/principal/domain/teachers/` (reuse, no new use-case expected), `src/features/principal/infrastructure/teachers/` (reuse)
- Shared contract/file: `Class` entity (`src/features/admin/class-management/domain/entities/class.entity.ts`), `IPrincipalTeachersRepository.listClasses()` (already real, core `GET /api/v1/classes`) — NOT a new repository/entity unless analysis finds a genuine gap.

## Context (why this US exists)

`docs/product/screens.md:84` lists `Classes | (app)/principal/classes | teacher.jsx | features/principal | ⬜` as the
last design-vs-build gap found in the 2026-07-26 screen audit. There is NO dedicated `PrincipalClassesScreen`
component in `design_src/edu/teacher.jsx` — the screens.md row points at that file only because it's the shared
design source for the Principal Dashboard (`PrincipalDashboardHome`) and Principal Teachers screens, and it contains
two visual reference patterns this new screen can draw from:
- `TeacherClasses` (lines 750–774) — card-grid pattern (class name, subject, student count, avg score, attendance,
  curriculum progress) — this is the TEACHER's own-classes view (US-E13.1, already built as
  `teacher-classes-screen`), not principal, but its card layout is a visual reference.
- `PrincipalTeachersScreen` table pattern (already built, US-E13.5) — table layout, filters, Badge usage.

Meanwhile the DATA layer for a principal-facing class list already exists and is REAL: `GetPrincipalClassesUseCase`
(`src/features/principal/domain/teachers/use-cases/get-principal-classes.use-case.ts`) calls
`IPrincipalTeachersRepository.listClasses()` which wires to real core `GET /api/v1/classes` (confirmed in
US-E13.5's BE-readiness table) and returns the canonical `Class` entity (`id`, `name`, `gradeLevel`, `status`,
`academicYear`, `studentCount`, `homeroomTeacherId`, `homeroomTeacherName`). Today this is consumed ONLY as a
`<select>` options source inside `TeacherAssignmentSheet`'s GVCN picker — never surfaced as its own browsable
screen. This US's job is mostly a NEW PRESENTATION LAYER on EXISTING real data — analysis should confirm whether
any additional data (per-class avg score / attendance, à la `TeacherClasses`) is in scope, and if so, flag the
fan-out cost (38+ classes × N calls) as an NFR/perf concern before recommending it.

## Relevant Product Docs

- `docs/product/screens.md` (Principal section, "Classes" row)
- `docs/product/design-spec.jsonc` — no existing entry for this screen; will need one if ba-spec-writer / a follow-up
  `/uiux` pass produces layout specifics beyond reuse of existing patterns.
- `docs/product/roles-permissions.md` — principal role = `MANAGER` claim server-side (per US-E13.5 RBAC section:
  "ADMIN / MANAGER (appRole=principal) can view...").
- `../edu-api/services/core/docs/{openapi.yaml,INTEGRATION.md}` — `Classes` tag, `GET /api/v1/classes`.
- `docs/stories/epics/E13-teacher-workspace/US-E13.5-principal-teachers-management/story.md` — sibling story,
  BE-readiness table precedent, reused repository.
- `src/features/admin/class-management/` — canonical `Class` entity + admin CRUD screen (read-only reuse reference
  for table layout; this US must NOT duplicate create/edit/archive — those stay admin-only).
- `src/features/teacher/presentation/teacher-classes-screen/` — card-grid visual reference (own-classes, not
  school-wide) — reuse the PATTERN, not the component (per `.claude/rules/component-organization.md`, this is a
  different actor/scope so a shared component promotion is not automatic; note the decision either way).

## Acceptance Criteria

(To be defined in full by `ba-use-case-modeler`; placeholder scope below for intake.)

- Principal can view a list of all classes in the tenant for the active/selected academic year.
- Each row/card shows: class name, grade level, homeroom teacher (or "Chưa phân công"), student count, status
  (Đang học / Đã lưu trữ).
- Loading / empty / error states.
- Read-only: no create, rename, archive, or homeroom-assignment action on this screen (those remain
  `(app)/admin/classes` US-E12.10 and `(app)/principal/teachers` US-E13.5 respectively).
- RBAC: `principal` only (route guard `(app)/principal/layout.tsx`, `evaluateNamespaceAccess`).

## Design Notes

- Commands: none (read-only screen).
- Queries: `listClasses()` (existing, real).
- API: `GET /api/v1/classes` (core, real, already wired).
- Tables: none new.
- Domain rules: none new — display-only projection of `Class`.
- UI surfaces: `(app)/principal/classes` route, `features/principal/presentation/classes/`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E13.8 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Presentation-only reuse expected — minimal/no new domain unit tests if no new use-case is introduced. |
| Integration | If a new use-case/repo method is introduced (e.g. for per-class metrics), repository contract tests. |
| E2E | Storybook interaction states (loading/empty/error/populated) + Playwright smoke once `/fe` implements. |
| Platform | n/a |
| Release | Spec-only for this BA pass; stays `planned` until `/fe` implements + proves. |

## Harness Delta

- Story registered: `scripts/bin/harness-cli story add --id US-E13.8 ...` (this session).
- `docs/TEST_MATRIX.md` row added, status `planned`.
- No ADR expected (pure UI/read-only reuse of an existing real endpoint) unless analysis surfaces a genuine new
  data/contract decision.

## Evidence

(none yet — spec-only story; FE team adds evidence on implementation)
