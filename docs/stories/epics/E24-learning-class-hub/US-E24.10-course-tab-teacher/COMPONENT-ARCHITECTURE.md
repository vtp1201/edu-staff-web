# US-E24.10 Component Architecture — Course tab (teacher)

Owner: fe-component-architect. No code written here. Ground-truthed against
`features/lms/presentation/course-timeline/*` as currently merged (US-E24.3 +
US-E24.5) and `PLAN.md`'s §0 corrections — see references inline. Reuse
confirmed via grep before proposing anything new (`components/ui/dialog`,
`select`, `dropdown-menu`, `input`, `label`, `textarea`, `components/shared/
destructive-confirm-dialog`, `status-badge`).

## 1. Architecture Summary

- **Scope**: extend the existing, shared `course-timeline/` component (used
  today only in `mode: "student"`) with two new mode branches — `teacher`
  (full read-write) and `readonly` (GVCN viewing a subject that isn't theirs)
  — and add a new `teacher-course-tab/` presentation tree that wraps it with
  subject-picker chrome, the DRAFT-publish banner, and the readonly pill.
- **1 component, 1 home, no fork** (decision 0026): `CourseTimeline`,
  `WeekSection`, `TimelineRow` are edited in place, gated by `vm.mode`/a new
  `interactive` prop — never copied into a teacher-only parallel tree. This
  is the single highest regression-risk decision in this packet; §2 pins down
  exactly what changes and what must not.
- **New component tree**: `features/lms/presentation/teacher-course-tab/`
  (container + 5 presentational/dialog children) — single-screen for now
  (only the teacher class-hub course tab consumes it), correctly placed per
  the decision tree (§3 of `component-organization.md`: composed, 1 screen →
  feature-local, promote only when a 2nd screen needs it).
- **Reused verbatim, zero new primitives**: `components/ui/dialog`, `select`,
  `dropdown-menu`, `input`, `label`, `textarea`, `button`; `components/shared/
  destructive-confirm-dialog` (delete-item confirm — do NOT build a second
  confirm dialog); `components/shared/status-badge` (via the existing
  `ItemStatePill` composition — untouched). **No `bun ui:add` needed.**
- **Missing primitive**: none. The design's raw `<select>` maps to the
  existing `ui/select` (Radix `Select`, already used elsewhere) rather than a
  native `<select>` element — the codebase has no bare-native-select
  convention and Radix `Select` already satisfies "keyboard-operable +
  labelled" without a custom build. (`PLAN.md` §5.2 said "native `<select>`,
  not a custom Radix combobox" — read as "don't build a fancy combobox",
  which `ui/select` already isn't; it's the plain single-choice primitive.)
- **Key decision — `CourseHeader` stays mode-agnostic.** Per `PLAN.md` §5.1's
  own recommendation: the DRAFT banner / subject-picker / readonly pill
  render in `TeacherCourseTab`, ABOVE `<CourseHeader>`, not as a new prop on
  it. `CourseHeader`'s prop interface is UNCHANGED.
- **Key decision — `TimelineRow` grows one boolean, `interactive`, not a 3rd
  markup fork.** `readonly` mode reuses the row's existing non-interactive
  (`locked`-style) card body; `teacher` mode adds the grip/edit/delete
  affordances INSIDE the interactive branch. This keeps the file at 2 shape
  branches (interactive / non-interactive) crossed with `mode`, not 3 parallel
  copies of the row.
- **Container vs presentational split**: exactly ONE new client container
  owns state — `TeacherCourseTab` (selected-subject URL nav via
  `router.push`, publish-banner pending state, and the TanStack Query
  boundary `fe-state-engineer` will design in `use-course-items-query.ts` or
  equivalent). Every row-level affordance (grip, edit-window toggle, add-item
  menu, delete confirm) is a **controlled, callback-driven presentational
  component** — none of them own their own server cache; they call back up
  through `onReorder`/`onSaveWindow`/`onCreateItem`/`onDelete` props that
  `TeacherCourseTab` binds to the TanStack mutations.
- **State-ownership note to `fe-state-engineer`**: this architecture defines
  the CALLBACK SHAPE each component needs (§4) and marks exactly where the
  TanStack `useQuery`/`useMutation` boundary sits (§4's "Container" column) —
  it does not design the query key, optimistic-rollback mechanics, or
  `initialData` hydration; that is `fe-state-engineer`'s contract per
  `PLAN.md` §6.

## 2. Component Tree

```
page.tsx                                                              RSC
└─ TeacherCourseTab                                    'use client', CONTAINER
   │  owns: selectedSubjectId nav (router.push ?subjectId=), publish-banner
   │  pending state, add-item-dialog open/kind state, edit-window-row open
   │  state (which itemId, if any), delete-confirm state (which itemId, if
   │  any) — AND the TanStack Query boundary (query key ["lms","course",
   │  courseId,"items"], useMutation × 7) that fe-state-engineer specifies.
   │
   ├─ SubjectPicker                                    presentational, controlled
   │     rendered ONLY when vm.subjectOptions.length > 1 (GVCN dropdown);
   │     GVBM with exactly 1 subject renders nothing here (design: "GVBM sees
   │     none... single course, no dropdown").
   │
   ├─ [DRAFT banner + "Xuất bản" button]                inline in teacher-course-tab.tsx
   │     rendered when vm.courseStatus === "DRAFT" && vm.mode === "teacher"
   │     (a readonly viewer never sees the publish CTA even on a draft course
   │     — publishing is the owning teacher's action only). Not its own file:
   │     it is a single conditional block (~15 lines), not a reusable unit
   │     with its own subtree — extract only if a 2nd screen needs the exact
   │     same "draft banner + publish" shape.
   │
   ├─ [readonly pill]                                   inline in teacher-course-tab.tsx
   │     rendered when vm.mode === "readonly"; same "small conditional block,
   │     not its own file" reasoning as the banner above.
   │
   ├─ [forbidden-subject banner]                        inline in teacher-course-tab.tsx
   │     rendered when vm.forbiddenSubject === true (ask #7 404 case) INSTEAD
   │     of <CourseTimeline> — there is no course to show a timeline for.
   │
   └─ CourseTimeline (EXISTING, extended)                'use client', mostly presentational
      mode: "teacher" | "readonly"  (was: throws for both — now real branches)
      │
      ├─ CourseHeader (EXISTING, UNCHANGED prop interface)   presentational
      │
      └─ WeekSection[] (EXISTING, extended)                  presentational
         │  mode === "teacher" adds the "+ Thêm mục" pill AFTER the week's
         │  hairline (design: "nút pill mỗi nhóm tuần"); mode === "readonly"
         │  renders nothing extra (identical to today's student markup minus
         │  the pill, which never existed for student either).
         │
         ├─ AddItemMenu (NEW, teacher mode only)     presentational, controlled
         │     opens via WeekSection's pill; emits onSelectKind(kind, weekKey)
         │     up to TeacherCourseTab, which opens CreateItemDialog with that
         │     kind + the week's date as the suggested startAt (design: "Mục
         │     mới có startAt = tuần đang chọn (gợi ý)").
         │
         └─ TimelineRow[] (EXISTING, extended)                presentational
            new prop: `interactive: boolean` (default true — student/teacher
            unaffected; `false` only for `readonly` mode's rows).
            │
            teacher mode (interactive=true) ADDS, inside the SAME row:
            ├─ grip / draggable row surface     native HTML5 `draggable`
            │     (no library) — the ROW ITSELF is the drag source (§6
            │     a11y decision), not a separate nested handle element.
            ├─ ReorderKeyboardControls (NEW)     presentational, controlled
            │     "Lên"/"Xuống" buttons, visible on row/grip focus — the
            │     REQUIRED keyboard alternative to drag (not optional).
            ├─ "Sửa ngày" toggle button          inline in timeline-row.tsx
            │     flips local `isEditingWindow` boolean (row-local UI state,
            │     NOT server state — see §4); when on, renders:
            │     └─ EditWindowRow (NEW)          presentational, controlled
            │           2× datetime-local + Huỷ/Lưu; disabled+tooltip when
            │           item.itemType === "EXAM" (BE-enforced, not a client
            │           choice — renders in EVERY mode, not just teacher).
            └─ delete icon (DOCUMENT only)       inline trigger in timeline-row.tsx
                  opens the existing, REUSED `DestructiveConfirmDialog`
                  (owned/rendered by TeacherCourseTab, not per-row — a single
                  dialog instance parameterized by "which item", same pattern
                  every other US-E19.x delete confirm uses) — no new confirm
                  component.

CreateItemDialog (NEW, teacher mode only, rendered by TeacherCourseTab)
   'use client', controlled Dialog — kind: "lesson"|"assignment"|"document"
   (the 4th menu entry, "Kiểm tra", is a <Link> in AddItemMenu and never
   reaches this dialog at all — see AddItemMenu's contract, §4).
```

### 2.1 Why this split (regression-safety argument for the reviewer)

- `CourseTimeline`'s `if (vm.mode !== "student") throw` is the ONLY line that
  changes at the root — replaced by a 2-way branch
  (`mode === "readonly" ? <ReadonlyTimeline/> : <TeacherTimeline/>`, per
  `PLAN.md` §5.1), and `StudentTimeline` (today's sole branch) is renamed/kept
  **byte-for-byte** otherwise. `mode` branching stays root-only per US-E24.3's
  original architecture note (`PLAN.md` §5.1 cites this explicitly) — no
  child component re-derives `mode` independently.
- `CourseHeader` receiving zero new props means every existing
  `course-timeline.stories.tsx` student story that asserts `CourseHeader`'s
  markup needs **zero changes** — a hard regression guard, not just a style
  preference.
- `WeekSection`/`TimelineRow` each gain exactly one new optional prop
  (`mode`/`interactive`, threaded down from `CourseTimeline`) with a
  **default that reproduces today's student behavior** — so every existing
  Storybook story that doesn't pass the new prop renders identically byte-
  for-byte; only stories that explicitly opt into teacher/readonly render the
  new branches.

## 3. ViewModel + Prop Interfaces

### 3.1 `course-timeline.i-vm.ts` (EDIT — additive only)

```ts
// UNCHANGED: CourseTimelineMode, TimelineItemVm, WeekVm, CourseTimelineVm's
// existing fields (courseId, courseName, tone, openCount, weeks, errorKey,
// mode). No field is removed or renamed.

/** NEW — teacher/readonly only; undefined (not present) for student.
 *  Kept OUT of the base `CourseTimelineVm` fields above and added as its own
 *  optional slot so a student-mode VM literal needs no new keys at all
 *  (regression safety for existing test fixtures/stories). */
export interface CourseTimelineTeacherVm {
  /** Per-item drag/keyboard reorder needs the FULL current id order — the
   *  same array `WeekVm.items` are drawn from, flattened once here so
   *  `buildReorderedItemIds` (domain, PLAN.md §1) never has to re-derive it
   *  from nested week groups. */
  orderedItemIds: string[];
  courseStatus: CourseStatus; // "DRAFT" | "PUBLISHED" — drives the publish banner
}

export interface CourseTimelineVm {
  courseId: string;
  courseName: string;
  tone: CourseTone;
  openCount: number;
  weeks: WeekVm[];
  errorKey: LmsFailure["type"] | null;
  mode: CourseTimelineMode;
  /** Present iff mode !== "student". */
  teacher?: CourseTimelineTeacherVm;
}

/** NEW — one row's window edit, parameterizing `EditWindowRow`'s save call.
 *  `itemId` is NOT part of this type: the caller (TimelineRow) already knows
 *  which row it belongs to and threads itemId as a separate action argument,
 *  matching the existing `retryListItems` "thin action, caller supplies ids"
 *  convention in this file. */
export interface ItemWindowInput {
  startAt: string | null; // datetime-local value, or null = "để trống"
  dueAt: string | null;
}

/** NEW action result shapes — mirror `RetryListItemsResult`'s ok/errorKey
 *  union convention exactly (one member per mutation, no shared envelope). */
export type ReorderItemsResult =
  | { ok: true; data: { weeks: WeekVm[] } }
  | { ok: false; errorKey: LmsFailure["type"] };

export type PatchItemWindowResult =
  | { ok: true; data: TimelineItemVm }
  | { ok: false; errorKey: LmsFailure["type"] };

export type DeleteItemResult =
  | { ok: true }
  | { ok: false; errorKey: LmsFailure["type"] };

/** CourseTimelineActions (EDIT — additive). Existing `retryListItems` field
 *  is untouched; these three are the ONLY course-timeline-internal mutations
 *  (reorder happens by drag/keyboard on rows already rendered here; window
 *  edit happens inline on a row). Add-item/create/publish are OWNED by
 *  `teacher-course-tab.i-vm.ts` instead (§3.3) — they operate above a single
 *  row/week, not on the timeline's own internal state, so they don't belong
 *  on this contract. */
export interface CourseTimelineActions {
  retryListItems: () => Promise<RetryListItemsResult>;
  /** Full new order, id-only — same "complete list, never a delta" contract
   *  `reorderItems` requires server-side (PLAN.md's `build-reordered-item-ids`). */
  reorderItems?: (orderedIds: string[]) => Promise<ReorderItemsResult>;
  patchItemWindow?: (
    itemId: string,
    input: ItemWindowInput,
  ) => Promise<PatchItemWindowResult>;
  deleteItem?: (itemId: string) => Promise<DeleteItemResult>;
}
```

Import `CourseStatus` from `@/features/lms/domain/entities/course.entity`
(already exported — no new domain type needed here).

**Optional (`?`) actions, not required**: student mode never populates
`reorderItems`/`patchItemWindow`/`deleteItem` (`CourseTimelineActions` is one
shared type across all 3 modes to avoid 3 parallel action-prop interfaces per
mode — the alternative, per-mode action types, would need a discriminated
union keyed on `mode` threaded through `CourseTimelineProps` too, which is
more machinery than 3 optional fields warrant here). `CourseTimeline`'s
teacher/readonly branches assert-not-undefined internally where mode
guarantees presence; student's `StudentTimeline` never reads them.

### 3.2 `teacher-course-tab/teacher-course-tab.i-vm.ts` (NEW)

```ts
import type { CourseStatus } from "@/features/lms/domain/entities/course.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type {
  CourseTimelineActions,
  CourseTimelineVm,
} from "../course-timeline/course-timeline.i-vm";

export interface SubjectOptionVm {
  id: string;
  name: string;
  /** Drives the "(môn của bạn)" suffix (SubjectPicker) — also the input to
   *  `resolveCourseTimelineMode` upstream in `course-vm.ts`, but kept here too
   *  since the picker needs to render the suffix without re-deriving mode. */
  isMine: boolean;
}

/**
 * Screen-level VM for the teacher course tab. Wraps `CourseTimelineVm` rather
 * than flattening it — `TeacherCourseTab` renders its own chrome (picker,
 * banner, pill) THEN forwards `courseTimeline` down unchanged, so
 * `CourseTimeline`'s own contract (§3.1) never has to know about the subject
 * picker or the forbidden-subject case that can occur before a course even
 * resolves.
 */
export interface TeacherCourseTabVm {
  classId: string;
  /** Only non-empty for a GVCN (>1 class subject); a GVBM with exactly one
   *  subject renders no picker (SubjectPicker mounts iff length > 1). */
  subjectOptions: SubjectOptionVm[];
  selectedSubjectId: string;
  /** Ask #7 — BE 404/403 on this subject's course. When true, `courseTimeline`
   *  is null and `TeacherCourseTab` renders ONLY the picker + forbidden banner. */
  forbiddenSubject: boolean;
  /** Null iff forbiddenSubject. */
  courseTimeline: CourseTimelineVm | null;
  /** Denormalized from `courseTimeline.teacher.courseStatus` for the banner
   *  gate — kept at this level too so the banner's presence check doesn't
   *  reach two objects deep; same value, not a second source of truth (the
   *  RSC VM-builder sets both from the one `Course.status` read). */
  courseStatus: CourseStatus | null;
}

export type PublishCourseResult =
  | { ok: true; data: { courseStatus: CourseStatus } }
  | { ok: false; errorKey: LmsFailure["type"] };

export interface CreateLessonInput {
  title: string;
  content: string | null;
  startAt: string | null;
}
export interface CreateAssignmentInput {
  title: string;
  description: string | null;
  startAt: string | null;
  dueAt: string | null;
}
export interface CreateDocumentInput {
  title: string;
  url: string; // pre-validated https by validate-item-window.ts before this is called
  startAt: string | null;
  dueAt: string | null;
}

export type CreateItemResult =
  | { ok: true; data: { weeks: CourseTimelineVm["weeks"] } }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Server Action refs — passed as props, never imported directly (same
 *  contract as `CourseTimelineActions`). Composes `CourseTimelineActions`
 *  rather than duplicating `reorderItems`/`patchItemWindow`/`deleteItem` —
 *  ONE prop object flows from `page.tsx` down through `TeacherCourseTab`
 *  into `<CourseTimeline actions={...} />` unchanged. */
export interface TeacherCourseTabActions extends CourseTimelineActions {
  publishCourse: (courseId: string) => Promise<PublishCourseResult>;
  createLesson: (
    courseId: string,
    input: CreateLessonInput,
  ) => Promise<CreateItemResult>;
  createAssignment: (
    courseId: string,
    input: CreateAssignmentInput,
  ) => Promise<CreateItemResult>;
  addDocumentItem: (
    courseId: string,
    input: CreateDocumentInput,
  ) => Promise<CreateItemResult>;
}
```

### 3.3 New component prop interfaces

```ts
// teacher-course-tab.tsx
export interface TeacherCourseTabProps {
  vm: TeacherCourseTabVm;
  actions: TeacherCourseTabActions;
  /** Base href pattern for the subject-picker's navigation, mirrors
   *  `itemHrefBase` on CourseTimeline — e.g. classHubHref(base, classId, "course"). */
  courseTabHrefBase: string;
}

// subject-picker.tsx — presentational, controlled (no internal state)
export interface SubjectPickerProps {
  options: SubjectOptionVm[];
  selectedId: string;
  /** Navigation, not a fetch — parent does `router.push` with `?subjectId=`. */
  onSelect: (subjectId: string) => void;
}

// add-item-menu.tsx — presentational, controlled (open state owned by parent
// WeekSection isn't right either — owned by TeacherCourseTab so ONE dialog
// instance serves every week's pill; see §4)
export interface AddItemMenuProps {
  /** The week this pill belongs to — becomes the created item's suggested
   *  `startAt` (design: "Mục mới có startAt = tuần đang chọn"). */
  weekKey: string;
  weekStart: string | null;
  onSelectKind: (
    kind: "lesson" | "assignment" | "document",
    weekStart: string | null,
  ) => void;
  /** "Kiểm tra" entry — a <Link>, not a dialog trigger; href resolved by the
   *  caller (page-level constant, not invented here). */
  examBankHref: string;
}

// create-item-dialog.tsx — 'use client', controlled Dialog
export interface CreateItemDialogProps {
  open: boolean;
  kind: "lesson" | "assignment" | "document" | null; // null = closed/no kind chosen
  /** Prefills the "Mở lúc" field per AddItemMenu's weekStart. */
  suggestedStartAt: string | null;
  isSubmitting: boolean;
  /** Server-side error surfaced after a failed submit (422/limit/etc.) —
   *  rendered inline, not thrown; mirrors DestructiveConfirmDialog's
   *  errorSlot pattern (component-organization consistency) but simpler
   *  (single message string; per-field errors go through the form fields
   *  directly, not this slot). */
  submitError: string | null;
  onSubmit: (
    kind: "lesson" | "assignment" | "document",
    values: CreateLessonInput | CreateAssignmentInput | CreateDocumentInput,
  ) => void;
  onCancel: () => void;
}

// edit-window-row.tsx — presentational, controlled
export interface EditWindowRowProps {
  startAt: string | null;
  dueAt: string | null;
  /** EXAM rows always pass true regardless of mode — BE-enforced, not a
   *  client choice (PLAN.md §5.1). */
  disabled: boolean;
  isSaving: boolean;
  /** Already-i18n'd, from a failed `isDueAfterStart`/`patchItemWindow` call. */
  errorMessage: string | null;
  onSave: (input: ItemWindowInput) => void;
  onCancel: () => void;
}

// reorder-keyboard-controls.tsx — presentational, controlled
export interface ReorderKeyboardControlsProps {
  /** Disabled at either edge of the FULL course order (not just this week's
   *  slice) — `orderedItemIds` from CourseTimelineTeacherVm is the source of
   *  truth for "is this the first/last item overall". */
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}
```

**`timeline-row.tsx` / `week-section.tsx` prop additions** (edit existing
files, additive only):

```ts
// week-section.tsx
export interface WeekSectionProps {
  week: WeekVm;
  itemHrefBase: string;
  isLastWeek: boolean;
  /** NEW, optional — default "student" preserves today's behavior exactly. */
  mode?: CourseTimelineMode;
  /** NEW — only read when mode === "teacher"; renders the AddItemMenu pill. */
  onSelectAddItemKind?: (
    kind: "lesson" | "assignment" | "document",
    weekStart: string | null,
  ) => void;
  examBankHref?: string;
  /** Threaded straight through to each TimelineRow — see below. */
  rowProps?: Pick<
    TimelineRowProps,
    | "interactive"
    | "onMoveUp"
    | "onMoveDown"
    | "canMoveFirst"
    | "canMoveLast"
    | "onDragReorder"
    | "onSaveWindow"
    | "onDeleteRequest"
  >;
}

// timeline-row.tsx
export interface TimelineRowProps {
  item: TimelineItemVm;
  itemHref: string;
  isLast: boolean;
  /** NEW, optional, default true — student/teacher rows are unaffected;
   *  false ONLY for readonly mode (no grip, no edit, no delete, no <Link>). */
  interactive?: boolean;
  /** NEW, teacher-mode only (all optional — undefined when interactive is
   *  false or mode isn't teacher). Row-local drag source + drop target. */
  draggable?: boolean;
  onDragReorder?: (draggedItemId: string, overItemId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaveWindow?: (input: ItemWindowInput) => Promise<void>;
  /** DOCUMENT items only — undefined for LESSON/ASSIGNMENT/EXAM (no delete
   *  affordance renders for those regardless of mode, per BE 409). */
  onDeleteRequest?: () => void;
}
```

## 4. State Ownership (contract level)

| Concern | Owner | Kind |
| --- | --- | --- |
| Which subject is selected | URL (`?subjectId=`), read server-side into `TeacherCourseTabVm.selectedSubjectId` | Controlled — `SubjectPicker.onSelect` calls `router.push`, no client state |
| Timeline items (weeks/order) | `fe-state-engineer`'s TanStack `useQuery` in `TeacherCourseTab`, seeded `initialData` from `vm.courseTimeline.weeks` | Container server-cache state |
| Reorder in flight (optimistic order) | Same `useQuery` cache, written by a `useMutation`'s `onMutate` | Container server-cache state (NOT local `useState` — needs rollback) |
| "Which row is mid drag" (visual drop-target highlight) | `TeacherCourseTab` or a thin local `useState<string \| null>` in `CourseTimeline`'s teacher branch (purely visual, never persisted) | Internal UI state |
| "Which row has its edit-window form open" | `useState<string \| null>` in `TeacherCourseTab` (one at a time — opening a 2nd row's editor closes the first, matching the design's single-row-editing affordance) | Internal UI state, controlled down to `TimelineRow` via a boolean prop derived from comparing ids |
| Edit-window form field values (the 2 datetime-local inputs) | `useState` LOCAL to `EditWindowRow` (uncontrolled-ish; only submitted value crosses the boundary via `onSave`) | Internal UI state |
| Add-item dialog open/kind/values | `useState` in `TeacherCourseTab` (open bool + kind + the week's suggested startAt); form field values local to `CreateItemDialog` | Internal UI state (open/kind) + internal UI state (fields) |
| Delete-confirm dialog open/which-item | `useState<string \| null>` in `TeacherCourseTab` (mirrors the single-instance `DestructiveConfirmDialog` pattern from every other US-E19.x delete flow) | Internal UI state |
| DRAFT→PUBLISHED transition | `useMutation` in `TeacherCourseTab`; on success, `courseStatus` flows back through the SAME query-cache write channel `fe-state-engineer` designs (not a page-level `router.refresh()`) so the banner disappears without a full RSC round trip | Container server-cache state |
| `errorKey` retry banner (timeline read failure) | UNCHANGED — existing `useState` in `StudentTimeline`'s analogue for teacher/readonly (`TeacherTimeline`/`ReadonlyTimeline`), same one-shot re-read via `retryListItems`, no TanStack | Internal UI state (existing pattern, not touched by this US's new mutations) |

**Hand-off to `fe-state-engineer`**: the query key
(`["lms","course",courseId,"items"]`), the exact `onMutate`/`onError`
rollback mechanics for `reorderItems`, and whether `patchItemWindow`/
`createLesson`/`createAssignment`/`addDocumentItem`/`deleteItem` write
through `queryClient.setQueryData` or trigger a narrower `invalidateQueries`
are that role's contract (`PLAN.md` §6). This document only commits to:
(a) `TeacherCourseTab` is the ONE component that touches
`useQuery`/`useMutation` — nothing below it does; (b) every mutation result
this architecture's action types return (`ReorderItemsResult`,
`PatchItemWindowResult`, `CreateItemResult`, etc.) carries enough data
(`{ weeks }` or the single updated item) for whichever cache-write strategy
`fe-state-engineer` picks, without needing a follow-up full refetch.

## 5. Composition & Variant Strategy

- **`mode` as the single discriminant**, threaded top-down
  (`CourseTimeline` → `WeekSection` → `TimelineRow`) rather than each child
  re-deriving it from context or a second prop — matches US-E24.3's original
  "mode branching lives only at the root" rule as reinforced in `PLAN.md`.
- **`interactive` boolean on `TimelineRow`**, not a `variant` string: only 2
  shapes exist at the row level (clickable-or-teacher-editable vs. inert), so
  a boolean is the right-sized primitive — a 3-state `variant` prop would
  imply a 3rd visually distinct shape that doesn't exist (readonly's inert
  card IS today's `locked` card, just without the "opens at" banner text,
  itself already conditional on `item.locked`).
- **`AddItemMenu` is a `DropdownMenu` composition**, not a custom popover:
  Radix's `DropdownMenu.Root`/`Trigger`/`Content`/`Item` (already in
  `components/ui/dropdown-menu/`) supplies `role="menu"`/`"menuitem"` +
  roving `Tab`/arrow-key focus + `Escape`-to-close out of the box. The 4th
  entry (Kiểm tra) renders as a `DropdownMenuItem` wrapping a `<Link>` — one
  menu, one set of ARIA semantics, not a menu-plus-link hybrid bolted on
  after.
- **`CreateItemDialog` is ONE component parameterized by `kind`**, not 3
  dialogs — the 3 field sets (§3.2's 3 input types) are a `cva`-free simple
  conditional render inside one `Dialog`/`DialogContent` (shadcn/Radix
  `ui/dialog`), matching `PLAN.md` §5.2's explicit recommendation.
  Composition point: `kind` selects which `<fieldset>`-equivalent block of
  `Input`/`Textarea`/`Label` renders; no `Slot`/`asChild` needed here (no
  polymorphic root element required by the design).
- **`DestructiveConfirmDialog` reused as-is**, zero new props needed —
  `title`/`body`/`confirmLabel` are all caller-supplied strings, which
  `TeacherCourseTab` already has (item title + a delete confirmation
  copy key). No extension point required.
- **`ReorderKeyboardControls` is a plain button pair**, not a compound
  component — its only job is to expose `onMoveUp`/`onMoveDown` with correct
  disabled-at-edge state; no slot/children API needed since nothing else ever
  composes with it.
- **No `Slot`/`asChild` usage anywhere in this tree** — nothing here needs to
  render as a different root element (no "render as a link" polymorphism
  requirement surfaced by the design).
- **Extension points intentionally deferred (YAGNI)**: the DRAFT banner and
  readonly pill stay inline blocks in `teacher-course-tab.tsx` rather than
  extracted components, per `component-organization.md`'s "no
  over-abstraction until 3+ instances" — extract only when a 2nd screen
  needs the identical "draft/readonly chrome" shape.

## 6. Accessibility Contract

| Interactive node | Role/semantics | Keyboard | Notes |
| --- | --- | --- | --- |
| `TimelineRow` (teacher, interactive) | Native draggable `<li>`/card; NOT a `role="button"` overlay — the row still carries a `<Link>` for LESSON/ASSIGNMENT/DOCUMENT/EXAM navigation exactly as today | `Tab` reaches the row's existing focusable `<Link>`; the NEW "Lên"/"Xuống" buttons (`ReorderKeyboardControls`) are separate `Tab` stops immediately after, each a real `<button>` with `aria-label` (`courses.teacher.reorder.up`/`down`, includes the item title per accessibility.md's "icon-only button needs a clear aria-label") | HTML5 `draggable` is **not** keyboard-operable by itself (per `.claude/rules/accessibility.md` "mọi tương tác... bằng bàn phím") — the up/down buttons are the REQUIRED alternative, calling the identical `onReorder`/`buildReorderedItemIds` path a drop does, never a lesser affordance |
| Drag grip / row drag source | `aria-hidden="true"` on any decorative grip glyph; the `draggable` attribute sits on the row's own container, which is already an accessible-named element (via the row's existing text content) — no separate nested drag handle element, avoiding a nested-interactive violation | N/A (mouse/touch only path; see keyboard alternative above) | Flagged `[OPEN QUESTION]` in `PLAN.md` for `fe-accessibility-auditor` to confirm this beats a dedicated visual-grip-as-sole-source design |
| "Sửa ngày" toggle button | `<button aria-expanded={isEditing}>` — standard disclosure pattern | `Tab`-reachable, `Enter`/`Space` toggles | Toggling reveals `EditWindowRow` immediately after in DOM order (no modal, no focus trap needed — it's an inline disclosure, not a dialog) |
| `EditWindowRow` datetime-local inputs | Each wrapped in a `<Label>` (`components/ui/label`) with `htmlFor` — native `<input type="datetime-local">`, keyboard-operable by the browser by default | `Tab` through Mở-lúc → Hạn-chót → Huỷ → Lưu | Validation error (`isDueAfterStart` false) surfaces as visible text + `aria-invalid="true"` + `aria-describedby` pointing at the error text (never colour alone, per accessibility.md) |
| EXAM row's disabled edit button | `<button disabled aria-describedby="...">` with the tooltip text ALSO available as static text via `aria-describedby` (not only a hover `title`) — mirrors the existing `locked` row's "visible text over hover tooltip" precedent this component already established | Reachable via `Tab` (disabled buttons remain in the tab order per browser default, which is fine — screen readers announce the disabled state) | `t("courses.errors.exam-window-not-editable")` |
| `AddItemMenu` (`DropdownMenu`) | `role="menu"`, items `role="menuitem"` — inherited from Radix, not hand-rolled | Trigger: `Tab` + `Enter`/`Space` opens; `↓`/`↑` roves; `Escape` closes and returns focus to trigger (Radix default) | The "Kiểm tra" `menuitem` wrapping a `<Link>` still needs `role="menuitem"` semantics preserved — render the `<Link>` INSIDE a `DropdownMenuItem asChild`, not a bare anchor, so it stays part of the roving-focus set |
| `CreateItemDialog` | shadcn/Radix `Dialog` — `role="dialog"`, `aria-labelledby`/`aria-describedby` wired by the primitive, focus trap + focus-restore-to-trigger inherited | `Tab` cycles within the dialog only (native Radix trap); `Escape` closes (routes through the same `onCancel` contract `DestructiveConfirmDialog` already established: plain `<Button>`s, not `DialogClose`, to avoid double-firing submit + cancel) | Every field has a `<Label htmlFor>`; the URL field's `https://`-only pre-check error renders as visible text + `aria-invalid`, matching the packet's "lỗi field trước khi gọi BE" AC |
| Delete icon → `DestructiveConfirmDialog` | Reused verbatim — already WCAG-audited (US-E17.8/US-E19.2) | Reused verbatim | No new a11y surface — this is the point of reusing it |
| `SubjectPicker` (`Select`) | Radix `Select` — `role="combobox"`/`listbox` semantics, already accessible | `Tab` + `Enter`/`Space` opens, arrow keys navigate, `Enter` selects | `aria-label` (`courses.teacher.subjectPicker.label`) since there's no visible `<label>` element per the design; each option's visible text includes "(môn của bạn)" suffix for the owned entry — not colour/position alone |
| "Xuất bản" button | Standard `<Button>`, `aria-busy` while pending (same `isLoading`-disables pattern as `DestructiveDialogActions`) | `Tab` + `Enter`/`Space` | Success removes the banner from the DOM (not just visually hides it) so a screen-reader user re-scanning the page doesn't still "see" a stale draft banner |

## Reuse / missing-primitive summary (for `fe-lead`)

- **Reused, zero edits**: `ui/dialog`, `ui/select`, `ui/dropdown-menu`,
  `ui/input`, `ui/label`, `ui/textarea`, `ui/button`,
  `components/shared/destructive-confirm-dialog`,
  `components/shared/status-badge` (via existing `ItemStatePill`),
  `features/lms/presentation/shared/{item-state-pill,item-type-chip,use-week-label}`.
- **Edited (additive only, no removed/renamed fields)**:
  `course-timeline.i-vm.ts`, `course-timeline.tsx`, `week-section.tsx`,
  `timeline-row.tsx`. `course-header.tsx` is **NOT edited**.
- **New files**: `teacher-course-tab/{teacher-course-tab.tsx,
  teacher-course-tab.i-vm.ts, subject-picker.tsx, add-item-menu.tsx,
  create-item-dialog.tsx, edit-window-row.tsx,
  reorder-keyboard-controls.tsx}` + one `.stories.tsx` per new file per
  `component-organization.md`'s stories requirement.
- **Missing shadcn primitive**: none — `bun ui:add` not needed.
- **Flag to `fe-lead`**: none new beyond what `PLAN.md` already flagged
  (open questions on grip-handle a11y and the second-publish 409 error code
  remain `fe-nextjs-engineer`/`fe-accessibility-auditor` territory, not a
  component-tree concern).
