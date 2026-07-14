# US-E11.7 Plan — Student Assignments (list, submit sheet, overdue confirm, graded feedback)

## 1. Summary

Additive net-new **presentation slice** (`student-assignments/`) inside the
already-implemented `src/features/lms/` Clean Architecture module — same
module US-E11.6 (student-courses/lesson-player) lives in. No new feature
folder, no `docs/product/design-spec.jsonc` gap (unlike US-E11.6): the entry
already exists at `screens.lms.assignments` (~line 1212), sourced from
`design_src/edu/assignments.jsx` (`StudentAssignmentsScreen`). 100% mock-first
(decision `0014`) — `lms` has no real service (`services/lms` doesn't exist in
edu-api). Route `t/[tenant]/(app)/student/assignments`, student-only.

**Key decisions**

- Extend `ILmsRepository`/`MockLmsRepository`/`lms.fixtures.ts` — do NOT fork a
  parallel mock stack. New `AssignmentEntity`, new
  `src/features/lms/domain/failures/assignment.failure.ts` (separate file from
  `lms.failure.ts` — different error surface, no reuse forcing per decision
  `0026`'s "real duplication only" bar; `LmsFailure` has no `already-submitted`/
  `file-too-large` members and no reason to grow them).
- "Lưu nháp" (save draft) is **presentation-local only** — a small hook
  wrapping `localStorage` keyed by `assignmentId`, NOT a repository method, NOT
  a Server Action. Confirmed 3x in the packet (spec.md, integration.md,
  story.md) — do not re-litigate at implementation time.
- Reuse `StatusBadge` (`src/components/shared/status-badge/`) for every badge
  (days-left / overdue / submitted / graded / score chip) via its existing
  `tone` prop — no new badge component. Reuse the existing score-color
  convention (`≥8 success, <5 error, else text-primary`) — currently lives
  inline in `exam-result.tsx`/`calculate-score.ts`; write a small pure
  `scoreTone(score, max)` helper local to this slice (same treatment as
  `lms/presentation/tone.ts`) rather than promoting `exam`'s helper cross-
  feature (YAGNI — one extra 6-line pure fn is cheaper than a cross-feature
  coupling for a 2-feature reuse; revisit if a 3rd screen needs it).
- Reuse `Sheet`/`Dialog` primitives already installed (`bun ui:add` already
  run — `src/components/ui/sheet/`, `src/components/ui/dialog/`,
  `src/components/ui/alert-dialog/` all exist). **No `bun ui:add` needed.**
  Submit sheet + graded sheet → `Sheet` (side panel, matches
  `design-spec.jsonc` `submitSheet.shell` "side sheet"); overdue-confirm →
  `AlertDialog` (destructive-confirm shape: title + body + Cancel/Confirm,
  matches `components/shared/destructive-confirm-dialog` precedent pattern
  even though we don't reuse that literal component, since its copy/actions
  are domain-specific here).
- **Naming correction vs this packet's Design Notes/spec.md wording**:
  `EduSkeleton`/`EduEmpty`/`EduError` do **not exist** as named components
  anywhere in the repo (`grep` confirmed zero hits) — these are descriptive
  placeholders in the BA packet, not real imports. Actual repo convention
  (confirmed via `student-courses-screen.tsx` + `courses-skeleton.tsx` +
  `courses-empty.tsx`):
  - **Loading** → a feature-local `assignments-skeleton.tsx` (4 stacked card-
    shaped `Skeleton` blocks — mirrors `courses-skeleton.tsx`).
  - **Empty** → reuse the existing shared `EmptyState`
    (`src/components/shared/empty-state/`) — NOT a new component, just pass
    per-tab title.
  - **Error** → inline pattern already used in `student-courses-screen.tsx`:
    `<p role="alert" className="text-edu-error-text text-sm">` + a "Thử lại"
    button (this screen additionally needs an explicit retry action per FR-009,
    `courses` screen didn't need one — add a small `assignments-error.tsx` or
    inline JSX with a retry `Button`, engineer's call, no new shared component
    needed for one screen).
  This is a content-fix note, not a blocker — flag to `fe-lead` so nobody goes
  looking for nonexistent `EduSkeleton` imports.

## 2. Grep results (decision 0026 reuse check)

- `src/features/lms/` already has `ILmsRepository`, `MockLmsRepository`,
  `lms.fixtures.ts`, DI factories in `bootstrap/di/lms.di.ts`, endpoints in
  `bootstrap/endpoint/lms.endpoint.ts` — all extended, not forked.
- `StatusBadge` (`components/shared/status-badge/`) — reused for every badge.
- `EmptyState` (`components/shared/empty-state/`) — reused for the empty
  state (4 per-tab titles via prop).
- `Sheet`/`Dialog`/`AlertDialog` (`components/ui/`) — already installed, no
  `bun ui:add` needed.
- No existing `AssignmentEntity`/assignment-shaped type anywhere in the repo —
  genuinely new domain concept, matches `lesson-bank`'s `LessonEntity` being
  a different bounded concept (per US-E11.6 §2.2 precedent reasoning).
- `exam/domain/calculate-score.ts` has a scoring helper but for a different
  entity shape (exam attempts) — reimplement a tiny local `scoreTone` pure fn
  in the assignments slice rather than importing cross-feature (see §1).

## 3. File layout

```
src/features/lms/
  domain/
    entities/
      assignment.entity.ts        # AssignmentEntity, AssignmentStatus ("pending"|"submitted"|"graded")
                                   # AssignmentStatusFilter ("all"|"pending"|"submitted"|"graded")
    failures/
      assignment.failure.ts       # NEW — "network-error"|"not-found"|"forbidden"|
                                   #   "already-submitted"|"file-too-large"|"unknown"
    repositories/
      i-lms.repository.ts         # EXTEND — + listAssignments, submitAssignment
    use-cases/
      list-assignments.use-case.ts
      submit-assignment.use-case.ts
      derive-overdue.ts            # pure fn: (status, dueDate, now) -> boolean
      __tests__/
        list-assignments.use-case.test.ts
        submit-assignment.use-case.test.ts
        derive-overdue.test.ts
  infrastructure/
    dtos/
      assignment-response.dto.ts   # AssignmentDto (raw wire shape, camelCase)
    mappers/
      lms.mapper.ts                 # EXTEND — mapAssignment(dto) -> AssignmentEntity
      __tests__/lms.mapper.test.ts  # EXTEND
    repositories/
      lms.repository.ts             # EXTEND — real-impl stubs for the 2 new methods
                                     #   (never exercised while USE_MOCK=true, matches
                                     #   existing stub treatment for listCourses etc.)
      mocks/
        lms.fixtures.ts              # EXTEND — + ASSIGNMENTS_DTO (6 seeds)
        lms.mock.repository.ts       # EXTEND — + assignments MockStore array,
                                      #   resetLmsMockStore() reseed, listAssignments,
                                      #   submitAssignment
        __tests__/lms.mock.repository.test.ts  # EXTEND
  presentation/
    student-assignments/
      student-assignments-screen.i-vm.ts
      student-assignments-screen.tsx      # 'use client' — tabs + list + sheet/dialog orchestration
      assignment-tabs.tsx                  # role=tablist, arrow-key nav
      assignment-card.tsx                  # icon box, title, meta, due line, badge(s), CTA
      assignment-badge.ts                  # pure: (status, dueDate, now) -> { toneKey, labelKey, icon }
      score-tone.ts                        # pure: (score, max) -> StatusTone
      assignments-skeleton.tsx             # 4-row skeleton (mirrors courses-skeleton.tsx)
      assignments-error.tsx                # inline role=alert + "Thử lại" retry button
      submit-sheet.tsx                     # edit + read-only submitted variant (same shell)
      overdue-confirm-dialog.tsx           # AlertDialog wrapper
      graded-sheet.tsx                     # read-only score/comment/file/timestamps
      use-assignment-draft.ts              # localStorage-backed draft hook (NOT a repo call)
      __tests__/
        assignment-badge.test.ts
        derive-overdue.test.ts (if not colocated in domain — prefer domain per §3 above)
      student-assignments-screen.stories.tsx
      submit-sheet.stories.tsx
      graded-sheet.stories.tsx
```

## 4. Domain layer

```ts
// assignment.entity.ts
export type AssignmentStatus = "pending" | "submitted" | "graded";
export type AssignmentStatusFilter = "all" | AssignmentStatus;

export interface AssignmentEntity {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  teacherName: string;
  courseColor: string; // hex from mock DTO; mapper resolves -> CourseTone via existing color->tone lookup (lms.mapper.ts already has this for courses)
  dueDate: string; // ISO
  status: AssignmentStatus;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  maxScore: number | null;
  teacherComment: string | null; // "" is a valid graded value (empty-comment fallback), null = not graded yet
  gradedFileName: string | null;
}
```

`derive-overdue.ts`: pure `isOverdue(status, dueDate, now)` — `status ===
"pending" && new Date(dueDate) < now`. Used identically by (a) card badge
render, (b) overdue-confirm-dialog gate at submit-click time (recomputed, not
cached from sheet-open — AC-1176.6). Single source of truth so both call
sites can't drift.

`AssignmentFailure` (new file, mirrors `lms.failure.ts` structure):

```ts
export type AssignmentFailure =
  | { type: "network-error" }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "already-submitted" }
  | { type: "file-too-large" }
  | { type: "unknown" };
```

`list-assignments.use-case.ts` — thin pass-through (mirrors
`list-courses.use-case.ts`): `execute(studentId, statusFilter?)` calls
`repo.listAssignments`, maps thrown `Error(code)` → `AssignmentFailure` via a
small `errorCodeOf`-style switch (network-error/unknown only reachable from
this call per integration.md).

`submit-assignment.use-case.ts` — `execute(assignmentId, input)` calls
`repo.submitAssignment`, maps all 5 failure codes
(network-error/not-found/forbidden/already-submitted/unknown) —
`file-too-large` is validated client-side in the sheet BEFORE this use-case is
ever invoked (integration.md INT-117-02: "never round-trips"), so the use-case
itself only needs to map the other 5, but the union type still carries
`file-too-large` for the sheet-local validation branch to construct directly
(no repo/use-case round trip for that one).

## 5. Infrastructure layer

- `AssignmentDto` (`assignment-response.dto.ts`) — camelCase, 1:1 with
  `integration.md` §2 field list.
- `lms.mapper.ts` extended with `mapAssignment(dto): AssignmentEntity` —
  reuses the existing hex→`CourseTone` resolution already present for
  `mapCourseSummary`/`mapCourseHeader` (grep that function, reuse it for
  `courseColor`, don't reimplement).
- `lms.fixtures.ts` extended with `ASSIGNMENTS_DTO: AssignmentDto[]` — 6 seeds
  per spec.md §4 (pending-non-overdue, pending-overdue, submitted,
  graded-with-comment, graded-empty-comment `teacherComment: ""`,
  graded-with-file `gradedFileName` set).
- `lms.mock.repository.ts`:
  - `MockStore.assignments: AssignmentEntity[]` (entity-shaped in the store,
    same treatment as `summaries`/`lessons` — mapped once at seed time).
  - `seedStore()` extended: `assignments: ASSIGNMENTS_DTO.map(mapAssignment)`.
  - `resetLmsMockStore()` — no code change needed (already reseeds the whole
    store object); just confirm the new field is included (it will be, since
    `seedStore()` is the single reseed path).
  - `listAssignments(studentId, statusFilter?)`: `mockDelay(200)`, filter
    `store.assignments` by `statusFilter` if given (client-parity — filtering
    happens here so a future real endpoint's `statusFilter` query param has an
    identical mock behavior to test against, per integration.md's own
    modeling choice).
  - `submitAssignment(assignmentId, input)`: `mockDelay(250)`; find by id →
    throw `not-found` if missing; throw `forbidden` if... (no real
    student-scoping enforced in mock beyond "only ever returns this student's
    seeded set" — forbidden is defense-in-depth per integration.md, so the
    mock can throw it only via an explicit unreachable/id-not-in-set path,
    same as `not-found` essentially — don't over-engineer a fake forbidden
    trigger; document in the use-case test with a direct unit test on the
    failure mapping instead of trying to force it through the repo); throw
    `already-submitted` if `status !== "pending"`; mutate to
    `status: "submitted", submittedAt: now`; return updated entity. Add a
    TEST-ONLY error-injection path if `network-error`/`unknown` need to be
    forced for Storybook/unit coverage — mirror how other mock repos in this
    repo expose deterministic failure injection (grep an existing example,
    e.g. `exam`'s mock repo, before inventing a new pattern).

## 6. Presentation layer

- `student-assignments-screen.tsx` — 'use client', receives `assignments`
  (full initial list, RSC-seeded) + `errorKey` via VM, same
  `useQuery({ initialData })` hydration pattern as `student-courses-screen.tsx`
  (`coursesListKey` → `assignmentsListKey = () => ["lms", "assignments", "list"]`).
  Client-side tab filter via `useMemo`, matching `student-courses-screen.tsx`
  exactly (per FR-001 AC-1171.9's "independent loading→state cycle per tab" —
  since the mock returns the full list in one RSC fetch, "independent cycle"
  in practice means: filter is client-side and instantaneous, no visible
  loading flicker per tab after the first RSC load — confirm this reading
  with `fe-lead`/`fe-state-engineer` if AC-1171.9's wording implies a REAL
  per-tab refetch, which would need `useQuery({ queryKey: [...,'list',tab] })`
  per tab instead. Flagged in §9.
- `assignment-tabs.tsx` — `role="tablist"`, 4 `role="tab"` buttons,
  `aria-selected`, roving-tabindex arrow-key nav (mirror any existing
  `role="tablist"` implementation in the repo if one exists — grep
  `role="tablist"` before writing from scratch; else implement per WCAG APG
  tablist pattern directly, same scope as `course-tabs.tsx` but that one may
  be a simpler button-row without full tablist semantics — verify and upgrade
  if needed, since this story's AC explicitly requires the full pattern
  (AC-1171.10) while `courses` may not have needed it).
- `assignment-card.tsx` — icon box (courseColor/18 bg per design-spec), title
  row, meta line, due line, `assignment-badge.ts` output rendered via
  `StatusBadge`, CTA button routed by status (opens `submit-sheet` or
  `graded-sheet` via parent-owned open state).
- `assignment-badge.ts` — pure fn combining `derive-overdue` (domain) +
  days-left math + the design-system's fixed color mapping (≤1d error, ≤3d
  warning, >3d success; submitted primary; graded success; overdue error) →
  returns `{ tone: StatusTone; labelKey: string; icon: LucideIcon }` so the
  card component stays a dumb renderer (unit-testable without React).
- `submit-sheet.tsx` — `Sheet` wrapping edit/read-only variants (prop
  `mode: "edit" | "readonly"`), mock file-picker (hidden `<input type=file>` +
  filename chip + remove, 20MB client check before enabling submit), optional
  textarea, footer Lưu nháp/Nộp bài, submitting sub-state (spinner +
  `aria-busy`, motion-safe-gated per `.claude/rules/accessibility.md`).
  Owns local mutation state via `useMutation` (submit) — TanStack Query,
  invalidates `assignmentsListKey()` + optimistically flips the card via
  `setQueryData` on success (mirrors `markLessonComplete`'s optimistic pattern
  from US-E11.6, but here the story doesn't require true optimism —
  "Đang nộp bài…" pending sub-state is explicitly required, so this is a
  REGULAR (non-optimistic) mutation with a visible pending state, not an
  optimistic one — do not copy the optimistic pattern verbatim).
- `overdue-confirm-dialog.tsx` — `AlertDialog`, opened from `submit-sheet.tsx`
  at the moment "Nộp bài" is clicked (recompute `isOverdue` there, not at
  sheet-open), Cancel restores focus to "Nộp bài" trigger (native
  `AlertDialog`/Radix focus-return behavior — verify it satisfies AC-1176.3
  without extra wiring).
- `graded-sheet.tsx` — `Sheet`, fully read-only: score chip (`score-tone.ts` +
  `StatusBadge`/plain chip per design-spec `scoreChip` shape), comment block
  with empty fallback (`assignments.graded.commentEmpty`), optional
  graded-file link → `onClick` shows a toast using the NEW
  `assignments.graded.mockDownloadToast` key (§8 GAP #2), timestamps.
- `use-assignment-draft.ts` — `{ getDraft(assignmentId), saveDraft(assignmentId, {answerText?, fileName?}) }`
  thin `localStorage` wrapper (key `lms.assignment-draft.${assignmentId}`),
  used only by `submit-sheet.tsx`. Not a repository method (confirmed
  decision, do not promote).

## 7. Route wiring

```
src/app/[locale]/t/[tenant]/(app)/student/assignments/
  page.tsx     # RSC — requireRole(["student"]) inline (matches US-E11.6's
               #   tightened guard precedent, NOT the looser student/exams
               #   precedent), then makeListAssignmentsUseCase().execute(
               #   MOCK_STUDENT_ID) — same MOCK_STUDENT_ID const pattern as
               #   student/courses/page.tsx; catch -> errorKey: "unknown"
  actions.ts    # 'use server' — submitAssignmentAction(assignmentId, input),
               #   starts with requireRole(["student"]), calls
               #   makeSubmitAssignmentUseCase(), returns
               #   { ok: true, assignment } | { ok: false, errorKey }
```

`bootstrap/di/lms.di.ts` — add `makeListAssignmentsUseCase()` /
`makeSubmitAssignmentUseCase()` next to the existing 7 factories, same
`makeRepo()` helper (no new repo-selection logic needed).

`bootstrap/endpoint/lms.endpoint.ts` — add (logical, mirrors
integration.md's documented-but-unshipped paths, never called while
`USE_MOCK=true`):

```ts
assignments: (studentId: string, statusFilter?: string) =>
  `/lms/api/v1/students/${studentId}/assignments${statusFilter ? `?status=${statusFilter}` : ""}`,
submitAssignment: (assignmentId: string) =>
  `/lms/api/v1/assignments/${assignmentId}/submissions`,
```

## 8. i18n — reuse `assignments` namespace, 2 content fixes

Namespace is fully staged (`vi.json:675`, `en.json` mirror) — reuse as-is
EXCEPT:

1. **GAP #1**: `assignments.card.daysLeft.overdue` currently `"Quá hạn"` (no
   placeholder). Change to `"Quá hạn {n} ngày"` (interpolation pattern matches
   the sibling `daysLeft.remaining: "Còn {days} ngày"` already in the same
   object — note the KEY NAME MISMATCH between `{n}` (used by the task brief/
   AC wording) and `{days}` (used by the existing sibling key) — **pick one
   placeholder name and use it consistently across the new key AND the
   `t()` call site**; recommend `{days}` to match the sibling key exactly
   (`remaining`/`overdue` should use identical interpolation-variable naming
   for consistency within the same `daysLeft` object), i.e. final value
   `"Quá hạn {days} ngày"`. Update BOTH `vi.json` and `en.json`.
2. **GAP #2**: new key `assignments.graded.mockDownloadToast` — vi copy
   direction "Đây là bản demo — không có tệp thật để tải." (per spec.md §8,
   confirmed non-blocking wording, `ba-lead`/`uiux-ux-writer` may refine
   later). Add to both `vi.json` (after `downloadAriaLabel` in the `graded`
   object) and `en.json` mirror.

No other new keys expected — confirm at implementation time by diffing the
full `assignments` namespace against every `t("assignments....")` call site
written.

## 9. TDD sequencing

1. **Red** `derive-overdue.test.ts` — pending+past dueDate → true;
   pending+future → false; submitted/graded+past dueDate → false (AC-1173.4).
2. **Red** `assignment-badge.test.ts` (pure fn, no React) — 1-day/0-day
   (dueToday)/>3-day/overdue/submitted/graded branches × icon+tone+labelKey
   (AC-1172.1/.4/.6, AC-1173.3).
3. **Red** `list-assignments.use-case.test.ts` — pass-through + statusFilter
   branch + network-error/unknown mapping (mock `ILmsRepository`).
4. **Red** `submit-assignment.use-case.test.ts` — happy path + all 5
   repo-thrown failure codes → correct `AssignmentFailure` mapping.
5. **Red** `lms.mapper.test.ts` (extend) — `mapAssignment` DTO→entity incl.
   empty-string `teacherComment` preserved (not coerced to null).
6. **Red** `lms.mock.repository.test.ts` (extend) — 6-seed fixture coverage
   assertion, `listAssignments` filter branches, `submitAssignment`
   mutation + `already-submitted`/`not-found` throws, `resetLmsMockStore`
   reseeds assignments too.
7. Storybook interaction specs (per story's Validation table / spec.md §10):
   tab switch + 4 states + 4 empty copies; card badge/overdue matrix; CTA→sheet
   routing (3-way); submit sheet file attach/remove/oversized-block/
   draft-save/pre-populate; overdue-confirm accept/cancel/recompute-at-click;
   submit happy-path + 5 failure branches + double-click guard; graded sheet
   score-mapping/comment-fallback/file-link-present-absent/mock-download-toast;
   list error+retry+no-stacked-retry.

## 10. Component + state sketch

```
StudentAssignmentsScreen (client, query-hydrated)
├── AssignmentTabs (role=tablist)
├── [loading] AssignmentsSkeleton
├── [empty]   EmptyState (shared, per-tab title)
├── [error]   AssignmentsError (inline role=alert + Thử lại)
└── [success] list of AssignmentCard
                └── onCtaClick -> opens SubmitSheet | GradedSheet (screen-owned open state, id of active assignment)
SubmitSheet (Sheet)
├── mode=edit: file-picker + textarea + Lưu nháp/Nộp bài
├── mode=readonly: read-only summary (submitted view)
├── useAssignmentDraft (local hook, no network)
└── onSubmitClick -> recompute isOverdue -> OverdueConfirmDialog (AlertDialog) if true, else submit mutation directly
GradedSheet (Sheet, fully read-only)
```

**State classification:**
- Server state (TanStack Query): assignment list (`["lms","assignments","list"]`,
  RSC `initialData`), submit mutation (`useMutation`, invalidates the list key
  + patches the submitted assignment in cache on success).
- URL state: none (tab is NOT deep-linked per AC — confirm; if a future AC
  wants shareable tab links, that's a `useSearchParams` addition, not needed
  now per current AC wording).
- Local state: active tab (`useState`), active sheet + which assignment id
  (`useState`), draft file/text (`useAssignmentDraft` → `localStorage`, not
  Zustand, not a global store — single-screen concern).

## 11. Risks, dependencies, open questions

- **[OPEN QUESTION]** AC-1171.9 ("tab switch unmounts previous list and starts
  an independent loading→state cycle") — since the mock returns the full list
  in one RSC-seeded fetch (integration.md: "no pagination, full response"),
  a literal per-tab refetch would need synthetic mockDelay per tab-switch to
  produce a visible loading state, which the current `student-courses-screen.tsx`
  precedent does NOT do (it's an instant client-side filter). Recommend:
  reuse the `student-courses-screen.tsx` instant-filter pattern (spec's
  "loading" state is then only ever visible on the FIRST navigation, which
  still satisfies "loading/empty/error/success all exist and are mutually
  exclusive" — just not literally re-triggered per tab click). Flag to
  `fe-lead`/`fe-state-engineer` to confirm this reading before implementation,
  since a stricter reading of AC-1171.9 would change the state-management
  approach materially (per-tab `useQuery` keys with an artificial delay).
- **[OPEN QUESTION]** `forbidden`/`file-too-large` mock-triggering: `forbidden`
  is defense-in-depth (integration.md: "should not occur if list is
  student-scoped") — recommend testing its `AssignmentFailure` mapping at the
  use-case unit level with a directly-mocked repo throw, rather than
  engineering a real trigger path through `MockLmsRepository`. `file-too-large`
  never reaches the repository at all (validated client-side in
  `submit-sheet.tsx` before any mutation call) — confirm this client-only
  validation location during implementation (per integration.md INT-117-02
  explicit wording "never round-trips").
- **[OPEN QUESTION]** Whether `assignment-tabs.tsx` needs a brand-new
  full-WCAG-tablist implementation or whether `course-tabs.tsx` already
  implements the pattern and can be lifted/adapted — grep
  `course-tabs.tsx` at implementation time; if it's a simpler button row,
  do NOT retrofit it in place (2-screen shared risk per decision `0026`) —
  build assignments' own `assignment-tabs.tsx` to the full pattern and treat
  promotion to `components/shared/` as a future 3rd-consumer decision, not
  now.
- **Naming discrepancy** (already detailed in §1): `EduSkeleton`/`EduEmpty`/
  `EduError` referenced in this packet's own `story.md`/`spec.md`/
  `integration.md` do not exist as real components — use `Skeleton`-based
  local skeleton, shared `EmptyState`, and an inline `role="alert"` error
  block instead. Non-blocking, content-only correction.
- No new design tokens needed — `error/40` border tint, `--edu-error-text`,
  score/status tone mappings all already exist per `.claude/rules/design-system.md`
  + `tone.ts` precedent. No ADR needed (matches story.md's own "no ADR"
  conclusion).
- No `TEST_MATRIX.md` row edit needed by the planner — `fe-nextjs-engineer`
  flips `planned` → `implemented` + fills proof columns per `.claude/rules/tdd.md`
  once TDD lands (story.md already carries the `planned` row content inline).

## 12. Sub-tasks (implementation order)

1. Domain: `assignment.entity.ts`, `assignment.failure.ts`, `derive-overdue.ts`
   + tests.
2. Domain: `list-assignments.use-case.ts`, `submit-assignment.use-case.ts` +
   tests; extend `i-lms.repository.ts`.
3. Infrastructure: `assignment-response.dto.ts`, extend `lms.mapper.ts` +
   test, extend `lms.fixtures.ts` (`ASSIGNMENTS_DTO`), extend
   `lms.mock.repository.ts` (+ `resetLmsMockStore`) + test, extend
   `lms.repository.ts` real-impl stubs.
4. Bootstrap: extend `lms.di.ts` (2 factories), `lms.endpoint.ts` (2 entries).
5. i18n: fix GAP #1 (`daysLeft.overdue` placeholder) + add GAP #2
   (`graded.mockDownloadToast`) in both `vi.json`/`en.json`.
6. Presentation: `assignment-badge.ts` + test, `score-tone.ts`,
   `assignment-tabs.tsx`, `assignment-card.tsx`, `assignments-skeleton.tsx`,
   `assignments-error.tsx`, `student-assignments-screen.i-vm.ts` +
   `student-assignments-screen.tsx` + stories.
7. Presentation: `use-assignment-draft.ts`, `submit-sheet.tsx`,
   `overdue-confirm-dialog.tsx` + stories.
8. Presentation: `graded-sheet.tsx` + stories.
9. Route: `student/assignments/page.tsx` + `actions.ts` (RBAC guard both).
10. Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) +
    `fe-accessibility-auditor` pass (tablist, sheets focus-trap/Escape/focus-
    restore ×3 surfaces) + `fe-qa-playwright` Storybook interaction sweep.

## 13. State Architecture (fe-state-engineer)

Resolves the two open calls flagged in §11. No implementation code below is
prescriptive of component JSX/tree (that stays `fe-component-architect`'s and
`fe-nextjs-engineer`'s) — this section fixes the query-key shape, cache
config, and mutation/invalidation contract `fe-nextjs-engineer` implements
against verbatim. No global client store introduced (confirmed: local
`useState` for tab/sheet-open/id, `localStorage`-backed hook for draft — none
of it TanStack Query, none of it Zustand/Redux/Jotai).

### 13.1 AC-1171.9 — definitive call: REAL per-tab refetch, not a client filter

**Decision: implement a genuine per-tab query (`assignmentsKeys.list(tab)`),
NOT the `student-courses-screen.tsx`/US-E11.6 client-filter-of-one-list
pattern.** This is a deliberate divergence from the sibling screen's
precedent, not an oversight — reasoning:

1. **The AC wording is materially different from courses' tabs, and that
   difference is the point.** US-E11.6's course tabs have no AC requiring an
   "independent loading→state cycle"; they were designed as a pure display
   filter. AC-1171.9 explicitly says "the 'Tất cả' list **unmounts** and
   'Chưa nộp'*'s own independent* loading→(empty|error|success) *cycle
   begins*" — and AC-1171.1 reinforces it: "Given **the active tab's fetch**
   is pending, Then `EduSkeleton` renders" (singular, tab-scoped fetch, not
   "the list's fetch"). A BA who already had the client-filter precedent
   available (US-E11.6 shipped first, same packet author lineage) chose this
   wording anyway — reading it as "just a client-side filter" would render
   "unmounts"/"independent cycle"/"the active tab's fetch" meaningless
   phrasing, which this team's spec-writing convention doesn't do casually.
2. **It matches this repo's own general list-query convention** (`<feature>
   Keys.list(params)` parameterized by filter — the standard shape this
   agent's own decision framework calls for) more than the courses screen's
   single flat key does. The courses screen is the outlier (3 tabs, no
   stated per-tab-cycle AC); assignments is the norm.
3. **Cost is negligible.** The mock's `mockDelay(200)` is cheap, the list is
   bounded (one student's own-class assignments), and `MockLmsRepository
   .listAssignments(studentId, statusFilter)` already filters server-side per
   `integration.md`'s own modeling choice ("filtering happens here so a
   future real endpoint's `statusFilter` query param has identical mock
   behavior to test against") — the mock was already built assuming
   per-filter calls, not a single unfiltered fetch. Reusing it as a single
   fetch (then filtering client-side) would under-use a contract INT-117-01
   already committed to.
4. **QA proof explicitly lists it.** Both `story.md`'s Validation table and
   spec.md §10 list "tab switch + 4 states" and "list error+retry+no-stacked-
   concurrent-retry" as *Storybook interaction* proof — i.e., these are
   expected to be *exercised on every tab switch*, not just on first paint.
   A client-filter approach would make "loading" unobservable after the
   first navigation, failing that proof's intent.

**Consequence for mount mechanics:** the tab-switch must cause a real
React-Query cold mount per tab, not just a new filter over cached data. The
concrete mechanism (owned jointly with `fe-component-architect`/
`fe-nextjs-engineer`, specified here as the query-config half):
- The list-rendering subtree is keyed by the active tab (e.g.
  `<AssignmentsListRegion key={activeTab} tab={activeTab} .../>`) so React
  unmounts the previous tab's subtree — and therefore its `useQuery` instance
  — before mounting the next tab's. This is what makes "unmount the previous
  list" literal, not just a filter swap.
- Each per-tab query uses `gcTime: 0` — the instant the subtree unmounts
  (tab switch away), TanStack drops that cache entry. Revisiting a tab later
  is therefore always a cold fetch with a real loading window, matching
  "independent cycle" **every** switch, not only the first.
- `staleTime: 0` for all non-default tabs (always refetch fresh on mount —
  there's nothing to consider "fresh" once `gcTime: 0` evicts on unmount
  anyway; keeps the two settings consistent/self-documenting rather than
  relying on `gcTime` alone).
- **Exception — the default "Tất cả" tab's first mount**: seeded via RSC
  `initialData` (see §13.3) with `staleTime: 30_000` so the very first paint
  does not immediately re-trigger a background refetch racing the RSC data
  (avoiding a wasted duplicate mock call 0ms after hydration). `gcTime: 0`
  still applies once the user tabs away and this subtree unmounts — so
  returning to "Tất cả" later is, correctly, its own fresh cycle too (AC-1171.9
  doesn't carve out an exception for the default tab).

This is a state-architecture call, confirmed and final — `fe-nextjs-engineer`
should not re-litigate it; if a reviewer disagrees, escalate to `fe-lead`
before implementation, not after.

### 13.2 Query Key Hierarchy + Cache Policy

Colocated locally in the screen file (`student-assignments-screen.tsx`),
matching this repo's existing convention (`coursesListKey` in
`student-courses-screen.tsx`, `lmsKeys` in `lesson-player.tsx` are both
per-screen-local, not a shared cross-screen factory) — do NOT create a new
shared `lms-keys.ts` module for this alone; extend that only if/when a 3rd
screen needs the same keys (decision `0026`'s promotion-on-2nd-use bar, here
applied to key factories not components).

```ts
const assignmentsKeys = {
  all:   ()                              => ["lms", "assignments"]              as const,
  lists: ()                              => ["lms", "assignments", "list"]      as const,
  list:  (tab: AssignmentStatusFilter)   => ["lms", "assignments", "list", tab] as const,
};
```

| Key | staleTime | gcTime | refetchOnWindowFocus | Notes |
|---|---|---|---|---|
| `list("all")` (default tab, RSC-seeded) | `30_000` | `0` | `false` | `initialData` from RSC; `gcTime: 0` still applies on unmount (tab-away) per §13.1 |
| `list("pending")` / `list("submitted")` / `list("graded")` | `0` | `0` | `false` | Client-fetched on first activation of that tab; always a cold mount per §13.1 |

No `useInfiniteQuery` — INT-117-01 explicitly has no pagination for MVP
(bounded per-student list).

### 13.3 RSC↔client boundary

Matches the confirmed `student-courses-screen.tsx`/`lesson-player.tsx`
convention exactly — one RSC use-case call, mapped to a ViewModel, hydrated
via `initialData` for the default view only:

```
student/assignments/page.tsx (RSC)
  → requireRole(["student"]) guard (inline, per US-E11.6 tightened-guard precedent)
  → makeListAssignmentsUseCase().execute(MOCK_STUDENT_ID, "all")
  → catch -> errorKey: "unknown"
  → map AssignmentEntity[] -> StudentAssignmentsScreenVm (ViewModel: assignments, errorKey, pendingCount)
  → <StudentAssignmentsScreen initialAssignments={vm.assignments} errorKey={vm.errorKey}
       actions={{ submitAssignmentAction }} />
       → useQuery({ queryKey: assignmentsKeys.list("all"), initialData: initialAssignments, ... })
       → activeTab (`useState`, default "all") drives which per-tab query is mounted (§13.1)
       → non-"all" tabs: useQuery({ queryKey: assignmentsKeys.list(tab), queryFn: () => listAssignmentsAction(tab) })
         — NOT initialData-seeded; genuine client fetch, real loading state every mount
```

- **RSC fetches**: only the default "Tất cả" tab's list, once, at first
  navigation. Nothing else — sheets (submit/graded) open synchronously from
  already-cached card data (the assignment object is already in whichever
  tab-list cache produced the card), no separate per-assignment "detail"
  fetch/query needed (matches FR-004's "sheet opens with the card's own
  data"; AC-1174.4's "concurrent removal → inline sheet error" is handled by
  the mutation's own `not-found` failure branch when submit is attempted
  against a since-removed assignment, not by a speculative detail refetch on
  sheet-open).
- **Client owns**: all 3 other tab queries (client-only `useQuery`, backed by
  a `listAssignmentsAction` **Server Action** wrapping
  `makeListAssignmentsUseCase()` — a Server Action, not a route handler, per
  this repo's convention of Server Actions as the sole DI-boundary crossing;
  confirm this action exists alongside `submitAssignmentAction` in the
  route's `actions.ts`, both `'use server'`), the submit mutation, tab state,
  sheet-open state, and the draft hook.
- **No client-side token/exp handling** anywhere in this flow (per
  `api-integration.md` — `requireRole` guard is server-side in `page.tsx`/
  `actions.ts` only).

### 13.4 Submit mutation — non-optimistic, cache-patch-on-success strategy

Confirms and tightens the plan's §6/§10 sketch: the plan's own note ("this
is a REGULAR (non-optimistic) mutation... do not copy the optimistic pattern
verbatim") is correct — finalizing the **exact** `onSuccess` cache strategy,
since "no optimistic `onMutate`" was decided but "invalidate vs. patch" was
left open.

```ts
const submitAssignment = useMutation({
  mutationFn: async (input: SubmitAssignmentInput) => {
    const res = await actions.submitAssignmentAction(assignmentId, input);
    if (!res.ok) throw new AssignmentActionError(res.errorKey);
    return res.data; // updated AssignmentEntity, status: "submitted", submittedAt: now
  },

  // NO onMutate — submitting sub-state comes from `submitAssignment.isPending`
  // alone (spinner + "Đang nộp bài…", disabled, aria-busy). This is the whole
  // point of "not optimistic": the CTA visibly waits for the mock's
  // mockDelay(250) before anything in the UI changes.

  onSuccess: (updatedAssignment) => {
    // 1. Patch the currently-active tab's own cache directly with the
    //    server-confirmed entity — no waiting on a second round-trip for the
    //    tab the user is actually looking at right now.
    queryClient.setQueryData<AssignmentEntity[]>(
      assignmentsKeys.list(activeTab),
      (old = []) => {
        const stillMatchesTab =
          activeTab === "all" || activeTab === "submitted"; // "graded" can't be reached from a submit; "pending" no longer matches
        if (!stillMatchesTab) {
          // e.g. active tab was "pending" — the submitted item no longer belongs here
          return old.filter((a) => a.id !== updatedAssignment.id);
        }
        return old.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
      },
    );

    // 2. The OTHER 3 tab caches are not patched by hand (deriving 3 more
    //    filter branches here would drift from the mock's own filter logic
    //    in `MockLmsRepository.listAssignments`). Instead mark them stale
    //    without forcing an immediate background fetch (`refetchType:
    //    "inactive"` — TanStack v5) — cheap because §13.1 already gives
    //    every tab `gcTime: 0`, so any tab not currently mounted has already
    //    been evicted from cache; this invalidate call is a no-op for them
    //    in practice and only matters for the (rare) case a tab is still
    //    resident. The NEXT time the user activates any other tab, §13.1's
    //    cold-mount-every-time behavior already guarantees a fresh fetch
    //    regardless — this call is defense-in-depth, not the primary
    //    correctness mechanism.
    queryClient.invalidateQueries({
      queryKey: assignmentsKeys.lists(),
      refetchType: "inactive",
    });

    // 3. Toast "Nộp bài thành công." (role="status", ~3.2s auto-dismiss) —
    //    component-architect/engineer wiring, not a cache concern.
    // 4. Sheet closes (component-owned open-state, set false here or by the
    //    caller reacting to `isSuccess`).
  },

  onError: () => {
    // Sheet stays open, inline error via `t(error.errorKey)`, file/text
    // state preserved for retry (AC-1177.3) — no cache was touched, so
    // nothing to roll back. This is exactly why there's no onMutate: an
    // optimistic pattern would need rollback machinery here; the
    // non-optimistic design needs none.
  },
});
```

**Why patch-then-invalidate-inactive, not a plain `invalidateQueries` (all
tabs, active refetch) and not a full 4-way manual patch:**
- A blanket `invalidateQueries({queryKey: assignmentsKeys.lists()})` with the
  default `refetchType: "active"` would force an immediate second network
  round-trip for the tab the user is looking at, re-showing a loading
  skeleton for ~200ms **right after** the sheet closes — a visible flicker
  for data we already have from the mutation's own response. Patch directly
  instead.
- Manually patching all 4 possible tab arrays (`all`/`pending`/`submitted`/
  `graded`) by hand would require reimplementing `MockLmsRepository`'s filter
  predicate in the client (drift risk, same class of bug the US-E11.6 doc
  flags for `calculateCourseProgress` duplication) for tabs that, per §13.1,
  are evicted on unmount anyway and will cold-fetch correctly next visit —
  wasted engineering for no observable benefit.
- `pendingCount` (page-header subtitle, AC/FR-009) is derived from whichever
  list is authoritative at render time — since it's sourced from the "all"
  tab's data specifically (per spec.md FR-009's "header subtitle reflects
  `pendingCount`"), the `activeTab === "all"` branch above already keeps it
  correct when the user is on "Tất cả"; if the user submits while on the
  "Chưa nộp" tab, the "all" tab's cache (if resident; `gcTime:0` means it's
  usually not, since the courses subtree unmounted when they switched tabs)
  is stale/evicted anyway and will cold-fetch fresh (post-mutation) `all`
  data with the correct `pendingCount` next time "Tất cả" is activated — no
  special-case patch of the header subtitle needed beyond that.

### 13.5 Async State Machine

| Region | Loading | Empty | Error | Submitting | Success |
|---|---|---|---|---|---|
| Assignment list (per active tab) | 4-row `assignments-skeleton.tsx` — shown on EVERY tab activation per §13.1, not just first paint | `EmptyState` with 4 distinct titles (`assignments.empty.allTab/pendingTab/submittedTab/gradedTab`), from `data.length === 0` post-fetch | Inline `role="alert"` (`assignments-error.tsx`) + "Thử lại" button that calls `queryClient.refetchQueries({queryKey: assignmentsKeys.list(activeTab)})` (or simply `query.refetch()`) — guarded so a second click while `isFetching` is a no-op (no stacked concurrent retry, per AC) | n/a (list region has no submitting sub-state — that's the sheet's) | Card list renders; header subtitle `pendingCount` sourced from the "all" tab's cache (see §13.4) |
| Submit sheet CTA | n/a (sheet opens synchronously from already-cached card data) | n/a | Inline error on sheet-open if the underlying assignment was concurrently removed (AC-1174.4) — detected when the CTA's source assignment id is no longer found in the active tab's cache at open-time, not a separate fetch | `submitAssignment.isPending` → CTA replaced by spinner + "Đang nộp bài…", `disabled`, `aria-busy`, motion-safe-gated | Sheet closes; toast "Nộp bài thành công." |
| Submit sheet — 5 failure branches | n/a | n/a | `submitAssignment.error instanceof AssignmentActionError ? t(\`errors.${error.errorKey}\`) : t("errors.unknown")` inline, `role="alert"`; `already-submitted`/`not-found` additionally trigger a list refetch of the active tab (the underlying data changed) via the same `invalidateQueries({queryKey: assignmentsKeys.lists(), refetchType: "inactive"})` call already in `onSuccess` — for these two error types run it in `onError` too, since the assignment's true state changed even though *this* submit failed | n/a | n/a |
| Save draft | n/a (instant local read/write) | n/a | n/a (cannot fail over network, per INT-117-03 — a `localStorage` quota failure is explicitly out of scope) | n/a — no submitting sub-state, this is synchronous | Toast "Đã lưu nháp.", sheet stays open |
| Graded sheet | n/a (opens synchronously from cached card data) | n/a | Same concurrent-removal inline-error pattern as the submit sheet | n/a | Score chip/comment/file-link/timestamps, fully read-only |

Failure→i18n mapping: `AssignmentFailure["type"]` values map 1:1 to
`assignments.errors.<type>` keys already staged (per integration.md §4) — no
new keys needed for the failure union itself (only the 2 unrelated content
gaps in spec.md §8/plan.md §8 are new).

### 13.6 Race Conditions & Resolution

| Race | Resolution |
|---|---|
| Double-click "Nộp bài" before the mutation resolves | `disabled={submitAssignment.isPending}` on the CTA (component-architect wires it) absorbs the second click; even if it slipped through, `mockDelay` + the mock's own `already-submitted` guard (assignment no longer `status: "pending"` after the first call's mutation lands) makes a slipped-through duplicate call fail safely into the `already-submitted` inline-error branch, not a corrupted double-submit. |
| User switches tabs while the submit sheet is open (background list changes underneath) | Per §13.1, the tab subtree the sheet's card came from may unmount (its query evicted, `gcTime:0`) while the sheet itself is a separate, screen-level open/id piece of state (not inside the tab-list subtree) — the sheet keeps functioning off the assignment data it was opened with; on submit, `onSuccess`/`onError` patch/invalidate per §13.4 regardless of which tab is now active, so the eventually-revisited original tab still self-corrects on its next cold mount. |
| Two rapid tab switches (e.g. "Chưa nộp" → "Đã nộp" → "Chưa nộp" before the first fetch resolves) | Each switch unmounts the previous subtree (§13.1), which — for TanStack Query — implicitly cancels the outgoing query's relevance to the UI (no observer left to receive it) even though the network promise may still resolve in the background; since `gcTime:0` evicts the cache entry on unmount, a late-arriving response for an abandoned mount has nowhere to write to that any active component reads, so it cannot clobber the newer tab's state. No manual `cancelQueries` call is required, but `fe-nextjs-engineer` MAY add one defensively at the top of the query for hygiene/perf (avoiding a wasted network resolution write) — not required for correctness. |
| Submit succeeds while the "all" tab's cache is still resident (rare — user just came from "Tất cả" without switching away) | §13.4 branch 1 already patches it directly (`activeTab === "all"` case) — no separate handling needed; `pendingCount` updates immediately in that case too. |
| List fetch error + user clicks "Thử lại" twice quickly | Retry handler is guarded by `query.isFetching` (disable the retry button while a fetch from the previous click is still in flight) — prevents the "no stacked concurrent retry" AC (AC-1179 family) from firing two overlapping fetches whose resolution order could otherwise race the error/success state. |

### 13.7 Handoff

No ADR needed — no global store, no new auth/token/data-contract decision;
`assignmentsKeys.list(tab)`'s per-tab-cold-fetch design and the
patch-then-invalidate-inactive mutation strategy are both applications of
existing TanStack Query primitives already used elsewhere in this repo
(`gcTime`/`staleTime`/`refetchType`), not a new pattern requiring a decision
record. Flag to `fe-lead`: confirm §13.1's divergence from the courses-screen
precedent is acceptable before `fe-nextjs-engineer` starts §12 step 6
(presentation layer) — this is the one call in this section most likely to
warrant a second opinion, everything else in §13 is a direct consequence of
it plus existing repo convention.
