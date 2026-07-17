# State Architecture — US-E11.8 Teacher Lesson Plan Authoring

Written by `fe-state-engineer`. Finalizes `plan.md` §4's sketch — does not
contradict it. Build contract = `spec.md` (cite for every AC reference below).
No global client store (Zustand/Redux/Jotai) — server state via TanStack
Query, everything else is URL/local-form/local-component state, per this
repo's convention (`.claude/CLAUDE.md`).

---

## 1. State Architecture Summary

- **Server state (TanStack Query):** 4 query families — list-mine
  (`useInfiniteQuery`), list-by-subject (`useInfiniteQuery`, gated), single
  plan detail (`useQuery`, shared by builder + locked view), subject-picker
  options (`useQuery`, reused cross-feature repo).
- **Mutations (Server Action + `useMutation`):** create, update (save draft),
  publish — 3 write paths, all thin Server Actions calling
  `bootstrap/di/lesson-plan.di.ts` factories only.
- **RSC↔client split:** list route seeds `listMineRoot()`'s `initialData`
  server-side (default scope only); edit route seeds `detail(id)`'s
  `initialData` server-side; create route has no read; visibility-gate
  redirects (`not-found`/`not-visible`/`invalid-id`) happen in the RSC before
  any client query mounts — only the network/5xx branch (AC-008.6, "stays on
  route") reaches the client as a query-level error state.
- **URL state:** only `:id` route param (edit route). Owner-toggle
  scope/selected subject/all filter values are **local state**, not URL
  search params — see §7 for the KISS justification (no deep-link AC exists
  for this screen, unlike audit-log US-E12.12 which had one).
- **Local-form state:** react-hook-form + zod for the builder (title,
  gradeLevel, 4 sections, tags array); tag-chip input buffer is separate
  local state from the RHF-controlled `tags: string[]` field;
  publish-readiness (FR-003) is a pure `useMemo` derivation, no query/store;
  unsaved-diff (FR-010) rides RHF's native `formState.isDirty`, cleared via
  `reset()` timing (see §6) — no hand-rolled diff object needed.
- **Key decision flagged:** the `already-published` race (AC-002.4/AC-004.5)
  is resolved by **query invalidation + forced active refetch** of
  `detail(id)`, bridged into the local form via an explicit `reset()` call
  once the refetch resolves — **not** a persistent local "force-locked"
  boolean. See §3/§6/§8 race-condition write-up for why.
- **No new global store, no ADR trigger.** Subject-picker reuse of
  `makeSubjectCatalogueRepository()` is read-only cross-feature reuse, not a
  data-contract change — no ADR needed (confirmed with `story.md`'s FE
  Resolution Notes #1, already resolved before this design).

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| List-mine pages | Server (`useInfiniteQuery`) | `LessonPlanListScreen` (mine tab) | `InfiniteData<{ items: LessonPlanEntity[]; nextCursor?: string; hasMore: boolean }>` | cursor-paginated server list, INT-118-02 |
| List-by-subject pages | Server (`useInfiniteQuery`, disabled until subject chosen) | `LessonPlanListScreen` (browse tab) | same page shape, keyed by `(subjectId, tag)` | cursor-paginated server list, INT-118-03 |
| Plan detail | Server (`useQuery`) | builder (create/edit) + locked view | `LessonPlanEntity \| undefined` | single source of truth for `status`-driven lock rendering, INT-118-04 |
| Subject picker options | Server (`useQuery`) | create form + edit route's read-only subject display | `SubjectOption[]` (existing entity from `subject-catalogue`) | reused read-only cross-feature repo, not owned by this feature |
| Owner-toggle scope (`"mine" \| "all"`) | Local (`useState`) | `LessonPlanListScreen` | `"mine" \| "all"` | no deep-link AC (§7) |
| Selected subject (browse) | Local (`useState`) | `LessonPlanListScreen` | `string \| null` | drives `enabled`/key of list-by-subject; no deep-link AC |
| Client-side filters (subject/grade/status/search on mine; grade on browse) | Local (`useState`, or `useMemo` derived) | `LessonPlanListScreen` | plain filter object, e.g. `{ subjectId?, gradeLevel?, status?, search? }` | §6 spec — never becomes a query param, must not pollute the query key |
| Browse tag filter | Local (`useState`), feeds the query key | `LessonPlanListScreen` (browse tab) | `string \| undefined` | the ONE real server param on browse (§6) — distinct from the client-only filters above |
| Builder form fields | Local-form (react-hook-form + zod) | `LessonPlanBuilderScreen` / `use-lesson-plan-builder.ts` | `{ title, gradeLevel, tags: string[], objectives, contentOutline, activities, assessmentMethod }` | not shared, per-field validation (FR-001/002 length limits) |
| Tag-chip input buffer | Local (`useState`, string) | tag-chips sub-component | `string` (the in-progress, unconfirmed input value) | ephemeral UI-only, distinct from the committed `tags[]` RHF field |
| Publish-readiness boolean | Local, derived (`useMemo`) | builder | `boolean` | pure client compute (FR-003, no BE call) |
| Unsaved-diff boolean | Local, derived from RHF | builder | `formState.isDirty` | must clear immediately on save success (AC-010.2), not wait for refetch |
| Race-error banner visible | Local (`useState`, ephemeral) | builder | `boolean` (+ optional `LessonPlanFailure["type"]` for the message) | short-lived UI signal, cleared on dismiss/unmount — NOT the lock-state source of truth (that's query data) |
| Publish confirm dialog open | Local (`useState`) | builder | `boolean` | ephemeral UI state |

---

## 3. State Flow

**Read flow (RSC → ViewModel → client):**

```
list/page.tsx (RSC)
  → makeListMyLessonPlansUseCase().execute({ cursor: undefined, limit: DEFAULT })
  → map to ListMineVm { items, nextCursor, hasMore, loadFailed }
  → <LessonPlanListScreen initialMineListVm={vm} />
     → useInfiniteQuery(lessonPlanKeys.listMineRoot(), { initialData: seeded-from-vm })
       (only when scope === "mine" AND vm.loadFailed === false — mirrors the
       audit-log US-E12.12 RSC-seeded-useInfiniteQuery precedent)
     → browse tab's useInfiniteQuery(lessonPlanKeys.listBySubjectRoot(id, tag))
       is NOT RSC-seeded (no subject pre-selected by default, AC-007.1) —
       purely client, enabled: !!selectedSubjectId

[id]/edit/page.tsx (RSC)
  → makeGetLessonPlanUseCase().execute({ id })
  → branch on result:
      not-found / not-visible / invalid-id → redirect('/teacher/lesson-plans')
        BEFORE any client component mounts (AC-008.3/.4/.5 "redirects to list")
      network-error → render <LessonPlanBuilderScreen initialPlanVm={{ loadFailed: true }} />
        (AC-008.6 "stays on the route" — client renders EduError + retry,
        client-side useQuery(detail(id)) is enabled and retries on demand)
      success (owner-any-status OR non-owner-PUBLISHED, FR-008) →
        <LessonPlanBuilderScreen initialPlanVm={{ plan: vm }} />
        → useQuery(lessonPlanKeys.detail(id), { initialData: seeded-from-vm })
        → RHF `defaultValues` seeded ONCE from this query's initial data
          (form is local-form source of truth after mount, not re-synced on
          every background refetch — see §6)

create/page.tsx (RSC) — no read; renders LessonPlanBuilderScreen in "create"
  mode; subject options are useQuery(subjectPickerKeys.options()) client-side
  (lazy, no RSC benefit — form isn't submittable before it loads anyway).
```

**Write flow (mutation → Server Action → invalidation):**

```
client useMutation
  → calls actions.ts Server Action ('use server')
     → makeCreateLessonPlanUseCase() / makeUpdateLessonPlanUseCase() /
       makePublishLessonPlanUseCase()  (bootstrap/di/lesson-plan.di.ts ONLY —
       actions.ts never imports infrastructure/ directly)
     → returns { ok: true; plan } | { ok: false; errorKey; retryable?; fields? }
  → onSuccess: invalidate per §5 map; for update/publish also `reset()` the
    form to the server-confirmed values (clears isDirty immediately, AC-010.2)
  → onError (already-published branch only): banner + forced detail refetch
    + form `reset()` once refetch resolves (§6/§8) — all other error
    branches: inline field error or generic banner, no cache mutation
```

No SSE/realtime in this feature (spec.md has no push requirement) — no
event-taxonomy entry needed.

---

## 4. Query Key Hierarchy + Cache Policy

```ts
// src/features/lesson-plan/presentation/lesson-plan.query-keys.ts (or co-located
// with the hook — engineer's call on file location, key shape is fixed here)

export const lessonPlanKeys = {
  all:               ()                                  => ["lesson-plan"] as const,
  listMineRoot:      ()                                  => ["lesson-plan", "list", "mine"] as const,
  listBySubjectRoot: (subjectId: string, tag?: string)   =>
    ["lesson-plan", "list", "subject", subjectId, tag ?? null] as const,
  detail:            (id: string)                        => ["lesson-plan", "detail", id] as const,
};

// Cross-feature, NOT lesson-plan-scoped — first client (useQuery) consumer of
// the existing ISubjectCatalogueRepository is this feature's picker (the
// admin subjects-screen is RSC-only, no client query keys exist yet to
// collide with). Keep this key feature-neutral so a future client consumer
// (exam-bank/lesson-bank, if they ever go client-side) shares the cache
// instead of duplicating it.
export const subjectPickerKeys = {
  options: () => ["subject-catalogue", "options"] as const,
};
```

**Why no filter params in `listMineRoot()`:** server accepts `cursor`/`limit`
only (§6) and there is no per-request variation beyond the authenticated
teacher's own identity — subject/grade/status/search are **client-side**
filters over already-fetched pages (§6, AC-006.2). Putting them in the key
would be wrong on two counts: (a) it would create redundant cache entries
that all fetch the identical server data, and (b) it would misrepresent
these filters as server-driving, contradicting the explicit AC-006.2/§6
caveat. Matches the established repo rule ("client-side tabs filtering an
already-fetched full list → do NOT put the filter in the key",
US-E11.6/US-E11.7 precedent).

**Why `subjectId` + `tag` ARE in `listBySubjectRoot()`:** both are real
server-side request parameters (§6 — `tag` is "the one true server-side
filter beyond cursor/limit"; `subjectId` is a path param). A subject switch
must discard the previous subject's results, not merge (AC-007.5) — a
distinct key per `(subjectId, tag)` gives this for free (stale in-flight
responses for a no-longer-selected subject update only their own,
unobserved cache entry). `gradeLevel` on browse stays client-side, NOT in the
key, per the same rule as above.

| Query | `staleTime` | `gcTime` | `enabled` / notes |
| --- | --- | --- | --- |
| `listMineRoot()` | `30_000` | `300_000` | own list, may create/edit within the same session; RSC-seeded `initialData` for first paint |
| `listBySubjectRoot(subjectId, tag)` | `30_000` | `300_000` | `enabled: !!subjectId` (AC-007.1 — no fetch until chosen); distinct cache entry per subject/tag, evicted after 5 min unobserved |
| `detail(id)` | `30_000` | `300_000` | RSC-seeded `initialData`; **exception:** the already-published race path forces an out-of-band refetch regardless of `staleTime` (§6/§8) — this is a deliberate bypass, not a `staleTime: 0` default, because a plain re-mount (e.g. navigating back to the same edit route twice in a session) shouldn't always cost a network round trip |
| `subjectPickerKeys.options()` | `300_000` | `600_000` | reference data, rarely changes within a session; shared across create-form + browse-scope picker if browse ever adds a subject `<select>` beyond the toggle |

`refetchOnWindowFocus: false` on all four (matches the repo global default;
none of these are safety-critical/live-collaboration surfaces that would
justify the opposite).

---

## 5. Invalidation Map

| Trigger | Keys invalidated | Notes |
| --- | --- | --- |
| `createLessonPlan` success | `listMineRoot()` | new DRAFT should appear in "Của tôi"; the edit route the user is redirected to fetches its own `detail(id)` fresh (RSC), no need to pre-populate it via invalidation |
| `updateLessonPlan` (save draft) success | `detail(id)`, `listMineRoot()` | title/tags may have changed and are shown on list cards (AC-002.2) |
| `updateLessonPlan` onError `already-published` | `detail(id)` — **forced**, `refetchType: "active"` | race mechanism, §6/§8 — this is the ONE error branch of this mutation that touches cache |
| `publishLessonPlan` success | `detail(id)`, `listMineRoot()`, `["lesson-plan", "list", "subject", subjectId]` (prefix match — busts every `tag` variant cached for that subject) | a newly PUBLISHED plan should surface in "Toàn trường" browse for its subject (task framing); TanStack's default `refetchType: "active"` means an inactive (unmounted/currently-unobserved) browse query is only marked stale, not eagerly refetched — this is exactly why "this teacher won't see it change until they switch scope" holds for free, no extra code needed |
| `publishLessonPlan` onError `already-published` | `detail(id)` — **forced**, `refetchType: "active"` | same mechanism as update's race branch |
| Any mutation onError, non-race branches (`not-found`, `not-visible`/`forbidden`, `network-error`, `unknown`, field-validation types like `title-required`/`tag-limit-exceeded`) | none | per established repo convention (moderation/feed precedent, `[[query-key-conventions]]`): a genuine validation/permission/transient failure must not perturb cache — content stays exactly as it was pre-mutation |
| `LESSON_PLAN_INVALID_CURSOR` on either list query | none (cache-level) | handled inside the query function itself, not via invalidation — see §8 item 4 |

---

## 6. Mutations & Race-Condition Mechanism (already-published)

All three mutations (`create`, `update`, `publish`) are **never optimistic**
— no `onMutate`/pre-emptive `setQueryData`. Reasons: (a) create navigates to
a brand-new route on success, nothing to optimistically render in place; (b)
update/publish are low-frequency, explicit-submit actions (not
live-typing/autosave) with a visible "Saving…"/spinner state already
required by the AC (AC-002.2 "Saving…", AC-004.2 `aria-busy` spinner) — the
repo's own established rule ("explicit-save form fields don't need
optimistic `setQueryData`") applies directly.

```ts
// update (save draft)
useMutation({
  mutationFn: (input) => saveLessonPlanDraftAction(id, input), // Server Action
  onSuccess: (saved) => {
    queryClient.setQueryData(lessonPlanKeys.detail(id), saved);
    queryClient.invalidateQueries({ queryKey: lessonPlanKeys.listMineRoot() });
    form.reset(mapEntityToFormValues(saved)); // clears isDirty immediately (AC-010.2)
  },
  onError: (err) => {
    if (err.errorKey === "already-published") {
      setRaceBannerVisible(true); // ephemeral local UI flag, banner only
      queryClient.invalidateQueries({
        queryKey: lessonPlanKeys.detail(id),
        refetchType: "active",
      });
      // form resync happens in a useEffect watching the detail query's data
      // (below), NOT here — the refetch is async.
    } else {
      // inline field error or generic banner per errorKey; no cache touch
    }
  },
});

// bridge: query → local form, exactly once per real status transition
useEffect(() => {
  if (detailQuery.data?.status === "PUBLISHED" && !form.formState.isSubmitting) {
    form.reset(mapEntityToFormValues(detailQuery.data), { keepDirty: false });
  }
}, [detailQuery.data?.status]);
```

**Why this mechanism (invalidate + forced active refetch + explicit
`reset()` bridge) and not a persistent local "force-locked" flag:**

- The read-only/locked rendering (FR-005/FR-008) is **already** specified as
  a pure function of `plan.status === "PUBLISHED"` — introducing a second,
  independent "force-locked" boolean would create two sources of truth for
  the exact same concept that must be kept in sync by hand. If the flag and
  the eventual refetched query data ever disagreed (e.g. flag set but
  refetch fails/retries), the UI could show a lock banner while some fields
  remain editable, or vice versa.
- react-hook-form does **not** auto-resync its fields to a query's
  background-refetched data (by design — that's what makes it safe for
  in-progress typing during normal operation). This means invalidation
  *alone* would update `detailQuery.data` but leave the visibly-rendered
  form fields unchanged and still "editable-looking" until an explicit
  `reset()` call — so the mechanism genuinely needs both halves: (1) cache
  invalidation to get canonical PUBLISHED data, (2) an explicit `reset()`
  bridge, gated on the real status transition, to push that data into the
  form and (implicitly, since the builder's `readOnly` prop is derived from
  `status`) flip the UI to locked.
- The **only** local state this mechanism adds is the ephemeral
  `raceBannerVisible` boolean — purely for showing/dismissing the error
  banner text, never consulted to decide lock state. This keeps "is this
  plan locked" a single-source-of-truth query-data question everywhere in
  the codebase (FR-005/FR-008/AC-002.4/AC-004.5 all resolve to the same
  check), which is the simpler, less error-prone design per this repo's
  established preference for deriving UI state from query data rather than
  parallel flags.

**`refetchType: "active"`** is used explicitly (rather than the default,
which is also `"active"` in TanStack v5 — stated here for clarity/audit
trail) because the detail query IS actively mounted at the moment of the
race (the user is looking at the builder that just got the error) — this
guarantees an immediate refetch, not a lazy stale-mark.

---

## 7. URL vs Local State for the List Screen — the call

**Decision: plain local state (`useState`), not URL search params**, for
owner-toggle scope, selected subject (browse), and all filter values
(subject/grade/status/search on mine; grade/tag on browse).

**Justification (checked against spec.md, not assumed):**

- No AC in `spec.md` requests a shareable/bookmarkable/deep-linkable URL for
  a specific scope+subject+filter combination — contrast with the
  established repo precedent where URL params WERE chosen (audit-log
  US-E12.12), which had an explicit filter-shareability requirement driving
  that call. This screen has no equivalent AC.
- Four of the five filterable dimensions (subject/grade/status/search on
  mine; grade on browse) are **explicitly client-side-only** per §6 — they
  never become a request parameter. Putting them in the URL would visually
  imply "this is a server query param" to a future reader, directly
  contradicting the settled §6 caveat that these are NOT server search.
  Keeping them as local state makes the client/server split legible at the
  code level, not just in the docs.
- The one genuinely server-driving value in this screen, browse's
  `selectedSubjectId` (+ optional `tag`), is still just a **within-screen
  toggle** target (per the definitions in spec.md §1 — "UI concept, not a BE
  param"), not a distinct navigable page; no AC frames "share a link to
  Subject X's published plans" as a use case.
- KISS: avoids adding a `useSearchParams`/routing dependency to a screen with
  zero deep-link requirement, matching `plan.md`'s own framing of this as an
  open call to be settled by "no real deep-link requirement exists" (quoting
  its §4).

**Flagged, not reversed:** if product later wants a shareable "browse Subject
X's published plans" link, `selectedSubjectId` is the one value worth
revisiting for URL-param promotion — noted here so it isn't silently lost,
but not built speculatively now.

---

## 8. Race Conditions & Resolution (full list)

1. **`LESSON_PLAN_ALREADY_PUBLISHED` on save-draft or publish** (spec'd,
   AC-002.4/AC-004.5) — resolved by invalidate + forced active refetch of
   `detail(id)` + explicit `form.reset()` bridge on the status transition.
   Full mechanism in §6.
2. **Concurrent edits across two tabs of the same teacher on the same DRAFT**
   (not spec'd, no version/ETag field in `LessonPlanResponse` §6) — the BE
   contract has no optimistic-concurrency field, so a second tab's save is a
   plain last-write-wins overwrite; this is **not** the
   `already-published` race (that one has an explicit BE error code; plain
   concurrent-DRAFT-edit does not). Accept last-write-wins, matching the BE's
   own lack of concurrency control — do not invent client-side version
   checking or a synthetic conflict UI beyond what the BE actually signals.
3. **Rapid subject switch while a browse fetch is in flight** (AC-007.5,
   "previous subject's results are discarded, not merged") — resolved
   natively because `subjectId`/`tag` are part of the query key; a
   late-arriving response for a no-longer-selected subject writes only its
   own, now-unobserved cache entry and can never render under the
   currently-selected subject. No `AbortController`/ignore-flag needed
   (same pattern as the principal-reports multi-region precedent).
4. **`LESSON_PLAN_INVALID_CURSOR` mid-pagination** (AC-006.6/AC-007.6, "not
   user-visible") — handled inside the client-side list-fetch wrapper
   (the function passed to `useInfiniteQuery`'s `queryFn`), not via
   TanStack cache mechanics: on receiving this failure from the repository,
   the wrapper silently re-invokes the use-case with `cursor: undefined` and
   returns that page-1 result in place of the requested (stale) page,
   instead of throwing. The domain use-case itself still returns the typed
   failure honestly (per `.claude/rules/api-integration.md`); this is a
   state/query-layer decision about how to *react* to that failure, not a
   change to the failure-mapping contract.
5. **Double-submit: Save Draft and Publish both triggerable while one is
   in-flight** — resolved by a mutual in-flight guard: disable both CTAs
   whenever either mutation's `isPending` is true (single-mutation-at-a-time
   for this builder). Avoids an ambiguous UI where a publish-confirm dialog
   could open while a save is still resolving, and avoids needing request
   cancellation for BE calls that aren't specified as safely abortable.

---

## Cross-references

- `spec.md` §6 (Data & Integration, pagination/filter caveat, failure union),
  §3 FR-002/FR-003/FR-004/FR-006/FR-007/FR-010 (ACs cited throughout above).
- `story.md` "FE Resolution Notes" — subject-picker reuse, owner-attribution
  fallback, FR-010 dot-only decision — all treated as fixed inputs here, not
  re-litigated.
- `plan.md` §2 (dispatch rationale), §4 (state classification this document
  finalizes).
- Repo memory: `query-key-conventions.md` (key factory shape, client-filter
  vs server-param rule, never-optimistic explicit-save pattern, stat-embedded
  broad-invalidation pattern), `rsc-readonly-pattern.md` (RSC-seeded
  `initialData` pattern).
