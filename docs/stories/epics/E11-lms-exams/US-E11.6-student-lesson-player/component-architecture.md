# US-E11.6 Component Architecture — Student Courses + Lesson Player

Author: fe-component-architect. Builds on `plan.md` §2/§8 (module home, file
layout, and open questions already settled there — this doc does not
relitigate them). Normative layout source: `design_src/edu/student.jsx`
lines 166-269 (`StudentCourses`) + 273-343 (`LessonBody`) + 352-568
(`LessonPlayer`) — no `docs/product/design-spec.jsonc` entry exists yet.

## 0. Reuse check (decision 0026 — grepped before proposing anything new)

Grepped `src/components/ui/*`, `src/components/shared/*`,
`src/features/exam/presentation/**` (closest precedent: student-facing,
mock-first, list→detail→complete flow).

| Need | Canonical reuse | Notes |
| --- | --- | --- |
| Course list tabs (3 tabs, count badge) | `components/ui/tabs` (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `variant="default"` pill style already matches mock's rounded-full active-tab look) | Reuse AS-IS. Do not hand-roll `<button>` tabs like the raw mockup — Radix Tabs gives roving-tabindex + `aria-selected` for free (AC-14). |
| Player Notes/Q&A tabs (underline style under content) | **Same** `components/ui/tabs` primitive, `variant="line"` (already exists in `tabsListVariants` — see `tabs.tsx:28-41`, the underline-on-active-trigger visual is exactly this variant) | **Decision: same Tabs primitive for both, different `variant` prop** — not two components. Mockup's visual difference (pill-tab-group vs underline-tab-strip) is a `variant` distinction the primitive already models; inventing a second tab component would violate decision 0026. |
| Progress bar (course card % done, progress card in player) | `components/ui/progress` (`Progress`, `indicatorClassName` prop for per-course tone) | Reuse. Pass `indicatorClassName="bg-edu-role-student"` or the course's own semantic tone class — no raw hex per-course color (mockup's inline `c.color` must map to an existing token, flagged in §7). |
| Cards (course card, progress card, chapter-list panel) | `components/ui/card` (`Card`, `CardContent`, etc.) | Reuse as the outer shell; course-card top color-strip + custom padding are compositional, not a new primitive. |
| Status/type badges (lesson-type icon+label, tab count pill) | `components/shared/status-badge` (`StatusBadge`, tones incl. `primary/success/warning/error/info/purple/teal/muted`) | Reuse for the tab count pill styling reference only (mockup's count pill isn't literally a `StatusBadge` — Radix `TabsTrigger` renders the count as a `<span>` child, see §3). Lesson `done` state icon is NOT a badge (see ChapterList below) — it's an inline circular marker, feature-local. |
| Empty states (per-tab empty, empty chapter, empty course-lessons, no-Q&A) | `components/shared/empty-state` (`EmptyState`, icon/title/body/cta props) | Reuse for **all 4** empty variants in this US (courses-tab-empty, course-lessons-empty, chapter-empty, qna-empty) — do not hand-roll centered-icon-and-text blocks like the mockup's inline style. |
| Course-list loading skeleton | `components/ui/skeleton` (`Skeleton`) primitive, composed feature-locally as `courses-skeleton.tsx` (grid of skeleton cards) | No shared "grid skeleton" component exists yet (checked `stat-card-skeleton` — that's StatCard-shaped, not course-card-shaped). Feature-local per decision 0026 (single-screen use today). |
| Textarea (Notes tab) | `components/ui/textarea` | Reuse. |
| Collapsible chapter header (expand/collapse) | **No accordion/collapsible primitive exists** (grepped `radix-ui/react-collapsible`, `Accordion` — zero hits in `src/`) | Do NOT `bun ui:add accordion` for a single disclosure button — use a native `<button aria-expanded aria-controls>` + conditionally-rendered `<ul>`, matching the `Sidebar`'s existing hand-rolled nav-disclosure pattern (`sidebar.tsx`) rather than pulling in a new Radix primitive for one collapse toggle. Flag to fe-lead only if a 2nd screen needs true accordion (single-open-at-a-time) semantics — this US allows multiple chapters open simultaneously, which a plain button disclosure handles fine. |
| Breadcrumb (player header) | None exists as `ui/`/`shared/` — **not shared** per `component-placement.md` memory (`Admin RosterBreadcrumb` vs `TeacherRosterBreadcrumb` precedent: breadcrumbs diverge per screen, stay feature-local) | Feature-local `<nav aria-label>` + `<ol>`, matches the "static trail" pattern noted for `TeacherRosterBreadcrumb`, not a dropdown. |
| Icon-only buttons (play/pause faux-control, fullscreen placeholder, download) | `components/ui/button` with `size="icon"` + `aria-label`, `components/ui/tooltip` if we want a hover label too (present, confirmed) | Reuse `Button`; no new primitive. |

**No new `components/ui/` or `components/shared/` component required for
this US.** `courses-skeleton.tsx`, `course-card.tsx`, `course-tabs.tsx`,
`courses-empty.tsx` (wrapping `EmptyState`), `chapter-list.tsx`, `lesson-body.tsx`
+ its 3 leaves, `notes-panel.tsx`, `qna-panel.tsx` are all **feature-local
composed components** under `src/features/lms/presentation/` per decision
0026 (§2.2 in plan.md already settled this — no promotion needed, this is
the *first* screen for all of them).

---

## 1. `StudentCoursesScreen`

### 1.1 Component tree

```
app/[locale]/t/[tenant]/(app)/student/courses/page.tsx      [RSC — container]
  └─ StudentCoursesScreen                                    ['use client', container-ish: owns tab state]
       ├─ CourseTabs                                          [presentational, controlled]
       │    └─ ui/Tabs, ui/TabsList, ui/TabsTrigger ×3
       ├─ CoursesSkeleton                                     [presentational — shown via Suspense fallback, NOT inside StudentCoursesScreen's own branch logic]
       ├─ CoursesEmpty (per active tab)                       [presentational, wraps shared/EmptyState]
       └─ CourseCard × N (grid)                                [presentational, pure props]
            ├─ ui/Card
            ├─ ui/Progress (indicatorClassName = course tone)
            └─ ui/Button (CTA: "Tiếp tục" / "Bắt đầu")
```

- **Container** = `page.tsx` (RSC): calls `makeListCoursesUseCase()` via DI,
  maps `CourseSummary[]` → `StudentCoursesScreenVm`, renders
  `<Suspense fallback={<CoursesSkeleton />}>` around `StudentCoursesScreen`.
  No Server Action needed for this screen (list-only, tab filtering is
  **client-side** — matches the mockup's `filter` state and plan.md §2's
  "recommend keeping filter client-side" call, since `CourseSummary` already
  carries `progress`/`total` needed to derive the tab bucket without a
  refetch).
- **`StudentCoursesScreen`** (`'use client'`) — thin state container: holds
  `activeTab` (`useState`, local UI state, not URL state — no deep-link
  requirement in AC-2), derives the filtered list via the same
  `isActive`/`isDone` predicates as the mockup (pure function, colocated or
  imported from `domain/use-cases/calculate-course-progress.ts`'s exported
  `CourseStatus` if that's public — otherwise a tiny local derive fn keyed off
  `course.status` precomputed by the RSC, see VM below), and renders
  `CourseTabs` + either `CoursesEmpty` or the `CourseCard` grid.
- **`CourseTabs`**, **`CourseCard`**, **`CoursesEmpty`**, **`CoursesSkeleton`**
  — pure presentational, props-only, no data fetching, no `useTranslations`
  (labels injected — see VM/label convention below).

### 1.2 `student-courses-screen.i-vm.ts`

```ts
import type { CourseStatus } from "@/features/lms/domain/entities/course.entity";

export interface CourseCardVm {
  id: string;
  name: string;
  teacherName: string;
  /** Pre-resolved semantic tone — RSC maps course.color (mock) -> one of
   *  the design-system role/status tones. No raw hex reaches the client. */
  tone: "primary" | "success" | "warning" | "purple" | "teal" | "error";
  lessonsDone: number;
  lessonsTotal: number;
  progressPct: number; // 0-100, pre-computed (done/total) -- client never divides
  gradeAvg: number | null; // null = "—"
  status: CourseStatus; // "not-started" | "in-progress" | "completed"
  /** RSC pre-computes the route -- client never concatenates strings. */
  href: string; // "/student/courses/{courseId}"
}

export interface StudentCoursesScreenVm {
  courses: CourseCardVm[];
  isLoading: boolean; // safety valve; primary loading = Suspense fallback (CoursesSkeleton)
  errorKey: "forbidden" | "unknown" | null;
}
```

Tab counts and per-tab filtering are derived client-side from `courses[].status`
(pure `Array.filter`) — no separate count field needed in the VM; `CourseTabs`
recomputes counts from the same list it's given (see 1.3), avoiding a second
source of truth that could drift from the actual filtered list length.

### 1.3 Sub-component prop contracts

```ts
// course-tabs.tsx — presentational, controlled (no internal state)
export type CourseTab = "all" | "in-progress" | "completed";

export interface CourseTabsProps {
  courses: CourseCardVm[]; // used only to compute per-tab counts, not rendered here
  activeTab: CourseTab;
  onTabChange: (tab: CourseTab) => void;
  labels: {
    all: string;
    inProgress: string;
    completed: string;
  };
}

// course-card.tsx — presentational, pure props
export interface CourseCardProps {
  course: CourseCardVm;
  labels: {
    gradeLabel: string;
    lessonsLabel: string;
    progressLabel: string;
    ctaStart: string;
    ctaContinue: string;
  };
}

// courses-empty.tsx — presentational, wraps shared/EmptyState
export interface CoursesEmptyProps {
  tab: CourseTab;
  title: string; // already-translated, per-tab copy chosen by the parent
}

// courses-skeleton.tsx — presentational, no props (fixed 6-card grid placeholder)
export type CoursesSkeletonProps = Record<string, never>;
```

**Label injection**: `StudentCoursesScreen` is the ONLY component in this
subtree that calls `useTranslations("courses")`; it builds the `labels`
objects once and passes them down. `CourseCard`/`CourseTabs`/`CoursesEmpty`
never import `next-intl` (per `vm-conventions.md` label-injection pattern —
keeps them unit-testable without i18n context and reusable if a 2nd screen
ever needs a bare course card).

### 1.4 Accessibility hooks

- `CourseTabs`: Radix `Tabs` gives `role="tablist"`/`role="tab"`/
  `aria-selected` for free — no manual ARIA needed. Count pill inside each
  `TabsTrigger` is decorative-adjacent to the label text, not a separate
  focusable element — render as a plain `<span aria-hidden="false">` (it IS
  meaningful — "3 courses" — so include it in the trigger's accessible name
  via visually-rendered text, not `aria-hidden`).
- `CourseCard`: entire card is NOT a nested-interactive-in-interactive trap —
  the mockup wraps the whole card in `onClick` AND has an inner CTA button
  with its own `onClick` + `stopPropagation`. Keep this: outer card is a
  `<Card>` wrapping an actual `<Link href={course.href}>` (not a `div
  onClick`, for keyboard operability without a synthetic tabIndex) that
  covers the clickable region minus the CTA button; CTA `Button` is a
  sibling `<Link>` styled as a button (or a real `<Button asChild>` wrapping
  `<Link>`) so screen readers/keyboard users get two clear, non-nested
  targets instead of a `div` faking a link. Concretely: card renders a
  visually-hidden "stretched-link" pattern — the title `<Link>` covers the
  card via `::after`/`inset-0` overlay (common a11y pattern for "whole card
  clickable + one nested real button"), OR simpler: make the whole card a
  `<Link>` and render the CTA as non-interactive text-with-icon inside it
  (since click-target and CTA-target are the same destination — the mockup's
  `stopPropagation` exists only because CTA and card have the *same*
  `onCourseSelect`, so there is no actual behavior divergence to preserve).
  **Recommend the simpler form**: single `<Link href={course.href}>`
  wrapping the whole card, CTA rendered as a styled `<span>` inside it (not
  a second interactive element) — avoids nested-interactive entirely. Flag
  this simplification to fe-nextjs-engineer explicitly since it diverges
  from the mockup's two-handler structure for a11y correctness.
- `CourseCard` hover-lift (AC-4): gate the `transform`/`shadow` transition
  class behind `motion-safe:` Tailwind variant (`motion-safe:hover:-translate-y-0.5
  motion-safe:hover:shadow-card-hover transition-shadow` — no transform at all
  under `prefers-reduced-motion: reduce`, per accessibility.md).
- `Progress` bars: `aria-label` per card (e.g. "Tiến độ 78%") — Radix
  `Progress` needs an explicit label since there's no visible `<label>`
  element pointing at it (same pattern as `exam-taking.tsx`'s
  `aria-valuetext`).

---

## 2. `LessonPlayer`

### 2.1 Component tree

```
app/.../student/courses/[courseId]/page.tsx                 [RSC — container]
  actions.ts ('use server': markLessonCompleteAction, saveNoteAction, askQuestionAction)
  └─ LessonPlayer                                             ['use client', container: owns activeLessonId, collapsed-chapters, active tab]
       ├─ PlayerBreadcrumb                                     [presentational]
       ├─ (2-col grid, left 60% / right 40%)
       │
       ├─ LEFT: LessonContentPane                              [presentational shell]
       │    ├─ LessonHeader (chapter label + lesson title)      [presentational]
       │    ├─ LessonBody (discriminated union on lesson.type)  [presentational, pure props]
       │    │    ├─ VideoPlayer   (type: "video")                [presentational + LOCAL client state: play/paused, seekPct]
       │    │    ├─ PdfPreview    (type: "pdf")                  [presentational, pure props]
       │    │    └─ TextContent   (type: "text")                 [presentational, pure props]
       │    ├─ MarkCompleteButton                                [presentational, controlled]
       │    └─ LessonTabs (ui/Tabs variant="line")                [presentational shell, controlled active tab]
       │         ├─ NotesPanel (tab: notes)                       [presentational + controlled textarea value]
       │         └─ QnaPanel   (tab: qna)                         [presentational + controlled question-draft input]
       │
       └─ RIGHT: aside
            ├─ ProgressCard                                      [presentational, pure props]
            └─ ChapterList                                       [presentational, LOCAL state: per-chapter collapsed map]
                 └─ ChapterSection × N
                      └─ LessonListItem × M                       [presentational, pure props]
```

- **Container** = `page.tsx` (RSC): `makeGetCourseLessonsUseCase(courseId)` →
  maps to `LessonPlayerVm` (chapters + lessons + progress, pre-resolved
  `activeLessonId` = mockup's `active`/first-incomplete logic, computed
  **server-side** so client never guesses the initial lesson). `actions.ts`
  exports the three Server Actions; `page.tsx` passes them as props into
  `LessonPlayer` (never imported by presentation directly).
- **`LessonPlayer`** (`'use client'`) — the state container for this screen:
  - `activeLessonId: string` (`useState`, initialized from VM's
    `initialActiveLessonId`) — controls which lesson's content + chapter-item
    highlight is shown. Optimistic `done` mutation touches this same
    component's derived data (see §4 hand-off to fe-state-engineer).
  - `activeTab: "notes" | "qna"` (`useState`, local UI state).
  - Passes `markLessonCompleteAction`, `saveNoteAction`, `askQuestionAction`
    straight through as props to `MarkCompleteButton`, `NotesPanel`,
    `QnaPanel` respectively — `LessonPlayer` itself does not need to call
    them directly unless it needs the optimistic-update callback wiring,
    which `fe-state-engineer` will decide (TanStack mutation `onMutate`
    hooks likely live in a `use-*` hook `LessonPlayer` calls, not in the
    presentational leaves).
- **`ChapterList`** owns its OWN local state: `collapsed: Record<chapterId,
  boolean>` (`useState`, matches plan.md's decision — not URL state). It does
  NOT own `activeLessonId` — that's lifted to `LessonPlayer` so the content
  pane and the chapter list both react to the same source of truth (classic
  "lift state up" — sibling components need the same value).
- **`VideoPlayer`** owns its OWN local state: `isPlaying: boolean`,
  `seekPct: number` (0-100) — per fe-lead's decision, faux-chrome with
  keyboard handlers, no real `<video>` element. This is genuinely
  component-local ephemeral UI state (not server data), so per
  `vm-conventions.md`'s "no `.i-vm.ts` for pure client-state leaf" rule, it
  gets a plain `VideoPlayerProps` type, not a VM entry (the lesson
  metadata it displays — title, duration — DOES come via props from the VM,
  but play/pause/seek position is pure client state).

### 2.2 `lesson-player.i-vm.ts`

```ts
import type { LessonType } from "@/features/lms/domain/entities/lesson.entity";

export interface LessonListItemVm {
  id: string;
  order: number; // "Bài {n}"
  title: string;
  type: LessonType; // "video" | "pdf" | "text"
  durationLabel: string; // pre-formatted ("32 phút" / "12 trang") -- client never branches on type to format
  done: boolean;
}

export interface ChapterVm {
  id: string;
  title: string;
  lessons: LessonListItemVm[];
  isEmpty: boolean; // teacher hasn't uploaded content for this chapter
}

/** Discriminated union — LessonBody switches on `type`, each variant carries
 *  only the fields its leaf component needs (no leaf receives fields it
 *  ignores from a different type). */
export type ActiveLessonVm =
  | {
      type: "video";
      id: string;
      title: string;
      chapterTitle: string | null;
      durationLabel: string;
      done: boolean;
    }
  | {
      type: "pdf";
      id: string;
      title: string;
      chapterTitle: string | null;
      durationLabel: string; // page count label
      done: boolean;
      downloadHref: string; // pre-resolved download URL
    }
  | {
      type: "text";
      id: string;
      title: string;
      chapterTitle: string | null;
      done: boolean;
      /** Pre-sanitized HTML-safe content blocks -- NOT raw HTML string
       *  (no dangerouslySetInnerHTML per security rule). Structured as
       *  heading/paragraph blocks the TextContent leaf maps to <h3>/<p>. */
      blocks: Array<{ heading: string; paragraphs: string[] }>;
    }
  | null; // no lesson selected / course has no content yet

export interface LessonPlayerVm {
  courseId: string;
  courseName: string;
  coursesListHref: string; // breadcrumb "back" link, pre-resolved
  chapters: ChapterVm[];
  initialActiveLessonId: string | null; // server-picked: active flag -> first incomplete -> first lesson -> null
  lessonsDone: number;
  lessonsTotal: number;
  progressPct: number;
  isLoading: boolean;
  errorKey: "not-found" | "forbidden" | "unknown" | null;
}

/** Server Action refs -- passed as props, never imported by presentation. */
export interface LessonPlayerActions {
  markLessonComplete: (lessonId: string) => Promise<MarkCompleteResult>;
  saveNote: (lessonId: string, content: string) => Promise<SaveNoteResult>;
  askQuestion: (lessonId: string, question: string) => Promise<AskQuestionResult>;
}

export interface MarkCompleteResult {
  ok: boolean;
  errorKey?: "not-found" | "forbidden" | "unknown";
}

export interface SaveNoteResult {
  ok: boolean;
  errorKey?: "forbidden" | "unknown";
}

export interface AskQuestionResult {
  ok: boolean;
  errorKey?: "forbidden" | "unknown";
  question?: { id: string; question: string; askedAt: string }; // echoed back for optimistic reconciliation
}
```

Notes on the VM:
- `ActiveLessonVm` is derived by the RSC from `chapters` + `initialActiveLessonId`
  for the FIRST paint; once the user clicks a different `LessonListItem`
  client-side, `LessonPlayer` re-derives the active lesson's `ActiveLessonVm`
  shape from its already-fetched `chapters` data (all lesson content is in
  the initial payload per the mock's `COURSE_LESSONS` shape — no per-lesson
  fetch). If the real `lms` service later requires a per-lesson content
  fetch (e.g. large video manifests), that's a TanStack Query addition
  `fe-state-engineer` should flag, not a VM change.
- `LessonListItemVm.durationLabel` and `ActiveLessonVm`'s duration/page-count
  are pre-formatted strings from the mapper — client does not know `type`
  determines whether "phút" or "trang" applies (avoids leaking that
  i18n-adjacent formatting decision into presentation branching beyond the
  type-switch itself).

### 2.3 Sub-component prop contracts

```ts
// player-breadcrumb.tsx
export interface PlayerBreadcrumbProps {
  courseName: string;
  courseHref: string;
  lessonName: string; // current lesson title, or a "pick a lesson" placeholder
  backLabel: string;
}

// chapter-list.tsx
export interface ChapterListProps {
  chapters: ChapterVm[];
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onNext?: () => void; // "Tiếp theo" footer button -- only rendered when a next lesson exists
  labels: {
    navAriaLabel: string; // e.g. "Danh sách bài học"
    emptyChapter: string;
    emptyCourse: string;
    nextButton: string;
    doneStateLabel: string; // for building each item's accessible state text
    activeStateLabel: string;
  };
}

// chapter-section.tsx (ChapterList's per-chapter child -- feature-local, not separately exported)
export interface ChapterSectionProps {
  chapter: ChapterVm;
  isCollapsed: boolean;
  onToggle: () => void;
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  labels: Pick<ChapterListProps["labels"], "emptyChapter" | "doneStateLabel" | "activeStateLabel">;
}

// lesson-body.tsx -- the discriminated-union switch itself
export interface LessonBodyProps {
  lesson: ActiveLessonVm; // null -> renders the "no content" EmptyState variant
  emptyLabels: { title: string; body: string };
}

// video-player.tsx
export interface VideoPlayerProps {
  title: string;
  durationLabel: string;
  labels: {
    playAriaLabel: string;
    pauseAriaLabel: string;
    seekAriaLabel: string;
    fullscreenAriaLabel: string;
    lectureLabel: string;
  };
}
// Internal state (NOT props): isPlaying, seekPct -- component-local useState.

// pdf-preview.tsx
export interface PdfPreviewProps {
  title: string;
  pageCountLabel: string;
  downloadHref: string;
  labels: { downloadButton: string; downloadAriaLabel: string };
}

// text-content.tsx
export interface TextContentProps {
  blocks: Array<{ heading: string; paragraphs: string[] }>;
}

// mark-complete-button.tsx
export interface MarkCompleteButtonProps {
  lessonId: string;
  done: boolean;
  onMarkComplete: (lessonId: string) => void; // LessonPlayer wires this to the optimistic mutation, not directly to the Server Action
  labels: { button: string; doneLabel: string };
}

// lesson-tabs.tsx
export interface LessonTabsProps {
  activeTab: "notes" | "qna";
  onTabChange: (tab: "notes" | "qna") => void;
  labels: { notes: string; qna: string };
  children: React.ReactNode; // slot -- NotesPanel / QnaPanel rendered by parent per active tab (compound-component style, see §5)
}

// notes-panel.tsx
export interface NotesPanelProps {
  lessonId: string;
  initialValue: string; // from VM if notes are repository-backed (plan.md §2.4 open question)
  onSave: (lessonId: string, content: string) => void;
  labels: { placeholder: string; saveButton: string; savedToast: string };
}

// qna-panel.tsx
export interface QnaPanelProps {
  lessonId: string;
  questions: Array<{ id: string; question: string; answer: string | null; askedAtLabel: string }>;
  onAsk: (lessonId: string, question: string) => void;
  labels: { emptyState: string; askButton: string; inputPlaceholder: string; submitButton: string };
}

// progress-card.tsx
export interface ProgressCardProps {
  done: number;
  total: number;
  pct: number;
  isComplete: boolean; // pct >= 100 -> success tone per design-system score rule
  label: string; // "Tiến độ"
  countLabel: string; // "{done}/{total} bài · {pct}%" pre-formatted
}
```

### 2.4 Server Action wiring

`page.tsx` (RSC) imports `markLessonCompleteAction`, `saveNoteAction`,
`askQuestionAction` from its colocated `actions.ts` and passes them as a
single `actions: LessonPlayerActions` prop into `<LessonPlayer actions={...}
lessonPlayerVm={...} />`. `LessonPlayer`:

- Passes `actions.markLessonComplete` down to `MarkCompleteButton` (wrapped
  in whatever optimistic-mutation hook `fe-state-engineer` designs — the
  presentational button only ever sees a plain callback, never the raw
  Server Action or a TanStack mutation object).
- Passes `actions.saveNote` down to `NotesPanel`.
- Passes `actions.askQuestion` down to `QnaPanel`.
- `LessonPlayer` itself never calls `bootstrap/di` or imports
  `infrastructure/` — only receives these three functions as props, per the
  layer table (`presentation/` never imports `bootstrap/di`).

### 2.5 Accessibility hooks

- **`ChapterList`** root renders `<nav aria-label={labels.navAriaLabel}>`
  (AC-14 literal requirement) wrapping the chapter sections — NOT
  `role="navigation"` as a bolt-on div, use the actual `<nav>` element (more
  robust semantics, same outcome).
- Each `ChapterSection` header is a real `<button aria-expanded={!isCollapsed}
  aria-controls={lessonListId}>` toggling a `<ul id={lessonListId}>` of
  `LessonListItem`s — native disclosure pattern (matches the "no accordion
  primitive" reuse decision above).
- Each `LessonListItem` (rendered as `<li><button>` or `<li><a>` — since
  clicking swaps in-page content rather than navigating to a new URL, a
  `<button>` is the correct semantic, not a link) gets:
  - `aria-current="page"` when `lesson.id === activeLessonId` (AC-14 literal
    requirement — note "page" is the conventional value React/ARIA authors
    use for "current item in a set", even though it's not a document
    navigation; alternative `aria-current="true"` also acceptable, but
    `"page"` matches the existing `Sidebar` precedent at
    `sidebar.tsx:133`, reuse the same value for consistency).
  - An accessible name that includes the done/active state, not just the
    visual checkmark: `aria-label={\`${lesson.title} — ${lesson.done ?
    labels.doneStateLabel : lesson.id === activeLessonId ?
    labels.activeStateLabel : ''}\`}` (icon-only checkmark has no text
    otherwise — checkmark icon must carry `aria-hidden="true"` and the state
    conveyed via this label instead, satisfying "status not conveyed by
    color alone").
  - The lesson-type icon (video/pdf/text) next to duration is `aria-hidden="true"`
    with the type conveyed via the adjacent visible text label (mockup already
    shows a text label "Video"/"PDF"/"Văn bản" next to the icon — keep that,
    it's what makes the icon safe to hide from AT).
- **`VideoPlayer`** faux-chrome:
  - Play/pause toggle is a real `<button>` with `aria-label` that FLIPS
    between `labels.playAriaLabel` / `labels.pauseAriaLabel` based on
    `isPlaying` (not a static label).
  - Keyboard: the player's outer container is `tabIndex={0}` with
    `role="group"` and `aria-label={labels.lectureLabel}` (or the button
    itself owns focus — recommend the whole faux-player region receives
    `onKeyDown` for Space/Left/Right so keyboard users don't have to tab
    specifically onto a tiny seek bar; Space toggles play/pause **only when
    the play button itself is focused** to avoid hijacking Space from
    scrolling the page when focus is elsewhere — scope the keydown handler
    to the play button element, not `window`).
  - A visually-hidden `<span aria-live="polite" className="sr-only">` inside
    the player announces state changes ("Đang phát" / "Đã tạm dừng") when
    play/pause is toggled via keyboard or click — satisfies the story
    brief's ask for a live description of playback state changes.
  - Seek bar: since there's no real scrubbing target (faux-chrome, no real
    media), render it as `role="slider" aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={seekPct} aria-label={labels.seekAriaLabel}` on the filled
    track element, with Left/Right arrow handlers decrementing/incrementing
    `seekPct` by a fixed step (e.g. 5) — gives keyboard users a standards-
    correct target even though the underlying "seek" is cosmetic.
- **`PdfPreview`** download button: real `<a href={downloadHref} download>`
  wrapped in `Button asChild`, `aria-label={labels.downloadAriaLabel}` (icon
  `paperclip`/`download` is `aria-hidden`).
- **`MarkCompleteButton`**: `disabled` + `aria-disabled="true"` when
  `done === true` (per the `component-placement.md` memory's established
  "disabled action + Tooltip" pattern IF product wants a hover explanation;
  otherwise a plain disabled button with `doneLabel` swapped in as the
  visible text is sufficient here since the AC doesn't ask for a tooltip).
- **`LessonTabs`**: reuse `ui/Tabs` — same free ARIA as course tabs (no
  custom work).
- Course-card hover-lift AC-4 motion-safe gating — see §1.4 (applies here
  too if `CourseCard` markup is touched, N/A for player screen itself).

---

## 3. Responsive behavior (AC-15, < 768px)

Mechanism: **CSS-only via Tailwind responsive classes**, not a JS
breakpoint hook or a client-side `matchMedia` toggle:

- The 2-col grid container uses `grid grid-cols-1 lg:grid-cols-[3fr_2fr]`
  (or the repo's existing responsive-grid convention — check
  `exam-taking.tsx`'s `flex-col lg:flex-row` for the exact breakpoint token
  already in use, `lg:` = 1024px in this repo's Tailwind config, which is
  ABOVE the story's 768px cutoff — **use `md:` instead of `lg:` here** since
  AC-15 explicitly says "< 768px", and Tailwind's default `md:` breakpoint is
  768px; flag this breakpoint choice explicitly to fe-nextjs-engineer since
  the exam-taking precedent uses `lg:` for a different cutoff).
- On mobile (`< md:`), the right `<aside>` (ProgressCard + ChapterList)
  renders BELOW the content pane in DOM order already (content pane is
  listed first in the JSX tree in §2.1) — no reordering needed, just stack
  via `grid-cols-1`.
- **Accordion toggle for the whole ChapterList on mobile**: rather than a
  separate mobile-only component, `ChapterList`'s outer wrapper gets an
  ADDITIONAL collapse toggle that only renders `md:hidden` — a `<button>`
  labeled "Danh sách bài học" (with a chevron) that toggles a `showOnMobile`
  local boolean (default `false` — collapsed on mobile per AC-15 "ẩn"
  option), wrapping the existing `<nav>` content. On `md:` and up, this
  mobile toggle button is hidden (`hidden md:block` on the nav content
  itself, `md:hidden` on the toggle button) so desktop always shows the
  full list. This keeps `ChapterList` a single component with a responsive
  affordance rather than forking a `MobileChapterList` — avoids the
  duplication `component-organization.md` warns against.
- No new component needed for this — it's a `useState` + Tailwind
  responsive-class combination inside the existing `ChapterList`.

---

## 4. State ownership summary (contract-level; hand off to fe-state-engineer)

| State | Owner | Kind |
| --- | --- | --- |
| `activeTab` (courses list: all/in-progress/completed) | `StudentCoursesScreen` | local `useState`, not URL |
| `courses[]` | RSC → VM prop | server data (TanStack Query hydration — fe-state-engineer to confirm key `["lms","courses"]`) |
| `activeLessonId` | `LessonPlayer` | local `useState`, initialized from VM's `initialActiveLessonId` |
| `collapsed` (per-chapter) | `ChapterList` | local `useState<Record<string,boolean>>`, NOT lifted, NOT URL |
| `showOnMobile` (mobile chapter-list toggle) | `ChapterList` | local `useState`, default `false` |
| `activeTab` (notes/qna) | `LessonPlayer` | local `useState` |
| `isPlaying`, `seekPct` | `VideoPlayer` | local `useState`, pure client UI state, never leaves the component |
| lesson `done` flags, course progress recompute | `LessonPlayer` (via a query-cache mutation hook — **fe-state-engineer to design**) | optimistic server-state mutation (AC-11); must also touch the courses-list query cache per plan.md §8 |
| note draft value | `NotesPanel` | controlled input, initial value from VM/query; save triggers `onSave` prop |
| question draft value | `QnaPanel` | controlled input; submit triggers `onAsk` prop, optimistic prepend per AC-13 |

**Hand-off note to fe-state-engineer**: the two open items in plan.md §11
that affect this contract are (a) whether Notes/Q&A go through TanStack
Query keys (`["lms","lesson",lessonId,"note"|"questions"]`) or stay pure
local state — the props above (`initialValue`/`questions` as props +
`onSave`/`onAsk` callbacks) work identically either way, so no VM change is
needed regardless of that decision; (b) the optimistic mark-complete flow
needs to update BOTH `["lms","course",courseId,"lessons"]` (this screen) AND
`["lms","courses",{status}]` (list screen's cached progress) — confirm
whether that's a manual `setQueryData` on both keys or a broader invalidate.

---

## 5. Composition & variant strategy

- **Tabs**: one primitive (`ui/Tabs`), two variants (`default` for course-list
  pills, `line` for player Notes/Q&A) — see §0 table. No new component.
- **`LessonBody`**: discriminated-union `switch (lesson.type)` render
  function (not a compound/slot pattern — the three variants are mutually
  exclusive, never composed together, so a simple switch is the right
  amount of abstraction; no `asChild`/`Slot` needed here).
- **`LessonTabs`**: modeled as a light compound-ish wrapper — `LessonPlayer`
  decides which panel (`NotesPanel` vs `QnaPanel`) to render as `children`
  based on `activeTab`, rather than `LessonTabs` importing both panels
  itself. Keeps `LessonTabs` reusable as a pure tab-strip shell if a future
  screen needs the same look with different tab content (extension point,
  not over-abstracted since there's no 3rd consumer yet — just avoids
  hard-coding Notes/Q&A into the tab-shell component).
- **`ChapterList`**: NOT a compound-component API (`<ChapterList.Item>` etc.)
  — a single component taking a `chapters: ChapterVm[]` array is sufficient
  (no evidence of a 2nd consumer needing to inject custom chapter-row
  markup); keep it simple per "no over-abstraction until 3+ instances".
- **`CourseCard`**: no variant prop needed yet (only one visual treatment
  across all 3 tabs) — if principal/parent course-list screens ever reuse
  this card with a different CTA set, add a `variant` prop then, don't
  pre-build it now.
- **Design-system reuse restated**: `StatusBadge` tones, `Card`, `Progress`,
  `Tabs`, `EmptyState`, `Skeleton`, `Button`, `Textarea` are ALL reused
  as-is; zero new tokens anticipated (flag below is the one exception to
  confirm).

---

## 6. Flags for fe-lead / design-system

1. **Course accent color mapping** — mockup assigns each course a raw hex
   (`T.primary`, `T.success`, `T.warning`, `T.purple`, `T.teal`, `T.error`)
   used for the card top-strip, progress bar fill, and CTA border/bg. These
   map 1:1 to existing tokens (`--edu-primary`, `--edu-success`,
   `--edu-warning`, `--edu-purple`, `--edu-teal`, `--edu-error` are all
   already in `tokens.css` per design-system.md's palette section) — **no
   new token needed**, but the VM's `CourseCardVm.tone` field must be
   populated by a **mapper-side** color→tone lookup (mock fixture assigns
   `color: T.xxx` per course; the mapper translates that to the semantic
   tone name) so the client only ever sees a token name, never a hex.
   fe-nextjs-engineer: build this lookup in `lms.mapper.ts`.
2. **Video faux-chrome dark background** (`#0f1117` in the mockup) — check
   `tokens.css` for an existing dark-surface token before hardcoding. If
   none exists, this needs a token addition + ADR (≥ 0023) per the "no raw
   color" hard rule — flagging per the plan's own §11 risk note. Recommend
   checking whether `--edu-role-*` or an existing `--card`-dark-mode
   equivalent already covers this before minting anything new.
3. **Breakpoint choice for AC-15** — recommend Tailwind `md:` (768px) over
   the `lg:` (1024px) used in `exam-taking.tsx`'s left/right stacking,
   since AC-15 explicitly says "< 768px". Confirm with fe-lead this isn't
   meant to align with the `lg:` precedent instead.
4. **Notes/Q&A persistence** — plan.md's open question (repository-backed vs
   pure local state) does not block this component design (props/callbacks
   are identical either way) but fe-state-engineer should close it before
   implementation.
