# US-E14.5 Implementation Plan — Academic Record Viewer

## Lane: normal

## Phase 1 — Domain (TDD red→green)

Pure functions + use-cases. No framework deps.

### Pure functions
- `calculateSubjectAvg(tx1, tx2, giuaKy, cuoiKy)` — weighted (×1,×1,×2,×3), null-safe
- `deriveYearSealStatus(terms)` — 4 states: all_sealed/partial/none/unsealed_in_year
- `deriveConductColorClass(grade)` — Tot/Kha/TrungBinh/Yeu/null → token class

### Entities
- `AcademicRecord` (studentId, name, code, years[], sealed, sealedAt, sealedBy)
- `AcademicYear` (yearId, yearLabel, classId, grade, isCurrent, sealStatus, terms[])
- `TermRecord` (termId HK1/HK2, status PENDING/SEALED/UNSEALED, subjects[], gpa)
- `SubjectScore` (subjectId, subjectName, tx1-tx2-giuaKy-cuoiKy, termAvg, rankBand)
- `AcademicRecordsFailure` union (not-found/forbidden/network-error/unknown)

### Use-cases
- `GetAcademicRecordUseCase` — delegates to repo.getRecord()
- `ListAcademicYearsUseCase` — delegates to repo.listYears()

## Phase 2 — Infrastructure (mock-first)

- DTO (`AcademicRecordResponseDto`, `AcademicYearDto`, `TermRecordDto`, `SubjectScoreDto`)
- Mapper (`academicRecordMapper`) — DTO→Entity, computes termAvg+rankBand+gpa+sealStatus
- Mock fixtures: 3-year dataset (2023-2024 all sealed, 2024-2025 partial/unsealed HK2, 2025-2026 HK1 sealed + HK2 pending)
- MockRepository + real repository stub (for when BE ships US-064)

## Phase 3 — Bootstrap

- `src/bootstrap/endpoint/academic-records.endpoint.ts`
- `src/bootstrap/di/academic-records.di.ts` — USE_MOCK ? Mock : Real
- Barrel exports

## Phase 4 — Presentation (TDD)

- `YearTimeline` — tablist a11y (role=tablist/tab, aria-selected)
- `SealStatusBadge` — read-only display; sealed=true → success+lock; false → muted
- `AcademicRecordTable` — native `<table>`, scope=col/row, sr-only caption, score colors
- `AcademicRecordSkeleton` — shadcn Skeleton
- `AcademicRecordScreen` (use client) — orchestrates VM → UI; handles error/empty/loading
- `AcademicRecordContainer` (use client) — TanStack Query wrapper
- `academic-record-screen.stories.tsx` — 9 stories (Loading/StudentView/TeacherView/ParentView/AdminView/SealedRecord/UnsealedTermWarning/EmptyYear/ErrorState)

## Phase 5 — App Routes (4 pages)

- `/student/academic-record/page.tsx` — self-view, no student selector
- `/teacher/students/[studentId]/academic-record/page.tsx` — teacher, assigned class
- `/parent/children/[studentId]/academic-record/page.tsx` — parent, linked child
- `/admin/students/[studentId]/academic-record/page.tsx` — admin, all students

All RSC pages fetch via DI, pass VM to container. Year selection via `?year=` searchParam.

## Phase 6 — i18n

- Namespace `academicRecord` in both `vi.json` and `en.json`
- All t() keys covered: pageTitle, breadcrumb, student, yearTimeline, sealStatus, yearStatus, termStatus, termSection, pending, table, conduct, rankBand, printButton, empty, error, roleBadge

## Phase 7 — Gate

- `bunx tsc --noEmit` → 0 errors
- `bun vitest run` → all pass
- `bun build` → clean
- Design-review gate

## Circular dep resolution

US-E14.6 (seal action) deferred. This US implements `sealed: boolean` display only — SealStatusBadge is read-only with no click handler. E14.6 will add the seal mutation alongside the badge it needs.
