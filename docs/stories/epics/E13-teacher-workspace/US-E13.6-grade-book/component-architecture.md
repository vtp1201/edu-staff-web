# US-E13.6 — Component Architecture

## Tree

```
app/.../{teacher,principal,admin}/grade-book/page.tsx   (RSC — fetch + build VM)
app/.../{student,parent}/grades/page.tsx                (RSC — fetch + build VM)
  └─ GradeBookContainer            'use client' — URL searchParam wiring, router nav
       └─ GradeBookScreen          'use client' — selectors + state composition
            ├─ Select (class/term) (roster roles only)
            ├─ GradeBookTable       @/components/shared/grade-book-table  ← SHARED
            │    └─ StatusBadge     @/components/shared/status-badge      ← reused
            └─ RankDistributionChart  feature-local (single screen)
```

## Canonical homes (decision 0026)
- **GradeBookTable** → `components/shared/grade-book-table/` — composed, reused by
  5 role screens. Single source of truth; role differences expressed via the
  `role` + `isPublished` + `onEnterGrades` props (NOT forked components).
- **Conduct badge** → reuses the existing `StatusBadge` shared component
  (Tot→success, Kha→primary, TB→warning, Yeu→error). No new badge variant.
- **RankDistributionChart** → `features/grades/presentation/grade-book-screen/components/`
  — single-screen; promote to `shared/` if a 2nd screen needs it.

## ViewModel contracts
- `GradeBookTableVM` { gradeBook, role, isPublished, onEnterGrades? } — the table
  is router-agnostic; navigation is a callback.
- `GradeBookScreenVM` { role, classSubjects, selectedCsId, selectedTerm,
  gradeBook, isPublished, error (stable key), gradeEntryPath? }.

## Accessibility
- Native `<table>` with `<caption class="sr-only">`, `<th scope="col">` headers
  (incl. rowSpan group/average/conduct) and `<th scope="row">` per student.
- Conduct conveyed by text + tone (never color-only).
- Loading skeleton `role=status`; error `role=alert`; publish gate `role=status`.
- Rank chart wrapped in `<section aria-label>`; bars are decorative width only,
  counts/percentages are text.
