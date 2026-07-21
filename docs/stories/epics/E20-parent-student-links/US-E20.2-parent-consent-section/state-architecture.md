# US-E20.2 — State Architecture (Parent Notification Consent Section)

Author: fe-state-engineer. Builds on `plan.md` (domain/infra/DI already decided —
not revisited here). Scope: query-key hierarchy, cache/invalidation policy, the
optimistic-mutation-with-rollback design for the per-toggle switch, the RSC↔client
boundary, and a definitive answer to the AC-001.3 partial-resolution question.

No global client store. All server state here is TanStack Query on the client,
fed by two Server Actions (`fetchParentConsentAction`, `updateParentConsentAction`,
`plan.md` §5) that each call the already-decided use-cases via `bootstrap/di`.

## 1. State Architecture Summary

- **One query** per mounted section instance: `["parent-consent"]` (flat key,
  matches `LinkedAccountsSection`'s `["linked-accounts"]` convention — no
  list/detail/paginated hierarchy needed, this is a single small combined
  snapshot, not a filterable/paginated collection).
- **Per-row mutations**: one `useMutation` instance per rendered toggle row
  (i.e. per `(studentId, category)` pair, mirrors `LinkedAccountRow`'s
  per-provider mutation exactly) — NOT one mutation per child, NOT one shared
  mutation for the whole section. This is what makes "exactly one
  (studentId, category) pair mutates per interaction" (AC-004.2) structurally
  true rather than something application code has to enforce.
- **Cache patch, not list invalidation, on settle.** Deliberate deviation from
  `LinkedAccountsSection`'s `onSettled: () => invalidateQueries(...)`: a full
  refetch on every toggle settle would race against a DIFFERENT toggle's
  in-flight optimistic write on the same cached array and could stomp it. Here,
  `onSuccess`/`onError` patch only the one child's one category via
  `setQueryData`; nothing calls `invalidateQueries` on toggle settle.
- **RSC never awaits this section's data** (NFR-005): `page.tsx` passes
  `onFetchParentConsent`/`onToggleParentConsent` as Server Action refs only;
  `useQuery` has no `initialData` and fetches on client mount. This is the
  only section-level query in the whole Profile screen with no RSC-seeded
  `initialData` — flag this as intentional, not an oversight, since it differs
  from every sibling section on this same screen.
- **AC-001.3 answer (definitive, see §3):** the client sees **one atomic
  query resolution**, never two. There is no client-observable
  "linked-students loaded, consents still loading" query state in this
  design — the combined Server Action awaits both use-case calls internally
  before resolving. The pending sub-state is a **per-child data shape**
  (`consent: null` on an otherwise-successful payload), not a second loading
  phase. This must be exercised at the unit/use-case level (already covered
  in `plan.md` §1) and, for the client, via a Storybook fixture that returns
  a payload with one child's `consent: null` inside an already-`success`
  result — never via a "slow second query" simulation.
- **Zero query registration for non-parent** (§6): confirmed sufficient by
  the existing triple-gate JSX conditional in `profile-screen.tsx` — no
  `enabled: false` flag or extra guard needed, because React never calls
  `ParentConsentSection`'s function body (and therefore never calls its
  `useQuery`) when the conditional is false.

## 2. State Inventory

| State | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Section data (children + per-child consent) | Server state | `ParentConsentSection` (`useQuery`) | `ParentConsentChildVM[]` (see `plan.md` §4) | Remote data from `core`; must support optimistic patch + section-scoped retry |
| Per-row toggle in-flight status | Server state (mutation status) | `ChildConsentCard`'s per-row `useMutation` | `mutation.isPending` (no extra local state needed for this) | Each row's own pending flag; independent per (studentId, category) — this independence is what protects a different category from being affected while one save is in flight |
| Per-row inline error message | Local UI state | Toggle row component | `useState<string \| null>` (mirrors `LinkedAccountRow`'s `error`) | Ephemeral, presentational only, cleared on next `onMutate`; not shared/cached — not server state |
| Role gate (`parent` or not) | RSC-resolved, passed as props | `page.tsx` → `ProfileScreenVM.parentConsent` / action props | `parentConsent?: true` + optional action props | Server-driven omission (AC-007.2) — not client state at all, just a prop that is present or absent |
| Consent category enum, request payload | Local ephemeral (mutation variables) | `useMutation`'s `mutate(input)` call | `UpdateConsentInput` | Not stored; passed straight through to the Server Action |

No URL state, no form state (react-hook-form) applies to this feature — it's
pure toggle-switch server state, no filters/pagination/steps.

## 3. State Flow

### Read path (RSC → client query)

```
page.tsx (RSC)
  role = await getSessionRole()               // plan.md §5, Option A
  isParent = role === "parent"
  <ProfileScreen
    parentConsent={isParent ? true : undefined}
    onFetchParentConsent={isParent ? fetchParentConsentAction : undefined}
    onToggleParentConsent={isParent ? updateParentConsentAction : undefined}
    ... />                                     // NOT awaited — action refs only

profile-screen.tsx (client, already mounted, other tabs interactive)
  {parentConsent && onFetchParentConsent && onToggleParentConsent && (
    <ParentConsentSection onFetch={onFetchParentConsent} onToggle={onToggleParentConsent} />
  )}

ParentConsentSection (client, mounts fresh — no initialData)
  useQuery({ queryKey: ["parent-consent"], queryFn: onFetch, retry: false })
    → onFetch = fetchParentConsentAction (Server Action)
        → makeGetLinkedStudentsWithConsentsUseCase().execute()
            → getLinkedStudents() THEN getConsents(ids)   // both awaited server-side
        → maps Result → ParentConsentFetchResult (children[], each consent: {...} | null)
  loading   → ConsentSkeleton (section-local, page/tabs already interactive)
  !success  → ConsentError + refetch() wired to retry button (AC-003.3)
  success, children.length === 0 → ConsentEmpty
  success, children.length > 0   → children.map(ChildConsentCard)
      each card: consent === null → disabled Switch + Skeleton row (AC-001.3)
                 consent !== null → live Switch per category
```

### Write path (single toggle → Server Action → cache patch)

```
ChildConsentCard's per-row Switch (one useMutation per (studentId, category))
  onClick → mutation.mutate({ studentId, category, enabled: next })
    onMutate  → snapshot previous value, patch cache optimistically (§6)
    mutationFn → onToggle(input) = updateParentConsentAction(input)
        → makeUpdateConsentUseCase().execute(input) → Result passthrough
    onSuccess(result) → success ? reconcile cache to server-echoed consent + toast
                                 : rollback + inline error (treated identically to onError)
    onError            → rollback + inline error
    onSettled           → clear local pending/error bookkeeping only; NO invalidateQueries
```

No SSE/realtime applies to this feature (no event taxonomy entry needed) —
concurrent admin unlink (US-E20.1) affects this section only on the section's
own next mount/refetch, per the edge-case matrix (`use-cases.md` §5): no
live-update requirement mid-session.

## 4. Query Key Hierarchy + Cache Policy

```ts
// colocated as a const in parent-consent-section.tsx, matching the
// LinkedAccountsSection precedent (flat const, not an exported factory —
// this feature has no list/detail variants to factor)
const QUERY_KEY = ["parent-consent"] as const;
```

No `parentConsentKeys.all/lists/list()/detail()` factory is warranted: there
is exactly one query shape (no filters, no pagination, no per-student detail
query — `getConsents` is a domain-layer batch call already combined into one
use-case, `plan.md` §1). Introducing a factory here would be speculative
generality against a feature with a single query. If a future story adds a
per-student consent detail view, promote to a factory then.

| Setting | Value | Reason |
| --- | --- | --- |
| `staleTime` | `0` (default) | Consent data can change from an admin-side unlink or the parent's own toggle elsewhere; no realtime channel exists to invalidate on external change, so prefer letting `refetchOnWindowFocus`/remount catch drift rather than caching stale data long |
| `gcTime` | default (5 min) | Section mounts once per Profile visit; default eviction is fine, nothing else shares this key |
| `retry` | `false` | The section already has an explicit user-triggered retry button (AC-003.3); TanStack's silent auto-retry would race with/duplicate that and delay the error state the user is supposed to see. Manual retry via `query.refetch()` only |
| `refetchOnWindowFocus` | default (`true`) | Acceptable — the "no live-update mid-session" rule is about not needing a push channel, not about suppressing a refetch on refocus; a stale-on-refocus refetch is fine and desirable here |
| `enabled` | none needed | Query registration itself is gated by the JSX conditional one level up (§6) — do not add a redundant `enabled` flag |

## 5. Invalidation Map

| Trigger | Keys invalidated / patched | Mechanism |
| --- | --- | --- |
| Toggle success (`updateParentConsentAction` → `{success:true, consent}`) | `["parent-consent"]` — patched in place for the one `(studentId, category)` | `queryClient.setQueryData` (targeted patch), NOT `invalidateQueries` |
| Toggle failure (any errorKey) | `["parent-consent"]` — patched in place, reverted to `context.previous` for the one `(studentId, category)` | `queryClient.setQueryData` (targeted patch) |
| Section error retry (AC-003.3) | `["parent-consent"]` | `query.refetch()` (re-issues `onFetch`, standard `useQuery` retry, not `invalidateQueries`) |
| Admin unlinks a child concurrently (US-E20.1, different session/tab) | none — no cross-tab/SSE channel wired for this story | Next natural refetch (mount, window refocus, or manual retry) simply omits the removed child; no invalidation hook needed per edge-case matrix |
| Any other feature's mutation (e.g. `linked-accounts`, `sessions`) | none | Key namespace `["parent-consent"]` has zero overlap with any other feature's query key — confirmed no cross-invalidation needed |

Explicitly: nothing in this feature ever calls
`invalidateQueries({ queryKey: ["parent-consent"] })` from a toggle mutation.
That is the one deliberate divergence from the `LinkedAccountsSection`
precedent, and it exists specifically to satisfy the "don't stomp a different
in-flight optimistic toggle" requirement — see §8 race conditions.

## 6. Mutations & Optimistic Strategy

One `useMutation` per rendered toggle row (component instance-scoped, exactly
like `LinkedAccountRow`). Cache value shape is `ParentConsentChildVM[]`.

```ts
const mutation = useMutation({
  mutationFn: (next: boolean) =>
    onToggle({ studentId, category, enabled: next }),

  onMutate: (next: boolean) => {
    setError(null);
    const previous = consent[category];           // read from the row's own prop,
                                                     // NOT re-read from cache — this
                                                     // is the exact prior CONFIRMED
                                                     // value, matching LinkedAccountRow
    queryClient.setQueryData<ParentConsentChildVM[]>(QUERY_KEY, (prev) =>
      prev?.map((c) =>
        c.studentId === studentId && c.consent
          ? { ...c, consent: { ...c.consent, [category]: next } }
          : c,
      ),
    );
    return { previous };
  },

  onSuccess: (result, next, context) => {
    if (!result.success) {
      rollback(studentId, category, context.previous);
      setError(t(`errors.${result.errorKey}`));    // distinct wording per AC-006.2
      return;
    }
    // reconcile to the FULL server-echoed consent object, not just the
    // toggled field — guards against the server normalizing/coupling other
    // categories in a way the client didn't predict
    queryClient.setQueryData<ParentConsentChildVM[]>(QUERY_KEY, (prev) =>
      prev?.map((c) =>
        c.studentId === studentId ? { ...c, consent: result.consent } : c,
      ),
    );
    toast.success(t("toast.success"));            // identical copy for on/off, FR-003
  },

  onError: (_err, next, context) => {
    rollback(studentId, category, context?.previous ?? !next);
    setError(t("errors.network-error"));
  },

  // deliberately NO onSettled invalidateQueries — see §5/§8
});

function rollback(studentId: string, category: Category, previous: boolean) {
  queryClient.setQueryData<ParentConsentChildVM[]>(QUERY_KEY, (prev) =>
    prev?.map((c) =>
      c.studentId === studentId && c.consent
        ? { ...c, consent: { ...c.consent, [category]: previous } }
        : c,
    ),
  );
}
```

Notes:
- The `Switch` for a row where `consent === null` (AC-001.3 pending sub-state)
  is rendered `disabled` and does not attach `onClick`/`mutate` at all — the
  mutation can structurally never fire against a null consent object, so the
  `c.consent &&` guard in the patch functions is a belt-and-suspenders check,
  not the primary gate.
- `onSuccess`'s failure branch and `onError` do the **same** rollback+error
  treatment (AC-006.1 "any failure code") — no branching on `errorKey` for
  the revert decision itself, only for the message shown, matching
  `LinkedAccountsSection`'s existing pattern exactly.
- Toast is success-only (matches `LinkedAccountsSection`, which also has no
  error toast); failures surface via the row's inline `role="alert"` text
  only — keeps the two sibling sections' error-surfacing convention
  identical, and avoids a toast+inline double-signal for the same failure.

## 7. Async State Machine

| State | Trigger | UI treatment |
| --- | --- | --- |
| Loading (section) | `useQuery` first fetch, no `initialData` | `ConsentSkeleton` — section-local only; rest of Profile page/tabs already interactive (AC-001.1/NFR-005) |
| Empty | `success: true`, `children.length === 0` | `ConsentEmpty` — "Chưa có con nào được liên kết" + contact-school guidance (AC-002.1) |
| Error (section) | `success: false` (`errorKey: "forbidden" \| "network-error"`) | `ConsentError` + retry button wired to `query.refetch()` (AC-003.1/.3); both `errorKey`s render the same generic error UI — no separate "you don't have access" copy, since AC-002.2 only requires this NOT be conflated with empty, not that it read differently from a network error |
| Stale/refetching (section) | window refocus / manual retry while prior data still cached | Prior render stays visible with an unobtrusive fetching indicator (do not swap to full skeleton on a background refetch — only the *first* fetch shows `ConsentSkeleton`); on retry from the error state, do transition through loading (AC-003.3 explicitly requires this) |
| Success | `success: true`, `children.length > 0` | List of `ChildConsentCard` + privacy footnote (AC-001.4) |
| Per-child pending sub-state | a child in the success payload has `consent: null` | disabled `Switch` + `Skeleton` row for that child only, siblings with resolved consent render normally (AC-001.3) |
| Per-row mutation pending | `mutation.isPending` | Switch shows a brief pending/disabled visual (per-row only); inline error cleared on `onMutate` |
| Per-row mutation error | `onSuccess` (failure result) or `onError` | Inline `role="alert"` text under that row, reverted switch value, distinct wording from success toast (AC-006.2) |

`errorKey` → i18n mapping (stable keys, never raw messages, per
`.claude/rules/api-integration.md` + `.claude/rules/i18n.md`):

| Failure union key | i18n key (namespace `parentLinks.consentSection`) |
| --- | --- |
| Section fetch `"forbidden"` | `error.title` / `error.body` (generic — same as network) |
| Section fetch `"network-error"` | `error.title` / `error.body` |
| Toggle `"validation"` | `errors.validation` |
| Toggle `"forbidden"` | `errors.forbidden` |
| Toggle `"network-error"` | `errors.network-error` |

(Keys illustrative per `plan.md` §7's i18n list — final leaf names are
`fe-nextjs-engineer`'s to slot into the existing `parentLinks.consentSection.*`
subtree; add an `errors.*` leaf group there if not already planned.)

## 8. Race Conditions & Resolution

1. **Rapid double-flip of the SAME toggle before the first PUT resolves.**
   Resolution: the Switch's `onClick` guards on `mutation.isPending` exactly
   like `LinkedAccountRow` (`if (!pending) mutation.mutate(...)`) — a second
   flip of the same row is inert while one is in flight. This trades "always
   fire the latest intent" for "never have two in-flight requests for the
   same pair," which is the simpler and already-proven-in-repo answer, and
   satisfies AC-006.4 (never display an unconfirmed state) trivially since
   there is only ever one in-flight request per row. If product later wants
   "always reflect the last click even while pending," that would need a
   request-sequence token (increment a ref per `onMutate`, ignore
   resolution if a newer request has since started) — flagged here as the
   upgrade path, not built now (no AC requires it; the edge-case matrix only
   requires no *lost* update to a *different* category, which is satisfied
   below).

2. **Toggle for a DIFFERENT category (or different child) while one save is
   in flight.** Resolution: each `(studentId, category)` pair is its own
   `useMutation` instance scoped to its own row component — there is no
   shared "section is busy" flag and no shared mutation object, so a second
   row's `mutate()` call is completely independent. The cache patch functions
   in §6 only ever touch the single `studentId`+`category` they're given, so
   two concurrent optimistic patches to different keys of the same cached
   array can't stomp each other (both are `prev?.map` over the same array
   reference at dispatch time from TanStack's synchronous queue, and React
   Query serializes `setQueryData` calls — no shared mutable draft object is
   held across an `await`).

3. **Toggle success/error resolving out of order relative to a subsequent
   `refetch()` (e.g. user hits section-level retry while a toggle is still
   in flight).** Not expected to co-occur per the ACs (retry is a section-load
   concern, toggle is a post-load concern), but if it does: `refetch()`
   replaces the whole cached array with the fresh server payload, which could
   overwrite an optimistic patch that hasn't reconciled yet. Accepted risk,
   not designed against, because: (a) no AC requires simultaneity of a
   section-error-retry and an in-flight toggle — the section can only be in
   its error state when a `children` array previously failed to load, meaning
   there was no rendered toggle to flip in the first place; the case is
   structurally unreachable. Documented here only to make the "not designed
   against" explicit for the reviewer.

4. **A toggle's optimistic patch racing the *initial* query's own resolution
   (component mounts, fetch is in flight, and — impossible in practice since
   toggles don't render until `success` — is prevented structurally: toggle
   rows only exist once `children` has resolved via the success branch, so
   there is no window where a mutation can fire before the first query
   resolution lands).**

5. **Concurrent admin unlink (US-E20.1) removing a child whose toggle is
   mid-flight in this session.** Out of scope per the edge-case matrix (no
   live cross-tab invalidation wired this story) — worst case, the in-flight
   PUT succeeds/fails against a link that server-side no longer resolves to
   the parent's memberId scope, which the server would reject as a
   `forbidden`/`validation` failure anyway, triggering the ordinary revert
   path (UC-006). No special client-side handling needed.

## Summary for `fe-lead`

- Query key: single flat `["parent-consent"]`, no factory (one query shape,
  no pagination/filters) — deviates from a factory-heavy convention on
  purpose; documented reason in §4.
- Cache policy: `retry: false` (explicit retry button owns retries),
  `staleTime` default 0, `refetchOnWindowFocus` default true, no
  `initialData` (RSC never awaits this section — NFR-005).
- Mutations: one `useMutation` per `(studentId, category)` row, targeted
  `setQueryData` patch/rollback (never a whole-list `invalidateQueries` on
  settle) — this is the one deliberate deviation from
  `linked-accounts-section.tsx`'s pattern, needed to prevent one toggle's
  settle from stomping a different in-flight optimistic toggle.
- AC-001.3 resolved definitively: **single atomic query resolution**, no
  second client-visible loading phase; the pending sub-state is a per-child
  `consent: null` data shape inside one successful payload, testable via a
  Storybook fixture and the domain unit tests already specified in
  `plan.md` §1 — not via a simulated two-phase network race.
- Non-parent zero-query guarantee: the existing triple-gate JSX conditional
  in `profile-screen.tsx` is sufficient by itself (component function body,
  and therefore its `useQuery`, is never invoked) — no additional `enabled`
  flag needed.
- Race conditions: same-toggle double-flip → disable-while-pending (matches
  `LinkedAccountRow` precedent); different-toggle concurrency → naturally
  isolated by per-row mutation instances + targeted cache patches.

Files read for this design: `plan.md`, `story.md`, `use-cases.md` (all in this
packet) and `src/features/user/presentation/profile/linked-accounts-section.tsx`
(sibling optimistic-mutation precedent).
