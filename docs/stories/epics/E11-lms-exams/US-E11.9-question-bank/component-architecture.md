# Component Architecture — US-E11.9 Teacher Question Bank

Written by `fe-component-architect`. Finalizes `plan.md` §4's component list into
concrete trees + prop/ViewModel contracts. Does not contradict `state-architecture.md`
(`fe-state-engineer`, written in parallel) — references its query-key/hook shapes
rather than re-deciding them. No implementation code below — interfaces/contracts
only, per this role's mandate.

---

## 0. Promotions executed this pass (decision 0026)

Both promotions plan.md §4 called for are **done** (code + stories + import updates),
plus one **new finding** flagged (not executed — see §0.3).

### 0.1 `TagChipsInput` — MOVED to `src/components/shared/tag-chips-input/`

- `tag-chips-input.tsx` (renamed from `LPTagChipsInput`) + `index.ts` +
  `tag-chips-input.stories.tsx` (8 stories: empty, with-tags, add-on-enter,
  duplicate-ignored, max-tags-exceeded, tag-too-long, remove-tag, locked).
- **Generalized**: `maxTags: number` / `maxTagLength: number` are now
  caller-supplied props (previously imported from `lesson-plan`'s
  `domain/entities/lesson-plan.entity.ts` `MAX_TAGS`/`MAX_TAG_LENGTH`
  constants) — the shared component now has **zero feature-domain import**.
- `lesson-plan`'s `plan-meta-panel.tsx` updated to import `TagChipsInput` from
  `@/components/shared/tag-chips-input` and pass
  `maxTags={MAX_TAGS} maxTagLength={MAX_TAG_LENGTH}` (still its own entity
  constants — same values, 10/50 — just supplied as props now instead of
  read internally by the component).
- `question-bank`'s `QBTagChipsInput` (see §3) is a **thin wrapper**: passes
  `question-bank`'s own `MAX_TAGS=10`/`MAX_TAG_LENGTH=50` constants +
  `questionBank.*`-translated `labels`. Not a fork.

### 0.2 `PublishConfirmDialog` — MOVED to `src/components/shared/publish-confirm-dialog/`

- `publish-confirm-dialog.tsx` (same name, byte-identical behavior) +
  `index.ts` + `publish-confirm-dialog.stories.tsx` (7 stories: closed,
  open-idle, cancel-click, escape-cancels, open-loading,
  loading-ignores-escape — mirrors `destructive-confirm-dialog.stories.tsx`'s
  proof shape for the equivalent lifecycle).
- `lesson-plan`'s `lesson-plan-builder-screen.tsx` updated to import
  `PublishConfirmDialog` from `@/components/shared/publish-confirm-dialog`.
- `question-bank`'s builder uses it directly (`QBConfirmDialog` in
  design-spec.jsonc terms = this component, used as-is — no wrapper needed,
  it already takes plain `labels`/`open`/`isLoading`/callbacks).
- **Confirmed correct NOT to reuse `DestructiveConfirmDialog`** for either
  consumer: grepping `exam-bank-screen.tsx` found it actually DOES reuse
  `DestructiveConfirmDialog` for its own publish flow (red/destructive tone on
  a positive one-way action) — an existing inconsistency in the shipped
  codebase, out of this story's scope to fix, but noted so the same mistake
  isn't repeated here. `lesson-plan`'s non-destructive dialog is the correct
  precedent for `question-bank`.

### 0.3 New finding (NOT executed — flag to `fe-lead`): `OwnerToggle` → `QBScopeToggle`

Grepping `lesson-plan/presentation/lesson-plan-list-screen/owner-toggle.tsx`
turned up its own doc-comment: *"Feature-local for now — anticipated 2nd
consumer is question-bank (promote on that story, decision 0026)."* Its shape
(`{ id, label, count }[]` + `role="group"`/`aria-pressed` toggle) is
structurally identical to `question-bank`'s mine/search scope toggle (same 2-option
count-badge pattern, different labels: "Của tôi"/"Toàn trường" vs "Của
tôi"/"Tìm kiếm"). **This is a legitimate 3rd promotion candidate this plan.md
pass did not call out.** I did not execute it in this pass (plan.md/fe-lead
authorized exactly 2 promotions; a 3rd unscoped move risked compounding
regression surface on `lesson-plan` beyond what was reviewed). Recommend
`fe-nextjs-engineer` promote it to `components/shared/scope-toggle/` (generic
name, not owner-specific) as part of implementing `QBScopeToggle`, OR `fe-lead`
explicitly defer again — either way it should be a **decision**, not silently
forked a 3rd time. `QBScopeToggle` below is specified against the *eventual*
shared shape either way (so the contract doesn't change regardless of when the
move happens).

---

## 1. Component reuse — verified by grep (supersedes/corrects plan.md §4's table)

| Need | plan.md said | What I found (grep-verified) | Decision |
| --- | --- | --- | --- |
| Tag-chips input | promote | Confirmed only consumer was `plan-meta-panel.tsx` | **Promoted** (§0.1) |
| Publish confirm dialog | promote | Confirmed only consumer was `lesson-plan-builder-screen.tsx`; **also found** `exam-bank` uses the wrong (`DestructiveConfirmDialog`) component for the same job — not to be repeated | **Promoted** (§0.2) |
| Status chip | reuse `StatusBadge` via thin wrapper | `lesson-plan` has **no** `LPStatusChip` component — `lp-card.tsx` calls `StatusBadge` **directly inline** (tone + icon + text), no wrapper exists to mirror | `QBStatusChip` is a new thin wrapper (feature-local), following the *inline usage pattern*, not a nonexistent `LPStatusChip` |
| Empty/skeleton/error states | reuse `EmptyState`/`EduSkeleton`/`EduError` | `components/shared/empty-state` exists and matches; **no** generic `EduSkeleton`/`EduError` shared components exist — `lesson-plan-skeleton.tsx`/`lesson-plan-error-state.tsx` are feature-local (mockup's `EduSkeleton`/`EduError` names are the *design-src* mockup's own inline helpers, not real repo components) | Reuse `EmptyState` (shared) directly; `QBSkeleton`/error-state are feature-local, mirroring `lesson-plan`'s own feature-local pattern (see §1.1 below — this is itself a 2nd-instance case, flagged not executed) |
| Filter dropdowns (`QBDropdown`) | "keep feature-local for now… flag, don't force" | `lesson-plan-filter-bar.tsx` uses shadcn `Select` **directly**, no named `Dropdown` wrapper exists anywhere in the repo | **No new `QBDropdown` component** — `QBFilterBar` uses `Select` directly (5 instances), consistent with `.claude/rules/component-organization.md`'s "don't fork a wrapper around an existing primitive" rule. `QBDropdown` in `design-spec.jsonc`/spec.md §10 is the **mockup's own name** for this composed pattern, not a mandate for a new physical component — implementing it as `Select` achieves the identical layout/spacing (label+icon+chevron via `SelectTrigger` content, not a redesign) |
| Scope toggle (`QBScopeToggle`) | not in plan.md's table | `OwnerToggle` exists, explicitly self-flagged for question-bank promotion (see §0.3) | **Flagged, not executed** — see §0.3 |

### 1.1 Second flagged-not-executed finding: `LessonPlanErrorState` → shared

`lesson-plan-error-state.tsx` (generic `role="alert"` + icon + title + message +
retry button) is now about to have a structurally identical 2nd instance in
`question-bank`'s list-screen error state (spec §5 state 5, "generic error banner
+ retry, network/5xx across all endpoints" — same shape, no feature-specific
content). Per decision 0026 this is a promotion trigger (2nd consumer), but
plan.md did not name it and it is not one of the 2 promotions this task
authorized. **Flag to `fe-lead`**: either (a) promote alongside `OwnerToggle`
in the same small "promote from lesson-plan" commit `fe-nextjs-engineer` does
first, or (b) explicitly accept a 2nd feature-local fork this once and revisit
at the 3rd consumer. Either is a legitimate call; silence is not — hence this
flag.

---

## 2. Architecture Summary

- **Net-new feature scope**: `src/features/question-bank/presentation/` — 2
  screens (list, builder), each with a container root + a handful of
  presentational sub-components, per plan.md §4's file list (verified against
  the mockup + design-spec, not re-derived from scratch).
- **Container/hook boundary** (coordinate with `fe-state-engineer`, whose
  `state-architecture.md` this defers to for the exact query-key/invalidation
  mechanics): `QuestionBankListScreen` is itself the container (inline
  `useInfiniteQuery` × 2, exactly like `LessonPlanListScreen` — no separate
  list hook file). `QuestionBankBuilderScreen` delegates all local state to
  `useQuestionBankBuilder(vm)` (mirrors `useLessonPlanBuilder`), returning a
  flat object of state + handlers the screen destructures.
- **Missing shadcn primitives**: none. Every primitive needed
  (`Select`, `Input`, `Textarea`, `Button`, `Badge`, `AlertDialog`, `Skelettton`,
  `Label`) already exists in `components/ui/`.
- **Key decisions**:
  1. No `QBDropdown` component — `Select` primitive used directly (§1).
  2. `QBStatusChip`/`QBTypeBadge`/`QBDifficultyBadge` are new, small,
     feature-local (not shared) — each wraps `StatusBadge` (shared) with a
     `questionBank`-specific tone/icon/label map; none are reused by any other
     feature today (a 2nd consumer would trigger promotion per decision 0026,
     same as `LPCard`'s inline `StatusBadge` usage never needed a wrapper
     because it only has 1 consumer).
  3. `QBFilterRequiredPrompt` stays feature-local (genuinely distinct visual —
     dashed border, own copy/icon — single consumer, no promotion trigger).
  4. Single-column-only responsive throughout (NFR-005) — no `lg:grid-cols-*`
     anywhere in either screen (unlike `lesson-plan-builder-screen`'s 2-column
     `lg:` split, which question-bank must NOT mirror per DR-021).

---

## 3. Component Tree

### 3.1 List screen — `src/features/question-bank/presentation/question-bank-list-screen/`

```
QuestionBankListScreen                              'use client', CONTAINER
├── (role="alert" notice banner)                     presentational, inline (mirrors
│                                                      LessonPlanListScreen's notice block —
│                                                      not a separate component, 1 consumer)
├── Page header
│   ├── <h1>/<p> title+subtitle                      presentational, inline
│   ├── QBScopeToggle                                presentational, CONTROLLED
│   │   (feature-local now; see §0.3 — eventual shared `ScopeToggle`)
│   └── <Button> "Tạo câu hỏi mới" (scope=mine only)  reused ui/button, inline
├── QBFilterBar                                       presentational, CONTROLLED
│   ├── <Input type="search">                         reused ui/input (tag/keyword field)
│   ├── <Select> × 4 (subject/grade/type/difficulty)  reused ui/select — NOT QBDropdown (§1)
│   ├── <Select> (status, scope=mine only)             reused ui/select, conditional render
│   └── mandatoryFilterIndicator                       presentational, inline (icon+text,
│                                                        scope=search only)
├── States (mutually exclusive, one renders):
│   ├── QBFilterRequiredPrompt                         presentational, NEW, feature-local
│   ├── QBSkeleton                                     presentational, NEW, feature-local
│   │                                                   (row-shaped, count=4 — NOT LessonPlanSkeleton's
│   │                                                    grid shape, different rowCard layout)
│   ├── QuestionBankErrorState                         presentational — flagged §1.1, feature-local
│   │                                                   for now (mirrors LessonPlanErrorState 1:1)
│   ├── EmptyState (shared, icon=clipboardList)         REUSED from components/shared/empty-state
│   │   — emptyAll (scope=mine, CTA→create)
│   ├── EmptyState (shared, icon=search)                REUSED — emptyFiltered (CTA=clearFilters)
│   └── Question list:
│       └── QBQuestionCard[]                           presentational, NEW
│           ├── QBTypeBadge                             presentational, NEW, feature-local
│           ├── QBDifficultyBadge                       presentational, NEW, feature-local
│           ├── QBStatusChip                            presentational, NEW, feature-local
│           │     (thin wrapper over shared StatusBadge)
│           └── author-attribution line (scope=search)  presentational, inline (uses
│                                                        card.unknownAuthor fallback, §0 plan.md decision #2)
└── LoadMoreButton                                     REUSED from components/shared/load-more-button
```

### 3.2 Builder screen — `src/features/question-bank/presentation/question-bank-builder-screen/`

```
QuestionBankBuilderScreen                            'use client', CONTAINER
│  (delegates all local state to useQuestionBankBuilder(vm) — presentational
│   JSX only, no inline useState beyond what the hook doesn't own)
├── Top bar (mirrors lessonPlan.builderScreen.topBar, spec builderScreen.topBar)
│   ├── Back button                                   inline, ui/button
│   ├── Breadcrumb + truncated-body title              inline
│   ├── QBStatusChip                                    reused (same component as §3.1)
│   └── Save draft / Publish buttons (unlocked only)    inline, ui/button
├── QBLockedBanner (locked only)                        presentational, NEW, feature-local
│                                                        (mirrors PublishedLockedBanner 1:1 shape —
│                                                         role="status", Lock icon, 1 consumer, no
│                                                         promotion trigger yet)
├── Unsaved-indicator dot (dirty, unlocked only)         inline (mirrors lesson-plan's, 1 consumer)
├── Single-column form body (maxWidth 760, NO lg: 2-col split — NFR-005/DR-021)
│   ├── QBQuestionTypeSelector                          presentational, NEW, CONTROLLED
│   │     (3-option segmented control; disabled when isEdit — FR-009)
│   ├── QBMetaGrid                                      presentational, NEW, CONTROLLED
│   │   ├── subject <Select>                            disabled on edit (FR-009, all 4 immutable)
│   │   ├── grade <Select>                               disabled on edit
│   │   └── difficulty <Select>                          disabled on edit
│   ├── Body <Textarea>                                 inline, ui/textarea (rows by type, FR-006)
│   ├── Expected-answer <Textarea>                      inline, ui/textarea (rows by type, FR-007 —
│   │                                                     NEVER a required/publish-gating field)
│   └── QBTagChipsInput                                  presentational, thin wrapper over shared
│                                                          TagChipsInput (§0.1)
└── PublishConfirmDialog (shared, §0.2)                  REUSED from components/shared/publish-confirm-dialog
```

---

## 4. ViewModel + Prop Interfaces

All types below reference `domain/entities` (question-bank's own, per
`plan.md` §1) and `../shared.i-vm` (feature-local, mirrors `lesson-plan`'s
`shared.i-vm.ts` pattern per `.claude/CLAUDE.md`'s naming convention). No
interface here imports `infrastructure/` or `bootstrap/di/`.

### 4.1 `src/features/question-bank/presentation/shared.i-vm.ts`

```ts
import type {
  Difficulty,
  QuestionEntity,
  QuestionPage,
  QuestionType,
} from "../domain/entities/question.entity";
import type { QuestionBankFailure } from "../domain/failures/question-bank.failure";

/** Subject option for the filter/meta-grid select (redeclared per-feature,
 * same small duplication `lesson-plan` itself accepts — plan.md §0 item 1). */
export interface SubjectOption {
  id: string;
  name: string;
}

export const GRADE_OPTIONS = ["10", "11", "12"] as const;

/** List/search scope toggle — UI concept only, not a BE param (spec §1). */
export type ListScope = "mine" | "search";

/** Displayable failure types — every union member (unlike lesson-plan, there
 * is no silently-handled `invalid-cursor` exclusion needed here at the VM
 * layer; invalid-cursor recovery happens inside the query layer per
 * state-architecture.md §8 item 3, never reaches a `errors.*` translation). */
export type DisplayableFailureType = QuestionBankFailure["type"];

export type ListActionResult =
  | { ok: true; page: QuestionPage }
  | { ok: false; errorKey: QuestionBankFailure["type"] };

export type CreateActionResult =
  | { ok: true; question: QuestionEntity }
  | { ok: false; errorKey: QuestionBankFailure["type"] };

export type BuilderActionResult =
  | { ok: true; question: QuestionEntity }
  | { ok: false; errorKey: QuestionBankFailure["type"] };

export type { Difficulty, QuestionEntity, QuestionPage, QuestionType };
```

### 4.2 `question-bank-list-screen.i-vm.ts`

```ts
import type {
  Difficulty,
  QuestionEntity,
  QuestionType,
} from "../../domain/entities/question.entity";
import type {
  ListActionResult,
  SubjectOption,
} from "../shared.i-vm";

/** Client-side + server-eligible filter state (FR-005 split — the screen,
 * NOT this VM, decides which fields become query-key params vs. a client
 * `.filter()`; see state-architecture.md §4). */
export interface QuestionBankFilterState {
  tag: string; // free-text; also the FR-002/003 gate-satisfier
  subjectId: string; // "" = all; ALSO a gate-satisfier in scope=search
  gradeLevel: string; // "" = all
  questionType: "" | QuestionType; // "" = all — ALWAYS client-side (FR-005)
  difficulty: "" | Difficulty; // "" = all
  status: "" | "DRAFT" | "PUBLISHED"; // "" = all; scope=mine only, ALWAYS client-side
}

/** Row-card view-model — screen resolves all display strings/derivations,
 * mirrors LPCardVM's "component receives no raw entity" contract. */
export interface QBQuestionCardVM {
  id: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  status: "DRAFT" | "PUBLISHED";
  subjectName: string;
  gradeLevel: string;
  bodyPreview: string; // pre-truncated to 140 chars by the screen (FR-004)
  tags: string[];
  /** scope==='mine' OR own question surfaced in search. Drives action label
   * (Xem/Sửa vs Xem chi tiết) AND whether Edit is shown at all (FR-011/AC-906.6
   * — UX nicety only, authorId===currentTeacherId, never a security boundary). */
  isMine: boolean;
  /** ALWAYS `card.unknownAuthor` on search-scope cards regardless of authorId
   * (plan.md §0 decision #2) — undefined on scope=mine cards (never rendered). */
  authorLabel?: string;
  openPath: string;
}

export type QuestionBankListNotice = "access-denied" | "not-found" | null;

export interface QuestionBankListScreenVM {
  /** First page — scope='mine' (default), seeded by the RSC. null = load failed. */
  initialMinePage: {
    items: QuestionEntity[];
    nextCursor?: string;
    hasMore: boolean;
  } | null;
  subjects: SubjectOption[];
  gradeOptions: string[];
  currentTeacherId: string;
  createPath: string;
  editPathPrefix: string;
  /** Redirect notice from a gated edit-route GET (mirrors lesson-plan FR-008-equiv). */
  notice: QuestionBankListNotice;
  listMineAction: (cursor?: string) => Promise<ListActionResult>;
  searchAction: (
    params: {
      subjectId?: string;
      tag?: string;
      gradeLevel?: string;
      difficulty?: string;
    },
    cursor?: string,
  ) => Promise<ListActionResult>;
}
```

### 4.3 `question-bank-builder-screen.i-vm.ts`

```ts
import type {
  Difficulty,
  QuestionEntity,
  QuestionType,
} from "../../domain/entities/question.entity";
import type { BuilderActionResult, SubjectOption } from "../shared.i-vm";

/** Controlled builder form values — the 4 immutable-on-edit fields (FR-009)
 * are still part of the draft (create needs them writable) but the screen
 * disables their controls when `isEdit` (see QBMetaGrid/QBQuestionTypeSelector
 * props, §4.4/§4.6) rather than the VM/hook omitting them. */
export interface QuestionBankDraftInput {
  questionType: QuestionType;
  subjectId: string;
  gradeLevel: string;
  difficulty: Difficulty;
  body: string;
  expectedAnswer: string; // "" allowed for ALL types, FR-007 — never validated as required
  tags: string[];
}

/** Save payload — `id` present ⇒ update (PUT, only body/expectedAnswer/tags
 * actually sent per FR-009 — the use-case/repository, not this VM, drops the
 * 4 immutable fields before the wire call). */
export interface SaveQuestionInput extends QuestionBankDraftInput {
  id?: string;
}

export interface QuestionBankBuilderScreenVM {
  /** Populated in edit mode (RSC-loaded, visibility/ownership-gated). Undefined = create mode. */
  initial: QuestionEntity | undefined;
  questionId?: string;
  /** Edit-route GET failed with a transient error — stay on route, client shows retry. */
  loadFailed?: boolean;
  subjects: SubjectOption[];
  gradeOptions: string[];
  /** RSC-computed list path for back-nav + race/forbidden/not-found redirects. */
  questionBankPath: string;
  editPathPrefix: string;
  saveQuestionAction: (input: SaveQuestionInput) => Promise<BuilderActionResult>;
  /** One-way DRAFT → PUBLISHED. */
  publishAction: (id: string) => Promise<BuilderActionResult>;
  /** Re-GET the question (already-published race resync). */
  refetchAction: (id: string) => Promise<BuilderActionResult>;
}
```

### 4.4 New sub-component prop interfaces

```ts
// qb-scope-toggle.tsx (feature-local now — see §0.3 for the eventual shared move)
export interface QBScopeToggleProps {
  scope: ListScope; // "mine" | "search"
  mineCount: number;
  searchCount: number; // note: NOT "publishedCount" — question-bank's search
                        // scope label is "Tìm kiếm", not "Toàn trường"
  onScopeChange: (scope: ListScope) => void;
  labels: { groupAriaLabel: string; mine: string; search: string };
}

// qb-filter-bar.tsx
export interface QBFilterBarProps {
  filters: QuestionBankFilterState;
  subjects: SubjectOption[];
  gradeOptions: string[];
  scope: ListScope;
  /** Only meaningful in scope=search — drives the mandatoryFilterIndicator
   * icon/copy (screen computes via the domain's isSearchFilterSatisfied
   * predicate, NOT recomputed inside this presentational component). */
  isFilterSatisfied: boolean;
  onFilterChange: (patch: Partial<QuestionBankFilterState>) => void;
}

// qb-filter-required-prompt.tsx — no props beyond i18n (t() called inside,
// consistent with lesson-plan's feature-local presentational components that
// call useTranslations directly rather than receiving pre-translated strings
// — EmptyState is the one shared exception, which the empty states above use).
export interface QBFilterRequiredPromptProps {
  className?: string;
}

// qb-question-card.tsx
export interface QBQuestionCardProps {
  question: QBQuestionCardVM;
  onOpen: (id: string) => void;
}

// qb-type-badge.tsx / qb-difficulty-badge.tsx / qb-status-chip.tsx
export interface QBTypeBadgeProps { questionType: QuestionType }
export interface QBDifficultyBadgeProps { difficulty: Difficulty }
export interface QBStatusChipProps { status: "DRAFT" | "PUBLISHED" }

// qb-skeleton.tsx — no props (fixed count=4 per spec NFR-006), mirrors
// LessonPlanSkeleton's no-prop shape.

// question-bank-error-state.tsx (flagged §1.1 — feature-local for now)
export interface QuestionBankErrorStateProps {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

// qb-question-type-selector.tsx
export interface QBQuestionTypeSelectorProps {
  value: QuestionType;
  disabled: boolean; // true when isEdit (FR-009 — immutable post-create)
  onChange: (value: QuestionType) => void;
}

// qb-meta-grid.tsx
export interface QBMetaGridProps {
  subjectId: string;
  gradeLevel: string;
  difficulty: Difficulty;
  subjects: SubjectOption[];
  gradeOptions: string[];
  /** All 4 fields (incl. questionType, handled by the selector above) share
   * this one lock derivation: `isLocked || isEdit` (FR-009). Passed as a
   * single flag rather than 3 booleans since it's always the same value for
   * all 3 selects in this component. */
  disabled: boolean;
  onSubjectChange: (id: string) => void;
  onGradeChange: (value: string) => void;
  onDifficultyChange: (value: Difficulty) => void;
  fieldErrors: { subjectId?: QuestionBankFailure["type"] };
}

// qb-locked-banner.tsx (mirrors PublishedLockedBanner 1:1)
export interface QBLockedBannerProps {
  publishedAtDisplay?: string;
}

// qb-tag-chips-input.tsx (thin wrapper over shared TagChipsInput)
export interface QBTagChipsInputProps {
  tags: string[];
  isLocked: boolean;
  onChange: (tags: string[]) => void;
  fieldError?: QuestionBankFailure["type"]; // "tag-limit-exceeded" | "tag-too-long"
}
```

---

## 5. State Ownership (contract level)

Full mechanics owned by `fe-state-engineer`'s `state-architecture.md` — this
section only maps which layer/component each piece of state in this tree
belongs to, so the two docs don't drift.

| State | Owner (component) | Controlled prop or internal? |
| --- | --- | --- |
| List/search pages (`useInfiniteQuery`) | `QuestionBankListScreen` | Internal to the container — not a prop anywhere in §3/§4 |
| Scope (`mine`/`search`) | `QuestionBankListScreen` | Internal (`useState`); passed DOWN as a controlled prop to `QBScopeToggle`/`QBFilterBar` |
| Filter values (`QuestionBankFilterState`) | `QuestionBankListScreen` | Internal (`useState`); passed down as controlled prop to `QBFilterBar` |
| Mandatory-filter-satisfied boolean | `QuestionBankListScreen` (derived via domain's `isSearchFilterSatisfied`) | Derived, passed down as `isFilterSatisfied` prop — `QBFilterBar` never recomputes it |
| Debounced tag buffer (FR-013) | `QuestionBankListScreen` | Internal — `QBFilterBar`'s `<Input>` is still a fully controlled `value`/`onChange`; the debounce timer lives in the screen, between `onFilterChange` firing and the query key actually changing |
| Row-card display data | `QBQuestionCard` | Fully controlled prop (`QBQuestionCardVM`) — zero internal state, zero data-fetching |
| Builder form fields, dirty/locked/publish-gate booleans | `useQuestionBankBuilder(vm)` hook | Internal to the hook; `QuestionBankBuilderScreen` destructures and passes down as controlled props to `QBQuestionTypeSelector`/`QBMetaGrid`/textareas/`QBTagChipsInput` |
| Tag-chip draft (uncommitted input text) | `TagChipsInput` (shared) | Internal, `useState` — the ONLY piece of state in the entire builder tree that is NOT lifted to the hook, by design (ephemeral, never needs to survive a re-render from outside) |
| Publish-confirm dialog open/loading | `useQuestionBankBuilder(vm)` hook | Internal to hook; `PublishConfirmDialog` receives `open`/`isLoading` as fully controlled props |

**Hand-off note to `fe-state-engineer`**: no conflicts found between this
component tree and `state-architecture.md` — its §2 "State Inventory" table
already assumes exactly this component/hook split (I read it before finalizing
this doc). One thing to double check together during implementation: `QBFilterBar`'s
`onFilterChange` callback signature (`Partial<QuestionBankFilterState>`) must
line up with however the hook that eventually wires `searchRoot()`'s key
params consumes `subjectId`/`tag`/`gradeLevel`/`difficulty` — same shape as
`LessonPlanFilterBar`'s `onFilterChange`, so this should compose cleanly.

---

## 6. Composition & Variant Strategy

- **No compound-component/slot pattern needed anywhere in this tree** — every
  new component takes flat, explicit props (matches `lesson-plan`'s style
  throughout; no `asChild`/`Slot` usage needed since nothing here polymorphically
  changes its rendered root element).
- **`cva` variants**: none needed for new components. `StatusBadge` (shared)
  already has its `tone` variant system (§ design-system.md Badge pattern);
  `QBStatusChip`/`QBTypeBadge`/`QBDifficultyBadge` each resolve a fixed
  `questionType`/`difficulty`/`status` → `{icon, tone}` lookup table internally
  (same shape as the mockup's `QB_TYPES`/`QB_DIFFICULTY`/`QB_STATUS` maps,
  translated into TS `Record`s) and hand the result to `StatusBadge`'s
  existing `tone` prop — no new variant axis on the shared primitive.
- **Design-system pattern reuse**: `StatusBadge` (icon+text badge pattern),
  `EmptyState` (canonical empty-state pattern), `LoadMoreButton`,
  `TagChipsInput`/`PublishConfirmDialog` (now shared, §0). `Select`/`Input`/
  `Textarea`/`Button`/`AlertDialog` primitives used directly, no wrapper.
- **Extension points (no over-abstraction until 3+ instances, per this rule's
  own guidance)**: `QBFilterRequiredPrompt`, `QBLockedBanner`,
  `QuestionBankErrorState` (flagged §1.1), `QBScopeToggle` (flagged §0.3) all
  stay feature-local for NOW even though 2 of the 4 already have a 2nd
  structural sibling elsewhere in the codebase — each is flagged explicitly in
  this doc rather than silently forked, so the decision to promote (or not) is
  made consciously by `fe-lead`/`fe-nextjs-engineer`, not accidentally
  deferred by omission.
- **Single-column responsive is a NON-negotiable extension boundary**
  (NFR-005/DR-021): `QuestionBankBuilderScreen`'s form body must never grow an
  `lg:grid-cols-*` split the way `lesson-plan-builder-screen.tsx` has — this is
  a deliberate DIVERGENCE from the `lesson-plan` precedent, not an oversight,
  called out so `fe-nextjs-engineer` doesn't copy that part of the sibling
  feature by habit.

---

## 7. Accessibility contract

| Interactive node | Role/label | Keyboard |
| --- | --- | --- |
| `QBScopeToggle` buttons | `role="group"` (fieldset+legend, mirrors `OwnerToggle`) + `aria-label` on the group; each button `aria-pressed` | Tab between the 2 buttons; Enter/Space activates (native `<button>`) |
| `QBFilterBar` search `<Input>` | `aria-label` (scope-conditional copy — different aria-label text in scope=search vs scope=mine per the mockup's own two `aria-label` variants) | Standard text input |
| `QBFilterBar` `<Select>` × 4–5 | `SelectTrigger aria-label` per filter (subject/grade/type/difficulty/status) | Native Radix Select keyboard nav (Space/Enter open, arrows navigate, Esc closes) — inherited, not reimplemented |
| mandatoryFilterIndicator | Not a control — `aria-live="polite"` region recommended (icon+text pairing, never color-alone per NFR-001/003) so a screen-reader user is told when the gate flips satisfied/unsatisfied without needing to re-focus it | n/a (status text, not focusable) |
| `QBQuestionCard` action button | `aria-label` interpolating the question's body preview (mirrors `LPCard`'s `${action}: ${title}` pattern) so screen-reader users don't hear 20 identical "Xem/Sửa" labels in a row | Tab-reachable, Enter/Space activates |
| `QBQuestionTypeSelector` segmented buttons | Each button `aria-pressed`; whole group should get a `role="radiogroup"`-equivalent treatment OR at minimum a `fieldset`/`legend` (mirrors `QBScopeToggle`'s pattern) — NOT plain unstructured buttons, so assistive tech understands only-one-selectable semantics | Tab into group, Enter/Space per button (or arrow-key roving if implemented as true radiogroup — engineer's call, either satisfies NFR-002) |
| `QBMetaGrid` selects | `Label htmlFor` + `SelectTrigger id` pairing (mirrors `PlanMetaPanel`); `disabled` (not just visually dimmed) when locked/edit | Native Select keyboard nav; disabled selects are correctly skipped in tab order |
| Body/expected-answer `<Textarea>` | `Label htmlFor` + `aria-invalid`/`aria-describedby` wired to the inline error `id` when touched+invalid (mirrors `plan-meta-panel.tsx`'s title-field pattern exactly) | Standard textarea; error text has `role="alert"` |
| `TagChipsInput` (shared) | Already accessible per its existing contract: `aria-label` on the draft input, per-tag `aria-label` on each remove button (`removeAriaLabelOf(tag)`), `role="alert"` on the inline max/too-long error, 44×44px touch target on remove buttons at `max-sm:` — unchanged by promotion | Enter/comma commits, Tab reaches each remove button independently |
| `PublishConfirmDialog` (shared) | Inherits Radix `AlertDialog`: `role="alertdialog"`, focus trap, `aria-labelledby`/`aria-describedby` — unchanged by promotion; confirm button `aria-busy` while loading | Escape/overlay-click → `onCancel` (unless loading — see stories `LoadingIgnoresEscape`); Tab cycles cancel↔confirm |
| `QBLockedBanner` | `role="status"` (mirrors `PublishedLockedBanner`) — announces once on mount, not assertive | n/a (not focusable, informational) |
| Toasts (draft saved / published / already-published-race) | `sonner`'s built-in `role="status"`/`aria-live` (informational, per spec §6.5 "NEVER a red error banner" for `already-published`) | n/a |

All badges (`QBTypeBadge`/`QBDifficultyBadge`/`QBStatusChip`) pair icon+text
per NFR-001 — none render color-only, matching `LPCard`'s `StatusBadge` usage
and the mockup's own icon+label pairing throughout.

---

## Cross-references

- `plan.md` §4 (component reuse table this doc corrects/finalizes), §0 items
  1–2 (subject dropdown source, author-fallback decision — both consumed
  as-is by `QBMetaGrid`'s `subjects` prop and `QBQuestionCardVM.authorLabel`).
- `state-architecture.md` (`fe-state-engineer`) — query keys, invalidation,
  hook internals; this doc only maps the component/hook boundary, not the
  query mechanics themselves.
- `spec.md` §5 (9 UI states — every state has a component slot in §3.1/§3.2),
  §6.4 (failure union — referenced by every `fieldErrors`/`errorKey` prop
  type above).
- Promoted components: `src/components/shared/tag-chips-input/`,
  `src/components/shared/publish-confirm-dialog/` (§0).
- Sibling precedent read in full before writing this doc:
  `src/features/lesson-plan/presentation/**` (list screen, builder screen,
  filter bar, card, owner-toggle, skeleton, error-state, meta-panel, hook).
