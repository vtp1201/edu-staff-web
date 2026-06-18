# US-E11.1 — State Design

## RSC vs client boundary

- **List** (`/student/exams`): data fetched in the RSC page via `makeListExamsUseCase`
  and passed as a prop to `ExamListScreen`. No client TanStack Query — the list is
  a read-once RSC render. Client-only state = the active status filter (`useState`).
- **Detail** (`/student/exams/[examId]`): the RSC page fetches `exam` (from list)
  plus either `questions` (not-completed) or `initialResult` (completed), then hands
  them to the client step machine. The server action `submitExamAction` is passed
  as a prop (Next 16 server-action-as-prop).

## No server state needed during taking

The taking step is entirely local — there is no per-keystroke server sync:

| State | Owner | Type |
| --- | --- | --- |
| `step` | ExamDetailScreen | `"briefing" \| "taking" \| "result"` |
| `startedAt` | ExamDetailScreen | `number \| null` (set on briefing→taking) |
| `result` | ExamDetailScreen | `ExamResult \| null` |
| `errorKey` | ExamDetailScreen | failure key for the error banner |
| `currentIndex` | ExamTakingScreen | `number` |
| `answers` | ExamTakingScreen | `Map<questionId, optionId>` |
| `flagged` | ExamTakingScreen | `Set<questionId>` |
| `showSubmit` | ExamTakingScreen | `boolean` |
| `remaining` | ExamTakingTimer | `number` (derived from `startedAt`+duration) |
| review `filter` | ExamResultScreen | `"all" \| "correct" \| "incorrect" \| "skipped"` |

## Submission flow

`onSubmit(answers, startedAt)` → `useTransition` → `submitExamAction(examId, …)`
→ Result: `{ ok, result }` advances to `result` step; `{ ok:false, errorKey }`
surfaces the localized error banner (translated at presentation only).

## TanStack Query note

Not used here. The list is RSC-served; the taking session is local. If a future
"my results history" surface needs client caching, add a query there with key
`["exam","result",examId]` — out of scope for this story.

## Timer determinism

`ExamTakingTimer` accepts an optional `now()` for tests/stories and derives
`remaining` from `startedAt + durationMinutes*60_000`. At `<= 0` it auto-submits
via `onExpire`. Color thresholds: `>10m` success, `5–10m` warning, `<5m` error.
