---
name: reference-e24-10-first-tanstack-course-tab
description: First TanStack Query usage in epic E24 (teacher course tab, reorder/patch/create/publish/delete) — mixed optimistic/non-optimistic mutation set on one screen, per-mutation rationale
metadata:
  type: reference
---

US-E24.10 (teacher course tab: drag-reorder timeline, inline date edit, add
item, publish, delete) is the first TanStack Query usage in epic E24 (every
prior E24 US was RSC + Server Action + `revalidatePath`/local `useState`).
Full design: `docs/stories/epics/E24-learning-class-hub/US-E24.10-course-tab-teacher/STATE-DESIGN.md`.

**Extends the existing `lms` key family** (US-E11.6's `["lms","course",courseId,"lessons"]`)
with a direct sibling `["lms","course",courseId,"items"]` and a new
`["lms","course",courseId]` (course entity, for the DRAFT/PUBLISHED banner).
Recommended extracting a shared `lmsKeys` factory file at this point — no
such file existed yet (each prior `lms` consumer inlined its own key).

**Mixed optimistic strategy on ONE screen, seven mutations, only ONE
optimistic** — useful precedent for "not every mutation on a TanStack screen
gets the same treatment, decide per-mutation against the AC wording":
- `reorderItems` (drag + keyboard, same mutation/code path for both):
  full `onMutate`/`onError` rollback/`onSuccess` resync — mirrors
  `feed-screen.tsx`'s `reactionMutation` almost verbatim (closest real
  precedent for optimistic-write-with-rollback in this repo). Keyboard
  "Lên/Xuống" calls the exact same `.mutate(newIds)` — no separate faster
  local-only path, avoids two divergent optimistic-write code paths for one
  key.
- `patchItem` (inline date edit): explicit exception to the repo's
  "never `setQueryData`-from-response, always invalidate" convention
  (moderation/staff-discipline/student-absences precedent) — justified
  because this is a single-row PATCH inside an already-loaded list (not a
  detail-query invalidation), and the AC literally says "state mới từ
  response" (BE recomputes derived `state` off the new window — client must
  not guess it, matches "state is BE-computed, never recomputed from a
  clock" EPIC rule).
- create×3 (lesson/assignment/document), publish, delete: all plain
  `onSuccess`-only `setQueryData`, zero `onMutate` — dialog-submit or
  confirm-gated actions, matches the repo's broad "never-optimistic
  single-row/destructive mutation" convention (confirmed 3+ places already).
  `publishCourse`'s race-409 branch (someone else already published) still
  invalidates on that SPECIFIC error branch only (race-branch invalidation
  asymmetry, US-E21.1 rule), not on generic network failure.

**RSC↔client boundary**: both `course` and `courseItems` queries seeded via
plain `initialData` props from `page.tsx`/`course-vm.ts` — no
`HydrationBoundary`/`dehydrate` (still zero repo-wide matches, reconfirmed).

**Race-condition note worth reusing**: `revalidatePath` (Next Router Cache)
and TanStack's client cache are independently governed — a mutation's
`revalidatePath` call never races the LIVE optimistic write within the same
mount; it only affects what a FUTURE navigation's RSC render seeds as
`initialData`. Don't conflate "did the Router Cache invalidate" with "did the
TanStack cache update" when reasoning about a mutation's post-conditions.

See also: [[query-key-conventions]], [[feedback-optimistic-update-no-usestate-mirror]].
