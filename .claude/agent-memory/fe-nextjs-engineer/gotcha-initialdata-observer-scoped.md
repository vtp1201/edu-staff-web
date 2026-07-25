---
name: gotcha-initialdata-observer-scoped
description: TanStack Query initialData is observer-scoped not key-scoped — an RSC-seeded list silently re-seeds every changed filter and never refetches; also where the skeleton story actually lives
metadata:
  type: feedback
---

`initialData` on a `useQuery` is applied by the **observer**, not by the query key.
When the filter (and therefore the key) changes, the NEW key gets seeded with the
first paint's rows again, so the UI shows stale data for the new filter and **no
fetch ever fires**.

**Why:** found on US-E09.6 (student-absences). The principal's class-filter story
asserted `listAbsencesAction` was called with the new `classId` and got
`Number of calls: 0` — the filter looked like it worked (rows rendered) but they
were the schoolwide rows re-seeded. A filter that silently shows the wrong data is
worse than a loading flash, and it broke the AC outright.

**How to apply:** seed only the filter the RSC actually fetched.

```ts
const [seededFilterKey] = useState(() => JSON.stringify(filter));
const isSeededFilter = JSON.stringify(filter) === seededFilterKey;
initialData: initialErrorKey || !isSeededFilter ? undefined : initialAbsences,
```

Two follow-on consequences worth remembering:

1. **The skeleton story must live on a cold key, not on retry.** For an
   RSC-seeded list the first paint never shows a skeleton, and *retry after an
   error does not either* — once `status === "error"`, `isLoading`
   (`isPending && isFetching`) stays false, so a `refetch()` re-renders the error,
   not the skeleton. Prove NFR "skeleton" by **changing a filter** (new key, no
   seed) with a never-settling action. Same trap as
   [[pattern-per-tab-cold-query-and-nullable-seed]]'s `null ≠ []`.
2. **Do not "fix" it by dropping the seed when `initialAbsences` is empty** — a
   genuinely empty RSC result would then refetch and flash a skeleton before the
   empty state.

Related: [[pattern-rsc-seeded-infinite-query]], [[pattern-nonblocking-overlay-query]].
