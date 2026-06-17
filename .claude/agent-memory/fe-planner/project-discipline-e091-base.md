---
name: project-discipline-e091-base
description: E09.1 discipline feature base — entities, repo interface, mock shape, DI pattern; E09.2 extends this without forking
metadata:
  type: project
---

E09.1 (implemented, merged main) established `src/features/discipline/` with:

- Domain: `ConductSummaryEntity`, `LeaveRequestEntity`, `ViolationEntity`, `DisciplineFailure` union, `IDisciplineRepository` interface (teacher/principal scoped), 7 use-cases.
- Infra: `DisciplineRepository` (real HTTP), `MockDisciplineRepository` (in-memory mutable `_violations/_conduct/_leave`), `fixtures.ts`, `DisciplineMapper`, `discipline.repository.test.ts` (axios-mock-adapter pattern).
- Bootstrap: `DISCIPLINE_EP` constants, `discipline.di.ts` (one `makeRepo()` helper, factories call it), `bootstrap/di/index.ts` re-exports.
- Presentation: `DisciplineScreen` (3-tab teacher/principal view), `DisciplineScreenVM` i-vm.

**E09.2 pattern:** extend interface with 4 student-scoped methods; add 4 use-cases; extend mock + fixture with `stu-001` records; add 4 DI factories; NEW `StudentConductScreen` presentation (separate i-vm); two new routes (`/student/conduct`, `/parent/conduct`).

**Why:** avoid forking — same `IDisciplineRepository`, same `makeRepo()` in DI; student methods coexist with teacher methods on the same interface.

**How to apply:** when planning any discipline-adjacent story, grep `features/discipline/` first; extend the existing interface/repo/fixture rather than creating a parallel feature folder.
