# US-E24.10 State Architecture — Course tab (teacher)

Owner: fe-state-engineer. No code written here — state shape, query keys,
invalidation/optimistic contract only. Grounded in `PLAN.md` (fe-planner,
already ground-truthed the repo/BE gaps — read that first) and the actual
shipped code under `src/features/lms/presentation/course-timeline/**` +
`src/app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/actions.ts`.

This is the **first TanStack Query usage in epic E24** (US-E24.8/9/11 are all
RSC + Server Action + `revalidatePath`/local `useState`). Everything below is
new ground for this epic but NOT new ground for the repo — every mechanism
here has a direct, cited precedent elsewhere (`feed-screen.tsx` for
optimistic reorder, several non-optimistic single-row mutations for the other
6). No pattern is invented from scratch.

---

## 1. State Architecture Summary

| Concern | Mechanism | Why |
|---|---|---|
| Course + items, first paint | RSC (`page.tsx` → `course-vm.ts` → `buildCourseTabVm`) | existing hub convention (US-E24.8/9), zero waterfall |
| Items list, post-first-paint | TanStack `useQuery`, `initialData` seeded from the RSC prop | only sub-tree that needs a durable client cache (reorder drag needs to read/write it optimistically) |
| Reorder (drag + keyboard) | TanStack `useMutation`, full `onMutate`/`onError` rollback | the ONE truly latency-sensitive, must-not-flash mutation in this screen |
| Sửa ngày (`patchItem`) | TanStack `useMutation`, **no** `onMutate` — `onSuccess: setQueryData(response)` | packet AC literally says "lưu → dòng cập nhật... từ response", i.e. wait-then-render, never optimistic |
| Create (lesson/assignment/document) | TanStack `useMutation`, **no** `onMutate` — `onSuccess: setQueryData(prepend)` + close dialog | dialog-submit, brief pending spinner acceptable, matches repo's "never-optimistic single-row mutation" convention |
| Publish course | TanStack `useMutation`, **no** `onMutate` — `onSuccess: setQueryData` on a SEPARATE `course` key + invalidate/no-op on items | one-way transition, zero UI flip before 2xx (mirrors academic-record-seal precedent) |
| Delete DOCUMENT item | TanStack `useMutation`, **no** `onMutate` — `onSuccess: setQueryData(remove)`, confirm-gated | destructive; repo convention is never-optimistic-remove (moderation/feed precedent) |
| Selected subject (`?subjectId=`) | URL search param, RSC-driven navigation (`router.push`) | shareable/deep-linkable, matches `?week=` precedent; changing it is a real RSC re-render, not a client fetch |
| Edit-window-row open/close, dialog open/close, drag source id | Local `useState` inside the row/container | pure UI toggle, never shared, never server data |
| Course DRAFT/PUBLISHED status shown in banner | Derived from the `course` query's cached entity (not a second boolean) | single source of truth — same rule as lesson-plan's "already-published" precedent |

**Key decision this doc fixes:** the packet's own Design Notes text ("optimistic
reorder... onMutate/onError rollback... this is where TanStack is warranted")
is honored **literally only for reorder**. The other 6 mutations get
`useMutation` too (uniform mental model, one cache is the source of truth —
same reasoning as feed's pin/unpin being modeled as `useMutation` even though
it's a no-op call), but with **zero** `onMutate`/optimism, per the packet's
own AC wording for `patchItem` and the repo-wide "never-optimistic
single-row/destructive mutation" convention (confirmed 2×+ across moderation,
staff-discipline, student-absences, admin/parent-links, feed's own
create/report/remove-adjacent mutations).

No global client store introduced. No new realtime/SSE surface (this screen
has no SSE requirement in the packet).

---

## 2. State Inventory

| Item | Type | Owner | Shape | Reason |
|---|---|---|---|---|
| `course` (entity: id, subjectId, classId, status, isDefault) | Server state | TanStack `useQuery` (`lmsKeys.course(courseId)`), RSC-seeded | `Course` entity (existing) | Needed independently of items for the DRAFT banner + `publish` mutation target; RSC already fetches it once (`course-vm.ts` §4.3) |
| `items` (the timeline) | Server state | TanStack `useQuery` (`lmsKeys.courseItems(courseId)`), RSC-seeded | `CourseItem[]` (existing entity) mapped to `WeekVm[]` client-side via existing `toWeekVms` | the mutable, optimistic-eligible cache — reorder/patch/create/delete all target this one key |
| `subjectOptions` / `selectedSubjectId` | URL state | `?subjectId=` search param, read via `page.tsx` searchParams (server) | `{id, name, isMine}[]`, `string` | shareable, matches `?week=` precedent; a change is a real RSC round-trip (new course, new items) — not a client-only re-filter |
| `courseStatus` (DRAFT/PUBLISHED banner) | Derived from server state | derived selector over the `course` query's `data.status`, NOT a separate `useState` | `CourseStatus` | single source of truth (lesson-plan "already-published" precedent) |
| Reorder drag source (`draggedItemId`) | Local UI state | `useState` inside `course-timeline.tsx` (root, per US-E24.3's "mode branching lives only at the root") | `string \| null` | pure interaction state, never a mutation input by itself — only feeds `buildReorderedItemIds` |
| Edit-window-row open toggle | Local UI state | `useState` inside `timeline-row.tsx`, one row at a time (or per-row, see Race Conditions §8) | `boolean` (or `openRowId: string \| null` lifted to `week-section.tsx` if only one row can edit at a time — see §8) | pure UI, no server round-trip until "Lưu" |
| Create-item dialog open + `kind` | Local UI state | `useState` inside `teacher-course-tab.tsx` (owns the `AddItemMenu` → `CreateItemDialog` wiring) | `{ open: boolean; kind: "lesson" \| "assignment" \| "document" \| null }` | pure UI |
| Create-item form fields (title/content/description/startAt/dueAt/url) | Local form state | react-hook-form + zod inside `create-item-dialog.tsx` | per Design Notes' 3 field sets | not shared, not server-derived |
| Delete-confirm dialog open + target itemId | Local UI state | `useState` inside `timeline-row.tsx` or lifted to `week-section.tsx` | `string \| null` | feeds `DestructiveConfirmDialog` (existing shared component, US-E17.8) |
| `reorderMutation` pending item ids (for a disabled-state during drag settle) | Derived from `useMutation`'s own `isPending`/`variables` | TanStack mutation object | n/a | matches "row-level pending state via `mutation.variables`" precedent (US-E21.1) — no parallel boolean map |
| Each mutation's failure key (toast text) | Ephemeral, read directly off `mutation.error` at render/toast-fire time | not persisted in any `useState` | `LmsFailure["type"]` | toasts fire once, no need to keep it in state |

---

## 3. State Flow

```
page.tsx (RSC)
  ├─ resolveCourseTimelineMode(...) → mode: "teacher" | "readonly"
  ├─ buildCourseTabVm({ classId, teacherSubjects, subjectIdParam })
  │    → listCourses / getCourse / listItems  (server-side, existing di)
  │    → TeacherCourseTabVm { course, items, subjectOptions, selectedSubjectId, mode, courseStatus }
  └─ <TeacherCourseTab vm={vm} actions={COURSE_ACTIONS} />   'use client'
        ├─ useQuery(lmsKeys.course(courseId), { initialData: vm.course })
        ├─ useQuery(lmsKeys.courseItems(courseId), { initialData: vm.items })
        ├─ useMutation(reorderItemsAction)     — onMutate/onError/onSettled
        ├─ useMutation(patchItemAction)        — onSuccess only
        ├─ useMutation(createLessonAction)     — onSuccess only
        ├─ useMutation(createAssignmentAction) — onSuccess only
        ├─ useMutation(addDocumentItemAction)  — onSuccess only
        ├─ useMutation(publishCourseAction)    — onSuccess only, targets `course` key
        └─ useMutation(deleteItemAction)       — onSuccess only
```

Every `xAction` above is the SAME Server Action shape already ground-truthed
in `PLAN.md` §4 (`assertOwnCourseSubject` gate → use-case → `revalidatePath`)
— `mutationFn` is a thin wrapper that calls the bound action prop and either
returns `res.data` or `throw`s the failure union (mirrors feed's
`reactionMutation.mutationFn` exactly: `if (!res.ok) throw { type:
res.errorKey, retryable: res.retryable }; return res.data;`).

`revalidatePath(CLASS_HUB_PATH, "page")` inside the action still fires on
every successful mutation (per `PLAN.md` §4, unconditionally) — this busts
the **Next.js Router Cache**, not the TanStack cache. Its effect is: the NEXT
full navigation into this tab (switch tabs and back, or a hard refresh) gets
server-fresh `initialData`. It does **not** race the client `setQueryData`
call within the current mount — these are two independent cache layers, and
per the repo's course/lesson precedent (US-E11.6) that's the intended
division of labor: TanStack owns the live client cache, `revalidatePath` owns
the next-navigation freshness. No SSE/realtime invalidation applies to this
screen (no cross-session-live requirement in the packet).

---

## 4. Query Key Hierarchy + Cache Policy

Extends the **existing** `lmsKeys` shape already established in US-E11.6
(confirmed convention: `["lms", "course", courseId, "lessons"]` etc. — the
packet's own key `["lms","course",courseId,"items"]` is a direct sibling of
that, not a new shape):

```ts
export const lmsKeys = {
  all:           ()                 => ["lms"]                                as const,
  coursesList:   ()                 => ["lms", "courses", "list"]             as const,
  course:        (courseId: string) => ["lms", "course", courseId]            as const, // NEW — course entity itself (status, isDefault, subjectId)
  courseItems:   (courseId: string) => ["lms", "course", courseId, "items"]   as const, // NEW — this US, matches packet literally
  courseLessons: (courseId: string) => ["lms", "course", courseId, "lessons"] as const, // pre-existing (US-E11.6), untouched
  note:          (lessonId: string) => ["lms", "lesson", lessonId, "note"]    as const, // pre-existing, untouched
  questions:     (lessonId: string) => ["lms", "lesson", lessonId, "questions"] as const, // pre-existing, untouched
}
```

No new file needed if `lmsKeys` doesn't exist as a standalone module today —
grep confirms **no `lmsKeys` factory file exists yet** in this repo (the
US-E11.6 precedent documented in memory was never extracted to a shared
`lms.query-keys.ts`; each consumer inlined its own key). **Recommendation for
this US**: extract `lmsKeys` into
`features/lms/presentation/lms.query-keys.ts` now (first multi-key,
multi-consumer use of the `lms` namespace across two subtrees — course-detail
`useQuery`s here are the second `lms`-prefixed key family after
US-E11.6's course/lesson one) so a future consumer doesn't re-derive the
`["lms","course",courseId,...]` shape independently. Flag to
`fe-component-architect`/`fe-nextjs-engineer` as a small refactor-while-here,
not a blocking dependency.

**Cache policy:**

| Key | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Rationale |
|---|---|---|---|---|
| `lmsKeys.course(courseId)` | `60_000` (global default) | `300_000` (default) | `false` (default) | low-churn (status flips once, DRAFT→PUBLISHED); no reason to override the global default |
| `lmsKeys.courseItems(courseId)` | `60_000` (global default) | `300_000` (default) | `false` (default) | matches the "explicit-save form fields don't need aggressive freshness" precedent — every mutation here is explicit-submit (drag-drop counts as explicit), not live-collab; no other session is expected to be editing the same course concurrently in this epic's scope |

Both queries are seeded via `initialData` from the RSC props — **no
`HydrationBoundary`/`dehydrate` anywhere** (confirmed repo-wide, zero
matches, per the `rsc-readonly-pattern`/`query-key-conventions` memory
entries — this repo's one-and-only RSC→TanStack bridge mechanism is a plain
`initialData` prop, e.g. US-E12.12 audit-log). No client-side re-fetch on
mount as long as `initialData` is present; a background refetch can still
happen if the user leaves the tab and `staleTime` elapses before returning
(acceptable, matches every other `initialData`-seeded query in this repo).

**No `useInfiniteQuery` needed** — `listItems` returns the FULL course
timeline (spec says ≤500 items is the hard ceiling, `LMS_ITEM_LIMIT_EXCEEDED`
at creation time), not a cursor-paginated list; `api-integration.md`'s cursor
guidance applies to `GET`-list endpoints with `meta.pagination`, which this
one is not (confirmed: US-E24.3/E24.5 already consume `listItems` as a
single non-paginated array).

---

## 5. Invalidation Map

| Trigger | Keys invalidated / patched | Mechanism |
|---|---|---|
| `reorderItemsAction` success | `lmsKeys.courseItems(courseId)` | `onMutate` optimistic write (new order) → `onSuccess`/`onSettled`: **no invalidate** — the optimistic order IS already correct (BE echoes the same order back on success); only overwrite with the response if the response shape differs from the optimistic guess (defensive `setQueryData(response)` in `onSuccess`, cheap no-op when they match) |
| `reorderItemsAction` failure (`404 not-found` = id-set drift, or any other) | `lmsKeys.courseItems(courseId)` | `onError`: rollback to the snapshotted previous value; **additionally** for the specific `not-found` (id-set-mismatch) branch, follow with `invalidateQueries({ queryKey: lmsKeys.courseItems(courseId) })` to force a real refetch — the packet's own copy ("404 → tập id lệch → refetch") requires a REAL server re-read here, rollback-to-stale-snapshot alone is not enough since the snapshot itself is what's now wrong |
| `patchItemAction` success | `lmsKeys.courseItems(courseId)` | `onSuccess: setQueryData` — replace the one item in place with the response entity (never `invalidateQueries`, per the repo's "non-optimistic mutation: `setQueryData`-from-response IS the right shape when the mutation is a single-field patch with an explicit save button" — see caveat in §6 vs. the *stricter* "invalidate-then-refetch, never setQueryData" convention; this mutation is the one deliberate exception, justified below in §6) |
| `patchItemAction` failure | none | error stays on the row (inline `aria-invalid` for 422 `invalid-window`); item list untouched |
| `createLessonAction` / `createAssignmentAction` / `addDocumentItemAction` success | `lmsKeys.courseItems(courseId)` | `onSuccess: setQueryData` — append the new item (server response carries the real id/position); close dialog, toast success |
| same, failure | none (dialog stays open, inline field error for 422 `invalid-url`/`invalid-content`) | — |
| `publishCourseAction` success | `lmsKeys.course(courseId)` | `onSuccess: setQueryData` — replace `status: "DRAFT"` → `"PUBLISHED"` from the response entity; banner disappears because it derives from this key, no second flag |
| `publishCourseAction` failure (409, already published) | `lmsKeys.course(courseId)` | `onError` for THIS SPECIFIC race branch: `invalidateQueries({ queryKey: lmsKeys.course(courseId) })` — mirrors the repo's "race-branch invalidation asymmetry" rule (US-E21.1): a 409 here means someone else (or a duplicate click) already transitioned it, so pull real state rather than leave the stale DRAFT banner up |
| `deleteItemAction` success | `lmsKeys.courseItems(courseId)` | `onSuccess: setQueryData` — remove the item from the cached array (never optimistic-remove, confirm dialog already gates it — matches moderation/feed's never-optimistic-destructive convention) |
| `deleteItemAction` failure (`409 not-document`, `404 not-found`) | none | toast only; item stays (a concurrent delete already removed it server-side, but there's no requirement here to auto-refresh — low-frequency admin-style action, next navigation's `revalidatePath` catches it) |
| Tab switch away and back / hard refresh | both keys | handled by `revalidatePath(CLASS_HUB_PATH,"page")` (already fired by every action) re-seeding fresh `initialData` on the next RSC render — **not** a client `invalidateQueries` call |

---

## 6. Mutations & Optimistic Strategy

### 6.1 `reorderItems` — the ONE optimistic mutation

```
mutationFn: (itemIds: string[]) => reorderItemsAction(classId, courseId, itemIds)
  → { ok:true, data: CourseItem[] } | { ok:false, errorKey }
  → throw { type: errorKey } on !ok

onMutate: (itemIds) => {
  cancelQueries(lmsKeys.courseItems(courseId))
  const previous = getQueryData(lmsKeys.courseItems(courseId))
  setQueryData(lmsKeys.courseItems(courseId), reorderLocalItems(previous, itemIds))
  return { previous }
}

onError: (err, itemIds, ctx) => {
  if (ctx?.previous) setQueryData(lmsKeys.courseItems(courseId), ctx.previous)
  if (failureType(err) === "not-found") {
    invalidateQueries({ queryKey: lmsKeys.courseItems(courseId) })   // force real refetch, id-set drifted
    toast.error(t("errors.reorderIdMismatch"))
  } else {
    toast.error(t(`errors.${failureType(err)}`))
  }
}

onSuccess: (serverItems) => {
  setQueryData(lmsKeys.courseItems(courseId), serverItems)   // defensive resync, cheap no-op if already identical
}
```

- **`itemIds` sent = the packet's literal requirement**: "toàn bộ id theo
  thứ tự mới" — `mutate()` is called with the COMPLETE reordered id array
  built by `buildReorderedItemIds` (pure domain fn, `PLAN.md` §1), never a
  partial diff. `mutationFn`'s only job is to thread that array through
  `reorderItemsAction`.
- `reorderLocalItems(previous, itemIds)`: a pure client-side helper (paired
  with the domain `buildReorderedItemIds`, lives in `course-timeline.derive.ts`
  alongside `toWeekVms`) that re-projects the CURRENT cached `CourseItem[]`
  into the NEW id order, preserving each item's own fields — this is what
  `setQueryData` writes, then the existing `toWeekVms` re-groups into weeks
  for render. No new server shape guessed — the reorder response's `position`
  fields ARE trusted as final in `onSuccess`.
- **Keyboard "Lên/Xuống" uses the exact SAME mutation** (`reorderMutation.mutate(buildReorderedItemIds(currentIds, rowId, siblingId, "before"|"after"))`)
  — answers task item **#8**: yes, it feels responsive immediately, because
  it goes through `onMutate` exactly like drag-drop; there is no separate,
  faster "just flip local state" path for the keyboard case, since that would
  create two divergent optimistic-write code paths for one cache key (drag's
  `onDrop` and the button's `onClick` both just call `.mutate(newIds)`).

### 6.2 `patchItem` (Sửa ngày) — explicit exception to "never setQueryData-from-response"

```
mutationFn: (input: PatchItemInput) => patchItemAction(classId, courseId, itemId, input)
onSuccess: (updatedItem) => setQueryData(lmsKeys.courseItems(courseId), replaceItem(old, updatedItem))
onError: — none (row stays in "editing" local state, inline error shown from mutation.error)
```

Answers task item **#3**: **no optimistic write.** The packet's own AC text
— "lưu → dòng cập nhật window + state mới **từ response**" — is explicit
that the row's new `state`/`window` must come from the server's recomputed
value, not a client guess. `state` (OPEN/UPCOMING_HIDDEN/CLOSED) is
BE-computed off the new window + "now" (EPIC §2's existing "state is
BE-computed, never recomputed from a clock" rule for `TimelineItemVm`) — a
client optimistic guess would have to duplicate that state-machine logic,
which is exactly the kind of drift-risk rule this repo already enforces for
the read path. This is why `onSuccess: setQueryData(response)` is used here
(NOT `invalidateQueries`), even though §5's general note flags this as an
exception to the repo's stricter "never setQueryData-from-response, always
invalidate-then-refetch" convention (moderation/staff-discipline/
student-absences precedent): those precedents are all **status-transition**
mutations on a record with its OWN detail query elsewhere; this one is a
**field patch on one row inside an already-loaded list**, and the response
already IS the full authoritative row — an `invalidateQueries` round-trip
here would refetch the ENTIRE course-items array just to update one row,
which is wasteful and, worse, would visually flash the whole list through
its own refetch state. Document this divergence explicitly for
`fe-nextjs-engineer` and `fe-tech-lead-reviewer` so it isn't read as an
inconsistency with the other precedents — it's a deliberate, narrower case
(single-row list patch vs. detail-query invalidation).

### 6.3 `createLesson` / `createAssignment` / `addDocumentItem`

```
mutationFn: (input) => create*Action(classId, courseId, input)
onSuccess: (created) => { setQueryData(lmsKeys.courseItems(courseId), appendItem(old, created)); closeDialog(); toast.success(...) }
onError: — inline dialog field error (422 invalid-url/invalid-content), dialog stays open (matches the repo's "error that's a direct synchronous consequence of the action just taken inside an open dialog → inline, not toast" rule)
```

Answers task item **#4**: **no optimistic append.** These are dialog-submit
flows (brief pending spinner on the Save button is fine, matches every
create-dialog precedent in the repo — parent-links, invitations, etc., none
of which optimistically insert a row before the server confirms). The one
exception elsewhere in this repo that DOES optimistically prepend
(feed's `createMutation`) is justified there by a live social-feed's
perceived-realtime expectation; a course-builder dialog has no such
expectation — packet AC only requires the dialog closes and the row appears,
not that it appears INSTANTLY before the round trip.

`startAt` prefill (packet: "gợi ý = tuần đang chọn hoặc null") is a
**form default value**, not query state — computed once when the dialog
opens from the currently-viewed week, lives in `create-item-dialog.tsx`'s
react-hook-form `defaultValues`, never touches the query cache.

### 6.4 `publishCourse`

```
mutationFn: () => publishCourseAction(classId, courseId)
onSuccess: (published) => setQueryData(lmsKeys.course(courseId), published)
onError: (err) => {
  if (failureType(err) === <the still-open 409 code, PLAN.md §2's OPEN QUESTION>) {
    invalidateQueries({ queryKey: lmsKeys.course(courseId) })   // race: someone else/a double-click already published
  }
  toast.error(...)
}
```

Answers task item **#5**: simple, non-optimistic, single-target invalidate
(`course` key only — `items` never changes shape on publish, no need to
touch `courseItems`). Note the `PLAN.md` §"Risks" open question (exact 409
error code un-ground-truthed) is a **domain/failure-union** gap, not a state
question — this doc's contract (`onError` branches on whichever code
`fe-nextjs-engineer` confirms) is written to be code-agnostic on purpose so
it doesn't need to change once that's resolved.

### 6.5 `deleteItem` (DOCUMENT only)

```
mutationFn: (itemId) => deleteItemAction(classId, courseId, itemId)
onSuccess: (_, itemId) => setQueryData(lmsKeys.courseItems(courseId), removeItem(old, itemId))
onError: — toast only, no cache change (item was never removed from the UI before the response — confirm dialog + wait, matches moderation/feed's never-optimistic-remove rule)
```

Answers task item **#6**: **no optimistic remove.** Confirm dialog
(`DestructiveConfirmDialog`, reused per `component-organization.md`) already
adds one interaction step of latency tolerance, and the repo's `moderation`/
feed precedent is unanimous on this shape for any destructive action.

---

## 7. Async State Machine

| Surface | Loading | Error | Empty | Stale/Refetching | Success |
|---|---|---|---|---|---|
| Course + items (first paint) | RSC — no client skeleton; `page.tsx` itself suspends (existing hub Suspense boundary) | RSC-level: existing degrade contract — a failed `listItems` read renders the header alone + inline `errorKey` banner (unchanged from `CourseTimeline`'s student mode; teacher mode reuses the SAME `errorKey`/"Thử lại" mechanism, now backed by a mutation-style retry: `refetchQuery` or the existing plain re-read action) | `EmptyState` (existing, `course-timeline.tsx`) — teacher mode ADDS the "+ Thêm mục" affordance inside the empty state per Design Notes | items query background-refetch: no visible skeleton (data already present via `initialData`) — a subtle "syncing" affordance is optional, not required by AC | timeline renders |
| Reorder | drag/keyboard interaction is instant (optimistic) — no spinner needed; a `reorderMutation.isPending` flag can dim the dragged row only (not the whole list) | rollback + `toast.error(t(errorKey))`; `not-found` case additionally shows the refetched (correct) order silently after the toast | n/a | n/a | order settles, no toast on plain success (silent — matches drag UX conventions, a success toast on every drop would be noisy) |
| Sửa ngày | Save button `disabled` + inline spinner while `patchMutation.isPending && mutation.variables?.itemId === row.id` (row-level pending via `mutation.variables`, US-E21.1 precedent) | inline field error via `aria-invalid`/`aria-describedby` for `invalid-window`; `exam-window-not-editable` never reachable (button pre-disabled for EXAM rows per packet) | n/a | n/a | row collapses back to display mode with new window text |
| Create dialog | Save button spinner + disabled while pending | inline field error (422) shown under the offending field; non-422 (e.g. `limit-exceeded`) → dialog-level banner, dialog stays open | n/a | n/a | dialog closes, toast success, new row visible |
| Publish banner | button spinner while pending | toast error; banner unchanged (still DRAFT) unless the specific race-409 branch fires, then banner disappears (query invalidated → status now genuinely PUBLISHED) | n/a | n/a | banner disappears |
| Delete confirm | confirm-dialog's own confirm button spinner | toast error; dialog closes regardless (item state resolved either way — either it's gone or the delete genuinely failed and the row is unchanged) | n/a | n/a | row removed, toast success |

Failure → i18n mapping reuses the EXISTING `courses.errors.*` catalogue
(`LmsFailure["type"]`-keyed, already used by `CourseTimeline`'s retry banner)
verbatim for every server-side branch — no duplicate error strings under
`courses.teacher.*` (per `PLAN.md` §8's own i18n plan). Client-side
pre-validation errors (`isHttpsUrl`/`isDueAfterStart` failing before any
network call) use the NEW `courses.teacher.errors.invalidUrl` /
`courses.teacher.errors.invalidWindow` keys, since those are never returned
by a `LmsFailure` — they're a distinct "never even sent" client-only
message, not a server error key.

---

## 8. Race Conditions & Resolution

1. **Two rapid reorders (fast double-drag before the first settles).**
   TanStack's default behavior with a single mutation instance queues
   `mutate()` calls sequentially; `onMutate` for the SECOND call reads
   whatever `getQueryData` currently holds (i.e., the FIRST call's already-
   applied optimistic write), so the second optimistic write layers
   correctly on top. Resolution: **do nothing extra** — rely on
   `cancelQueries` inside `onMutate` (already in the spec above, mirrors
   feed's `reactionMutation`) to abort any in-flight background refetch that
   would otherwise clobber the second optimistic write. If the FIRST
   request's response arrives after the second's optimistic write already
   landed, its `onSuccess: setQueryData(response)` would incorrectly
   overwrite the second drag's newer order — **mitigation**: track a
   monotonic `mutation.submittedAt` (or simpler, rely on TanStack's own
   built-in request de-dup/cancellation via `cancelQueries` in `onMutate`,
   which is the standard TanStack answer to this exact race) — flag to
   `fe-nextjs-engineer`: disable the grip/keyboard buttons while
   `reorderMutation.isPending` is a simpler, sufficient fix for a
   single-user single-tab screen (no concurrent multi-drag is realistically
   reachable once the UI itself blocks a second drag start during the first's
   flight).

2. **Reorder optimistic write racing a concurrent `patchItem`/`createX`/
   `deleteItem` on the same `courseItems` key.** All six non-reorder
   mutations only run from an explicit Save/Confirm click, and the row-level
   pending-disable (§7) prevents starting a SECOND mutation on the same row
   while one is in flight — but a DIFFERENT row's patch could race the
   in-flight reorder drag. Resolution: `patchItem`'s `onSuccess:
   setQueryData(replaceItem(...))` operates on whatever the CURRENT cache
   holds (including a still-in-flight reorder's optimistic order) and only
   replaces the ONE item's own fields, never re-derives order — so it cannot
   stomp the reorder's ordering. The reverse (reorder's `onMutate` running
   while a patch is in flight) is similarly safe: `reorderLocalItems`
   re-projects existing item OBJECTS (untouched) into a new order, so it
   never reverts a concurrently-patched field. No explicit mutex needed;
   this falls out of each mutation touching a disjoint slice of the same
   cached array (order vs. one row's fields).

3. **`revalidatePath`'s next-navigation RSC re-fetch racing a still-open
   optimistic reorder within the SAME mount.** Not applicable within one
   mount — `revalidatePath` only affects a FUTURE navigation's RSC render,
   never the live client cache (§3). The only real race is: user drags,
   drop resolves, user immediately switches tabs and back BEFORE
   `revalidatePath`'s invalidated Router Cache entry has been re-fetched —
   Next.js's own Router Cache semantics (not TanStack) govern that; the
   returned `initialData` on the next mount will already reflect the
   settled reorder (mutation resolved before the tab switch could complete),
   so no stale flash is possible here — this generalizes the `PLAN.md`
   Risks section's own open concern ("switching tabs and back picking up
   server-confirmed order") to: **yes, it does**, because `initialData` is
   re-derived from a fresh RSC render every time the route remounts, and
   the RSC's own `listItems` call is always server-truth at THAT render
   time, independent of whatever the client cache held before unmount.

4. **GVCN reads a course while its GVBM concurrently reorders/edits it
   (readonly mode, no mutations available to the GVCN at all).** No race
   exists client-side — `mode: "readonly"` never mounts any mutation, so the
   only question is staleness of the READ, governed by the same
   `staleTime`/`initialData` policy as any other read (§4) — acceptable per
   the packet (no live-collab requirement, no SSE in scope).

5. **`assertOwnCourseSubject`'s server-side re-derivation racing a mode
   change client never re-renders.** If BE's/another admin's data changes
   such that the teacher no longer owns the subject (e.g. reassignment)
   between the RSC render (mode: "teacher") and a mutation attempt, the
   Server Action's own gate (re-run on every call, per `PLAN.md` §4) is the
   authoritative check — a stale client-side `mode==="teacher"` merely
   renders mutation-capable UI; the actual gate is re-derived server-side on
   every action call regardless of what the client believes. `onError`
   branch for `errorKey: "forbidden"` shows a toast and (recommended, flag
   to `fe-nextjs-engineer`) triggers `router.refresh()` to force the RSC to
   re-resolve `mode` for the NEXT render — same "403 → refetch via
   `router.refresh()`" pattern already established for US-E24.11's
   `pending-leave-card.tsx`. Per that same memory precedent
   (`feedback-content-derived-remount-key`), if any client leaf mirrors this
   server list via a `useState` (it does not here — TanStack IS the cache,
   no parallel `useState` mirror), it would need a content-derived remount
   key; since this screen uses `useQuery`/`useMutation` directly (no
   `useState` mirror anywhere in this doc's design), that concern does not
   apply here — noted explicitly so a reviewer doesn't ask for it needlessly.

---

## Answers to the assignment's 8 numbered questions (summary, cross-referenced above)

1. **Query key**: `["lms","course",courseId,"items"]` confirmed correct and
   consistent — it's a direct sibling of the ALREADY-shipped
   `["lms","course",courseId,"lessons"]` key from US-E11.6 (§4). Student side
   (`course-timeline.tsx`) uses **zero** TanStack today (confirmed by reading
   the file — plain `useState` + a one-shot retry action); this US is
   genuinely the first `lms`-presentation consumer of a `courseItems`-shaped
   TanStack key. Recommend extracting a shared `lmsKeys` factory now (§4).
2. **Optimistic reorder**: full `onMutate`/`onError`/`onSettled` contract in
   §6.1, mirroring `feed-screen.tsx`'s `reactionMutation` almost verbatim
   (closest real precedent in the repo for optimistic-write-with-rollback).
   `mutate()` is always called with the COMPLETE reordered id array (never a
   partial diff), built by the domain `buildReorderedItemIds` fn.
3. **Sửa ngày**: confirmed **NOT optimistic** — `onSuccess`-only, patches
   from the response (§6.2), because BE recomputes `state` and the packet's
   own AC wording says "từ response."
4. **Thêm mục (×3)**: **not optimistic** — dialog-submit-and-wait,
   `onSuccess` appends + closes dialog (§6.3).
5. **Publish course**: simple non-optimistic mutation, invalidates the
   SEPARATE `course` key only, not `courseItems` (§6.4).
6. **Xoá DOCUMENT**: **not optimistic** — confirm-then-wait,
   `onSuccess` removes from cache (§6.5).
7. **RSC↔client boundary**: `page.tsx`/`course-vm.ts` fetch once server-side
   (existing `buildCourseTabVm` per `PLAN.md` §4); client seeds BOTH
   `useQuery`s via plain `initialData` props — **no `HydrationBoundary`**
   anywhere in this repo (confirmed repo-wide grep, zero matches); this is
   the same mechanism as every other `initialData`-seeded query here
   (US-E12.12 audit-log being the clearest precedent) (§4, §3).
8. **Keyboard Lên/Xuống**: same mutation object, same `.mutate(newIds)` call
   as drag-drop — yes, optimistic immediately, via the identical `onMutate`
   path (§6.1) — no separate faster/local-only code path.
