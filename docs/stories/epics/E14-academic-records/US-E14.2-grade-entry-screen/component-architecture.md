# US-E14.2 — Component Architecture

## Tree

```
teacher/grades/page.tsx (RSC)
  └─ GradeEntryContainer ('use client')        # router-driven selection
       └─ GradeEntryScreen ('use client')      # query/mutation orchestration
            ├─ <Select> class-subject + <Select> term   # filters
            ├─ status <Badge> (pending / published)
            ├─ banner <p role="status">         # save/publish feedback
            ├─ GradeEntrySkeleton               # isLoading
            ├─ EmptyState                        # noSelection / emptyClass / error
            ├─ GradeEntryTable                   # the grid
            │    └─ ScoreCell × (rows × columns) # editable input | read-only span
            └─ AlertDialog                       # publish confirmation
```

## Component homes (decision 0026)
All components are single-screen (feature-local) under
`features/grades/presentation/grade-entry-screen/`. None promoted to
`components/shared/` yet — no second consumer. `Select`, `Badge`, `Button`,
`AlertDialog`, `Skeleton` reused from `components/ui/` primitives unchanged.

## ViewModel contract (`grade-entry-screen.i-vm.ts`)
- `classSubjects: ClassSubjectOption[]` — `{ id, label }`
- `selectedCsId / selectedTerm: string | null`
- `sheet: GradeSheet | null` — RSC-fetched, null when no selection/loading
- `error: GradesFailure["type"] | null` — STABLE KEY, not translated copy
- `saveScoreAction(csId, studentId, columnId, value) → ActionResult`
- `publishAction(csId, term) → ActionResult`
- `ActionResult = { ok: true } | { ok: false; errorKey: GradesFailure["type"] }`

## Boundary discipline
- Server Action returns stable `errorKey`; screen maps via `ERROR_KEY_MAP` +
  `errorMessage()` → `useTranslations("gradeEntry")`. No translation server-side.
- `score-color.ts` is a pure util (proportional ≥80% success / <50% error).
- `GradeEntryScreen` is router-agnostic (`onSelectionChange` optional) so
  Storybook drives it without next/navigation.
