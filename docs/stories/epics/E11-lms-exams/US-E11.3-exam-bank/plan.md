# US-E11.3 Exam Bank + Builder — Implementation Plan

## 1. Summary

**Feature:** Teacher MCQ Exam Bank — list, create, edit (Builder), publish, delete.
Admin read-only aggregate.
**Lane:** normal
**Screens touched:**
- `/teacher/exam-bank` — list + filter + search
- `/teacher/exam-bank/create` — Builder (new exam)
- `/teacher/exam-bank/[id]/edit` — Builder (edit existing)
- `/admin/exam-bank` — read-only aggregate

**Done looks like:**
- Skeleton → list → filter/search → create/edit builder → drag-reorder questions →
  save draft → publish (confirm dialog) → delete draft — all wired to mock repo.
- Admin sees all exams, no create/edit affordance.
- All strings under `examBank` i18n namespace (vi + en parity).
- Unit tests green; 8 Storybook stories passing interaction tests; `bun build` + `tsc` clean.

**Key decisions:**

| # | Decision | Ruling |
|---|----------|--------|
| D1 | Drag-to-reorder library | `@dnd-kit/core` + `@dnd-kit/sortable` — not in `package.json` yet. Must be installed as dependency. Flag to `fe-lead` for `bun add @dnd-kit/core @dnd-kit/sortable` before Phase 4. If blocked, fallback = manual array-swap via Up/Down keyboard-accessible buttons (no new dep). |
| D2 | Builder page layout | Full-screen 2-col layout overrides app shell — use `layout="builder"` or suppress sidebar via a dedicated layout file under `app/…/exam-bank/create/layout.tsx` (Next.js segment layout). No new token needed. |
| D3 | Feature module | `src/features/exam-bank/` — separate from `src/features/exam/` (student-side). No shared entities; `ExamBankSummary` vs student `ExamSummary` have different fields (status, teacherId, totalQuestions, not deadline/attempts). |
| D4 | `ExamBankQuestion` entity | Extends student `ExamQuestion` with `correctOptionId`, `difficulty`, `subjectId` fields — NOT imported from `features/exam/`; redeclared here (different domain). |
| D5 | Admin route | Reuses same `IExamBankRepository.listExamBank()` with `role:"admin"` scope; single DI factory with role param. |

**ADR flag:** D1 requires `@dnd-kit` installation decision → flag to `fe-lead` as ADR **0043** ("drag-to-reorder library for Exam Builder").

---

## 2. Phased Breakdown

### Phase 1 — Domain (pure TypeScript, no deps)

**Goal:** Define entities, failure union, repository interface, use-case classes; all unit-tested red→green.

**Files (`src/features/exam-bank/domain/`):**
```
entities/
  exam-bank-summary.entity.ts      # list card entity
  exam-bank-detail.entity.ts       # full exam incl. questions[]
  exam-bank-question.entity.ts     # MCQ question + options + correctOptionId + difficulty
  exam-bank-filter.entity.ts       # { subjectId?, status?, search?, teacherId? }
  exam-bank-input.entity.ts        # CreateExamInput / UpdateExamInput
failures/
  exam-bank.failure.ts             # failure union (see below)
repositories/
  i-exam-bank.repository.ts        # interface
use-cases/
  list-exam-bank.use-case.ts
  get-exam-detail.use-case.ts
  create-exam.use-case.ts
  update-exam.use-case.ts
  publish-exam.use-case.ts         # domain rules enforced here
  delete-exam.use-case.ts
  __tests__/
    publish-exam.use-case.test.ts  # ← WRITTEN FIRST (red)
    create-exam.use-case.test.ts
    delete-exam.use-case.test.ts
```

**Entity shapes (key fields):**

`ExamBankSummary`: `id, title, subjectId, subjectName, teacherId, teacherName, totalQuestions, durationMinutes, maxAttempts, status: "draft"|"published", createdAt`

`ExamBankDetail` extends summary + `questions: ExamBankQuestion[]`

`ExamBankQuestion`: `id, index, content, options: {id:"A"|"B"|"C"|"D", text}[], correctOptionId: string, difficulty: "easy"|"medium"|"hard", subjectId`

**Failure union:**
```ts
type ExamBankFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "cannot-delete-published" }
  | { type: "missing-title" }
  | { type: "no-questions" }              // publish: min 1 question
  | { type: "question-empty-content" }   // publish: question.content blank
  | { type: "question-missing-answer" }  // publish: no correctOptionId
  | { type: "insufficient-options" }     // publish: <2 options
  | { type: "network-error" }
  | { type: "unknown"; message?: string }
```

**Repository interface:**
```ts
interface IExamBankRepository {
  listExamBank(filter: ExamBankFilter): Promise<ExamBankSummary[]>
  getExamDetail(id: string): Promise<ExamBankDetail>
  createExam(input: CreateExamInput): Promise<ExamBankDetail>
  updateExam(id: string, input: UpdateExamInput): Promise<ExamBankDetail>
  publishExam(id: string): Promise<ExamBankSummary>
  deleteExam(id: string): Promise<void>
}
```

**Test first (RED before any implementation):**

`publish-exam.use-case.test.ts` — 5 cases:
1. `ok:true` — valid exam (≥1 question, all have content + correctOptionId + ≥2 options)
2. `{ type: "no-questions" }` — empty questions array
3. `{ type: "question-empty-content" }` — question.content is blank
4. `{ type: "question-missing-answer" }` — correctOptionId is empty
5. `{ type: "insufficient-options" }` — question has <2 options

`delete-exam.use-case.test.ts` — 2 cases:
1. `ok:true` — draft exam deleted
2. `{ type: "cannot-delete-published" }` — published exam blocked at domain level

`create-exam.use-case.test.ts` — 2 cases:
1. `ok:true` — valid input delegates to repo
2. `{ type: "missing-title" }` — empty title

**Done when:** 9 use-case unit tests green, tsc clean on domain layer.

---

### Phase 2 — Infrastructure (server-only)

**Goal:** DTOs, mappers, HTTP repository, mock repository + fixtures.

**Files (`src/features/exam-bank/infrastructure/`):**
```
dtos/
  exam-bank-list-response.dto.ts    # { items: ExamBankSummaryDto[] }
  exam-bank-detail-response.dto.ts  # ExamBankDetailDto
  exam-bank-question-response.dto.ts
repositories/
  exam-bank.repository.ts           # 'server-only'; implements IExamBankRepository
  exam-bank.repository.test.ts      # integration: envelope unwrap, error→failure mapping
  mocks/
    exam-bank.mock.repository.ts    # MockExamBankRepository: in-memory state
    fixtures.ts                     # MOCK_EXAMS[], MOCK_SUBJECTS[], 3 draft + 2 published
mappers/
  exam-bank.mapper.ts               # ExamBankSummaryDto → ExamBankSummary
                                    # ExamBankDetailDto → ExamBankDetail
```

**DTO notes:**
- All fields camelCase (wire contract rule).
- `ExamBankSummaryDto` mirrors `ExamBankSummary` entity shape — direct 1:1 mapping for mock-first phase.
- Mapper exists now so real repo can be wired later without touching domain.

**Mock repo design:**
- In-memory `Map<string, ExamBankDetail>` populated from `fixtures.ts`.
- `publishExam` flips `status` to `"published"` in-memory; returns updated summary.
- `deleteExam` throws `"cannot-delete-published"` if status is published (defence-in-depth; domain also validates).

**Test first:** `exam-bank.repository.test.ts` — integration test against `MockExamBankRepository` (not HTTP):
1. `listExamBank` with status filter returns only matching items
2. `deleteExam` on published exam rejects with mapped failure

**Done when:** mock repo tests green; `import 'server-only'` present in `exam-bank.repository.ts`.

---

### Phase 3 — Bootstrap (wiring)

**Goal:** Endpoint constants + DI factory with mock toggle.

**Files:**
```
src/bootstrap/endpoint/exam-bank.endpoint.ts
src/bootstrap/di/exam-bank.di.ts              # 'server-only'
src/bootstrap/di/index.ts                     # add re-export
```

**Endpoint constants:**
```ts
export const EXAM_BANK_EP = {
  list:    '/lms/api/v1/exam-bank',
  detail:  (id: string) => `/lms/api/v1/exam-bank/${id}`,
  create:  '/lms/api/v1/exam-bank',
  update:  (id: string) => `/lms/api/v1/exam-bank/${id}`,
  publish: (id: string) => `/lms/api/v1/exam-bank/${id}/publish`,
  delete:  (id: string) => `/lms/api/v1/exam-bank/${id}`,
} as const
```

**DI factory pattern** (mirrors `lesson-bank.di.ts`):
```ts
// bootstrap/di/exam-bank.di.ts — 'server-only'
async function makeRepo(): Promise<IExamBankRepository> {
  if (USE_MOCK) return new MockExamBankRepository()
  return new ExamBankRepository(await createServerHttpClient())
}

export async function makeListExamBankUseCase() { ... }
export async function makeGetExamDetailUseCase() { ... }
export async function makeCreateExamUseCase() { ... }
export async function makeUpdateExamUseCase() { ... }
export async function makePublishExamUseCase() { ... }
export async function makeDeleteExamUseCase() { ... }
```

**No test required here** (wiring-only; covered by Phase 2 mock repo tests + Phase 5 page smoke).

**Done when:** `bun build` clean with new endpoint + DI file; `index.ts` re-exports all 6 factories.

---

### Phase 4 — Presentation layer

**Goal:** All UI components (client, 'use client'), ViewModels, Storybook stories.

**Note on drag-to-reorder:** If `@dnd-kit/core` + `@dnd-kit/sortable` confirmed installed by `fe-lead` (ADR 0043), use `SortableContext` + `useSortable` in `QuestionList`. If NOT installed, implement fallback: `QuestionListItem` has Up/Down icon-buttons that call `onReorder(fromIdx, toIdx)` — fully keyboard-accessible (AC-12), no new dep needed. Plan for both; engineer chooses based on final dep decision.

**Files (`src/features/exam-bank/presentation/`):**
```
exam-bank-screen/
  exam-bank-screen.i-vm.ts          # ExamBankScreenVM
  exam-bank-screen.tsx              # 'use client'; list + filter + cards
  exam-bank-screen.stories.tsx      # 3 stories: Loading / DraftAndPublished / EmptyState
  exam-bank-filter-bar.tsx          # subject dropdown + status dropdown + search input
  exam-bank-skeleton.tsx            # skeleton card × 6 (AC-1)
  exam-bank-empty.tsx               # empty state + CTA (AC-11)
  exam-card.tsx                     # ExamCard: title, subject badge, status badge, actions

exam-builder-screen/
  exam-builder-screen.i-vm.ts       # ExamBuilderScreenVM
  exam-builder-screen.tsx           # 'use client'; 2-col layout; manages local state
  exam-builder-screen.stories.tsx   # 5 stories: AddQuestion / MCQEdit / Validation /
                                    #   PublishConfirm / AdminReadOnly
  question-list.tsx                 # draggable (or up/down) list; aria-label on handles
  question-list-item.tsx            # index preview + drag handle
  mcq-editor.tsx                    # content textarea + 4 option inputs + radio + difficulty
  publish-confirm-dialog.tsx        # AlertDialog: "Đề thi sẽ xuất hiện..." (AC-8)
```

**ViewModel interfaces (key shapes):**

```ts
// exam-bank-screen.i-vm.ts
interface ExamBankScreenVM {
  exams: ExamBankSummary[]
  subjects: SubjectOption[]
  viewerRole: 'teacher' | 'admin'
  currentTeacherId: string
  createAction: () => void                               // navigate to /create
  editAction: (id: string) => void
  publishAction: (id: string) => Promise<ActionResult>
  deleteAction: (id: string) => Promise<ActionResult>
}

// exam-builder-screen.i-vm.ts
interface ExamBuilderScreenVM {
  initial?: ExamBankDetail                               // undefined = create mode
  subjects: SubjectOption[]
  saveDraftAction: (input: UpdateExamInput) => Promise<ActionResult>
  publishAction: (id: string) => Promise<ActionResult>
}
type ActionResult<F = ExamBankFailure> =
  | { ok: true }
  | { ok: false; errorKey: F['type'] }
```

**ExamCard:** `StatusBadge` from `components/shared/status-badge` for status (draft=warning, published=success). Subject uses `Badge` primitive. No new shared component needed — pattern is identical to lesson-bank card.

**MCQEditor state:** local `useState` — 4 option values + selected correctOptionId + difficulty + content. No TanStack Query on this (local form). ExamBuilderScreen owns array of questions in local state; passes one question to MCQEditor as controlled props.

**Drag-to-reorder (dnd-kit path):**
- `QuestionList` wraps `DndContext` + `SortableContext(items, verticalListSortingStrategy)`.
- Each `QuestionListItem` uses `useSortable(id)`.
- On `DragEndEvent`: compute new index array, call `onReorder(newOrder: string[])` up to builder.
- Drag handle `<button aria-label="Kéo để sắp xếp câu hỏi X">` (AC-12).

**Storybook stories (8 total):**
1. `ExamList_Loading` — skeleton state
2. `ExamList_DraftAndPublished` — mixed cards, filter active
3. `ExamList_EmptyState` — empty state + CTA
4. `Builder_AddQuestion` — new question added, right col shows blank MCQEditor
5. `Builder_MCQEdit` — question with all fields filled
6. `Builder_Validation` — attempt publish with invalid question → error highlight
7. `PublishConfirm` — dialog open state
8. `AdminReadOnly` — same ExamBankScreen, viewerRole="admin", no action buttons

**Done when:** all 8 stories render without errors; `bun storybook` clean.

---

### Phase 5 — App routing (RSC pages + Server Actions)

**Goal:** Next.js pages + actions wired to DI factories.

**Files:**
```
src/app/[locale]/t/[tenant]/(app)/teacher/exam-bank/
  page.tsx                          # RSC: list page (ExamBankScreen)
  actions.ts                        # 'use server': publishExamAction, deleteExamAction
  create/
    page.tsx                        # RSC: builder (create mode, no initial)
    layout.tsx                      # builder full-screen layout (suppress sidebar padding)
    actions.ts                      # 'use server': createExamAction
  [id]/
    edit/
      page.tsx                      # RSC: builder (edit mode, loads ExamBankDetail)
      layout.tsx                    # same builder full-screen layout
      actions.ts                    # 'use server': updateExamAction

src/app/[locale]/t/[tenant]/(app)/admin/exam-bank/
  page.tsx                          # RSC: ExamBankScreen viewerRole="admin", no actions
```

**Page pattern (mirrors teacher/lesson-bank/page.tsx):**
```ts
// teacher/exam-bank/page.tsx
export default async function TeacherExamBankPage() {
  let exams: ExamBankSummary[] = []
  try { exams = await (await makeListExamBankUseCase()).execute({}) } catch {}
  return <ExamBankScreen exams={exams} subjects={deriveSubjects(exams)}
    viewerRole="teacher" currentTeacherId={MOCK_TEACHER_ID}
    publishAction={publishExamAction} deleteAction={deleteExamAction}
    createAction={...} editAction={...} />
}
```

**Builder full-screen layout:** A `layout.tsx` in both `create/` and `[id]/edit/` segments that renders `{children}` WITHOUT the app shell sidebar/header. Matches 2-col full-screen design spec. No new token or ADR — pure layout segment pattern.

**Server Actions pattern:**
```ts
// actions.ts — 'use server'
export async function publishExamAction(id: string): Promise<ActionResult> {
  const uc = await makePublishExamUseCase()
  const res = await uc.execute(id)
  if (res.ok) { revalidatePath(...); return { ok: true } }
  return { ok: false, errorKey: res.failure.type }
}
```

**Done when:** `bun build` clean; all 4 routes resolve (no 404); mock data visible in dev server.

---

### Phase 6 — i18n

**Goal:** All UI strings under `examBank` namespace; vi (source) + en (mirror) added in same commit.

**Namespace structure (`src/bootstrap/i18n/messages/vi.json` + `en.json`):**

```jsonc
{
  "examBank": {
    "title": "Kho đề thi",
    "titleAdmin": "Kho đề thi toàn trường",
    "createButton": "Tạo đề thi mới",
    "filter": {
      "searchPlaceholder": "Tìm theo tiêu đề...",
      "searchAriaLabel": "Tìm kiếm đề thi",
      "subjectAriaLabel": "Lọc theo môn học",
      "allSubjects": "Tất cả môn học",
      "statusAriaLabel": "Lọc theo trạng thái",
      "allStatuses": "Tất cả trạng thái",
      "teacherAriaLabel": "Lọc theo giáo viên (admin)",
      "allTeachers": "Tất cả giáo viên"
    },
    "status": {
      "draft": "Nháp",
      "published": "Đã publish"
    },
    "difficulty": {
      "easy": "Dễ",
      "medium": "Trung bình",
      "hard": "Khó"
    },
    "card": {
      "questions": "{count} câu hỏi",
      "subject": "Môn học",
      "createdAt": "Ngày tạo",
      "edit": "Chỉnh sửa",
      "publish": "Publish",
      "delete": "Xoá",
      "deleteAriaLabel": "Xoá đề thi {title}"
    },
    "empty": {
      "title": "Chưa có đề thi",
      "body": "Tạo đề thi đầu tiên để bắt đầu.",
      "cta": "Tạo đề thi đầu tiên",
      "noMatch": "Không tìm thấy đề thi",
      "noMatchBody": "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
    },
    "builder": {
      "titlePlaceholder": "Tiêu đề đề thi",
      "subjectLabel": "Môn học",
      "durationLabel": "Thời gian (phút)",
      "maxAttemptsLabel": "Số lần làm tối đa",
      "addQuestion": "Thêm câu",
      "questionIndex": "Câu {index}",
      "dragHandleAriaLabel": "Kéo để sắp xếp câu hỏi {index}",
      "saveDraft": "Lưu nháp",
      "saving": "Đang lưu...",
      "publish": "Publish",
      "mcqEditor": {
        "contentLabel": "Nội dung câu hỏi",
        "contentPlaceholder": "Nhập nội dung câu hỏi...",
        "optionLabel": "Phương án {id}",
        "correctAnswerLabel": "Đáp án đúng",
        "difficultyLabel": "Độ khó"
      }
    },
    "publishConfirm": {
      "title": "Publish đề thi?",
      "body": "Đề thi sẽ xuất hiện trong danh sách bài thi của học sinh. Sau khi publish không thể xoá.",
      "confirm": "Publish",
      "cancel": "Huỷ"
    },
    "deleteConfirm": {
      "title": "Xoá đề thi?",
      "body": "Hành động này không thể hoàn tác.",
      "confirm": "Xoá",
      "cancel": "Huỷ"
    },
    "toast": {
      "saved": "Đã lưu nháp.",
      "published": "Đề thi đã được publish.",
      "deleted": "Đã xoá đề thi."
    },
    "errors": {
      "not-found": "Không tìm thấy đề thi.",
      "forbidden": "Bạn không có quyền thực hiện thao tác này.",
      "cannot-delete-published": "Không thể xoá đề thi đã publish.",
      "missing-title": "Vui lòng nhập tiêu đề đề thi.",
      "no-questions": "Đề thi phải có ít nhất 1 câu hỏi.",
      "question-empty-content": "Câu hỏi chưa có nội dung.",
      "question-missing-answer": "Vui lòng chọn đáp án đúng cho câu hỏi.",
      "insufficient-options": "Mỗi câu hỏi phải có ít nhất 2 phương án.",
      "network-error": "Không thể kết nối đến máy chủ.",
      "unknown": "Có lỗi xảy ra, vui lòng thử lại."
    }
  }
}
```

**Done when:** `bunx tsc --noEmit` passes with no missing-key errors; no hardcoded Vietnamese diacritics in `.tsx`/`.ts` files outside messages/mock/test/stories.

---

### Phase 7 — Proof + gate checklist

**Goal:** Confirm all acceptance criteria covered; gate passes.

**Test inventory:**

| Type | File | Covers |
|------|------|--------|
| Unit | `publish-exam.use-case.test.ts` | AC-6, AC-8 domain rules |
| Unit | `delete-exam.use-case.test.ts` | AC-10 domain rule |
| Unit | `create-exam.use-case.test.ts` | missing-title guard |
| Integration | `exam-bank.repository.test.ts` | mock CRUD, filter, publish, forbidden |
| Storybook | `ExamList_Loading.stories.tsx` | AC-1 |
| Storybook | `ExamList_DraftAndPublished.stories.tsx` | AC-2 |
| Storybook | `ExamList_EmptyState.stories.tsx` | AC-11 |
| Storybook | `Builder_AddQuestion.stories.tsx` | AC-3 |
| Storybook | `Builder_MCQEdit.stories.tsx` | AC-4 |
| Storybook | `Builder_Validation.stories.tsx` | AC-6 UI |
| Storybook | `PublishConfirm.stories.tsx` | AC-8 UI |
| Storybook | `AdminReadOnly.stories.tsx` | AC-9 |

**Unit count target:** ≥ 9 unit tests + ≥ 4 integration assertions + 8 Storybook stories.

**Gate checklist:**
- [ ] `bun vitest run` — all tests green
- [ ] `bunx tsc --noEmit` — 0 errors
- [ ] `bun lint` (Biome) — 0 errors
- [ ] `bun build` — successful
- [ ] `bun storybook` — 8 stories render without error
- [ ] `/impeccable audit` on ExamBankScreen + ExamBuilderScreen
- [ ] Keyboard nav: Tab through builder questions, Enter activates drag handle or Up/Down buttons (AC-12)
- [ ] `<html lang>` correct, aria-label on drag handles present (AC-12)
- [ ] No raw colors in new `.tsx` files — only semantic tokens
- [ ] `examBank` namespace keys present in both `vi.json` and `en.json`
- [ ] `docs/TEST_MATRIX.md` row US-E11.3 updated to `implemented`

---

## 3. Component + state sketch

```
Teacher Exam Bank Page (RSC)
└── ExamBankScreen (client)
    ├── ExamBankFilterBar        ← URL search params (server state via searchParams)
    ├── ExamBankSkeleton         ← loading state (TanStack Query isPending)
    ├── ExamBankEmpty            ← empty state
    └── ExamCard × n             ← StatusBadge(shared), Badge(ui)

Teacher Exam Builder Page (RSC — loads ExamBankDetail if edit)
└── ExamBuilderScreen (client — owns full local form state)
    ├── BuilderHeader            ← title input, subject select, duration, maxAttempts
    ├── QuestionList (left 30%)  ← local useState([ExamBankQuestion])
    │   └── QuestionListItem × n ← drag handle + index preview
    ├── MCQEditor (right 70%)    ← controlled by selectedQuestionId
    │   ├── content Textarea
    │   ├── OptionInput × 4      ← A/B/C/D text inputs
    │   ├── RadioGroup           ← correct answer selector
    │   └── difficulty Select
    ├── PublishConfirmDialog     ← AlertDialog(ui/alert-dialog)
    └── BuilderActionBar         ← Save Draft / Publish buttons

Admin Exam Bank Page (RSC)
└── ExamBankScreen (client, viewerRole="admin")
    ← same component, no action buttons rendered
```

**State classification:**

| State | Type | Location |
|-------|------|----------|
| Exam list (initial) | server (RSC) | passed as prop from page.tsx |
| Filter/search | URL search params | `useRouter` + `useSearchParams` |
| Questions array in builder | local `useState` | `ExamBuilderScreen` |
| Selected question index | local `useState` | `ExamBuilderScreen` |
| MCQ field values | local `useState` | `MCQEditor` (controlled) |
| Publish dialog open | local `useState` | `ExamBuilderScreen` |
| Save/publish async state | local `useState` / async action | action result |
| Optimistic list updates | TanStack Query `invalidateQueries` | after Server Action |

No Zustand, no global store.

**TanStack Query keys:**
```ts
['exam-bank', 'list', filter]   // ExamBankScreen client refetch after mutations
['exam-bank', 'detail', id]     // ExamBuilderScreen pre-populate on edit
```

**Note for `fe-state-engineer`:** ExamBuilderScreen is complex local state (question array + selection + drag order). Recommend extracting a custom hook `useExamBuilder(initial?: ExamBankDetail)` that returns `{ questions, selectedIdx, addQuestion, updateQuestion, reorderQuestions, removeQuestion }` — keeps component render fn lean and makes the hook unit-testable. This is not a `fe-state-engineer` blocker (no server state complexity), but worth noting.

---

## 4. Risks, dependencies, open questions

**ADR required:**
- **ADR 0043** — drag-to-reorder library (`@dnd-kit/core` + `@dnd-kit/sortable` installation). Needed before Phase 4 kickoff. Fallback plan (Up/Down buttons) is viable if ADR delays.

**Dependency risk:**
- US-E12.3 (subject catalogue) is listed as a dependency in story.md. However, mock-first mode uses `MOCK_SUBJECTS` fixture — no real subject API needed. Unblocked for planning and implementation. **If real subject API needed later**, wire via cross-feature use-case or prop from RSC page. Do NOT call subject catalogue repo from exam-bank feature directly.

**Builder full-screen layout:**
- Next.js segment layout in `create/layout.tsx` + `[id]/edit/layout.tsx` can suppress sidebar by NOT rendering `DashboardLayout`. Confirm with `fe-lead` that this pattern is safe for the app shell (check `src/app/[locale]/t/[tenant]/(app)/layout.tsx` — does it force sidebar unconditionally?). If so, may need a `(builder)` route group with separate layout.

**Token check:**
- No new design-system tokens anticipated. Builder background, panel backgrounds → `bg-background`, `bg-muted`. Borders → `border-border`. If design file reveals custom colors, flag for ADR 0043+.

**`design_src/edu/exam.jsx`:**
- Only `exam.jsx` exists in `design_src/edu/` — no `exam-bank.jsx`. Story references `design_src/edu/exam-bank.jsx`. This file may not exist yet (new 1506 design). **[OPEN QUESTION]** Confirm with `fe-lead` whether `exam-bank.jsx` design file will be provided before Phase 4, or whether builder layout should be derived from story AC + product contract only.

**AC-5 drag-to-reorder + AC-12 keyboard nav:**
- Both must be satisfied simultaneously. dnd-kit `useSortable` supports keyboard (Space to pick, arrow keys to move, Enter to drop). Fallback Up/Down buttons are inherently keyboard-friendly. Either path satisfies AC-12.

**Admin route (`/admin/exam-bank`):**
- Not listed in existing admin pages found in `src/app/[locale]/t/[tenant]/(app)/admin/`. New directory needed.

**`docs/TEST_MATRIX.md`:**
- Row for US-E11.3 must be added at `planned` status before Phase 1 coding begins (per `tdd.md` rule).
