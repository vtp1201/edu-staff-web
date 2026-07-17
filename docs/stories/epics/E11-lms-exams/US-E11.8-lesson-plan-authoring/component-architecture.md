# US-E11.8 Teacher Lesson Plan Authoring — Component Architecture

**Author:** `fe-component-architect`
**Build contract:** `spec.md` (62 AC, 10 UC) + `story.md` §FE Resolution Notes + `plan.md`
**Design citation (do not re-derive):** `design_src/edu/lesson-plan.jsx`
(`LessonPlanScreen`, `LessonPlanBuilderScreen`) + `docs/product/design-spec.jsonc`
→ `screens.lessonPlan` (`listScreen`, `builderScreen`, `a11y`).
**Precedent followed (same epic, same shape of problem — cite, don't fork):**
`docs/stories/epics/E11-lms-exams/US-E11.3-exam-bank/component-architecture.md`.

---

## 1. Architecture Summary

### Feature scope

Two screens share one feature module `src/features/lesson-plan/`:

1. **`LessonPlanListScreen`** — `/teacher/lesson-plans`. One component parameterised by
   owner-toggle scope (`mine` | `browse`), each scope with its own loading/empty/error
   sub-states (4 distinct empty/prompt states total, per FR-006/FR-007).
2. **`LessonPlanBuilderScreen`** — `/teacher/lesson-plans/create` and
   `/teacher/lesson-plans/:id/edit`. One component parameterised by `initial` (undefined =
   create) and `initial.status` (DRAFT = editable, PUBLISHED = locked/read-only, FR-005).

### New vs. reused components

| Component | Status |
| --- | --- |
| `StatusBadge` (`components/shared/status-badge/`) | **REUSED** — DRAFT=warning, PUBLISHED=success (design-spec confirms "no new token", same 2-value convention as exam-bank). Icon is passed as `children` alongside the label (see §5) — no new "LPStatusChip" component needed; the design's `LPStatusChip` IS `StatusBadge` used this way. |
| `EmptyState` (`components/shared/empty-state/`) | **REUSED** — all 4 list empty/prompt states render through this one component with different `icon`/`title`/`body`/`cta` props (see §2, §5). No new "4 empty components" needed. |
| `Select` (`components/ui/select/`) | **REUSED** — subject/grade/status filter dropdowns (the design's `LPDropdown` is this primitive; the jsx hand-rolls it only because the mockup has no Radix). |
| `Input` (`components/ui/input/`) | **REUSED** — search field, title field. |
| `Textarea` (`components/ui/textarea/`) | **REUSED** — 4 document-section fields. |
| `Label` (`components/ui/label/`) | **REUSED** — every field label. |
| `Badge` (`components/ui/badge/`) | **REUSED** — tag pills on the card (non-semantic label, not a status → plain `Badge`, not `StatusBadge`, same distinction exam-bank drew for its subject chip). |
| `AlertDialog` (`components/ui/alert-dialog/`) | **REUSED** — publish confirm dialog primitive. |
| `Skeleton` (`components/ui/skeleton/`) | **REUSED** — inside the feature-local skeleton components. |
| `DetailPanelHeader` (`components/shared/detail-panel-header/`) | **REUSED** — builder top bar's 3-zone back/title/actions shell (back button + truncated title + right-zone actions), same as exam-bank's `builder-action-bar.tsx`. |
| `Button` (`components/ui/button/`) | **REUSED** — all CTAs. |
| `Sonner` / `toast()` | **REUSED** — publish-success toast (AC-004.3). |
| `LessonPlanListScreen` | NEW — feature-local |
| `OwnerToggle` | NEW — feature-local (see §5 promotion flag) |
| `LessonPlanFilterBar` | NEW — feature-local |
| `LessonPlanSkeleton` | NEW — feature-local |
| `LessonPlanErrorState` | NEW — feature-local |
| `LPCard` | NEW — feature-local |
| `LessonPlanBuilderScreen` | NEW — feature-local |
| `BuilderTopBar` | NEW — feature-local |
| `PlanMetaPanel` | NEW — feature-local |
| `DocumentSectionField` | NEW — feature-local |
| `LPTagChipsInput` | NEW — feature-local (see §5 promotion flag — DR-021 explicitly says this shape is shared with question-bank) |
| `PublishConfirmDialog` | NEW — feature-local (see §5 promotion flag — near-duplicate of exam-bank's own feature-local dialog) |
| `PublishedLockedBanner` | NEW — feature-local |
| `useLessonPlanBuilder` | NEW — feature-local client hook (form-state + FR-003 gate), mirrors `use-exam-builder.ts` |

### Missing primitives

**None.** Every shadcn primitive this feature needs (`select`, `input`, `textarea`, `label`,
`badge`, `alert-dialog`, `skeleton`, `button`) already exists in `components/ui/`. No
`bun ui:add` call required (contrast with exam-bank, which needed `radio-group` — lesson-plan
has no correct-answer-style control).

### Key decisions

| # | Decision |
| --- | --- |
| D1 | `LessonPlanListScreen` is ONE component parameterised by scope (`mine`/`browse`), not two screens — mirrors `LessonPlanScreen`'s own `filters.owner` toggle in the mockup and `ExamBankScreen`'s `viewerRole` parameterisation precedent. |
| D2 | The mockup's `LPStatusChip`/`LPDropdown` are **not** built as new components — they map 1:1 onto existing `StatusBadge`/`Select`. Only `LPCard`, `LPTagChipsInput`, `LPConfirmDialog` (→ `PublishConfirmDialog`) are genuinely new composed shapes, per design-spec's own component list. |
| D3 | The design's 4 distinct empty/prompt states (mine-empty-no-filters, mine-empty-filtered, browse-no-subject-prompt, browse-empty-for-subject) are ONE `EmptyState` shared-component usage with 4 prop sets computed in the container — not 4 new components, not 1 new "LessonPlanEmpty" wrapper duplicating what `EmptyState` already does (contrast with exam-bank's `ExamBankEmpty`, which pre-dates `EmptyState`'s promotion and would itself be a candidate for backfill — out of scope here). |
| D4 | `PublishConfirmDialog` is a **new, non-destructive-tone** dialog — it does **not** reuse `DestructiveConfirmDialog` (red/`AlertTriangle`/destructive-button-variant). Publishing is a positive, one-way action (success tone, check icon, primary/success button), semantically wrong to route through the destructive component. See §5 for the promotion flag against exam-bank's own `publish-confirm-dialog.tsx`. |
| D5 | Subject picker options are supplied by the RSC page via `makeSubjectCatalogueRepository()` (existing, per `story.md` FE Resolution Notes #1) — `PlanMetaPanel` receives a plain `subjects: SubjectOption[]` prop, identical shape to exam-bank's `SubjectOption`. `PlanMetaPanel` never imports `bootstrap/di` itself. |
| D6 | `gradeLevel` is a free-text-bounded field (spec.md: "max 20 chars", not a subject-catalogue-linked reference), rendered as a `Select` fed by a small **feature-local static option list** (mirrors the mockup's local `LP_GRADES = [10, 11, 12]`), not a second reference-data integration. If a school's future taxonomy needs more grades this is a one-line constant change, not a new endpoint. |
| D7 | FR-007 owner attribution is fixed per `story.md`: `LPCard.ownerLabel: string` is a **plain required string**, always resolved by the container to `t("lessonPlan.card.unknownOwner")` for every browse-scope card. `LPCard` performs no conditional/fallback logic on it — dumb component, resolution lives in the screen/mapping layer (per the task's confirmed constraint). |

---

## 2. Component Tree

### 2a. Lesson Plan List

```
TeacherLessonPlansPage (RSC — app/…/teacher/lesson-plans/page.tsx)
  │  Fetches: first page of list-mine (default scope) via makeListMyLessonPlansUseCase
  │  Fetches: SubjectOption[] via makeSubjectCatalogueRepository() (read-only, for filter dropdown)
  │  Passes: Server Action refs (listMineAction, listBySubjectAction)
  │  Builds: LessonPlanListScreenVM
  └── LessonPlanListScreen ('use client' — CONTAINER)
        │  Local/query state (final key design owned by fe-state-engineer):
        │    scope: 'mine' | 'browse'          (local useState, not URL — no deep-link requirement surfaced)
        │    selectedSubjectId: string | null   (browse scope only; null = no fetch, AC-007.1)
        │    filters: { search, subjectId, gradeLevel, status } (client-side only, over fetched pages)
        │    pages (TanStack useInfiniteQuery × 2 call sites — list-mine / list-by-subject)
        ├── <header> — page title/subtitle (scope-dependent copy) + OwnerToggle + "Soạn giáo án mới" Button [visible: scope==='mine' only]
        │     └── OwnerToggle (PRESENTATIONAL — controlled)
        │           Props: scope, mineCount, publishedCount, onScopeChange, labels
        ├── LessonPlanFilterBar (PRESENTATIONAL — controlled)
        │     Props: filters, subjects, scope, onFilterChange
        │     Renders: search Input, subject Select, grade Select, status Select
        │       (status Select rendered ONLY when scope==='mine' — AC-007.1/FR-007 "no status filter" rule)
        ├── LessonPlanSkeleton (PRESENTATIONAL — no props; 6 skeleton cards)
        │     Rendered: isLoading===true (mine: while first page loads; browse: only once a subject is chosen, AC-007.1/.2)
        ├── LessonPlanErrorState (PRESENTATIONAL — controlled)
        │     Props: message, retryLabel, onRetry
        │     Rendered: fetch error (mine or browse) — NOT for LESSON_PLAN_INVALID_CURSOR (silent drop+refetch, never user-visible, AC-006.6/AC-007.6)
        ├── EmptyState (REUSED shared — 4 distinct prop sets, see §5) — rendered when the resolved item list is empty, one of:
        │     • scope='mine', no filters active     → icon=ScrollText, cta=Create
        │     • scope='mine', filters active, 0 match → icon=Search, cta=Clear filters
        │     • scope='browse', no subject selected  → icon=BookOpen, no cta   (AC-007.1 — no fetch fires)
        │     • scope='browse', subject selected, 0 results → icon=ScrollText, no cta (AC-007.8)
        └── <div grid> LPCard × n (PRESENTATIONAL — controlled)
              Props: plan (LPCardVM), onOpen
              Uses: StatusBadge (status tone+icon), Badge (tag pills)
```

**Annotation:**
- `LessonPlanListScreen` — `'use client'`, container (owns scope/filter/pagination state).
- `OwnerToggle`, `LessonPlanFilterBar`, `LessonPlanSkeleton`, `LessonPlanErrorState`, `LPCard` —
  `'use client'` (event handlers), all presentational/controlled, zero internal server-state.
- `EmptyState` — already `'use client'` presentational, imported as-is.

### 2b. Lesson Plan Builder

```
TeacherLessonPlanCreatePage (RSC — app/…/teacher/lesson-plans/create/page.tsx)
  │  Fetches: SubjectOption[] only (no initial plan)
  │  Builds: LessonPlanBuilderScreenVM (initial=undefined)
  └── LessonPlanBuilderScreen ('use client' — CONTAINER)
        │  Local state via useLessonPlanBuilder(initial?) hook:
        │    draft: LessonPlanDraft (title, subjectId, gradeLevel, tags, 4 sections)
        │    touched: Partial<Record<FieldKey, boolean>>
        │    isDirty: boolean (FR-010)
        │    isSaving / isPublishing: boolean (useTransition)
        │    publishDialogOpen: boolean
        │    fieldErrors: Partial<Record<FieldKey, LessonPlanFailure['type']>> (server-echoed, AC-004.6)
        ├── BuilderTopBar (PRESENTATIONAL — controlled)
        │     Props: title, status, isDirty, isLocked, isSaving, isPublishable, publishDisabledReason, onBack, onSaveDraft, onPublishClick, labels
        │     Composes: DetailPanelHeader (REUSED — back+title+actions zones) + StatusBadge (status chip)
        │     Renders when NOT locked: Save Draft button, Publish button (aria-disabled + visible helper when !isPublishable, AC-003.3)
        │     Renders when locked: NO save/publish controls at all (absent, not disabled — AC-005.4/FR-005)
        ├── PublishedLockedBanner (PRESENTATIONAL — stateless)
        │     Props: publishedAtDisplay, labels
        │     Rendered: status === 'PUBLISHED' only; role="status", lock icon + text (AC-005.3)
        ├── <div unsaved-dot> (PRESENTATIONAL, inline in BuilderTopBar or a 3-line sibling — see §5)
        │     Rendered: isDirty && !isLocked (AC-010.1); warning-tone dot + "Chưa lưu" text
        ├── <div 2-col-grid> (layout only, not a component — 320px / 1fr, stacks <860px per design-spec)
        │   ├── PlanMetaPanel (PRESENTATIONAL — controlled)   [left column]
        │   │     Props: title, subjectId, subjectName (for locked/edit display), gradeLevel, tags,
        │   │            subjects, gradeOptions, isLocked, isEdit, createdAtDisplay, publishedAtDisplay,
        │   │            fieldErrors, touched, onFieldChange, onFieldBlur, labels
        │   │     Uses: Input (title), Select (subject — DISABLED unconditionally when isEdit; see D6),
        │   │           Select (gradeLevel), LPTagChipsInput (tags)
        │   └── <div section-stack> (layout only)         [right column]
        │       └── DocumentSectionField × 4 (PRESENTATIONAL — controlled, reused per sectionKey)
        │             Props: sectionKey, icon, value, isLocked, isInvalid, onChange, onBlur, labels
        │             Uses: Textarea (rows=4)
        └── PublishConfirmDialog (PRESENTATIONAL — controlled)
              Props: open, isLoading, onConfirm, onCancel, labels
              Uses: AlertDialog primitive (non-destructive tone, see D4)

TeacherLessonPlanEditPage (RSC — app/…/teacher/lesson-plans/[id]/edit/page.tsx)
  │  Fetches: LessonPlanEntity via makeGetLessonPlanUseCase (FR-008 visibility-gated —
  │           not-found/access-denied handled at the RSC/route level, redirect before
  │           LessonPlanBuilderScreen ever mounts; see §6 access-denied vs not-found note)
  │  Builds: LessonPlanBuilderScreenVM (initial=LessonPlanEntity)
  └── LessonPlanBuilderScreen ('use client' — same component, initial populated)
        └── [same tree; useLessonPlanBuilder(initial) seeds draft from the fetched plan;
             isLocked derives from initial.status === 'PUBLISHED']
```

**Annotation:**
- `LessonPlanBuilderScreen` — `'use client'`, container (owns all builder state via
  `useLessonPlanBuilder`).
- `BuilderTopBar`, `PublishedLockedBanner`, `PlanMetaPanel`, `DocumentSectionField`,
  `LPTagChipsInput`, `PublishConfirmDialog` — `'use client'`, presentational/controlled, zero
  internal server-state (`LPTagChipsInput` owns only its own uncommitted-draft-text `useState`,
  same as the mockup — see §4).

### 2c. Route-guard note (FR-008, access-denied vs. not-found)

The distinct "access denied" (AC-008.3) vs. "not found" (AC-008.4) states are **not** rendered
inside `LessonPlanBuilderScreen` — per spec.md §5 both redirect to the list ("teacher stays on
route" only applies to network errors, AC-008.6). These are handled at the RSC/Server-Action
boundary (`[id]/edit/page.tsx` or a shared error-redirect helper), which is `fe-state-engineer`/
`fe-nextjs-engineer` territory (route-level control flow, not a component). `LessonPlanBuilderScreen`
therefore only ever renders for the two reachable end-states: editable DRAFT or locked PUBLISHED
(own or another teacher's) — never a 403/404 UI itself.

---

## 3. ViewModel + Prop Interfaces

### 3a. Shared types

```typescript
// Redeclared per-feature, no cross-feature import (same convention as exam-bank/lesson-bank)
export interface SubjectOption {
  id: string;
  name: string;
}

export type LessonPlanActionResult =
  | { ok: true }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

export type CreateLessonPlanActionResult =
  | { ok: true; id: string }
  | { ok: false; errorKey: LessonPlanFailure["type"] };
```

### 3b. `lesson-plan-list-screen.i-vm.ts`

```typescript
// src/features/lesson-plan/presentation/lesson-plan-list-screen/lesson-plan-list-screen.i-vm.ts

import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../../domain/failures/lesson-plan.failure";
import type { SubjectOption } from "../shared.i-vm"; // or inlined, per exam-bank convention

export interface LessonPlanPage {
  items: LessonPlanEntity[];
  nextCursor?: string;
  hasMore: boolean;
}

export type ListActionResult =
  | { ok: true; page: LessonPlanPage }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

export interface LessonPlanListScreenVM {
  /** First page — scope='mine' (default), rendered by RSC before hydration. */
  initialMinePage: LessonPlanPage;
  /** Subjects for the filter dropdown AND the browse-scope subject selector. */
  subjects: SubjectOption[];
  /** Cursor-paginated fetch — scope='mine'. Client calls again for "load more"/next page. */
  listMineAction: (cursor?: string) => Promise<ListActionResult>;
  /** Cursor-paginated fetch — scope='browse'. Requires subjectId; optional `tag` (real server
   *  filter, AC-007.4) and cursor. Never called until a subject is chosen (AC-007.1). */
  listBySubjectAction: (
    subjectId: string,
    opts?: { tag?: string; cursor?: string },
  ) => Promise<ListActionResult>;
  /** RSC pre-computes the create route — presentation never concatenates paths. */
  createPath: string;
  /** RSC pre-computes edit/detail path per plan id. */
  planPathOf: (id: string) => string;
  /** Current teacher's id — used to compute `LPCardVM.isMine` without a name-resolution lookup. */
  currentTeacherId: string;
}
```

### 3c. `LPCardVM` (prop interface, derived by the screen — not a separate `.i-vm.ts`)

```typescript
export interface LPCardVM {
  id: string;
  title: string;
  subjectName: string;
  subjectColorToken: string; // e.g. "primary" | "success" | ... — resolved to a design token, not raw hex
  gradeLevel: string;
  status: "DRAFT" | "PUBLISHED";
  filledSectionsCount: number; // 0-4, derived by the screen from the 4 section fields
  tags: string[];
  updatedAtDisplay: string; // RSC/screen formats the date string, component never formats dates
  /** true only when scope='mine' AND plan.teacherId === currentTeacherId. Drives "Xem/Sửa" vs "Xem chi tiết" + hides ownerLabel row. */
  isMine: boolean;
  /**
   * Per story.md's confirmed constraint (FR-007): ALWAYS
   * t("lessonPlan.card.unknownOwner") on every browse-scope card, never a resolved name,
   * never optional/nullable. LPCard performs no fallback logic on this field — it is a
   * plain required string the screen already resolved. Absent/unused when isMine===true.
   */
  ownerLabel: string;
  openPath: string; // pre-computed by the screen from planPathOf(id)
}

export interface LPCardProps {
  plan: LPCardVM;
  onOpen: (id: string) => void;
}
```

### 3d. `OwnerToggle` prop interface

```typescript
export interface OwnerToggleProps {
  scope: "mine" | "browse";
  mineCount: number;
  publishedCount: number;
  onScopeChange: (scope: "mine" | "browse") => void;
  labels: OwnerToggleLabels;
}

export interface OwnerToggleLabels {
  groupAriaLabel: string; // lessonPlan.ownerToggle.ariaLabel
  mine: string; // lessonPlan.ownerToggle.mine
  school: string; // lessonPlan.ownerToggle.school
}
```

### 3e. `LessonPlanFilterBar` prop interface

```typescript
export interface LessonPlanFilterState {
  search?: string;
  subjectId?: string;
  gradeLevel?: string;
  status?: "DRAFT" | "PUBLISHED";
}

export interface LessonPlanFilterBarProps {
  filters: LessonPlanFilterState;
  subjects: SubjectOption[];
  gradeOptions: string[]; // feature-local static list, D6
  scope: "mine" | "browse";
  onFilterChange: (patch: Partial<LessonPlanFilterState>) => void;
  labels: LessonPlanFilterBarLabels;
}

export interface LessonPlanFilterBarLabels {
  searchPlaceholder: string;
  searchAriaLabel: string;
  subjectAriaLabel: string;
  allSubjects: string;
  gradeAriaLabel: string;
  allGrades: string;
  statusAriaLabel: string; // only used when scope==='mine'
  allStatuses: string;
  statusDraft: string;
  statusPublished: string;
}
```

`status` filter field/select is simply not rendered by the parent when `scope==='browse'`
(FR-007 — implicitly PUBLISHED-only, no status filter surfaced at all) — `LessonPlanFilterBar`
itself still receives `scope` so it can omit that one control internally, rather than the
parent forking a second filter-bar component.

### 3f. `LessonPlanErrorState` prop interface

```typescript
export interface LessonPlanErrorStateProps {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}
```

### 3g. `lesson-plan-builder-screen.i-vm.ts`

```typescript
// src/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen.i-vm.ts

import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../../domain/failures/lesson-plan.failure";
import type { SubjectOption } from "../shared.i-vm";

export interface LessonPlanDraftInput {
  title: string;
  gradeLevel: string;
  tags: string[];
  objectives: string;
  contentOutline: string;
  activities: string;
  assessmentMethod: string;
}

export type BuilderActionResult =
  | { ok: true; plan: LessonPlanEntity }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

export type CreateActionResult =
  | { ok: true; id: string; plan: LessonPlanEntity }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

export interface LessonPlanBuilderScreenVM {
  /** Populated in edit mode (RSC loads LessonPlanEntity via FR-008-gated GET). Undefined = create mode. */
  initial: LessonPlanEntity | undefined;
  /** true only in edit mode when initial.teacherId === caller — controls the "one-way lock already
   *  active" render path; NOT the source of truth for write permission (server is, NFR-005). */
  subjects: SubjectOption[];
  gradeOptions: string[]; // D6 — static list, e.g. ["10","11","12"]
  /** Create: POST. Edit: PUT (never includes subjectId — immutable, FR-002/AC-002.8). */
  saveDraftAction: (
    input: LessonPlanDraftInput & { subjectId?: string; id?: string },
  ) => Promise<CreateActionResult | BuilderActionResult>;
  /** Always requires an id — create mode must save-draft first (same pattern as exam-bank). */
  publishAction: (id: string) => Promise<BuilderActionResult>;
  /** RSC pre-computes the redirect path for list navigation / already-published/forbidden/not-found races. */
  lessonPlansPath: string;
  /** RSC pre-computes this plan's own edit path — used after first save in create mode to swap the URL. */
  editPathOf: (id: string) => string;
}
```

### 3h. `BuilderTopBar` prop interface

```typescript
export interface BuilderTopBarProps {
  title: string; // draft.title || placeholder, resolved by the screen
  status: "DRAFT" | "PUBLISHED";
  isLocked: boolean; // status === 'PUBLISHED'
  isDirty: boolean; // FR-010, hidden entirely when isLocked
  isSaving: boolean;
  isPublishable: boolean; // FR-003 gate
  /** Non-empty ONLY when !isPublishable — the visible helper AC-003.3 requires alongside
   *  aria-disabled (never dimming-only). e.g. t("lessonPlan.builder.publishDisabledHelper"). */
  publishDisabledReason: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublishClick: () => void; // triggers FR-003 validation; opens dialog only if it passes (AC-003.2)
  labels: BuilderTopBarLabels;
}

export interface BuilderTopBarLabels {
  backAriaLabel: string;
  untitledPlaceholder: string;
  statusDraft: string;
  statusPublished: string;
  saveDraft: string;
  saving: string;
  publish: string;
  unsavedIndicator: string; // "Chưa lưu"
}
```

`BuilderTopBar` composes `DetailPanelHeader` (back zone + title zone + actions zone = Save/Publish
buttons + `StatusBadge`) and, as siblings below it (not inside its 3 zones), the conditional
unsaved-dot row and `PublishedLockedBanner`. When `isLocked`, no Save/Publish buttons are passed
into `DetailPanelHeader`'s `actions` slot at all (AC-005.4 — absent, not disabled).

### 3i. `PublishedLockedBanner` prop interface

```typescript
export interface PublishedLockedBannerProps {
  publishedAtDisplay: string; // already-formatted date string
  labels: {
    title: string; // lessonPlan.lockedNotice.title
    body: string; // lessonPlan.lockedNotice.body
  };
}
```

Renders `role="status"`, lock icon (`aria-hidden`) + text (AC-005.3, AC-005.1).

### 3j. `PlanMetaPanel` prop interface

```typescript
export type LessonPlanFieldKey =
  | "title"
  | "subjectId"
  | "gradeLevel"
  | "tags"
  | "objectives"
  | "contentOutline"
  | "activities"
  | "assessmentMethod";

export interface PlanMetaPanelProps {
  title: string;
  subjectId: string;
  subjectName: string; // for the disabled/read-only display on edit — never re-derived by the component from a lookup
  gradeLevel: string;
  tags: string[];
  subjects: SubjectOption[];
  gradeOptions: string[];
  isLocked: boolean;
  /** True on the edit route unconditionally — subject Select is ALWAYS disabled/read-only
   *  here, never re-enabled even if !isLocked (subjectId is immutable post-create, D6/AC-002.8). */
  isEdit: boolean;
  createdAtDisplay: string;
  publishedAtDisplay?: string; // absent for DRAFT (mirrors publishedAt key-absence, §6 spec.md)
  fieldErrors: Partial<Record<"title" | "gradeLevel" | "subjectId", string>>; // already-i18n'd messages
  touched: Partial<Record<"title", boolean>>;
  onFieldChange: (patch: Partial<Pick<LessonPlanDraftInput, "title" | "gradeLevel" | "tags">>) => void;
  onTitleBlur: () => void;
  labels: PlanMetaPanelLabels;
}

export interface PlanMetaPanelLabels {
  sectionTitle: string; // "Thông tin giáo án"
  titleLabel: string;
  titlePlaceholder: string;
  titleRequiredMark: string; // "*" aria-hidden decorative, real requirement conveyed via aria-required
  subjectLabel: string;
  subjectPlaceholder: string;
  gradeLevelLabel: string;
  gradeLevelPlaceholder: string;
  tagsLabel: string;
  createdAtPrefix: string;
  publishedAtPrefix: string;
}
```

### 3k. `DocumentSectionField` prop interface

```typescript
export type DocumentSectionKey =
  | "objectives"
  | "contentOutline"
  | "activities"
  | "assessmentMethod";

export interface DocumentSectionFieldProps {
  sectionKey: DocumentSectionKey;
  value: string;
  isLocked: boolean;
  /** touched && trimmed-empty — FR-003 per-field required-marking (AC-003.2). */
  isInvalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  labels: DocumentSectionFieldLabels; // one label/placeholder/error set per sectionKey, resolved by parent
}

export interface DocumentSectionFieldLabels {
  label: string;
  placeholder: string;
  requiredError: string; // "Mục này cần được điền trước khi phát hành."
}
```

Rendered 4× by the screen, one per `DocumentSectionKey`, each with its own icon (`flag`/`list`/
`users`/`checkSquare` per design-spec) passed as a `labels`-adjacent prop or resolved via a small
`SECTION_ICON: Record<DocumentSectionKey, LucideIcon>` map owned by the screen (not the component)
— keeps `DocumentSectionField` icon-agnostic and easy to test.

### 3l. `LPTagChipsInput` prop interface

```typescript
export interface LPTagChipsInputProps {
  tags: string[];
  isLocked: boolean; // hides remove ("x") controls entirely + greys the input area (AC-009.6)
  onChange: (tags: string[]) => void;
  labels: LPTagChipsInputLabels;
}

export interface LPTagChipsInputLabels {
  placeholder: string;
  maxTagsHelper: string; // "Tối đa 10 thẻ" — shown inline when the 11th add is blocked (AC-009.3)
  tagTooLongError: string; // shown inline when a >50-char tag is confirmed (AC-009.4)
  removeAriaLabelOf: (tag: string) => string; // t("lessonPlan.builder.tags.removeAriaLabel", { tag }) — AC-009.6
}
```

Internal-only state (not in the prop contract, owned by the component itself, same as the
mockup's `LPTagChipsInput`): the uncommitted draft input text. Add/remove/duplicate-ignore/
max-10/too-long logic (UC-009) lives inside this component since it's pure, self-contained
input-editing behavior — no server state, no cross-component coordination needed.

### 3m. `PublishConfirmDialog` prop interface

```typescript
export interface PublishConfirmDialogProps {
  open: boolean;
  /** AC-004.2 — confirm button must show an inline spinner + aria-busy while the
   *  PUT /:id/publish call is in flight. This is the one prop exam-bank's own
   *  PublishConfirmDialog interface (component-architecture.md §3j, US-E11.3) does NOT
   *  have — flagging as an improvement to carry back if/when that dialog is promoted (§5). */
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  labels: PublishConfirmDialogLabels;
}

export interface PublishConfirmDialogLabels {
  title: string; // "Phát hành giáo án?"
  body: string; // one-way + visibility warning copy
  confirm: string;
  cancel: string; // Common.confirmDialog.cancel, reused i18n key (same as DestructiveConfirmDialog)
}
```

---

## 4. State Ownership (contract level)

### `LessonPlanListScreen` — local state

| State | Type | Owner | Rationale |
| --- | --- | --- | --- |
| `scope` | `'mine' \| 'browse'` | local `useState`, default `'mine'` | UI-only concept (spec.md §1) — never a BE param; no deep-link requirement surfaced (plan.md §4), default to local state. |
| `selectedSubjectId` | `string \| null` | local `useState` | Browse-scope only. `null` = no fetch fires at all (AC-007.1) — this is the literal gate condition on the `useInfiniteQuery` for browse, not a component concern. |
| `filters` | `{ search?, subjectId?, gradeLevel?, status? }` | local `useState` | **Client-side only** over already-fetched pages (§6 of spec.md) — never becomes a query param except browse's own `tag`, which is a distinct, separately-tracked value (see next row). |
| `browseTag` | `string \| undefined` | local `useState` | The ONE real server-side filter param for browse scope (AC-007.4) — deliberately modeled separately from `filters` so it's obvious to the engineer this one drives a refetch while the rest don't. |
| pages / cursor / `hasMore` | TanStack `useInfiniteQuery` × 2 (`mine`, `by-subject`) | **`fe-state-engineer` to finalize query keys** | Plan.md's proposed keys: `["lesson-plan","list","mine"]` / `["lesson-plan","list","subject",subjectId]`. Component-architect's contract requirement: whatever hook shape lands, `LessonPlanListScreen` must expose a flat `LPCardVM[]` (already filtered client-side) + `isLoading` + `isError` + `onRetry` + `onLoadMore` to its presentational children — none of `OwnerToggle`/`LessonPlanFilterBar`/`LPCard` should know TanStack Query exists. |

**Hand-off note to `fe-state-engineer`:** the client-side filter pipeline (subject/grade/status/
search) must run as a `useMemo` derivation over the accumulated pages, recomputed on every new
page appended (AC-006.3) — it is NOT a second query. Only `browseTag` and `selectedSubjectId`
changes should trigger a new `useInfiniteQuery` call (browse) / no-op (mine, cursor/limit only).

### `LessonPlanBuilderScreen` — local state (`useLessonPlanBuilder` hook)

| State | Type | Owner | Rationale |
| --- | --- | --- | --- |
| `draft` | `LessonPlanDraftInput & { subjectId, status, publishedAt? }` | hook `useState`, seeded from `initial` | Controlled form state — mirrors `useExamBuilder`'s `meta`/`questions` pattern. |
| `touched` | `Partial<Record<FieldKey, boolean>>` | hook `useState` | Drives per-field inline errors (title, 4 sections) both on blur (AC-002.3 style) and on a failed Publish attempt (AC-003.2 marks ALL simultaneously). |
| `isDirty` | `boolean` | hook `useState`, derived on every `updateField` call | FR-010 — cleared immediately on successful Save Draft (AC-010.2), NOT on refetch. |
| `isLocked` | `boolean` (derived, not stored) | pure derivation: `draft.status === 'PUBLISHED'` | Never a separate state var — single source of truth is `draft.status`, avoiding drift (this is exactly the exam-bank precedent's `isLocked` derivation pattern). |
| `isSaving` / `isPublishing` | `boolean` | `useTransition` × 2 (Server Action pending) | Separate transitions — Save Draft and Publish are distinct async actions that can't overlap in the UI but are conceptually independent calls. |
| `publishDialogOpen` | `boolean` | hook `useState` | Opened only after FR-003's client gate passes (AC-003.2/AC-004.1). |
| `fieldErrors` | `Partial<Record<FieldKey, LessonPlanFailure['type']>>` | hook `useState`, set from Server Action failure results | AC-002.3/AC-004.6 — server-echoed field errors (e.g. stale-bundle bypass of FR-003) render on the same inline-error surface as client-side validation. |
| `raceLocked` | `boolean` | hook `useState`, set on `already-published` failure | AC-002.4/AC-004.5 — "auto-locks to read-only" + triggers a refetch of the now-PUBLISHED plan; modeled as a distinct flag (not reusing `isLocked`) so the screen can show the specific race-condition error banner copy once, then converge to the normal locked render once the refetch lands. |

**`LPTagChipsInput` internal state — note:** the uncommitted draft-tag input text is the ONE
piece of state this leaf component owns itself (same boundary the mockup draws) — everything
else (the committed `tags: string[]` array) is a controlled prop from `useLessonPlanBuilder`.

**Hand-off note to `fe-state-engineer`:** no TanStack Query is needed inside the builder screen
itself beyond the single initial `GET /:id` fetch on the edit route (owned by the RSC page, not
a client query) — all builder interaction is local form state + Server Action calls. Confirm
whether the edit-route's initial fetch should ALSO be a client-side `useQuery` (for
race-condition refetch after `already-published`, AC-002.4/AC-004.5) or whether a manual
Server-Action re-fetch call from the hook is sufficient — component-architect's contract only
requires that `useLessonPlanBuilder` expose a `refetch(): Promise<void>` capability for that one
race path; the mechanism is state-engineer's call.

---

## 5. Composition & Variant Strategy

### `StatusBadge` = the design's `LPStatusChip` (no new component)

```tsx
<StatusBadge tone={status === "DRAFT" ? "warning" : "success"}>
  {status === "DRAFT" ? <PenLine aria-hidden className="size-3" /> : <Check aria-hidden className="size-3" />}
  {labels.statusDraft /* or statusPublished */}
</StatusBadge>
```

Both tones are already WCAG-AA text-token-mapped in `TONE_CLASS` (status-badge.tsx) — 0 new
tokens, matches design-spec's explicit "no new token" note.

### `EmptyState` = all 4 list empty/prompt states (no new component)

The screen computes one of 4 prop sets and renders a single `<EmptyState .../>`:

```
mine, no filters, 0 items      → icon=ScrollText, title=empty.title,        body=empty.body,        cta={label:createLabel, onClick:onCreate}
mine, filters active, 0 items  → icon=Search,     title=empty.noMatch,      body=empty.noMatchBody,  cta={label:clearFiltersLabel, onClick:onClearFilters}
browse, no subject selected    → icon=BookOpen,    title=browse.promptTitle, body=browse.promptBody,  cta=undefined
browse, subject chosen, 0 items→ icon=ScrollText,  title=browse.emptyTitle,  body=undefined,          cta=undefined
```

This is a pure derivation function the screen (or a small colocated `deriveEmptyState()` helper)
owns — not a component boundary. Keeps `EmptyState`'s existing, already-reviewed a11y contract
(role="status", icon `aria-hidden`, `text-edu-text-secondary` contrast fix) untouched.

### `PublishConfirmDialog` — non-destructive `AlertDialog` composition

Same primitive-composition approach as `DestructiveConfirmDialog`
(`AlertDialogContent`/`Header`/`Title`/`Description`/`Footer`), but:
- Icon: `Check` in a `bg-primary/14` (or success-tone) roundel, not `AlertTriangle`/`ShieldAlert`.
- Confirm button: default/success variant, not `variant="destructive"`.
- `isLoading` → confirm button shows an inline spinner (`Loader2` `animate-spin`, gated behind
  `motion-safe:` per accessibility.md) + `aria-busy="true"` (AC-004.2) — mirrors
  `DestructiveDialogActions`'s `aria-busy` wiring, generalized to a non-destructive tone.
- No `errorSlot` variant needed for v1 (spec.md's publish failures redirect or inline-field-error
  instead of an in-dialog error slot — AC-004.5/.6/.7 all close the dialog first).

**Promotion flag (raise to `fe-lead`):** this is now the **second** near-identical one-way
"confirm and lock" dialog in the codebase — exam-bank already has its own feature-local
`publish-confirm-dialog.tsx` (US-E11.3, same `open`/`onConfirm`/`onCancel`/`labels` shape, missing
only `isLoading`). Per `component-organization.md`/decision `0026`, a 2nd screen needing the same
composed shape is the textbook promotion trigger ("promote, don't copy"). Recommend: extract a
`components/shared/publish-confirm-dialog/` (non-destructive tone, `isLoading` included) and
have BOTH exam-bank and lesson-plan consume it, rather than lesson-plan shipping a third
near-duplicate. This is a cross-feature file touch (editing exam-bank's existing component) —
flagging for `fe-lead` to sequence rather than doing it silently inside this US.

### `LPTagChipsInput` — promotion flag

The design mockup's own code comment states: *"Tag-chips input — reused shape for lesson-plan +
question-bank."* `docs/product/design-spec.jsonc`'s `questionBank` entry (US-E11.9, same DR-021)
lists an analogous `QBTagChipsInput`-shaped need. Per decision `0026`, this is anticipated
2nd-consumer reuse, not yet a confirmed 2nd screen (question-bank isn't built yet) — the
conservative rule (`component-organization.md`: "chỉ 1 screen dùng và chưa chắc tái dùng → tạm
để features/<x>/presentation/") says stay feature-local for now. **Flag to `fe-lead`:** when
US-E11.9 (question-bank) starts, promote this component (move, don't copy) to
`components/shared/tag-chips-input/` on that story's first commit that would otherwise fork it.

### `OwnerToggle` — same promotion watch

Same DR-021 origin, same "Của tôi / Toàn trường" scope-toggle UX likely appears in question-bank's
browse-by-subject screen too (`design-spec.jsonc`'s `questionBank.scopeToggle.*` i18n keys already
exist per its `i18nKeyCount` note). Keep feature-local for lesson-plan now; flag the same
promotion trigger to `fe-lead` for when question-bank's component architecture is authored.

### `useLessonPlanBuilder` hook — mirrors `useExamBuilder`

Same shape/spirit as `use-exam-builder.ts`: a single custom hook owning all builder local state,
returning `{ draft, touched, isDirty, isLocked, isSaving, isPublishing, publishDialogOpen,
fieldErrors, updateField, markTouched, handleSaveDraft, handlePublishClick,
handleConfirmPublish, closePublishDialog }`. Pure local state + Server Action calls — no
TanStack Query inside it (see §4 hand-off note).

### `PlanMetaPanel` — subject field variant, not a compound component

The subject field renders as a `Select` in create mode and the SAME `Select` component but
`disabled` in edit mode (never swapped for a plain `<span>` display) — matches spec.md AC-002.1's
"disabled/read-only display (never an editable `<select>`)" wording literally: it's a disabled
`<select>`, not a re-rendered read-only text node, so screen-reader semantics stay identical
(`disabled` attribute, not `display:none`, per AC-005.3's broader locked-field principle). One
component, one `isEdit`/`isLocked`-driven `disabled` prop — no `variant` prop needed here (`cva`
would be overkill for a single boolean disabled-state).

### `DocumentSectionField` — 4 identical instances, not 4 components

One component, invoked 4× with different `sectionKey`/`labels`/icon. No `cva` variant needed —
the only visual difference between instances is the icon + copy, both externally supplied.

---

## 6. Accessibility Contract

### `LessonPlanListScreen`

| Element | Requirement |
| --- | --- |
| `<h1>`/page title | Semantic heading, `text-2xl font-extrabold` per design-spec typography scale. |
| `OwnerToggle` | `role="group"` + `aria-label={labels.groupAriaLabel}`; each option button `aria-pressed={scope===option}` (AC per design-spec `listScreen.pageHeader.ownerToggle.a11y`). |
| `LessonPlanFilterBar` search `Input` | `aria-label={labels.searchAriaLabel}` (not placeholder-only). |
| `LessonPlanFilterBar` subject/grade/status `Select` | Each `aria-label`'d individually (subjectAriaLabel/gradeAriaLabel/statusAriaLabel) — status control not rendered at all when scope='browse' (not merely hidden — DOM-absent, matching FR-007's "SHALL NOT expose a status filter"). |
| `LessonPlanSkeleton` container | `aria-busy="true"` while loading (NFR-003). |
| `LessonPlanErrorState` | `role="alert"`; retry is a real `<button>` (native focusable, `onRetry` callback — not `window.location.reload()`). |
| `EmptyState` (all 4 variants) | Inherited `role="status"` + icon `aria-hidden` + `text-edu-text-secondary` contrast fix (already-audited component, no changes needed here). |
| `LPCard` — status | `StatusBadge` pairs icon + text — never color-only (NFR-001). |
| `LPCard` — open action | Real `<button type="button">` (or `<a>` if using `openPath` as a Link) with visible text ("Xem/Sửa" or "Xem chi tiết") — not icon-only, so no extra `aria-label` strictly required, though one naming the plan title is recommended for disambiguation among many cards (same pattern exam-bank's `ExamCard` uses). |
| Tag pills (`Badge`) | Decorative, not interactive on the card — no ARIA needed (contrast with `LPTagChipsInput`'s builder-only interactive chips, which DO need per-chip remove labels). |

### `LessonPlanBuilderScreen`

| Element | Requirement |
| --- | --- |
| `BuilderTopBar` / `DetailPanelHeader` | Back button `aria-label={backAriaLabel}` (per `DetailPanelHeader`'s existing contract); title zone truncates via ellipsis, never displaces back/actions. |
| Save Draft button | `aria-busy={isSaving}`; disabled while `isLocked` — actually **absent**, not disabled, when `isLocked` (AC-005.4). |
| Publish button | `aria-disabled={!isPublishable}` PLUS a visible helper text (`publishDisabledReason`, rendered via `aria-describedby` pointing at it) when disabled — AC-003.3 explicitly requires more than visual dimming; the exam-bank precedent (`builder-action-bar.tsx`) uses `aria-disabled` + opacity ONLY, which does **not** satisfy this spec's AC-003.3 — this is a deliberate, spec-mandated departure from the exam-bank precedent, not an oversight. |
| `PublishedLockedBanner` | `role="status"`; lock icon `aria-hidden` + text (AC-005.3). |
| Unsaved-changes dot | Text alternative present ("Chưa lưu"), not a color-only dot — `<span aria-hidden>` dot + adjacent visible text (mirrors the mockup's `<span>` dot + text pairing). |
| `PlanMetaPanel` — title `Input` | `<Label htmlFor>` association; `aria-invalid={touched.title && !titleValid}`; `aria-describedby` pointing at the inline error `id` when invalid (`role="alert"` on that error element). |
| `PlanMetaPanel` — subject `Select` | `<Label htmlFor>` association; `disabled` (never `aria-disabled`-only) on the edit route — real disabled semantics per AC-002.1/AC-002.8. |
| `PlanMetaPanel` — grade `Select` | `<Label htmlFor>` association. |
| `LPTagChipsInput` — remove ("x") control | `aria-label={labels.removeAriaLabelOf(tag)}` naming the SPECIFIC tag (AC-009.6, e.g. "Xoá thẻ Chương 5") — independently keyboard-operable (native `<button type="button">`); hidden entirely (not disabled) when `isLocked`. |
| `LPTagChipsInput` — max-10 / too-long helper | Visible inline text (`maxTagsHelper`/`tagTooLongError`), announced via the same `id`+`aria-describedby` pattern as other field errors, not a toast-only signal (AC-009.3/.4 require inline, add-time feedback). |
| `DocumentSectionField` — each `Textarea` | `<Label htmlFor>` association (icon `aria-hidden` inside the label); `aria-invalid={isInvalid}`; `aria-describedby` → the section's own error `id` (`role="alert"`) when invalid (AC per design-spec `rightColumn_documentSections.validation`). |
| `PublishConfirmDialog` | `role="alertdialog"` (via `AlertDialog` primitive, `aria-modal` implicit); confirm button `aria-busy={isLoading}` while the publish call is in flight (AC-004.2); Escape/overlay-click routes to `onCancel` (no request fires, AC-004.4). |
| Keyboard tab order | Reading order: back → title → status → save/publish (or locked banner) → meta column (title→subject→grade→tags) → 4 sections top-to-bottom (design-spec `a11y.keyboard`). |
| Motion | Dialog fade-in + toast animation gated behind `prefers-reduced-motion: reduce` (design-spec `a11y.motion`, `.claude/rules/accessibility.md`). |

### Contrast

All status tones reuse `StatusBadge`'s already-audited `TONE_CLASS` — `warning` →
`bg-edu-warning/15 text-edu-warning-foreground`, `success` → `bg-edu-success/15
text-edu-success-text`. No new tokens, no new contrast risk introduced by this feature.

---

## 7. File Inventory (Phase 5 hand-off to `fe-nextjs-engineer`)

```
src/features/lesson-plan/presentation/
├── shared.i-vm.ts                              ← SubjectOption, cross-screen shared types (optional; or inline per-screen like exam-bank does)
├── lesson-plan-list-screen/
│   ├── lesson-plan-list-screen.i-vm.ts
│   ├── lesson-plan-list-screen.tsx             ← 'use client'; container
│   ├── lesson-plan-list-screen.stories.tsx     ← mine: loading/empty/filtered-empty/error/success;
│   │                                              browse: prompt/loading/empty/error/success
│   ├── owner-toggle.tsx                        ← presentational; role=group + aria-pressed
│   ├── lesson-plan-filter-bar.tsx               ← presentational
│   ├── lesson-plan-skeleton.tsx                 ← presentational; 6 skeleton cards
│   ├── lesson-plan-error-state.tsx              ← presentational; role=alert + onRetry
│   └── lp-card.tsx                              ← presentational; StatusBadge + Badge
│
└── lesson-plan-builder-screen/
    ├── lesson-plan-builder-screen.i-vm.ts
    ├── lesson-plan-builder-screen.tsx           ← 'use client'; container
    ├── lesson-plan-builder-screen.stories.tsx   ← create-validation / edit-skeleton / race-auto-lock /
    │                                                locked-readonly / publish-confirm-open-confirm-cancel-error /
    │                                                tag-chips add-dup-max10-toolong-locked
    ├── use-lesson-plan-builder.ts               ← client hook — form state + FR-003 gate + FR-010 diff
    ├── builder-top-bar.tsx                      ← presentational; composes DetailPanelHeader + StatusBadge
    ├── published-locked-banner.tsx              ← presentational; role=status
    ├── plan-meta-panel.tsx                      ← presentational; controlled
    ├── document-section-field.tsx               ← presentational; controlled; reused ×4
    ├── lp-tag-chips-input.tsx                   ← presentational; own uncommitted-input state only
    └── publish-confirm-dialog.tsx               ← presentational; controlled; AlertDialog (non-destructive tone)
```

---

## 8. Reuse Summary (for `fe-lead`)

**Reused as-is, zero changes needed:**
`StatusBadge` (`components/shared/status-badge/`), `EmptyState` (`components/shared/empty-state/`),
`DetailPanelHeader` (`components/shared/detail-panel-header/`), `Select`/`Input`/`Textarea`/
`Label`/`Badge`/`AlertDialog`/`Skeleton`/`Button` (`components/ui/`), `Sonner` toast.

**No missing `ui/` primitives** — no `bun ui:add` call needed for this US.

**Promotion recommendations (flag to `fe-lead`, not actioned in this design pass):**
1. `PublishConfirmDialog` — extract a shared non-destructive-tone confirm dialog
   (`components/shared/publish-confirm-dialog/`) generalized from exam-bank's existing
   feature-local `publish-confirm-dialog.tsx`, adding the `isLoading`/`aria-busy` prop this US
   needs (AC-004.2) that exam-bank's version currently lacks. Two near-identical feature-local
   copies (exam-bank + this US) is exactly decision-0026's promotion trigger.
2. `LPTagChipsInput` — anticipated 2nd consumer is US-E11.9 question-bank (same DR-021, design
   mockup explicitly notes the shared shape). Stay feature-local now (conservative rule — 2nd
   screen not yet built); promote on question-bank's first commit rather than forking a copy.
3. `OwnerToggle` — same DR-021/question-bank anticipated reuse watch as #2.

No new design-system token, no ADR needed from this component-architecture pass (confirmed
consistent with `story.md`'s hard-gate check).
