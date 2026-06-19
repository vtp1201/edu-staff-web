# US-E13.6 — State & Data Flow

## RSC-props + URL-param pattern (no client TanStack Query fetch)
The grade book is read-only, so data is fetched in the RSC `page.tsx` via the
DI use-case and passed down as a VM prop. Selection (class-subject / term) lives
in the URL searchParams; changing a selector calls `router.replace(...)` which
re-runs the RSC and delivers a fresh VM. This mirrors the E14.2 grade-entry
container pattern.

```
selector change → GradeBookContainer.onSelectionChange
  → router.replace(?csId=…&term=…) → RSC re-fetch → new GradeBookScreenVM prop
```

- `startTransition` wraps the selection change so the screen stays responsive.
- Retry (error state) → `router.refresh()`.
- Teacher CTA → `router.push(gradeEntryPath?csId&term)` into the E14.2 screen.

## Query keys (`grade-book-keys.ts`)
Declared for forward compatibility (client invalidation if a future revision
moves to client fetching): `book(csId, term)`, `mine(term)`, `child(childId, term)`.
Not used for fetching today (RSC owns fetch).

## Role → data source (DI)
| Role | Use-case | Repo method | Rows |
| --- | --- | --- | --- |
| teacher/principal/admin | `GetGradeBookUseCase` | `getGradeBook(csId, term)` | full roster |
| student | `GetMyGradesUseCase` | `getMyGrades(term)` | single (self) |
| parent | `GetChildGradesUseCase` | `getChildGrades(childId, term)` | single (child) |

## Failure handling
Repo throws `GradesFailure`; use-case catches → returns `GradeBook | GradesFailure`;
RSC maps to `{ error: failure.type }`; the screen translates the stable key via
the `gradeBook.error*` namespace at presentation. No translation server-side.

## Publish gate
`isGradeBookPublished(book)` = non-empty AND every row PUBLISHED. Student/parent
see a "not published" banner until then; roster roles always see the table.
