# US-E14.5 Component Architecture

## Component tree

```
AcademicRecordContainer (use client, TanStack Query)
  └─ AcademicRecordScreen (use client, receives VM)
       ├─ StudentHeaderCard (display only, inline in screen)
       ├─ SealStatusBadge (read-only, whole-record level)
       ├─ YearTimeline (use client, controlled tabs)
       │    └─ YearTab (button[role=tab] × N)
       ├─ TermSection × 2 (HK1, HK2)
       │    ├─ TermHeader (status badge + sealed-by info)
       │    ├─ UnsealedBanner (conditional, UNSEALED status)
       │    ├─ PendingPlaceholder (PENDING status)
       │    └─ AcademicRecordTable (native table, SEALED/UNSEALED)
       │         ├─ thead (scope=col headers)
       │         ├─ tbody (SubjectRow × N)
       │         │    └─ ScoreCell (colored score)
       │         └─ tfoot (SummaryRow: GPA + conduct)
       ├─ EmptyState (no data for year)
       └─ ErrorBanner (error state + retry)
```

## Component locations (canonical)

| Component | Location | Reason |
|-----------|----------|--------|
| AcademicRecordContainer | `features/academic-records/presentation/academic-record-screen/` | Feature-specific container |
| AcademicRecordScreen | same | Feature-specific screen |
| YearTimeline | same | Single-screen use (promotes to shared if E14.6 reuses) |
| SealStatusBadge | same | Single-screen use (promotes to shared if E14.6 reuses) |
| AcademicRecordTable | same | Feature-specific table |
| AcademicRecordSkeleton | same | Feature-specific skeleton |

No new shared/ components needed — all are feature-local until reuse confirmed.

## ViewModel contracts

### AcademicRecordScreenVM
```ts
interface AcademicRecordScreenVM {
  role: 'student' | 'teacher' | 'parent' | 'admin';
  studentId: string;           // 'me' for student self-view
  record: AcademicRecord | null;
  selectedYearId: string | null;
  error: AcademicRecordsFailure['type'] | null;
}
```

### YearTimeline props
```ts
interface YearTimelineProps {
  years: AcademicYear[];
  activeYearId: string;
  onChange: (yearId: string) => void;
}
```

### SealStatusBadge props
```ts
interface SealStatusBadgeProps {
  sealed: boolean;
  sealedAt?: string | null;
  sealedBy?: string | null;
  className?: string;
}
```

### AcademicRecordTable props
```ts
interface AcademicRecordTableProps {
  termRecord: TermRecord;
}
```

## Presentational vs container split

- **Containers** (TanStack Query + data fetching): `AcademicRecordContainer`
- **Presentational** (receive VM/props, no fetching): everything else
- **RSC pages**: pure data → VM construction, render Container

## A11y surface

- `YearTimeline`: `role="tablist"` wrapper, `role="tab"` + `aria-selected` on buttons, `aria-label` from i18n key
- `AcademicRecordTable`: `<caption className="sr-only">` (i18n), `scope="col"` on `<th>`, `scope="row"` on subject name `<th>`
- `SealStatusBadge`: `aria-label` computed from sealed state (i18n keys)
- `TermSection`: `aria-label` on the card section
