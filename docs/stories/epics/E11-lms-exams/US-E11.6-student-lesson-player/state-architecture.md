# US-E11.6 State Architecture — Student Lesson Player

Author: fe-state-engineer. No implementation code, no component structure (see
`component-architecture.md` from fe-component-architect for the ViewModel/prop
boundary). This document is the state/data-flow contract fe-nextjs-engineer
implements against.

## 1. State Architecture Summary

- **Two RSC entry points**, each doing exactly one server-side use-case call
  behind an inline `requireRole(["student"])` guard, mapped to a ViewModel,
  passed as props:
  - `student/courses/page.tsx` → `CourseSummary[]` (full list, unfiltered).
  - `student/courses/[courseId]/page.tsx` → `{ course, chapters }` (lessons +
    progress for one course).
- **Client hydration**: both client screens seed a TanStack Query cache entry
  via the `initialData` option, mirroring the confirmed repo pattern
  (`messaging-screen.tsx`, `audit-log-screen.tsx`) — RSC fetch is the *only*
  network round trip on first paint; the client query then owns the cache for
  all subsequent optimistic mutations, no waterfall refetch.
- **Tabs (All/InProgress/Completed) are pure client-side derived state, NOT a
  query-key parameter and NOT URL state.** Confirmed per plan.md's own
  recommendation: the RSC fetch always returns the full unfiltered course
  list; tab selection filters the already-cached array in memory
  (`useMemo`/plain filter, no `useState<CourseSummary[]>` copy needed since
  filtering doesn't mutate). Rationale below (§4).
- **No global client store.** Server state → TanStack Query seeded by RSC.
  Local UI-only state (active tab, chapter collapse map, active lesson
  pointer, notes textarea draft, Q&A input draft) → component `useState`,
  owned by fe-component-architect's tree, out of scope here except where it
  interacts with cache (active lesson ↔ query cache below).
- **Notes and Q&A are repository-backed** (domain-typed, per fe-lead's
  decision) and live in TanStack Query too — same mutation/rollback machinery
  as mark-complete, not bespoke `useState`.
- **Mutations go through Server Actions** (`markLessonCompleteAction`,
  `saveNoteAction`, `askQuestionAction`), each guarded by
  `requireRole(["student"])` server-side, returning a stable failure-key
  result shape (§7) that the client `useMutation`'s `mutationFn` unwraps.
- **calculate-course-progress is a pure domain fn, safe to import
  client-side** — confirmed below (§9) — and is reused verbatim by the
  optimistic cache patch so the client-computed progress never drifts from
  the server formula.

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
|---|---|---|---|---|
| Course list (unfiltered) | Server state | TanStack Query, RSC-seeded | `CourseSummary[]` | Remote data (mock-first), needs optimistic patch target after mark-complete |
| Active tab (`all\|in-progress\|completed`) | Local UI state | `StudentCoursesScreen` client component | `useState<TabValue>` | Not shareable/deep-link-required per story; pure display filter over already-fetched data |
| Chapter/lesson hierarchy for one course | Server state | TanStack Query, RSC-seeded | `{ chapters: ChapterEntity[] }` (lessons nested) | Remote data; mutated optimistically on mark-complete |
| Active lesson id | URL-adjacent local state (see §3 note) | `LessonPlayer` client component | `useState<string \| null>`, initialized from first incomplete/first lesson | Pure client navigation inside the player; no requirement to deep-link a specific lesson (story routes only to `[courseId]`, not `[lessonId]`) — kept local, NOT in the query key |
| Chapter collapse map | Local UI state | `ChapterList` (component-architect's tree) | `useState<Record<chapterId, boolean>>` | AC-7 persistence is *within-session/within-navigation*, not cross-reload; local state suffices |
| Lesson note content (current textarea value) | Local form state | `NotesPanel` | `useState<string>`, seeded from query cache on lesson switch | Explicit "Lưu" button (AC-12) = no live-sync needed; draft is local until Save |
| Lesson note (persisted) | Server state | TanStack Query | `{ lessonId, content, updatedAt } \| null` | Repository-backed per fe-lead decision; must persist across lesson navigation (AC-12) |
| Q&A question draft (input value) | Local form state | `QnaPanel` | `useState<string>` | Ephemeral input, cleared on submit |
| Q&A list | Server state | TanStack Query | `LessonQuestionEntity[]` | Repository-backed; optimistic prepend (AC-13) |
| Mark-complete in-flight flag | Derived from mutation | TanStack Query (`mutation.isPending`) | n/a | Drives button disabled/loading state without extra local state |
| RBAC guard result | Server-only, not client state | `page.tsx` / `actions.ts` | n/a | Never exposed to client; redirect/404 happens server-side |

## 3. State Flow

```
RSC page.tsx (student/courses)
  → requireRole(["student"]) guard
  → makeListCoursesUseCase().execute(studentId)   // no status filter param
  → map to CourseSummary[] (ViewModel)
  → <StudentCoursesScreen initialCourses={...} actions={{ markLessonCompleteAction? no — not needed here }} />
       → useQuery(coursesKeys.list(), { initialData: initialCourses, queryFn: refetch-if-ever-needed })
       → client-side filter by activeTab (useState) over query data — no refetch on tab change

RSC page.tsx (student/courses/[courseId])
  → requireRole(["student"]) guard
  → makeGetCourseLessonsUseCase().execute(courseId)  // not-found → notFound()
  → map to { course, chapters } (ViewModel)
  → <LessonPlayer initialData={...} actions={{ markLessonCompleteAction, saveNoteAction, askQuestionAction }} />
       → useQuery(lmsKeys.courseLessons(courseId), { initialData })
       → useState<activeLessonId> derived from initialData (first incomplete lesson, else first lesson)
       → on chapter-list click: setActiveLessonId (pure client nav, no query)
       → Notes: useQuery(lmsKeys.note(lessonId), { initialData: undefined, enabled: true }) per active lesson
                 — NOT initialData from RSC (notes aren't RSC-fetched to keep the RSC page single-purpose;
                    first note query per lesson id is a normal client fetch against the mock repo)
       → Q&A: useQuery(lmsKeys.questions(lessonId), { }) — same, client-fetched per lesson id

Mutation → Server Action → cache reconciliation
  markLessonCompleteAction(lessonId)  → useMutation.onMutate patches BOTH
    lmsKeys.courseLessons(courseId) AND coursesKeys.list() caches (cross-query
    setQueryData, see §6) → onError rolls both back → onSettled: no forced
    invalidate needed for mock repo (server already agrees with optimistic
    state); real repo integration later may add onSettled invalidate once BE ships.

saveNoteAction(lessonId, content) → useMutation.onSuccess sets
    lmsKeys.note(lessonId) cache to the saved value (no optimistic set needed,
    see §6.2 rationale) → local textarea draft state stays as-is (already
    matches what was saved).

askQuestionAction(lessonId, question) → useMutation.onMutate prepends an
    optimistic LessonQuestionEntity to lmsKeys.questions(lessonId) → onError
    rolls back → onSuccess replaces the optimistic item with the server-
    returned one (id swap) via setQueryData.
```

Note on "active lesson id": not URL state. The story's routes are
`/student/courses` and `/student/courses/[courseId]` only — no `[lessonId]`
segment — so deep-linking a specific lesson is out of scope for this US. If a
future US adds `?lesson=<id>` shareable linking, that would move this to
`useSearchParams`; not needed now (YAGNI, matches plan.md's routes section).

## 4. Query Key Hierarchy + Cache Policy

```ts
export const lmsKeys = {
  all:          ()                     => ["lms"]                                as const,
  courses:      ()                     => ["lms", "courses"]                     as const,
  coursesList:  ()                     => ["lms", "courses", "list"]             as const,
  course:       (courseId: string)     => ["lms", "course", courseId]            as const,
  courseLessons:(courseId: string)     => ["lms", "course", courseId, "lessons"] as const,
  lesson:       (lessonId: string)     => ["lms", "lesson", lessonId]            as const,
  note:         (lessonId: string)     => ["lms", "lesson", lessonId, "note"]    as const,
  questions:    (lessonId: string)     => ["lms", "lesson", lessonId, "questions"] as const,
};
```

**Decision — status is NOT in the courses list key.** Plan.md's sketch had
`["lms","courses",{status}]`. Overridden: since AC-2's three tabs filter a
client-held, already-fetched full list (confirmed with fe-component-architect
scope: "filtering client-side like the mockup"), parameterizing the key by
status would create three independent cache entries for what is actually one
dataset, forcing either (a) three separate fetches on tab switch — wasted
round-trips, wrong per plan's own recommendation — or (b) prefetching all
three up front, which is just the unparameterized single fetch with extra
bookkeeping. Use the single `coursesList()` key; tabs read `useMemo(() =>
data.filter(...), [data, activeTab])` in the component. If a future US adds
server-side pagination to the course list, revisit — cursor-based list would
then need the filter in the key per the repo's cursor-pagination convention
(`api-integration.md`), but that's not this US.

**Cache policy:**

| Key | staleTime | gcTime | refetchOnWindowFocus | Notes |
|---|---|---|---|---|
| `coursesList()` | `120_000` (2 min) | `300_000` (5 min) | `false` | Matches "conduct list" precedent tier — low churn, RSC-seeded, mutated only via optimistic patch from mark-complete |
| `courseLessons(courseId)` | `60_000` (1 min, global default) | `300_000` | `false` | RSC-seeded per page load; optimistic patch keeps it live during the session |
| `note(lessonId)` | `60_000` | `300_000` | `false` | Client-fetched per lesson switch; explicit-save semantics mean staleness isn't user-visible risk |
| `questions(lessonId)` | `30_000` | `180_000` | `false` | Slightly shorter — Q&A could get teacher answers in future iterations (not this US, no SSE here), keep it fresher by convention |

No `useInfiniteQuery` anywhere in this US — course list is a small bounded
set (no pagination in Design Notes/mock), lessons are bounded per course,
notes are 1:1, questions list has no stated pagination requirement.

## 5. Invalidation Map

| Trigger | Keys invalidated / patched |
|---|---|
| `markLessonCompleteAction` success | `courseLessons(courseId)` — direct `setQueryData` patch (lesson `done: true`, recompute `activeLessonId` suggestion); `coursesList()` — direct `setQueryData` patch (recompute that course's `done`/`total`/`status` via `calculateCourseProgress`). No `invalidateQueries` call needed for either — see §6 rationale (mock repo has no server-truth divergence to reconcile via refetch). |
| `markLessonCompleteAction` error | Roll back both patched caches to `onMutate` snapshot via `context.previousLessons` / `context.previousCourses`. |
| `saveNoteAction` success | `setQueryData(note(lessonId), savedNote)` — direct set, not invalidate (single-writer, no divergence risk). |
| `saveNoteAction` error | No cache mutation happened (see §6.2, no optimistic set) — nothing to roll back; show inline error only. |
| `askQuestionAction` success | `setQueryData(questions(lessonId), ...)` replace optimistic temp item with server-confirmed item (id swap). |
| `askQuestionAction` error | Roll back `questions(lessonId)` to `context.previousQuestions` (removes the optimistic prepend). |
| Lesson switch (`activeLessonId` change) | No invalidation — `note(lessonId)`/`questions(lessonId)` are keyed per lesson, so switching lessons naturally addresses a different (likely uncached-yet) key; TanStack fetches it fresh on first access, caches thereafter. |
| Course list re-visit (nav back from player) | No forced invalidation; `staleTime: 120_000` means a re-visit within 2 minutes shows the already-patched cache (correct — it reflects the mark-complete that happened in the player). Past `staleTime`, a background refetch is harmless once a real `lms` repo exists; mock repo's in-memory fixture also agrees. |

## 6. Mutations & Optimistic Strategy

### 6.1 `markLessonComplete` (AC-11) — cross-query optimistic patch

```
useMutation({
  mutationFn: (lessonId) => actions.markLessonCompleteAction(lessonId),

  onMutate: async (lessonId) => {
    await queryClient.cancelQueries({ queryKey: lmsKeys.courseLessons(courseId) });
    await queryClient.cancelQueries({ queryKey: lmsKeys.coursesList() });

    const previousLessons = queryClient.getQueryData(lmsKeys.courseLessons(courseId));
    const previousCourses = queryClient.getQueryData(lmsKeys.coursesList());

    // 1. Patch the lesson hierarchy: flip `done` on the target lesson.
    queryClient.setQueryData(lmsKeys.courseLessons(courseId), (old) =>
      patchLessonDone(old, lessonId, true));   // pure helper, not a query call

    // 2. Recompute that course's progress with the SAME domain fn used
    //    server-side, and patch it into the courses list cache.
    const updatedLessons = queryClient.getQueryData(lmsKeys.courseLessons(courseId));
    const { doneCount, total } = countLessons(updatedLessons);
    const progress = calculateCourseProgress(doneCount, total);  // domain pure fn
    queryClient.setQueryData(lmsKeys.coursesList(), (old) =>
      patchCourseProgress(old, courseId, progress));

    return { previousLessons, previousCourses };
  },

  onError: (_err, _lessonId, context) => {
    if (context?.previousLessons) queryClient.setQueryData(lmsKeys.courseLessons(courseId), context.previousLessons);
    if (context?.previousCourses) queryClient.setQueryData(lmsKeys.coursesList(), context.previousCourses);
    // surface errorKey from the action result via component-local error state (role="alert")
  },

  // No onSettled invalidate for the mock repo — see rationale below.
})
```

**Why `setQueryData` patch, not `invalidateQueries`, on success (confirming
the brief's framing):** `invalidateQueries` triggers a background refetch
against the *current* repository implementation. For `MockLmsRepository`,
that refetch reads the same in-memory fixture the Server Action itself just
mutated, so it would actually be consistent — but the brief correctly flags
the general risk: if a future mock adds artificial latency simulation, or
once the real `lms` HTTP repo lands, a refetch racing the mutation's own
commit could momentarily return stale pre-mutation data (a second in-flight
GET issued concurrently, or eventual-consistency on the real BE), causing a
visible "flicker back to not-done." Directly patching with the value we
already have (the Server Action's own success payload — updated lesson +
recalculated course progress, per plan.md §4) is strictly safer and doesn't
depend on repository latency characteristics. Kept as: patch on `onMutate`
optimistically, then patch again with the **server-confirmed** values on
`onSuccess` (idempotent second write, guards against the domain fn producing
a different result than the server if they ever drift) — no
`invalidateQueries` call in this flow.

**"Advance to next lesson" (mockup's auto-suggest button):** pure client
navigation state, NOT query-related. It's `setActiveLessonId(nextLesson.id)`
computed from the already-in-cache `courseLessons` data (find current
lesson's index, return next lesson id or null if last). No query key, no
mutation — confirmed out of state-engineer scope, component-architect owns
the button/handler wiring.

**Idempotent re-trigger (fe-lead decision):** if `markLessonCompleteAction`
is somehow called on an already-`done` lesson (defensive — UI disables the
button so this is a guard against race/double-click), `onMutate` patches
`done: true` over `done: true` (no-op diff) and the action returns
`{ ok: true, data: <unchanged lesson> }`. No `already-complete` failure key
is surfaced to the client mutation's error path.

### 6.2 `saveNote` (AC-12) — explicit save, no optimistic set

Confirmed simplest-correct choice: **no debounce, no autosave, no optimistic
`setQueryData` before the Server Action resolves.** Rationale:
- Story AC-12 is explicit about a "Lưu" button — there is no live-typing
  persistence requirement to optimize for, so debounce logic would be
  unrequested complexity.
- The textarea's own local `useState<string>` draft *is* the immediate UI
  feedback the user sees while typing — optimistically writing to the query
  cache before the action resolves buys nothing extra (nothing else reads
  `note(lessonId)` concurrently while the user is on that lesson's Notes tab)
  and adds rollback complexity for a save that's very unlikely to fail
  (mock-local, no network partition modeled).
- On `onSuccess`: `setQueryData(note(lessonId), { lessonId, content, updatedAt })`
  directly (not invalidate) — establishes the new persisted value so
  navigating away and back (AC-12's actual persistence requirement) reads it
  from cache without a refetch.
- On error: show inline `role="alert"` text under the textarea via
  `t(errorKey)`; textarea draft is left untouched (user doesn't lose their
  typed content) so they can retry Save.

```
useMutation({
  mutationFn: (content) => actions.saveNoteAction(lessonId, content),
  onSuccess: (savedNote) => {
    queryClient.setQueryData(lmsKeys.note(lessonId), savedNote);
  },
  // no onMutate, no onError rollback — nothing was optimistically written
})
```

### 6.3 `askQuestion` (AC-13) — optimistic prepend

```
useMutation({
  mutationFn: (question) => actions.askQuestionAction(lessonId, question),

  onMutate: async (question) => {
    await queryClient.cancelQueries({ queryKey: lmsKeys.questions(lessonId) });
    const previousQuestions = queryClient.getQueryData(lmsKeys.questions(lessonId)) ?? [];
    const optimistic: LessonQuestionEntity = {
      id: `optimistic-${crypto.randomUUID()}`,   // temp id, swapped on success
      lessonId, question, answer: undefined, askedAt: new Date().toISOString(),
    };
    queryClient.setQueryData(lmsKeys.questions(lessonId), [optimistic, ...previousQuestions]);
    return { previousQuestions, optimisticId: optimistic.id };
  },

  onSuccess: (serverQuestion, _vars, context) => {
    queryClient.setQueryData(lmsKeys.questions(lessonId), (old = []) =>
      old.map((q) => (q.id === context?.optimisticId ? serverQuestion : q)));
  },

  onError: (_err, _vars, context) => {
    if (context?.previousQuestions) {
      queryClient.setQueryData(lmsKeys.questions(lessonId), context.previousQuestions);
    }
  },
})
```

Input draft (`useState` in `QnaPanel`) is cleared immediately on submit
(optimistic UX matches AC-13 "xuất hiện đầu danh sách" instantly), restored
only if the caller wants a "restore draft on error" UX — not required by AC,
so simplest choice: clear on submit, don't restore (matches how chat compose
boxes in `messaging-screen.tsx` behave per repo precedent).

## 7. Server Action Result Shape (failure-key contract)

Per `i18n.md` (server never translates) and the confirmed repo convention
(`calendar-screen.tsx`'s `res.ok` pattern, `messaging` mutations):

```ts
// features/lms/domain/failures/lms.failure.ts
export type LmsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "unknown" };
// NOTE: no "already-complete" variant — re-trigger is a no-op success (§6.1).

// Shared action result shape (mirrors calendar/messaging pattern)
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: LmsFailure["type"] };

// app/.../[courseId]/actions.ts
export async function markLessonCompleteAction(
  lessonId: string,
): Promise<ActionResult<{ lesson: LessonContentEntity; courseProgress: CourseProgress }>> {
  "use server";
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const useCase = await makeMarkLessonCompleteUseCase();
  const result = await useCase.execute(lessonId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}
// saveNoteAction / askQuestionAction follow the identical { ok, data | errorKey } shape.
```

Client `useMutation`'s `mutationFn` throws when `ok: false` so `onError`
fires uniformly:

```ts
mutationFn: async (lessonId: string) => {
  const res = await actions.markLessonCompleteAction(lessonId);
  if (!res.ok) throw new LmsActionError(res.errorKey);   // small typed Error subclass carrying errorKey
  return res.data;
},
```

Presentation reads `mutation.error instanceof LmsActionError ? t(error.errorKey)
: t("unknown")` for a `role="alert"` inline message — i18n namespace
`courses.errors.<type>` (component-architect/i18n owns exact key names; this
doc only fixes the **shape and the union values** flowing through it).

## 8. Async State Machine

| Screen/region | Loading | Error | Empty | Stale/refetching | Success |
|---|---|---|---|---|---|
| `StudentCoursesScreen` | N/A on first paint (RSC-seeded `initialData` — never shows a spinner/skeleton for the *initial* load per AC-1's skeleton being for the *pre-hydration* SSR moment, not a client refetch); if a manual refetch is ever added, skeleton (not spinner) per CLAUDE.md guidance | RSC use-case failure → `page.tsx` renders an inline error ViewModel (no client query error state needed since there's no client refetch path for the list in this US) | Per-tab: `courses.empty.{allTab,inProgressTab,completedTab}` — computed from the client-side filtered array length, not a query state | N/A (staleTime 2 min, no visible background refetch UI needed since RSC already delivered fresh data) | Grid renders `CourseSummary[]` filtered by tab |
| `LessonPlayer` — lesson hierarchy | RSC-seeded, same as above — no client loading state on first paint | RSC use-case not-found → `notFound()` (404 page, matches Next.js convention); RSC unknown failure → inline error ViewModel | `getCourseLessons` empty-chapters result (mockup's designed empty state) → `courses.player.chapterList.emptyCourse` copy, content pane shows a neutral "chưa có nội dung" state instead of a lesson | N/A | Chapter list + content pane render |
| Notes panel | First access per lesson: `note.isLoading` → skeleton/placeholder text in the textarea area (brief moment, mock-local so effectively instant, but state must exist for real-repo future) | `note.isError` → inline `role="alert"` under textarea, `t("courses.player.notes.loadError")` | No note yet for this lesson → `content: ""`, textarea starts empty (not a distinct "empty state" UI, just an empty field) | N/A (staleTime 1 min) | Textarea seeded from `note.data.content` |
| Q&A panel | First access per lesson: `questions.isLoading` → skeleton list rows | `questions.isError` → inline `role="alert"` | `questions.data.length === 0` → `courses.player.qna.emptyState` copy | N/A | List renders, newest first |
| Mark-complete button | `mutation.isPending` → button shows a loading state (spinner icon inside the button is acceptable here — it's a button micro-state, not page data, so the "skeleton not spinner" rule for page data doesn't apply) | `mutation.isError` → inline `role="alert"` near the button, `t(error.errorKey)`; button re-enables (optimistic patch already rolled back) | N/A | N/A | Button flips to disabled "done" state (`courses.player.markComplete.doneLabel`) |
| Notes save button | `mutation.isPending` → button label swaps to a "saving" state | `mutation.isError` → inline `role="alert"`, textarea content preserved | N/A | N/A | Toast or inline confirmation (`courses.player.notes.savedToast`) — component-architect decides toast vs inline |
| Q&A ask button | `mutation.isPending` → submit button disabled briefly (optimistic item already visible, so this is a very short window) | `mutation.isError` → inline `role="alert"` above the input; optimistic item already rolled back from the list | N/A | N/A | Optimistic item shown immediately, later reconciled with server id |

## 9. Domain Pure-Fn Sharing (client-safe confirmation)

`calculateCourseProgress` (in `features/lms/domain/use-cases/calculate-course-progress.ts`)
is confirmed **safe to import directly into the client bundle**:
- It lives in `domain/`, which per the CLAUDE.md layer table has **zero
  framework/lib dependencies** and is explicitly listed as importable from
  `presentation/` (`domain/entities` types) — a pure function operating only
  on primitive/entity types extends the same guarantee (no `server-only`
  marker, no React, no `next/navigation`, no HTTP client import).
- Using the *same* function on the client (optimistic patch, §6.1) and on the
  server (Server Action / use-case, computing the authoritative post-mutation
  progress) is required, not just convenient: if the client hand-rolled an
  equivalent formula in the presentation layer instead of importing the
  domain fn, the two could silently drift (e.g., a future edge-case fix to
  rounding or the `total === 0` guard applied server-side only) — a subtle
  bug class this sharing eliminates by construction.
- Any small cache-patch helpers this doc references (`patchLessonDone`,
  `patchCourseProgress`, `countLessons`) are **not** domain use-cases (they
  reach into a `CourseSummary[]`/query-cache shape, which is presentation
  concern) — they belong in the client feature's presentation/lib layer (or
  co-located with the hook that uses them), and should call
  `calculateCourseProgress` internally rather than reimplementing the
  in-progress/completed threshold logic.

## 10. Race Conditions & Resolution

| Race | Resolution |
|---|---|
| User clicks "Đánh dấu hoàn thành" twice rapidly (double-click before the button's `disabled` state commits a re-render) | `mutation.isPending` guard on the click handler (component-architect wires `disabled={mutation.isPending}`) prevents a second `mutationFn` call; even if it slipped through, the action is idempotent (§6.1) so a duplicate call is harmless — second `onMutate` just re-patches `done: true` over `done: true`. |
| Mark-complete succeeds, then user immediately clicks "next lesson" before `onSuccess`'s confirmatory `setQueryData` finishes | Non-issue in practice — `setQueryData` is synchronous once the mutation's promise resolves, and lesson navigation (`setActiveLessonId`) is an unrelated state update; no shared mutable field is written by both. |
| User navigates back to `/student/courses` mid-mutation (mark-complete in flight) | `onMutate`'s optimistic patch already applied to `coursesList()` synchronously before the action even resolves, so the list screen (if still mounted/cached) already reflects the new progress; if unmounted and remounted, RSC re-fetch on the new page load reads the mock repo's already-mutated fixture (or the real BE's already-committed write) — either way consistent. No stale read possible because there is no `invalidateQueries`-triggered concurrent refetch racing the mutation (per §6.1's decision to avoid invalidate). |
| Two Notes saves in flight (fast repeated clicks on "Lưu" with edited content between clicks) | TanStack Query does not auto-cancel by default for a plain (non-optimistic) mutation; **recommend** the Notes save button also `disabled={mutation.isPending}` (component-architect wires this) so only one save is in flight at a time — avoids an out-of-order `onSuccess` overwriting newer content with an older response. No cache-side dedup logic needed given the button-disable guard. |
| Q&A: user asks a second question while the first optimistic entry hasn't resolved yet | Each `onMutate` reads the *current* cache (including any not-yet-resolved prior optimistic entries) via `getQueryData` at call time, so entries stack correctly (newest first) regardless of resolution order; rollback context captures a snapshot per-call, so an error on question #2 rolls back to the state *including* question #1's optimistic entry, not wiping it — verified by the snapshot being taken fresh in each `onMutate`, not shared across mutations. |
| Switching `activeLessonId` while a Notes/Q&A query for the *previous* lesson is still loading | Non-issue — `note(lessonId)`/`questions(lessonId)` are lesson-id-keyed, so switching triggers TanStack to key into a different cache entry and show that entry's own loading/cached state; the previous lesson's in-flight fetch (if any) completes into its own key harmlessly, no cross-contamination. |
| Course-list optimistic patch races a real background refetch (future, once BE ships and `staleTime` lapses) | Since no `invalidateQueries` is called on mutation success (§6.1), the only trigger for a background refetch is `staleTime` expiry + a refocus/remount — TanStack's default behavior on such a refetch is to overwrite the cache with the fresh server response once it resolves, which (once a real BE is authoritative) is correct-by-definition; the optimistic patch's only job is to bridge the visual gap until that fresh data arrives, so this is expected, not a bug. |

## 11. Open Items / Flags for fe-lead & fe-component-architect

- **fe-component-architect**: confirm the `activeLessonId` initial-selection
  rule (first incomplete lesson vs. first lesson overall) — this doc assumes
  "first incomplete, else first" to match a natural "resume where you left
  off" UX, but the mockup/AC don't state it explicitly; pick one and it's a
  pure client compute over already-cached `courseLessons` data, no query
  impact either way.
- **fe-lead**: no ADR needed — no global store introduced, no new token, no
  auth/data-contract decision beyond the already-decided failure-union shape
  (§7), which matches existing repo convention (`calendar-screen.tsx`
  precedent) rather than inventing something new.
- **fe-nextjs-engineer**: the `LmsActionError` typed-error wrapper in §7 is a
  presentation-layer convenience (throw-to-trigger-onError), not a domain
  type — keep it colocated with the hook/mutation definitions, not in
  `domain/failures/`.
