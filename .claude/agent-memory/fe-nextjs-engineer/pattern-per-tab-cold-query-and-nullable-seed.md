---
name: pattern-per-tab-cold-query-and-nullable-seed
description: E11.7 per-tab cold-mount query (key by activeTab, gcTime/staleTime 0), nullable RSC seed to distinguish empty-vs-not-seeded, shadcn Tabs already = WCAG APG tablist
metadata:
  type: project
---

US-E11.7 student-assignments (`src/features/lms/presentation/student-assignments`).

**Per-tab REAL refetch (not client filter).** When an AC says a tab switch
"unmounts the previous list + starts an independent loading cycle" (vs the
sibling student-courses client-filter-of-one-list), implement a genuine per-tab
query: `assignmentsKeys.list(tab)`, and render the list region in a component
**keyed by `activeTab`** (`<AssignmentsListRegion key={activeTab} .../>`) so
React unmounts/remounts the `useQuery` on every switch. Non-default tabs:
`gcTime:0` + `staleTime:0` (cold fetch every mount). Default RSC-seeded tab:
`initialData` + `staleTime:30_000` (no immediate refetch racing hydration).

**Why:** avoids duplicate mock call 0ms after hydration on the default tab while
giving every other tab a real, observable loading window each visit.

**Nullable RSC seed trap.** `initialData={activeTab==="all" ? initial : undefined}`
where `initial` is `AssignmentEntity[] | null` — pass `null` (not `[]`) from the
RSC when the seed FAILED, so the region cold-fetches instead of showing a wrong
empty state. `initialData: []` (not undefined) makes TanStack treat the query as
seeded-success → never fetches → shows empty forever. Distinguish RSC-success-
empty (`[]`) from RSC-fail-not-seeded (`null` → `?? undefined`).

**shadcn `Tabs`/`TabsList`/`TabsTrigger` (Radix) already IS the full WCAG APG
tablist** — role=tablist/tab, aria-selected, roving tabindex, arrow-key nav,
Enter/Space activation. Do NOT hand-roll a tablist for the "full APG pattern"
AC; reuse the primitive (list region rendered separately, keyed by tab —
`TabsContent` not needed). Confirmed with the storybook interaction runner.

**Non-optimistic submit + cache patch** (state-arch §13.4): no `onMutate`;
`isPending` drives the visible "Đang nộp bài…" sub-state; `onSuccess` patches
only the active tab's cache (`setQueryData`) + `invalidateQueries({refetchType:
"inactive"})` for the rest (they're `gcTime:0`-evicted anyway) — no full 4-way
manual patch (would duplicate the mock filter predicate = drift). Carry the
failure key through the mutation via a small `AssignmentActionError` class.
