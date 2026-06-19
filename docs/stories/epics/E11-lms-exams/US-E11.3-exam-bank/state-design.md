# US-E11.3 Exam Bank + Builder — State Architecture Design

**Author:** fe-state-engineer  
**Date:** 2026-06-18  
**ADR in scope:** 0043 (Up/Down reorder — no dnd-kit)  
**Mock-first:** lms service not shipped; all server state flows through MockExamBankRepository.

---

## 1. State Architecture Summary

US-E11.3 has two distinct screens with different state profiles:

**ExamBankScreen (list)** — straightforward RSC-seeded list with URL-driven filter/search and Server Action mutations. The primary data load is server-side (RSC page calls use-case, passes `ExamBankSummary[]` as ViewModel props). Filter/search state lives in URL search params. After mutations (publish, delete), the Server Action calls `revalidatePath` — Next.js re-renders the RSC page, delivering fresh data. No TanStack Query client cache is needed for the list because: (a) there is no client-triggered refetch requirement, (b) the data is already SSR'd on every navigation, and (c) mock-first means there is no real-time churn. **This follows the RSC + local mutation pattern** confirmed in `lesson-bank/page.tsx`.

**ExamBuilderScreen (create/edit)** — complex local state for the question editor. All question-array manipulation (add, update, reorder, remove, select) lives in a custom hook `useExamBuilder`. The builder header fields (title, subjectId, duration, maxAttempts) are co-owned by the same hook. Async state for save/publish actions is tracked with local `isSaving` / `isPublishing` booleans derived from action call Promises. In edit mode, the RSC page pre-loads `ExamBankDetail` via use-case and passes it as the `initial` prop — the hook hydrates from it. No TanStack Query is needed on the builder client because initial data comes from RSC props, and the builder does not need to refetch during editing.

**Key architectural decisions:**
- No global store (no Zustand/Redux/Jotai).
- No TanStack Query for list or builder: RSC revalidation is primary, no client refetch needed.
- TanStack Query IS introduced only if a future requirement needs client-side polling or cross-component sharing — deferred, not designed now.
- `useExamBuilder` is a pure local-state hook extractable to a unit-testable module.
- Filter/search = URL state (shareable, navigational).
- Mutations go through Server Actions; Server Actions call `revalidatePath` — RSC page re-renders on next navigation.

---

## 2. State Inventory

| # | State item | Type | Owner / Location | TypeScript shape | Reason |
|---|-----------|------|-----------------|-----------------|--------|
| 1 | Exam list (initial) | Server state (RSC) | RSC `page.tsx` → `ExamBankScreen` prop | `ExamBankSummary[]` | SSR'd on each navigation; no client refetch needed; follows lesson-bank pattern |
| 2 | Subjects list (for filter dropdown) | Server state (RSC, derived) | RSC `page.tsx` → `ExamBankScreen` prop | `SubjectOption[]` | Derived from exam list at RSC time; no separate fetch |
| 3 | Filter: subjectId | URL state | `useSearchParams` / `useRouter` | `string \| undefined` | Shareable, bookmarkable, works with RSC revalidation |
| 4 | Filter: status | URL state | `useSearchParams` / `useRouter` | `"draft" \| "published" \| undefined` | Same as above |
| 5 | Filter: search (title) | URL state | `useSearchParams` / `useRouter` | `string \| undefined` | Debounced write to URL (300ms); preserves browser back |
| 6 | Filter: teacherId (admin only) | URL state | `useSearchParams` / `useRouter` | `string \| undefined` | Admin aggregate filter; no local state |
| 7 | Questions array (builder) | Local component state | `useExamBuilder` hook | `ExamBankQuestion[]` | Mutable during edit session; owned entirely by builder hook |
| 8 | Selected question index | Local component state | `useExamBuilder` hook | `number` (−1 = none) | Drives which question is shown in MCQ editor right pane |
| 9 | Exam meta (title, subjectId, duration, maxAttempts) | Local component state | `useExamBuilder` hook | `ExamMeta` | Header fields; co-located with question state for unified draft submission |
| 10 | MCQ field values (content, options, correctOptionId, difficulty) | Local component state | `MCQEditor` (controlled) | `ExamBankQuestion` slice | Controlled by `useExamBuilder.updateQuestion`; no separate form library needed |
| 11 | Publish confirm dialog open | Local component state | `ExamBuilderScreen` | `boolean` | UI-only; no persistence needed |
| 12 | Delete confirm dialog open | Local component state | `ExamBankScreen` (per-card) | `string \| null` (exam id being confirmed) | Tracks which exam's delete is being confirmed |
| 13 | `isSaving` | Local async state | `ExamBuilderScreen` | `boolean` | Set true on `saveDraftAction` call start; false on resolve |
| 14 | `isPublishing` | Local async state | `ExamBuilderScreen` | `boolean` | Set true on `publishExamAction` call start; false on resolve |
| 15 | `actionError` (builder) | Local async state | `ExamBuilderScreen` | `ExamBankFailure["type"] \| null` | Cleared on each action start; set on action error response |
| 16 | `actionError` (list) | Local async state | `ExamBankScreen` | `ExamBankFailure["type"] \| null` | Per-card action error (publish/delete); cleared on next action |
| 17 | ExamBankDetail (builder initial) | Server state (RSC) | RSC `[id]/edit/page.tsx` → `ExamBuilderScreen` prop | `ExamBankDetail \| undefined` | Loaded server-side in edit mode; undefined in create mode |

**No TanStack Query client cache in this story.** The RSC + Server Action revalidation cycle replaces client cache for both screens.

---

## 3. State Flow

### 3.1 ExamBankScreen — List

```
RSC page.tsx
  └── makeListExamBankUseCase().execute(filter)
        └── MockExamBankRepository.listExamBank(filter)
              ↓
        ExamBankSummary[]
              ↓
        deriveSubjects(exams) → SubjectOption[]
              ↓
  ExamBankScreen (client)
    Props: { exams, subjects, viewerRole, currentTeacherId,
             publishAction, deleteAction, createAction, editAction }
              ↓
    ExamBankFilterBar
      reads  → useSearchParams() [subjectId, status, search, teacherId]
      writes → router.replace(newSearchParams) on filter change
              ↓
    ExamCard × n
      publish button → calls publishAction(id)
                         (Server Action) → makePublishExamUseCase().execute(id)
                                         → revalidatePath('/teacher/exam-bank')
                                         → return { ok: true } | { ok: false, errorKey }
                       on ok    → toast success
                       on error → setActionError(errorKey); toast t(errorKey)
      delete button  → setDeleteConfirmId(id) (local open dialog)
      delete confirm → calls deleteAction(id)
                         (Server Action) → makeDeleteExamUseCase().execute(id)
                                         → revalidatePath('/teacher/exam-bank')
                                         → return { ok: true } | { ok: false, errorKey }
                       on ok    → toast success
                       on error → setActionError(errorKey); toast t(errorKey)
```

**Filter-to-RSC data flow (URL-first):**

The RSC `page.tsx` reads `searchParams` from the Next.js page prop and passes the filter into the use-case. This means filter changes (via `router.replace`) trigger a Next.js navigation that causes the RSC to re-run with the new params and return a fresh `ExamBankSummary[]`. The client component renders the prop-provided data — no client filter computation, no TanStack Query.

```
User changes filter
  → ExamBankFilterBar calls router.replace('?subjectId=math&status=draft')
    → Next.js navigation
      → RSC page re-runs with new searchParams
        → makeListExamBankUseCase().execute({ subjectId: 'math', status: 'draft' })
          → MockExamBankRepository returns filtered list
            → ExamBankScreen receives fresh exams prop
```

### 3.2 ExamBuilderScreen — Create Mode

```
RSC create/page.tsx
  (no use-case call — create mode has no initial data)
              ↓
  ExamBuilderScreen (client)
    Props: { initial: undefined, subjects, saveDraftAction, createExamAction }
              ↓
    useExamBuilder(undefined)
      → initializes: exam = blankExamMeta(), questions = [], selectedIdx = -1
              ↓
    BuilderHeader → calls hook.updateExamMeta(patch)
    QuestionList → renders hook.questions; Up/Down calls hook.reorderQuestions
    MCQEditor    → renders hook.questions[hook.selectedIdx];
                   on change calls hook.updateQuestion(idx, patch)
    ActionBar
      "Save Draft" → isSaving = true
                   → createExamAction(buildInput(exam, questions))
                       (Server Action) → makeCreateExamUseCase().execute(input)
                                       → return { ok: true, id } | { ok: false, errorKey }
                   → isSaving = false
                   → on ok:    toast "Đã lưu nháp"; router.replace(`/teacher/exam-bank/${id}/edit`)
                   → on error: setActionError(errorKey)

      "Publish"   → validate locally (questions.length ≥ 1, each has content + correctOptionId + ≥2 options)
                  → if invalid: setActionError('no-questions' | 'question-empty-content' | ...)
                  → if valid:   setPublishDialogOpen(true)
      Dialog confirm → isPublishing = true
                     → createExamAction(input) then publishExamAction(id)
                     → isPublishing = false
                     → on ok:    toast "Đã publish"; router.push('/teacher/exam-bank')
                     → on error: setActionError(errorKey)
```

### 3.3 ExamBuilderScreen — Edit Mode

```
RSC [id]/edit/page.tsx
  └── makeGetExamDetailUseCase().execute(id)
        └── MockExamBankRepository.getExamDetail(id)
              ↓
        ExamBankDetail (incl. questions[])
              ↓
  ExamBuilderScreen (client)
    Props: { initial: ExamBankDetail, subjects, saveDraftAction, updateExamAction, publishAction }
              ↓
    useExamBuilder(initial)
      → initializes from initial.questions, initial.title, initial.subjectId, etc.
              ↓
    (same builder UI as create mode, but actions call updateExamAction instead of createExamAction)
    "Save Draft" → updateExamAction(initial.id, buildInput(exam, questions))
                     (Server Action) → makeUpdateExamUseCase().execute(id, input)
                                     → return { ok: true } | { ok: false, errorKey }
                   → on ok:    toast "Đã lưu nháp"
                   → on error: setActionError(errorKey)

    "Publish"   → (validate) → updateExamAction → then publishExamAction(id)
```

---

## 4. Query Key Hierarchy + Cache Policy

**Decision: No TanStack Query for this story.**

The rationale follows the RSC-first read-only pattern confirmed in this repo (lesson-bank, class-log, teacher-dashboard). Both screens have their data SSR'd by RSC pages. Mutations go through Server Actions that call `revalidatePath`. There is no client-triggered refetch, no polling, no SSE-driven invalidation, and no cross-component sharing that requires a client cache.

However, the key hierarchy is defined here for the **upgrade path** when the lms service ships and real-time behavior may be required:

```ts
// src/features/exam-bank/presentation/exam-bank-keys.ts
// (not created now — defined here for upgrade reference only)

export const examBankKeys = {
  all:    ()                                 => ['exam-bank']                              as const,
  lists:  ()                                 => ['exam-bank', 'list']                      as const,
  list:   (params: ExamBankFilter)           => ['exam-bank', 'list', params]              as const,
  detail: (id: string)                       => ['exam-bank', 'detail', id]                as const,
}
```

**Upgrade trigger:** When lms service ships and any of these conditions appear:
- The list needs background refetch (polling for exam status changes)
- Another client component (e.g., a dashboard widget) needs the same exam list without a full RSC re-render
- SSE events from `noti` service signal exam state changes that should invalidate the list

**Cache durations (for future reference, following this repo's conventions):**

| Query | staleTime | gcTime | Notes |
|-------|-----------|--------|-------|
| `examBankKeys.list(params)` | `120_000` (2 min) | `300_000` (5 min) | Exam list changes infrequently (matches discipline violations pattern) |
| `examBankKeys.detail(id)` | `60_000` (1 min) | `180_000` (3 min) | Builder edit mode; user may leave and return |

---

## 5. Invalidation Map

Since no TanStack Query is used now, this table covers **revalidation paths** (Next.js cache) for each Server Action:

| Trigger | Server Action | revalidatePath called | Effect |
|---------|--------------|----------------------|--------|
| Publish exam (from list) | `publishExamAction(id)` | `/teacher/exam-bank` | RSC re-runs list; card status badge updates to "published" |
| Publish exam (from admin) | `publishExamAction(id)` | `/admin/exam-bank` | Admin aggregate re-renders |
| Delete exam | `deleteExamAction(id)` | `/teacher/exam-bank` | RSC re-runs; deleted card removed from list |
| Save draft (create) | `createExamAction(input)` | `/teacher/exam-bank` | List now includes new draft; builder redirects to edit URL |
| Save draft (update) | `updateExamAction(id, input)` | `/teacher/exam-bank`, `/teacher/exam-bank/${id}/edit` | Both list and edit page are fresh |
| Publish from builder | `updateExamAction` + `publishExamAction` | `/teacher/exam-bank`, `/teacher/exam-bank/${id}/edit` | Sequence: update first, then publish |

**Future invalidation map (TanStack Query upgrade path):**

| Trigger | Keys invalidated |
|---------|-----------------|
| `publishExamAction` success | `examBankKeys.lists()`, `examBankKeys.detail(id)` |
| `deleteExamAction` success | `examBankKeys.lists()` |
| `createExamAction` success | `examBankKeys.lists()` |
| `updateExamAction` success | `examBankKeys.lists()`, `examBankKeys.detail(id)` |
| SSE: `exam.published` | `examBankKeys.lists()` |

---

## 6. Mutations & Optimistic Strategy

### 6.1 Why no optimistic updates for ExamBankScreen

The list screen's data is RSC-owned. After a Server Action returns `{ ok: true }`, `revalidatePath` marks the RSC cache stale. The next user navigation (or if the page is still mounted, the next RSC re-render triggered by Next.js) delivers fresh data. This is not truly "optimistic" (the list only updates on re-render, not instantly), but for the mock-first phase this is the correct approach matching the lesson-bank pattern.

**Rationale for deferring optimistic list updates:**
- The list is rendered by RSC — there is no TanStack Query cache to patch optimistically
- Mock-first: no real network latency to hide
- When lms ships and latency appears, upgrade to TanStack `useMutation` with `onMutate` optimistic set + `onError` rollback + `onSettled` invalidate

### 6.2 Mutation flows (all mock-first, no optimistic)

**Publish exam (from ExamBankScreen)**
```
User clicks "Publish" on ExamCard
  → ExamBankScreen: setPublishPendingId(id)  (local: which card is loading)
  → call publishAction(id)                   (Server Action ref from props)
    → Server Action: makePublishExamUseCase().execute(id)
                   → revalidatePath('/teacher/exam-bank')
                   → return { ok: true } | { ok: false, errorKey }
  → on { ok: true }:    toast(t('examBank.toast.published'))
  → on { ok: false }:   setCardError(id, errorKey); toast(t(`examBank.errors.${errorKey}`))
  → setPublishPendingId(null)
```

**Delete exam (from ExamBankScreen)**
```
User clicks "Xoá" on ExamCard
  → setDeleteConfirmId(id)        (opens AlertDialog)
User confirms
  → setDeleteConfirmId(null)      (close dialog)
  → setDeletePendingId(id)        (local: which card is loading)
  → call deleteAction(id)
    → Server Action: makeDeleteExamUseCase().execute(id)
                   → return { ok: true } | { ok: false, errorKey: 'cannot-delete-published' | ... }
                   → on ok: revalidatePath('/teacher/exam-bank')
  → on { ok: true }:    toast(t('examBank.toast.deleted'))
  → on { ok: false }:   setCardError(id, errorKey); toast(t(`examBank.errors.${errorKey}`))
  → setDeletePendingId(null)
```

**Save draft (from ExamBuilderScreen — create mode)**
```
User clicks "Lưu nháp"
  → local validation: exam.title must be non-empty
  → if invalid: setActionError('missing-title'); return
  → setIsSaving(true)
  → call createExamAction(buildInput(exam, questions))
    → Server Action: makeCreateExamUseCase().execute(input)
                   → revalidatePath('/teacher/exam-bank')
                   → return { ok: true, id } | { ok: false, errorKey }
  → on { ok: true, id }:  toast("Đã lưu nháp"); router.replace(`/teacher/exam-bank/${id}/edit`)
  → on { ok: false }:     setActionError(errorKey)
  → setIsSaving(false)
```

**Save draft (from ExamBuilderScreen — edit mode)**
```
User clicks "Lưu nháp"
  → local validation: exam.title non-empty
  → setIsSaving(true)
  → call saveDraftAction(buildInput(exam, questions))  [= updateExamAction(id, input)]
    → Server Action: makeUpdateExamUseCase().execute(id, input)
                   → revalidatePath('/teacher/exam-bank')
                   → revalidatePath(`/teacher/exam-bank/${id}/edit`)
                   → return { ok: true } | { ok: false, errorKey }
  → on { ok: true }:   toast("Đã lưu nháp")
  → on { ok: false }:  setActionError(errorKey)
  → setIsSaving(false)
```

**Publish exam (from ExamBuilderScreen)**
```
User clicks "Publish"
  → local pre-validation (before dialog):
      if questions.length === 0 → setActionError('no-questions'); return
      for each q in questions:
        if !q.content.trim()         → setActionError('question-empty-content'); return
        if !q.correctOptionId        → setActionError('question-missing-answer'); return
        if q.options.length < 2      → setActionError('insufficient-options'); return
  → setPublishDialogOpen(true)
User confirms dialog
  → setPublishDialogOpen(false)
  → setIsPublishing(true)
  → (edit mode): call saveDraftAction then publishExamAction(id)
    (create mode): call createExamAction then publishExamAction(newId)
    → Server Actions call domain use-cases which enforce rules server-side too
    → revalidatePath('/teacher/exam-bank')
  → on ok:    toast("Đề thi đã được publish"); router.push('/teacher/exam-bank')
  → on error: setActionError(errorKey)
  → setIsPublishing(false)
```

---

## 7. `useExamBuilder` Hook Design

The `useExamBuilder` hook encapsulates all mutable builder state. It is not a TanStack Query hook — it is a pure React `useState` hook with array operations. It accepts an `initial?: ExamBankDetail` parameter for edit mode.

### 7.1 TypeScript shapes

```ts
// Held in useExamBuilder internal state

interface ExamMeta {
  title: string
  subjectId: string
  durationMinutes: number
  maxAttempts: number
}

interface ExamBuilderLocalState {
  meta: ExamMeta
  questions: ExamBankQuestion[]
  selectedIdx: number   // -1 = no question selected
}
```

### 7.2 Hook contract

```ts
function useExamBuilder(initial?: ExamBankDetail): {
  // Read
  meta: ExamMeta
  questions: ExamBankQuestion[]
  selectedIdx: number
  isDirty: boolean           // true if any change since initialization

  // Exam meta mutations
  updateExamMeta(patch: Partial<ExamMeta>): void

  // Question array mutations
  addQuestion(): void        // appends blank question; sets selectedIdx to new last index
  removeQuestion(idx: number): void       // removes; selectedIdx adjusts (clamp to last)
  updateQuestion(idx: number, patch: Partial<ExamBankQuestion>): void
  reorderQuestions(fromIdx: number, toIdx: number): void  // array-swap (ADR 0043)
  selectQuestion(idx: number): void
}
```

### 7.3 Initialization logic

```
if (initial === undefined):               // create mode
  meta = { title: '', subjectId: '', durationMinutes: 45, maxAttempts: 1 }
  questions = []
  selectedIdx = -1

if (initial !== undefined):               // edit mode
  meta = {
    title:           initial.title,
    subjectId:       initial.subjectId,
    durationMinutes: initial.durationMinutes,
    maxAttempts:     initial.maxAttempts,
  }
  questions = [...initial.questions]      // shallow copy — mutations do not mutate prop
  selectedIdx = initial.questions.length > 0 ? 0 : -1
```

### 7.4 `reorderQuestions` implementation contract (ADR 0043)

The function must produce a new array without mutating the original:

```
reorderQuestions(fromIdx, toIdx):
  1. Guard: fromIdx === toIdx → no-op
  2. Guard: fromIdx or toIdx out of [0, questions.length-1] → no-op
  3. Create newQuestions = [...questions]
  4. const [moved] = newQuestions.splice(fromIdx, 1)
  5. newQuestions.splice(toIdx, 0, moved)
  6. Update each question's `index` field to match new array position
  7. setState({ questions: newQuestions })
```

This is a pure array operation testable in Vitest with no React dependency.

### 7.5 `addQuestion` blank template

```
{
  id: `q-${Date.now()}`,          // temporary client-side id; server assigns real id on save
  index: questions.length,
  content: '',
  options: [
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ],
  correctOptionId: '',
  difficulty: 'medium',
  subjectId: meta.subjectId,      // inherit from exam meta
}
```

### 7.6 Why this hook is unit-testable

All operations are pure `useState` dispatches on plain arrays and plain objects. No React context, no TanStack Query, no HTTP. Tests can call the hook via `renderHook` (Vitest + @testing-library/react) and assert the resulting state after each operation. The `reorderQuestions` array-swap logic can also be extracted to a pure utility function and tested without React.

### 7.7 `buildInput` helper (used by Server Action call sites)

Not part of the hook — a separate presentation-layer utility:

```ts
// exam-builder-screen.tsx (inline or small helper file)
function buildInput(meta: ExamMeta, questions: ExamBankQuestion[]): UpdateExamInput {
  return {
    title:           meta.title,
    subjectId:       meta.subjectId,
    durationMinutes: meta.durationMinutes,
    maxAttempts:     meta.maxAttempts,
    questions:       questions.map((q, i) => ({ ...q, index: i })),
  }
}
```

---

## 8. Async State Machine

### 8.1 ExamBankScreen — per-card async states

| State | Condition | UI treatment |
|-------|-----------|-------------|
| Loading (initial) | RSC page is rendering | `ExamBankSkeleton` — 6 skeleton cards (AC-1) |
| Success | `exams.length > 0` after RSC | `ExamCard` grid |
| Empty (no exams at all) | `exams.length === 0` AND no active filter | `ExamBankEmpty` with "Tạo đề thi đầu tiên" CTA (AC-11) |
| Empty (filtered, no match) | `exams.length === 0` AND active filter/search | `ExamBankEmpty` variant: "Không tìm thấy đề thi" (no CTA) |
| Action pending (publish/delete) | `publishPendingId === card.id` or `deletePendingId === card.id` | Button shows spinner/disabled; card muted |
| Action error | `cardError[card.id]` is set | Toast with `t(examBank.errors.${errorKey})`; button re-enabled |
| Delete confirm | `deleteConfirmId === card.id` | `AlertDialog` open |

**Note on skeleton:** The RSC page renders the skeleton server-side during Suspense (if a `<Suspense>` boundary is added around the data-loading section), or the skeleton is rendered client-side during Next.js router transitions. AC-1 ("skeleton cards when loading the list") is satisfied by the `ExamBankSkeleton` component rendered while the RSC page is in flight.

### 8.2 ExamBuilderScreen — async states

| State | Condition | UI treatment |
|-------|-----------|-------------|
| Loading (edit mode) | RSC page loads `ExamBankDetail` | Full-page skeleton (BuilderSkeleton) |
| Ready (create) | `initial === undefined`, hook initialized blank | Empty question list; MCQEditor hidden; "Thêm câu" CTA prominent |
| Ready (edit) | `initial` loaded, `questions.length > 0` | First question selected; MCQEditor shows question 0 |
| No question selected | `selectedIdx === -1` | Right pane shows empty-state copy "Chọn câu hỏi để chỉnh sửa" |
| Saving draft | `isSaving === true` | "Lưu nháp" button shows "Đang lưu..." (i18n key `examBank.builder.saving`); button disabled |
| Publishing | `isPublishing === true` | "Publish" button shows spinner; dialog confirm button disabled |
| Validation error (local) | `actionError` is a publish-blocking type | Error banner below MCQEditor; invalid question highlighted in QuestionList (red border) |
| Action error (server) | `actionError` is a server failure type | Toast with `t(examBank.errors.${errorKey})`; buttons re-enabled |
| Success save draft (create) | `createExamAction` returned `{ ok: true, id }` | Toast "Đã lưu nháp"; router redirects to edit URL |
| Success save draft (edit) | `updateExamAction` returned `{ ok: true }` | Toast "Đã lưu nháp"; stay on page |
| Success publish | `publishExamAction` returned `{ ok: true }` | Toast "Đề thi đã được publish"; router.push('/teacher/exam-bank') |

### 8.3 Error → failure → i18n key mapping

All failures returned by Server Actions are of type `ExamBankFailure["type"]`. The presentation translates them at the client boundary using `t(\`examBank.errors.${errorKey}\`)`.

| `errorKey` | `ExamBankFailure["type"]` | i18n key path | When triggered |
|-----------|--------------------------|--------------|----------------|
| `"not-found"` | `ExamBankFailure` | `examBank.errors.not-found` | getExamDetail on non-existent id |
| `"forbidden"` | `ExamBankFailure` | `examBank.errors.forbidden` | Teacher tries to edit another teacher's exam |
| `"cannot-delete-published"` | `ExamBankFailure` | `examBank.errors.cannot-delete-published` | Delete on published exam (defence in domain layer) |
| `"missing-title"` | `ExamBankFailure` | `examBank.errors.missing-title` | createExam/updateExam with blank title |
| `"no-questions"` | `ExamBankFailure` | `examBank.errors.no-questions` | publishExam with 0 questions |
| `"question-empty-content"` | `ExamBankFailure` | `examBank.errors.question-empty-content` | publishExam with blank question content |
| `"question-missing-answer"` | `ExamBankFailure` | `examBank.errors.question-missing-answer` | publishExam with no correctOptionId |
| `"insufficient-options"` | `ExamBankFailure` | `examBank.errors.insufficient-options` | publishExam with <2 options |
| `"network-error"` | `ExamBankFailure` | `examBank.errors.network-error` | HTTP transport failure |
| `"unknown"` | `ExamBankFailure` | `examBank.errors.unknown` | Catch-all |

**Rule:** Server Actions NEVER translate. They return `{ ok: false, errorKey: failure.type }`. The presentation component calls `t(\`examBank.errors.${vm.errorKey}\`)`. Type safety is enforced because `ExamBankFailure["type"]` is a union literal — if a key is missing from `vi.json`, `tsc` fails.

---

## 9. Race Conditions & Resolution

### Race 1: Double-click "Save Draft"

**Scenario:** User double-clicks "Lưu nháp" before the first action resolves.

**Resolution:** `isSaving` flag. When `isSaving === true`, the "Lưu nháp" button is `disabled`. The second click is a no-op. The flag is set to `false` in the action's finally block (both ok and error paths). No debounce needed; the button disabled state is sufficient.

### Race 2: Save Draft then navigate away

**Scenario:** User clicks "Lưu nháp" (async in flight) then navigates to `/teacher/exam-bank` before the action completes.

**Resolution:** Next.js RSC navigation happens client-side via router. If the action resolves after navigation, the `router.push` in the success handler fires (no-op if already on the target page, or it navigates correctly). The toast may flash briefly on the new page — acceptable UX. No rollback needed since the save either committed or failed server-side regardless of the navigation.

### Race 3: Concurrent publish from builder + list card

**Scenario:** User has two browser tabs open — one on the list, one on the builder. List publishes the exam; builder also tries to publish.

**Resolution:** The domain use-case (`PublishExamUseCase`) is idempotent for already-published exams — publishing a published exam returns `{ ok: true }` (no-op) or a specific failure. Server-side truth is authoritative. The builder's second publish attempt at worst gets a no-op success. No client-side de-duplication needed.

### Race 4: URL filter change during Server Action

**Scenario:** User triggers a publish action, then immediately changes the filter (URL change → RSC re-render).

**Resolution:** The Server Action and the RSC navigation are independent. `revalidatePath` marks the cache stale; the RSC re-render triggered by the filter change will pick up fresh data if the action already completed, or will get cached data if not yet complete (Next.js will re-render again when revalidation fires). No explicit coordination needed — eventual consistency via revalidation is acceptable for this use case.

### Race 5: `reorderQuestions` during `isSaving`

**Scenario:** Auto-save (if debounced save is implemented) fires while user is reordering questions.

**Resolution (design guidance for implementation):** In this story, save is manual (button click), not auto-save. `isSaving` disables the Save button but does NOT disable the question list. If auto-save is added in a future story, implement it as: cancel pending debounced save timer when a new reorder fires, then restart the timer after the reorder completes. The hook's `questions` state at the time the action fires is always the source of truth.

### Race 6: `addQuestion` then immediate `removeQuestion` before render

**Scenario:** Two rapid state dispatches (unlikely but possible in tests).

**Resolution:** React batches state updates in event handlers. `useExamBuilder`'s array operations are all single `setState` calls — each dispatch produces a new array reference. React will batch them correctly in concurrent mode. No special handling needed.

---

## 10. RSC ↔ Client Boundary Summary

| Data | Where loaded | How passed to client |
|------|-------------|---------------------|
| `ExamBankSummary[]` | RSC `page.tsx` (via use-case) | Prop `exams` on `ExamBankScreen` |
| `SubjectOption[]` | RSC `page.tsx` (derived from exams) | Prop `subjects` on `ExamBankScreen` |
| `viewerRole` | RSC `page.tsx` (known from route segment) | Prop on `ExamBankScreen` |
| `currentTeacherId` | RSC `page.tsx` (mock constant; future: from session) | Prop on `ExamBankScreen` |
| `ExamBankDetail` | RSC `[id]/edit/page.tsx` (via use-case) | Prop `initial` on `ExamBuilderScreen` |
| `SubjectOption[]` (builder) | RSC builder page (same derive logic or mock) | Prop `subjects` on `ExamBuilderScreen` |
| Filter state (`subjectId`, `status`, `search`, `teacherId`) | URL search params | `useSearchParams()` in `ExamBankFilterBar` |
| Questions array, selectedIdx, exam meta | Local hook state | `useExamBuilder()` within `ExamBuilderScreen` |
| `isSaving`, `isPublishing`, `actionError` | Local component state | `useState()` in `ExamBuilderScreen` |
| Delete/publish confirm dialog open | Local component state | `useState()` in `ExamBankScreen` |

**Server Actions** (cross the RSC→client boundary as function references passed via props):
- `publishExamAction(id: string): Promise<ActionResult>`
- `deleteExamAction(id: string): Promise<ActionResult>`
- `createExamAction(input: CreateExamInput): Promise<{ ok: true; id: string } | { ok: false; errorKey: ExamBankFailure["type"] }>`
- `updateExamAction(id: string, input: UpdateExamInput): Promise<ActionResult>`

**What stays server-only:**
- `IExamBankRepository` and its implementation
- `MockExamBankRepository` and `fixtures.ts`
- All use-case classes
- `bootstrap/di/exam-bank.di.ts`
- `bootstrap/endpoint/exam-bank.endpoint.ts`

**What is safe on the client:**
- `ExamBankSummary`, `ExamBankDetail`, `ExamBankQuestion` entity types (pure TypeScript, no runtime deps)
- `ExamBankFailure` type union
- `ExamBankScreenVM`, `ExamBuilderScreenVM` ViewModel interfaces

---

## 11. ViewModel Interface Contracts

### `ExamBankScreenVM`

```ts
// src/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm.ts

import type { ExamBankSummary } from '../../domain/entities/exam-bank-summary.entity'
import type { ExamBankFailure } from '../../domain/failures/exam-bank.failure'

export interface SubjectOption {
  id: string
  name: string
}

export type ActionResult<F = ExamBankFailure> =
  | { ok: true }
  | { ok: false; errorKey: F['type'] }

export interface ExamBankScreenVM {
  exams: ExamBankSummary[]
  subjects: SubjectOption[]
  viewerRole: 'teacher' | 'admin'
  currentTeacherId: string
  publishAction(id: string): Promise<ActionResult>
  deleteAction(id: string): Promise<ActionResult>
}
```

### `ExamBuilderScreenVM`

```ts
// src/features/exam-bank/presentation/exam-builder-screen/exam-builder-screen.i-vm.ts

import type { ExamBankDetail } from '../../domain/entities/exam-bank-detail.entity'
import type { CreateExamInput, UpdateExamInput } from '../../domain/entities/exam-bank-input.entity'
import type { ExamBankFailure } from '../../domain/failures/exam-bank.failure'

export type BuilderActionResult =
  | { ok: true }
  | { ok: false; errorKey: ExamBankFailure['type'] }

export type CreateActionResult =
  | { ok: true; id: string }
  | { ok: false; errorKey: ExamBankFailure['type'] }

export interface ExamBuilderScreenVM {
  /** undefined = create mode; defined = edit mode */
  initial?: ExamBankDetail
  subjects: SubjectOption[]
  /** Edit mode: save draft updates existing exam */
  saveDraftAction(input: UpdateExamInput): Promise<BuilderActionResult>
  /** Create mode: first save creates the exam and returns the new id */
  createExamAction(input: CreateExamInput): Promise<CreateActionResult>
  /** Publish: always has an id (builder publishes only after at least one save) */
  publishExamAction(id: string): Promise<BuilderActionResult>
}
```

---

## 12. Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TanStack Query on list | Not used | RSC-seeded list; `revalidatePath` handles freshness; no client refetch needed; follows lesson-bank pattern |
| TanStack Query on builder | Not used | Builder data is RSC prop; no cross-component sharing; no polling |
| Filter/search state | URL search params | Shareable, browser-back preserves filter, works with RSC searchParams |
| Question reorder | Up/Down buttons via `reorderQuestions(fromIdx, toIdx)` | ADR 0043: no dnd-kit; fully keyboard-accessible; zero dep |
| Builder state extraction | `useExamBuilder` custom hook | Keeps component lean; makes array operations unit-testable |
| Optimistic updates | None for this story | Mock-first; no real latency to hide; `revalidatePath` provides eventual consistency |
| Mutation async state | Local `isSaving` / `isPublishing` booleans | Sufficient for single-action-at-a-time UX; no need for `useMutation` |
| Error handling | Server Action returns `{ ok: false, errorKey: FailureType }`; client translates via `t(errorKey)` | Stable key contract; typed at compile time via `ExamBankFailure["type"]` |
| Admin route | Same `ExamBankScreen` with `viewerRole="admin"` | Same component, no create/edit affordance; DI factory uses role param |
| Upgrade path | Replace RSC props with `useQuery(initialData)` + `useMutation` when lms ships | Minimal refactor: add `examBankKeys` factory, wrap action calls in `useMutation` |
