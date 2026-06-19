# US-E11.3 Exam Bank + Builder — Component Architecture

**Author:** fe-component-architect  
**Date:** 2026-06-18  
**ADR reference:** ADR 0043 (Up/Down reorder — ACCEPTED; no @dnd-kit dep)

---

## 1. Architecture Summary

### Feature scope

Two distinct screens share the same `exam-bank` feature module (`src/features/exam-bank/`):

1. **ExamBankScreen** — list view, rendered at `/teacher/exam-bank` and `/admin/exam-bank`. Single
   client component parameterised by `viewerRole`; the admin variant is read-only (no create/edit/delete
   affordances rendered).
2. **ExamBuilderScreen** — full-screen 2-column builder rendered at `/teacher/exam-bank/create` and
   `/teacher/exam-bank/:id/edit`. Owns all form state locally (no TanStack Query; local `useState`
   for question array, selection, and dialog visibility).

### New vs reused components

| Component | Status |
|-----------|--------|
| `StatusBadge` (`components/shared/status-badge/`) | **REUSED** — draft=warning, published=success |
| `Badge` (`components/ui/badge/`) | **REUSED** — subject label chip |
| `Skeleton` (`components/ui/skeleton/`) | **REUSED** — inside `ExamBankSkeleton` |
| `DropdownMenu` (`components/ui/dropdown-menu/`) | **REUSED** — card action menu |
| `Select` (`components/ui/select/`) | **REUSED** — filter dropdowns + difficulty select |
| `Input` (`components/ui/input/`) | **REUSED** — search field, title input, option inputs |
| `Textarea` (`components/ui/textarea/`) | **REUSED** — MCQ question content |
| `AlertDialog` (`components/ui/alert-dialog/`) | **REUSED** — `PublishConfirmDialog`, `DeleteConfirmDialog` |
| `Button` (`components/ui/button/`) | **REUSED** — all CTAs |
| `Sonner` / `toast()` | **REUSED** — save draft / publish / delete toasts |
| `ExamBankScreen` | NEW — feature-local |
| `ExamBankFilterBar` | NEW — feature-local |
| `ExamBankSkeleton` | NEW — feature-local |
| `ExamBankEmpty` | NEW — feature-local |
| `ExamCard` | NEW — feature-local |
| `ExamBuilderScreen` | NEW — feature-local |
| `BuilderHeader` | NEW — feature-local |
| `QuestionList` | NEW — feature-local |
| `QuestionListItem` | NEW — feature-local |
| `MCQEditor` | NEW — feature-local |
| `PublishConfirmDialog` | NEW — feature-local |
| `DeleteConfirmDialog` | NEW — feature-local |
| `BuilderActionBar` | NEW — feature-local |

### Missing primitives

No `bun ui:add` calls required. All needed shadcn primitives are already present in `components/ui/`:
`button`, `input`, `textarea`, `select`, `badge`, `skeleton`, `dropdown-menu`, `alert-dialog`, `label`, `separator`.

A `radio-group` primitive is **needed for the correct-answer selector** in `MCQEditor`. Check:
`components/ui/radio-group/` — **NOT found in the inventory**. Flag: `bun ui:add radio-group` required
before Phase 4 implementation.

### Key decisions

| # | Decision |
|---|----------|
| D1 | ADR 0043 ACCEPTED — Up/Down icon-buttons for reorder, no @dnd-kit. `QuestionListItem` emits `onMoveUp` / `onMoveDown` callbacks to parent. |
| D2 | Builder full-screen layout via Next.js segment `layout.tsx` in `create/` and `[id]/edit/` — renders `{children}` without `DashboardLayout`. |
| D3 | No shared component promotion needed — all components are exam-bank-only (single screen family). Promote only if a 2nd screen outside this feature reuses them. |
| D4 | `ExamCard` does NOT call `useTranslations` for badge labels — parent screen injects `labels` prop per vm-conventions. Exception: `ExamCard` does call `useTranslations` for its own action-menu labels (self-contained interactive element — avoids prop-drilling 10+ strings from screen into each card). Architect note: reconsider if card ever leaves this feature. |
| D5 | `DeleteConfirmDialog` is a sibling component to `PublishConfirmDialog` — not merged into one compound dialog. Two distinct confirmation intents with different body copy and different action outcomes. |

---

## 2. Component Tree

### 2a. Exam Bank List

```
TeacherExamBankPage (RSC — app/…/teacher/exam-bank/page.tsx)
  │  Fetches: ExamBankSummary[], SubjectOption[]
  │  Passes: Server Action refs (publishExamAction, deleteExamAction)
  │  Creates: ExamBankScreenVM
  └── ExamBankScreen ('use client' — CONTAINER)
        │  Local state: filters (object), deleteTargetId, publishTargetId
        │  TanStack Query: none (initial data from RSC; post-action invalidation deferred to fe-state-engineer)
        ├── <header> — page title + "Tạo đề thi mới" Button [conditional on viewerRole=teacher]
        ├── ExamBankFilterBar (PRESENTATIONAL — no state)
        │     Props: filters, subjects, viewerRole, onFilterChange
        │     Uses: Select (subject), Select (status), Select (teacher — admin only), Input (search)
        ├── ExamBankSkeleton (PRESENTATIONAL)
        │     Props: — (no props; renders 6 skeleton cards)
        │     Uses: Skeleton primitive
        │     Rendered: when isLoading=true
        ├── ExamBankEmpty (PRESENTATIONAL)
        │     Props: hasActiveFilter, canCreate, onCreateClick
        │     Rendered: when exams.length === 0 && !isLoading
        └── ExamCard × n (PRESENTATIONAL — controlled)
              Props: exam (ExamCardVM), onEdit, onPublish, onDelete, labels
              Uses: StatusBadge (status tone), Badge (subject — outline variant), DropdownMenu
              ├── StatusBadge — status (draft→warning, published→success)
              ├── Badge — subjectName (outline variant, no semantic tone)
              └── DropdownMenu — actions: Edit, Publish, Delete (gated by viewerRole + exam.status)

AdminExamBankPage (RSC — app/…/admin/exam-bank/page.tsx)
  └── ExamBankScreen ('use client' — same component, viewerRole="admin")
        └── [same tree; ExamCard receives empty action callbacks; DropdownMenu not rendered for admin]
```

**Annotation:**
- `ExamBankScreen` — `'use client'`, container (owns filter local state + dialog target state)
- `ExamBankFilterBar` — `'use client'` (Select/Input need event handlers), presentational
- `ExamBankSkeleton` — `'use client'`, presentational (stateless)
- `ExamBankEmpty` — `'use client'`, presentational (stateless)
- `ExamCard` — `'use client'`, presentational (stateless; callbacks controlled by parent)

### 2b. Exam Builder

```
TeacherExamBuilderCreatePage (RSC — app/…/teacher/exam-bank/create/page.tsx)
  │  layout.tsx: builder segment — no DashboardLayout (full-screen)
  │  Fetches: SubjectOption[] only (no initial exam)
  │  Creates: ExamBuilderScreenVM (initial=undefined)
  └── ExamBuilderScreen ('use client' — CONTAINER, owns all builder state)
        │  Local state:
        │    title, subjectId, durationMinutes, maxAttempts (builder header fields)
        │    questions: ExamBankQuestion[] (full question array)
        │    selectedQuestionIdx: number | null
        │    publishDialogOpen: boolean
        │    deleteDialogOpen: boolean (for a question removal confirm, if needed — TBD)
        │    isSaving: boolean (useTransition)
        │    validationErrors: Map<questionId, 'empty-content' | 'missing-answer' | 'insufficient-options'>
        ├── BuilderHeader (PRESENTATIONAL — controlled)
        │     Props: title, subjectId, durationMinutes, maxAttempts, subjects
        │            onTitleChange, onSubjectChange, onDurationChange, onMaxAttemptsChange
        │     Uses: Input (title), Select (subject), Input (duration), Input (maxAttempts)
        ├── <div class="flex flex-1">  ← 2-col layout container
        │   ├── QuestionList  [left 30%] (PRESENTATIONAL — controlled)
        │   │     Props: questions (QuestionListItemVM[]), selectedIdx, onSelect,
        │   │            onMoveUp, onMoveDown, onAddQuestion, onRemoveQuestion
        │   │     Uses: Button ("Thêm câu"), ScrollArea
        │   │     └── QuestionListItem × n (PRESENTATIONAL — controlled)
        │   │           Props: item (QuestionListItemVM), isSelected, isFirst, isLast,
        │   │                  hasError, onSelect, onMoveUp, onMoveDown
        │   │           Uses: Button (Up arrow), Button (Down arrow) [aria-label required — ADR 0043]
        │   │
        │   └── MCQEditor  [right 70%] (PRESENTATIONAL — controlled)
        │         Props: question (ExamBankQuestion | null), validationError,
        │                onContentChange, onOptionChange, onCorrectAnswerChange, onDifficultyChange
        │         Uses: Textarea (content), Input × 4 (A/B/C/D options),
        │               RadioGroup (correct answer — bun ui:add radio-group),
        │               Select (difficulty)
        │         Empty state: renders "Chọn câu hỏi để chỉnh sửa" when question=null
        │
        ├── PublishConfirmDialog (PRESENTATIONAL — controlled)
        │     Props: open, onConfirm, onCancel
        │     Uses: AlertDialog primitive
        │
        └── BuilderActionBar (PRESENTATIONAL — controlled)
              Props: isSaving, isPublishable (derived from validationErrors),
                     onSaveDraft, onPublish
              Uses: Button ("Lưu nháp"), Button ("Publish")

TeacherExamBuilderEditPage (RSC — app/…/teacher/exam-bank/[id]/edit/page.tsx)
  │  layout.tsx: same builder segment layout
  │  Fetches: ExamBankDetail (initial), SubjectOption[]
  │  Creates: ExamBuilderScreenVM (initial=ExamBankDetail)
  └── ExamBuilderScreen ('use client' — same component, initial prop populated)
        └── [same tree; questions array seeded from initial.questions]
```

**Annotation:**
- `ExamBuilderScreen` — `'use client'`, container (owns the entire builder local state)
- `BuilderHeader` — `'use client'`, presentational (all controlled props)
- `QuestionList` — `'use client'`, presentational (controlled)
- `QuestionListItem` — `'use client'`, presentational (controlled)
- `MCQEditor` — `'use client'`, presentational (all controlled props; zero internal state)
- `PublishConfirmDialog` — `'use client'`, presentational (controlled open state)
- `BuilderActionBar` — `'use client'`, presentational (controlled)

---

## 3. ViewModel + Prop Interfaces

### 3a. Shared types

```typescript
// Reused from lesson-bank pattern — redeclared in exam-bank feature (no cross-feature import)
interface SubjectOption {
  id: string;
  name: string;
}

type ActionResult<F = ExamBankFailure> =
  | { ok: true }
  | { ok: false; errorKey: F["type"] };
```

### 3b. `exam-bank-screen.i-vm.ts`

```typescript
// src/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm.ts

import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import type { ExamBankFailure } from "../../domain/failures/exam-bank.failure";

export interface SubjectOption {
  id: string;
  name: string;
}

export type ActionResult = { ok: true } | { ok: false; errorKey: ExamBankFailure["type"] };

export interface ExamBankScreenVM {
  /** Initial list — rendered by RSC; client may optimistically update after mutations. */
  exams: ExamBankSummary[];
  /** Available subjects for filter dropdown. */
  subjects: SubjectOption[];
  /** Available teachers — only used when viewerRole="admin" for teacher filter. */
  teachers: TeacherOption[];
  /** Drives visibility of create/edit/delete affordances. */
  viewerRole: "teacher" | "admin";
  /** Used to gate edit/delete to own exams only when viewerRole="teacher". */
  currentTeacherId: string;
  /**
   * RSC pre-computes the create route string — presentation never concatenates paths.
   * e.g. "/teacher/exam-bank/create"
   */
  createPath: string;
  /**
   * RSC pre-computes edit paths per exam id.
   * e.g. (id) => "/teacher/exam-bank/<id>/edit"
   * Passed as a function reference so ExamCard can construct its own link.
   */
  editPathOf: (id: string) => string;
  /** Server Action — publish a draft exam; returns ActionResult. */
  publishAction: (id: string) => Promise<ActionResult>;
  /** Server Action — delete a draft exam; returns ActionResult. */
  deleteAction: (id: string) => Promise<ActionResult>;
}

export interface TeacherOption {
  id: string;
  name: string;
}
```

### 3c. `exam-builder-screen.i-vm.ts`

```typescript
// src/features/exam-bank/presentation/exam-builder-screen/exam-builder-screen.i-vm.ts

import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type { CreateExamInput, UpdateExamInput } from "../../domain/entities/exam-bank-input.entity";
import type { ExamBankFailure } from "../../domain/failures/exam-bank.failure";
import type { SubjectOption } from "../exam-bank-screen/exam-bank-screen.i-vm";

export type BuilderActionResult =
  | { ok: true; id: string }          // id returned so create mode can redirect to edit
  | { ok: false; errorKey: ExamBankFailure["type"] };

export interface ExamBuilderScreenVM {
  /**
   * Populated in edit mode (RSC loads ExamBankDetail).
   * undefined in create mode.
   */
  initial: ExamBankDetail | undefined;
  /** Available subjects for builder header selector. */
  subjects: SubjectOption[];
  /**
   * Server Action for "Lưu nháp".
   * Create mode: receives CreateExamInput (no id).
   * Edit mode: receives UpdateExamInput (with id).
   * Unified via discriminated union to keep the VM simple.
   */
  saveDraftAction: (
    input: CreateExamInput | UpdateExamInput
  ) => Promise<BuilderActionResult>;
  /**
   * Server Action for "Publish" — always requires an id
   * (create mode must save draft first, then publish).
   */
  publishAction: (id: string) => Promise<BuilderActionResult>;
  /**
   * RSC pre-computes the redirect path for post-publish navigation.
   * e.g. "/teacher/exam-bank"
   */
  examBankPath: string;
}
```

### 3d. `ExamCardVM` (prop interface — not a separate `.i-vm.ts`)

```typescript
// Defined inline in exam-bank-screen.i-vm.ts or a sibling types file

export interface ExamCardVM {
  id: string;
  title: string;
  subjectName: string;
  totalQuestions: number;
  status: "draft" | "published";
  /** ISO date string — RSC formats as display string before passing. */
  createdAtDisplay: string;
  /** Derived by RSC: true when viewerRole="teacher" && exam.teacherId === currentTeacherId */
  canEdit: boolean;
  /** Derived by RSC: canEdit && status === "draft" */
  canDelete: boolean;
  /** Derived by RSC: canEdit && status === "draft" */
  canPublish: boolean;
  /** Pre-computed edit path — e.g. "/teacher/exam-bank/<id>/edit" */
  editPath: string;
}
```

**Note:** `ExamCard` receives `ExamCardVM` as `exam` prop, plus callbacks `onPublish(id)`,
`onDelete(id)` from the parent `ExamBankScreen`. The parent owns the dialog-open state; `ExamCard`
calls the callback which sets `publishTargetId` in the parent, then the parent renders the dialog.

### 3e. `QuestionListItemVM` (prop interface)

```typescript
export interface QuestionListItemVM {
  id: string;
  /** 1-based display index. */
  index: number;
  /** First 60 chars of content — RSC or parent truncates. Used as preview text. */
  contentPreview: string;
  /** true when question fails validation (empty content or missing correct answer). */
  hasError: boolean;
}
```

### 3f. `MCQEditor` prop interface

```typescript
// MCQEditor is controlled entirely by ExamBuilderScreen.
// No .i-vm.ts needed — it's a leaf presentational component.

export interface MCQEditorProps {
  /** The question currently being edited. null = empty state (no selection). */
  question: ExamBankQuestion | null;
  /**
   * Validation error for this question, if any.
   * Drives error highlight per field.
   */
  validationError: "question-empty-content" | "question-missing-answer" | "insufficient-options" | null;
  onContentChange: (content: string) => void;
  /** id = "A" | "B" | "C" | "D" */
  onOptionChange: (optionId: string, text: string) => void;
  onCorrectAnswerChange: (optionId: string) => void;
  onDifficultyChange: (difficulty: "easy" | "medium" | "hard") => void;
  /** i18n labels injected from parent (label injection pattern). */
  labels: MCQEditorLabels;
}

export interface MCQEditorLabels {
  contentLabel: string;
  contentPlaceholder: string;
  optionLabel: (id: string) => string;    // t("builder.mcqEditor.optionLabel", { id })
  correctAnswerLabel: string;
  difficultyLabel: string;
  emptyState: string;
}
```

### 3g. `BuilderHeader` prop interface

```typescript
export interface BuilderHeaderProps {
  title: string;
  subjectId: string;
  durationMinutes: number;
  maxAttempts: number;
  subjects: SubjectOption[];
  onTitleChange: (title: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onDurationChange: (minutes: number) => void;
  onMaxAttemptsChange: (max: number) => void;
  labels: BuilderHeaderLabels;
}

export interface BuilderHeaderLabels {
  titlePlaceholder: string;
  subjectLabel: string;
  durationLabel: string;
  maxAttemptsLabel: string;
}
```

### 3h. `QuestionList` prop interface

```typescript
export interface QuestionListProps {
  items: QuestionListItemVM[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (idx: number) => void;
  labels: QuestionListLabels;
}

export interface QuestionListLabels {
  addQuestion: string;
  questionIndex: (index: number) => string;     // t("builder.questionIndex", { index })
  moveUpAriaLabel: (index: number) => string;   // ADR 0043 requirement
  moveDownAriaLabel: (index: number) => string; // ADR 0043 requirement
  removeAriaLabel: (index: number) => string;
}
```

### 3i. `BuilderActionBar` prop interface

```typescript
export interface BuilderActionBarProps {
  isSaving: boolean;
  /** Derived in ExamBuilderScreen from validationErrors.size === 0 && questions.length > 0 */
  isPublishable: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  labels: BuilderActionBarLabels;
}

export interface BuilderActionBarLabels {
  saveDraft: string;
  saving: string;
  publish: string;
}
```

### 3j. `PublishConfirmDialog` prop interface

```typescript
export interface PublishConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  labels: PublishConfirmLabels;
}

export interface PublishConfirmLabels {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
}
```

### 3k. `ExamBankFilterBar` prop interface

```typescript
export interface ExamBankFilterBarProps {
  subjectId: string;
  status: "draft" | "published" | "";
  teacherId: string;
  search: string;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  viewerRole: "teacher" | "admin";
  onSubjectChange: (id: string) => void;
  onStatusChange: (status: "draft" | "published" | "") => void;
  onTeacherChange: (id: string) => void;
  onSearchChange: (q: string) => void;
  labels: ExamBankFilterBarLabels;
}

export interface ExamBankFilterBarLabels {
  searchPlaceholder: string;
  searchAriaLabel: string;
  subjectAriaLabel: string;
  allSubjects: string;
  statusAriaLabel: string;
  allStatuses: string;
  statusDraft: string;
  statusPublished: string;
  teacherAriaLabel: string;
  allTeachers: string;
}
```

---

## 4. State Ownership (contract level)

### ExamBankScreen — local state

| State | Type | Owner | Rationale |
|-------|------|-------|-----------|
| `filters` | `{ subjectId, status, teacherId, search }` | `ExamBankScreen` local `useState` | Client-side filter on server-fetched list; no URL round-trip needed for this screen |
| `publishTargetId` | `string \| null` | `ExamBankScreen` local `useState` | Dialog trigger — identifies which exam to publish |
| `deleteTargetId` | `string \| null` | `ExamBankScreen` local `useState` | Dialog trigger — identifies which exam to delete |
| `exams` (optimistic) | `ExamBankSummary[]` | `ExamBankScreen` local `useState` (seeded from VM) | Optimistic update after publish/delete mutations |
| `isSaving` | `boolean` | `ExamBankScreen` `useTransition` | Mutation pending state |

**Hand-off note to `fe-state-engineer`:**  
The initial exam list arrives from RSC (no TanStack Query on first render). After a mutation
(publish/delete), the screen updates optimistically via `setExams`. If TanStack Query is added for
background refetch, the query key is `['exam-bank', 'list', { viewerRole, teacherId }]`. Coordinate
on invalidation strategy after `publishAction` / `deleteAction` succeed.

### ExamBuilderScreen — local state

| State | Type | Owner | Rationale |
|-------|------|-------|-----------|
| `title` | `string` | `ExamBuilderScreen` local `useState` | Controlled header field |
| `subjectId` | `string` | `ExamBuilderScreen` local `useState` | Controlled header field |
| `durationMinutes` | `number` | `ExamBuilderScreen` local `useState` | Controlled header field |
| `maxAttempts` | `number` | `ExamBuilderScreen` local `useState` | Controlled header field |
| `questions` | `ExamBankQuestion[]` | `ExamBuilderScreen` local `useState` | Full question array; mutations (add/update/remove/reorder) are pure array operations |
| `selectedQuestionIdx` | `number \| null` | `ExamBuilderScreen` local `useState` | Drives which question MCQEditor shows |
| `publishDialogOpen` | `boolean` | `ExamBuilderScreen` local `useState` | Controls `PublishConfirmDialog` |
| `validationErrors` | `Map<string, ExamBankFailure['type']>` | `ExamBuilderScreen` — derived on publish attempt | Re-computed when user clicks Publish; each entry keyed by question id |
| `isSaving` | `boolean` | `ExamBuilderScreen` `useTransition` | Server Action pending state |
| `savedExamId` | `string \| null` | `ExamBuilderScreen` local `useState` | Populated after first save-draft in create mode; needed for subsequent publish call |

**MCQEditor state — note:** `MCQEditor` is FULLY CONTROLLED. It holds zero internal `useState`.
All field values (`content`, `options`, `correctOptionId`, `difficulty`) come from the `question`
prop (from the parent's `questions[selectedQuestionIdx]`). Each `onChange` callback calls
`updateQuestion(idx, patch)` in `ExamBuilderScreen` which produces a new `questions` array copy.
This keeps the source of truth for every question in one place.

**`useExamBuilder` hook recommendation (to `fe-state-engineer`):**  
Extract a custom hook `useExamBuilder(initial?: ExamBankDetail)` returning:
`{ title, subjectId, durationMinutes, maxAttempts, questions, selectedQuestionIdx, publishDialogOpen, isSaving, validationErrors, savedExamId, handlers }`.  
This is pure local state (no server state queries) — within `fe-component-architect` scope to
flag but within `fe-state-engineer` + `fe-nextjs-engineer` scope to implement.

---

## 5. Composition & Variant Strategy

### ExamBankScreen as single component (teacher + admin)

Rather than two separate screen components, a single `ExamBankScreen` parameterised by
`viewerRole: "teacher" | "admin"` gates all write affordances. This mirrors the `LessonBankScreen`
pattern (`viewerRole: "teacher" | "principal"`). The derived gates are:

```
canCreate = viewerRole === "teacher"
canEdit   = (exam) => viewerRole === "teacher" && exam.teacherId === currentTeacherId
canDelete = (exam) => canEdit(exam) && exam.status === "draft"
canPublish= (exam) => canEdit(exam) && exam.status === "draft"
```

All derived in `ExamBankScreen`, passed as `ExamCardVM.canEdit / canDelete / canPublish` booleans
— `ExamCard` does not re-derive, it reads the booleans.

### ExamCard — DropdownMenu pattern

`ExamCard` renders a single three-dot `DropdownMenu` (Radix) for actions. Items are conditionally
rendered based on `exam.canEdit`, `exam.canPublish`, `exam.canDelete`. When all three are false
(admin), the `DropdownMenu` trigger is not rendered at all (not just disabled) — this prevents
empty menus appearing for admin role.

No `cva` variant is needed on `ExamCard` — the only variation is in the menu items, controlled by
booleans. The card layout is identical for teacher and admin.

### ExamBuilderScreen — two-column composition

The 2-column layout is a flex container inside `ExamBuilderScreen`. It is NOT a compound component
or slot pattern — `QuestionList` and `MCQEditor` are just children positioned via Tailwind:

```
<div class="flex flex-1 overflow-hidden">
  <aside class="w-[30%] ...">   ← QuestionList
  <section class="flex-1 ...">  ← MCQEditor
```

This is appropriate: neither panel is reused independently, and the layout is screen-specific.

### MCQEditor — Option inputs

The four A/B/C/D option inputs are rendered as a `<ul>` of `<li>` items. Each item contains:
- A `Label` identifying the option letter ("Phương án A")
- An `Input` for the option text
- A `RadioGroup.Item` for marking correct answer

The `RadioGroup` wraps the correct-answer selection across all four options. `RadioGroup` (shadcn
`radio-group` primitive) provides the `role="radiogroup"` + `aria-labelledby` semantics out of the
box — no manual ARIA needed.

### QuestionListItem — Up/Down reorder pattern (ADR 0043)

Each `QuestionListItem` renders two icon-buttons:
- `<Button variant="ghost" size="icon" aria-label={labels.moveUpAriaLabel(item.index)} disabled={isFirst}>`
- `<Button variant="ghost" size="icon" aria-label={labels.moveDownAriaLabel(item.index)} disabled={isLast}>`

These emit `onMoveUp(idx)` / `onMoveDown(idx)` to `QuestionList`, which emits to
`ExamBuilderScreen`. The screen performs the array swap:

```
questions[idx] ↔ questions[idx - 1]   // for moveUp
questions[idx] ↔ questions[idx + 1]   // for moveDown
```

No library dep required. Fully keyboard-accessible — both buttons are native `<button>` elements
focusable in tab order.

### PublishConfirmDialog / DeleteConfirmDialog — AlertDialog reuse

Both dialogs use the existing `AlertDialog` primitive (`components/ui/alert-dialog/`). They are
separate components (not a generic `ConfirmDialog`) because:
1. Their body copy differs substantially (publish warns about student visibility; delete is
   irreversible action).
2. Future changes to one should not risk the other.

No `asChild` / `Slot` pattern needed — standard AlertDialog composition:
`AlertDialogTrigger` is NOT used; open state is controlled externally via the `open` prop on
`AlertDialogContent` (the parent sets `open` based on `publishTargetId !== null`).

### Skeleton pattern

`ExamBankSkeleton` renders 6 skeleton cards (matching the expected loaded grid). Each card uses the
`Skeleton` primitive for title, badge, and meta rows. No props needed — fixed count of 6.

### Toast pattern

Following the inventory note: `toast()` from `sonner` package is called directly in
`ExamBankScreen` and `ExamBuilderScreen` after Server Action results. No custom `useState` toast
pattern.

---

## 6. Accessibility Contract

### ExamBankScreen

| Element | Requirement |
|---------|-------------|
| `<h1>` page title | `text-2xl font-extrabold` — semantic heading |
| "Tạo đề thi mới" Button | `<Button>` with text label — no extra `aria-label` needed |
| Filter `<Input>` search | `aria-label={labels.searchAriaLabel}` (not placeholder-only) |
| Filter `<Select>` subject | `aria-label={labels.subjectAriaLabel}` |
| Filter `<Select>` status | `aria-label={labels.statusAriaLabel}` |
| Filter `<Select>` teacher (admin) | `aria-label={labels.teacherAriaLabel}` |
| `ExamCard` — card button | `type="button"` with `aria-label` including exam title for screen reader disambiguation |
| `ExamCard` — DropdownMenu | Radix `DropdownMenu` handles `aria-haspopup`, `aria-expanded` |
| `ExamCard` — delete item | Red destructive styling PLUS text label "Xoá" — not color-only (AC-12) |
| `PublishConfirmDialog` | AlertDialog: `role="alertdialog"`, `aria-labelledby`, `aria-describedby` provided by Radix |
| Status badges | `StatusBadge` renders text + tonal background — status is never conveyed by color alone |
| Skeleton loading | `aria-busy="true"` on the list container when loading |
| Empty state | Inline empty state with visible text — no ARIA live region needed (not dynamic) |

### ExamBuilderScreen

| Element | Requirement |
|---------|-------------|
| Builder `<header>` | Semantic `<header>` element |
| Title `<Input>` | `<Label>` associated via `htmlFor` / `id` pair |
| Subject `<Select>` | `<Label>` associated; `aria-label` fallback |
| Duration / MaxAttempts `<Input>` | `type="number"`, `<Label>` associated |
| `QuestionList` container | `<ol>` ordered list (order matters semantically) |
| `QuestionListItem` | `<li>` with readable content via `aria-label` on the item or child button |
| Move Up button | `aria-label={labels.moveUpAriaLabel(item.index)}` — e.g. "Di chuyển câu hỏi 2 lên trên" |
| Move Down button | `aria-label={labels.moveDownAriaLabel(item.index)}` — e.g. "Di chuyển câu hỏi 2 xuống dưới" |
| Move buttons disabled state | `disabled` prop on first item's Up button and last item's Down button |
| MCQEditor question textarea | `<Label>` with `htmlFor`; `aria-invalid` when `validationError === "question-empty-content"` |
| MCQEditor option inputs | `<Label>` "Phương án A/B/C/D" associated |
| MCQEditor RadioGroup | `<RadioGroup aria-labelledby="correct-answer-legend">` wrapping all option radios |
| MCQEditor validation errors | `aria-invalid="true"` on erroneous field + `aria-describedby` pointing to error message text |
| Validation error highlight (AC-6) | Error message text visible below field — not only border-color change |
| "Thêm câu" button | `type="button"`, explicit text label |
| BuilderActionBar | `<footer>` or `role="toolbar"` on the action container |
| Save Draft button | `aria-busy="true"` when `isSaving === true` |
| Publish button | `disabled` when `!isPublishable` + `aria-disabled="true"` |
| `PublishConfirmDialog` | AlertDialog: focus trapped; Escape closes; confirm button autofocused per Radix default |
| Keyboard nav between questions | Tab moves through QuestionListItem buttons naturally; Enter/Space activates |

### Contrast

All status badge tones for exam statuses:
- `draft` → `warning` tone → `bg-edu-warning/15 text-edu-warning-foreground` (dark text, WCAG AA)
- `published` → `success` tone → `bg-edu-success/15 text-edu-success-text` (dark text, WCAG AA)

Both are covered by the existing `StatusBadge` TONE_CLASS mapping — no new tokens needed.

---

## 7. Prop Flow Diagram

```
RSC Page (server)
  │
  │  Calls use-cases (via DI factories)
  │  Fetches: ExamBankSummary[], SubjectOption[]
  │  Imports: Server Action refs from ./actions.ts
  │  Builds: ExamBankScreenVM
  │
  ▼
ExamBankScreen ('use client')   ← receives ExamBankScreenVM as props
  │
  │  Derives: ExamCardVM[] from exams + viewerRole + currentTeacherId
  │  Owns:    filters, publishTargetId, deleteTargetId, exams (local state)
  │  Calls:   publishAction(id), deleteAction(id) on confirm
  │
  ├──▶ ExamBankFilterBar   ← { subjectId, status, search, subjects, teachers, viewerRole, onXxxChange, labels }
  ├──▶ ExamBankSkeleton    ← (no props)
  ├──▶ ExamBankEmpty       ← { hasActiveFilter, canCreate, onCreateClick, labels }
  └──▶ ExamCard × n        ← { exam: ExamCardVM, onPublish, onDelete, labels }

RSC Builder Page (server)
  │
  │  Calls use-cases: getExamDetail (edit mode), subjectList
  │  Imports: Server Action refs (saveDraftAction, publishAction)
  │  Builds: ExamBuilderScreenVM
  │
  ▼
ExamBuilderScreen ('use client')   ← receives ExamBuilderScreenVM as props
  │
  │  Owns all builder local state (title, subjectId, duration, maxAttempts,
  │          questions[], selectedQuestionIdx, publishDialogOpen, validationErrors, isSaving)
  │  Seeds initial state from VM.initial if edit mode
  │
  ├──▶ BuilderHeader      ← { title, subjectId, durationMinutes, maxAttempts, subjects, onXxx, labels }
  ├──▶ QuestionList       ← { items: QuestionListItemVM[], selectedIdx, onSelect, onMoveUp, onMoveDown, onAddQuestion, onRemoveQuestion, labels }
  │     └──▶ QuestionListItem × n  ← { item, isSelected, isFirst, isLast, hasError, onSelect, onMoveUp, onMoveDown, labels }
  ├──▶ MCQEditor          ← { question, validationError, onXxx, labels }
  ├──▶ PublishConfirmDialog ← { open, onConfirm, onCancel, labels }
  └──▶ BuilderActionBar   ← { isSaving, isPublishable, onSaveDraft, onPublish, labels }
```

---

## 8. Reuse Analysis

### StatusBadge — `components/shared/status-badge/`

Used in `ExamCard` for exam status:
- `status === "draft"` → `<StatusBadge tone="warning">{labels.statusDraft}</StatusBadge>`
- `status === "published"` → `<StatusBadge tone="success">{labels.statusPublished}</StatusBadge>`

No new tones needed. The `warning` and `success` tones already have WCAG AA compliant text classes.

### Badge — `components/ui/badge/`

Used in `ExamCard` for subject name. The subject chip does not carry semantic status meaning —
it is a neutral label. Use `Badge variant="outline"` for subject chips.

Pattern: `<Badge variant="outline">{exam.subjectName}</Badge>`

No `StatusBadge` for subject — subject is not a status. This distinction is intentional.

### Skeleton — `components/ui/skeleton/`

Used in `ExamBankSkeleton` to render 6 placeholder cards. No new component needed — `Skeleton`
primitive is sufficient.

### AlertDialog — `components/ui/alert-dialog/`

Used by both `PublishConfirmDialog` and `DeleteConfirmDialog`. Both compose from the same primitive
parts: `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`,
`AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`.

### DropdownMenu — `components/ui/dropdown-menu/`

Used by `ExamCard` for the action menu (Edit / Publish / Delete). Radix provides keyboard
nav (arrow keys), `role="menu"`, `role="menuitem"` automatically.

### Sonner toast

`ExamBankScreen` and `ExamBuilderScreen` call `toast.success(t("examBank.toast.saved"))` /
`toast.error(t("examBank.errors.<key>"))` directly. Provider already wired in dashboard layout.

---

## 9. File Inventory for Phase 4

```
src/features/exam-bank/presentation/
├── exam-bank-screen/
│   ├── exam-bank-screen.i-vm.ts          ← ExamBankScreenVM, ExamCardVM, SubjectOption, TeacherOption, ActionResult
│   ├── exam-bank-screen.tsx              ← 'use client'; container
│   ├── exam-bank-screen.stories.tsx      ← 3 stories: Loading / DraftAndPublished / EmptyState
│   ├── exam-bank-filter-bar.tsx          ← presentational
│   ├── exam-bank-skeleton.tsx            ← presentational; 6 skeleton cards
│   ├── exam-bank-empty.tsx               ← presentational; two variants (no exams / no match)
│   └── exam-card.tsx                     ← presentational; StatusBadge + Badge + DropdownMenu
│
└── exam-builder-screen/
    ├── exam-builder-screen.i-vm.ts       ← ExamBuilderScreenVM, BuilderActionResult
    ├── exam-builder-screen.tsx           ← 'use client'; container; owns all builder state
    ├── exam-builder-screen.stories.tsx   ← 5 stories: AddQuestion / MCQEdit / Validation / PublishConfirm / AdminReadOnly
    ├── builder-header.tsx                ← presentational; controlled
    ├── question-list.tsx                 ← presentational; controlled
    ├── question-list-item.tsx            ← presentational; controlled; Up/Down buttons
    ├── mcq-editor.tsx                    ← presentational; fully controlled; RadioGroup for correct answer
    ├── publish-confirm-dialog.tsx        ← presentational; controlled; AlertDialog
    ├── delete-confirm-dialog.tsx         ← presentational; controlled; AlertDialog (for exam delete from list)
    └── builder-action-bar.tsx            ← presentational; controlled
```

---

## 10. Missing Primitive — Action Required

**`radio-group`** is required for `MCQEditor` (correct-answer selector).  
It is NOT present in `components/ui/`. The engineer must run:

```bash
bun ui:add radio-group
```

before implementing `MCQEditor`. No hand-writing of the Radix RadioGroup primitive.

All other required primitives are already present.
