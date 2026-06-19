# US-E13.6 — Grade Book Screen (Multi-Role Read View) — Implementation Plan

Extends the existing `grades` feature (E14.2 grade-entry, E14.4 grade-approval)
with a read-only, multi-role grade book. Mock-first (core service not live).

## Phases (TDD red → green → refactor)

1. **Domain** — `grade-book.entity.ts` (GradeBook / GradeBookRow / ConductGrade /
   GradeBookRole); pure functions `rank-band.ts` + `rank-distribution.ts`;
   `i-grade-book.repository.ts` (throwing contract, matches IGradesRepository);
   three use-cases (`get-grade-book`, `get-my-grades`, `get-child-grades`)
   returning `GradeBook | GradesFailure` (same union pattern as
   `GetGradeSheetUseCase`). Tests first for every unit.
2. **Infrastructure** — `grade-book-response.dto.ts`; `grade-book.mapper.ts`
   (recomputes weighted average defensively, maps conduct + publish status);
   `GradeBookRepository` (`server-only`, envelope-cast, `throwFailure`);
   mock fixtures (5 students, mixed conduct, all PUBLISHED) +
   `MockGradeBookRepository`. Endpoint constants added to `GRADES_EP`.
3. **DI** — `makeGetGradeBookUseCase` / `makeGetMyGradesUseCase` /
   `makeGetChildGradesUseCase`; `USE_MOCK ? Mock : Real`; reuses
   `resolvePublishMode` + `resolveScheme` (real settings/scheme services).
4. **Shared component** — `components/shared/grade-book-table/` (native table,
   3-tier headers w/ TX/GK/CK group tints, conduct StatusBadge, publish gate).
5. **Presentation** — `grade-book-screen/` (selectors for roster roles, table,
   rank-distribution chart, skeleton, error/empty/no-selection states);
   container drives URL searchParams; build helpers.
6. **App routes** — teacher/principal/admin `grade-book`; student/parent `grades`.
7. **i18n** — `gradeBook` namespace (vi + en).

## Key decisions
- Result convention follows the **throwing repo + `T | Failure` use-case** pattern
  already used by `get-grade-sheet.use-case.ts` (NOT a wrapped `Result<T>`).
- Grade-book routes are placed at `teacher/grade-book` + `admin/grade-book`
  (not `teacher/grades`) to avoid colliding with the existing E14.2 grade-entry
  route. Student/parent get new `grades` routes (no prior occupant).
- `isPublished` (student/parent gate) = every row PUBLISHED. Roster roles always
  see the table + rank chart regardless.
