# US-E14.2 Grade Entry Screen — Implementation Plan

## Phases (executed red → green → refactor)

1. **Domain (pure TS, TDD)** — entities (`grade-sheet.entity`), failures
   (`grades.failure`), repository interface (`i-grades.repository`, throwing
   contract per packet), and use-cases. Tests written first:
   `calculate-weighted-average` (7), `validate-score` (6), `save-score` (4),
   `publish-grades` (3), `get-grade-sheet` (3).
2. **Infrastructure** — DTOs, pure-function mapper (`grades.mapper`, recomputes
   average defensively), real `GradesRepository` (`server-only`, error→failure by
   code/status, throws), mock repo + fixtures (3 students, in-memory mutable
   state, `publishMode` injected). Mapper test (6), mock repo integration test (6).
3. **Bootstrap** — `GRADES_EP` endpoint constants, `grades.di` factory
   (mock-first; REAL scheme via `makeAssessmentSchemeRepository`, REAL
   `gradePublishMode` via `makeAdminSettingsRepository`), barrel export.
4. **Presentation** — VM interface, `GradeEntryScreen` (TanStack Query mutations,
   optimistic save, publish confirm dialog), `GradeEntryTable` (role="grid",
   editable cells, read-only when locked), `GradeEntrySkeleton`,
   `GradeEntryContainer` (router-driven selection), `score-color` util.
5. **i18n** — `gradeEntry` namespace added to vi.json + en.json (33 keys).
6. **Route** — `/teacher/grades` `page.tsx` (RSC) + `actions.ts` (`use server`).
7. **Storybook** — 8 states with play() interactions.

## Reuse (no duplication)
- `AssessmentScheme`/`AssessmentColumn` imported (type) from assessment-scheme.
- `GradePublishMode` imported from admin-school-setup.
- `makeAssessmentSchemeRepository`, `makeAdminSettingsRepository` reused via DI.

## Mock-first rationale
The `core` grade endpoints (BE US-060) are not live → `USE_MOCK` selects
`MockGradesRepository`. Assessment scheme + operational settings (US-059) are
REAL and threaded into the otherwise-mocked grade sheet.

## Proof
- `bunx tsc --noEmit` → 0 errors
- `bun vitest run` → 134 files / 686 tests pass (35 new for grades)
- `bun run build` → compiled successfully, `/teacher/grades` route registered
- `bun lint` → clean (1 pre-existing warning in admin-roster, not in scope)
