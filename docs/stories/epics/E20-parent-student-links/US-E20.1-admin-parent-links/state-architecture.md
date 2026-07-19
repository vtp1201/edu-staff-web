# State Architecture — US-E20.1 Admin Parent–Student Link Management

Author: `fe-state-engineer`. Scope: `src/features/admin/parent-links/presentation/parent-links-screen/`.
No production code written here — hook signatures + invalidation/state design only.
Coordinates with `fe-component-architect`'s component-tree doc in this same packet
(this file owns query keys / mutation shape / async-state wiring; that doc owns
component props / `PLCombobox` UI contract). Written to its own file to avoid a
concurrent edit collision on `plan.md`.

Precedents read and mirrored (do not reinvent):
- `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx` +
  `.../components/filter-search-params.ts` — RSC-seed → client-hydrate list pattern.
- `src/features/moderation/presentation/moderation-screen/moderation-screen.tsx` —
  **the** non-optimistic destructive-mutation precedent (`removeMutation`, NFR-101/
  AC-1928.6, US-E19.2) + per-error-type invalidation branching + `errorSlot` derivation.
- `src/features/question-bank/presentation/question-bank-list-screen/question-bank-list-screen.tsx` —
  debounced-search-gate pattern (`debouncedTag` state outside the query, `enabled` gate,
  `querySatisfied` derived flag), confirming no shared debounce hook exists in this repo
  (grepped `useDebounce`/`debounce` — only inline `useEffect`+`setTimeout` per screen, 3x
  precedent: audit-log, moderation, question-bank). This story follows the same inline
  convention — no new hook is introduced.

---

## 1. State Architecture Summary

- **Server state (TanStack Query)**: links list (`useInfiniteQuery`, cursor-paginated),
  consent detail (`useQuery`, lazy on dialog open), student-search candidates (`useQuery`,
  debounced+gated), parent-search candidates (`useQuery`, debounced+gated). Two
  `useMutation`s: create, unlink.
- **URL state**: `q` (search text), `classId` (class filter). `cursor` is **infinite-query
  internal state** (TanStack's own `pageParams`), never URL-synced — mirrors audit-log
  (cursor pagination loads more, doesn't deep-link a specific page).
- **Local-form state**: create-dialog field values (`studentId`/`parentId` selection +
  their display labels, `relationship`, `note`) — plain `useState` in `PLCreateDialog`,
  reset on open/close. This story has no `react-hook-form`+zod need called out by
  component-architect (single-screen dialog, no multi-field cross-validation) — flag to
  `fe-component-architect`/`fe-lead` if that changes; not re-decided here.
- **Local UI state**: which dialog is open (`create` | `detail` | `unlink` | none),
  the targeted `linkId` (+ denormalized parent/student/class names needed for the unlink
  dialog's interpolated copy — captured at open time, NOT re-derived from a possibly-stale
  cache read after invalidation).
- **Debounced search-input state** (×2, independent): lives in `PLCreateDialog` (the
  dialog container that owns both `PLCombobox` instances), NOT inside `PLCombobox` itself
  — per `fe-component-architect`'s controlled-input requirement. Each combobox gets its
  own `[rawQ, debouncedQ]` pair + its own query key.
- **No global client store.** Every stateful concern above maps cleanly to the table in
  `.claude/CLAUDE.md`/agent brief; no candidate for Zustand/Redux/Context-as-store
  surfaced. (If `PLCombobox`'s open/highlighted-option state needs to be shared beyond
  the component itself, that's still local `useState` inside `PLCombobox`, not lifted —
  component-architect's call, noted here only to rule out over-lifting into the container.)
- **Key decision**: Unlink mutation is **structurally forbidden from optimism** — no
  `onMutate`, no `setQueryData`. This is not a style preference; it is AC-005.4 (high-risk
  lane). The moderation `removeMutation` precedent is copied near-verbatim below.

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| `q`, `classId` | URL state | `ParentLinksScreen` container | `{ q?: string; classId?: string }` (= `ParentLinksFilter`) | Shareable/back-button-friendly filter (FR-002); mirrors audit-log's `AuditLogFilter` pattern |
| links list pages | Server state | `ParentLinksScreen` (`useInfiniteQuery`) | `{ items: ParentStudentLink[]; nextCursor?: string; hasMore: boolean }` per page | INT-001, cursor-paginated per API contract |
| consent detail | Server state | `PLDetailDialog` (or lifted to container per §4) (`useQuery`) | `ParentStudentConsent` | INT-004, lazy — only needed when detail dialog open |
| student-search candidates | Server state | `PLCreateDialog` (`useQuery`) | `LinkCandidate[]` | INT-005, typeahead |
| parent-search candidates | Server state | `PLCreateDialog` (`useQuery`) | `LinkCandidate[]` | INT-006, typeahead, parent-role-scoped |
| create mutation | Server-write state | `ParentLinksScreen` (`useMutation`) | input `{studentId, parentId, relationship, note?}` → `ParentStudentLink` | INT-002 |
| unlink mutation | Server-write state | `ParentLinksScreen` (`useMutation`) | input `{linkId, parentName, studentName, className}` (denormalized for dialog copy) → `void` | INT-003, non-optimistic |
| `dialogState` | Local UI state | `ParentLinksScreen` | `{ kind: "none"|"create"|"detail"|"unlink"; target?: LinkRowTarget }` where `LinkRowTarget = {linkId, parentName, studentName, className}` | which dialog + which row, captured at open time (not re-derived post-invalidation) |
| create-dialog form fields | Local-form state | `PLCreateDialog` | `{ student?: LinkCandidate; parent?: LinkCandidate; relationship?: Relationship; note: string }` | not shared, resets per open |
| student combobox search text | Local + debounced | `PLCreateDialog` (fed into `PLCombobox` as controlled prop) | `{ raw: string; debounced: string }` | independent debounce gate #1 |
| parent combobox search text | Local + debounced | `PLCreateDialog` (fed into `PLCombobox` as controlled prop) | `{ raw: string; debounced: string }` | independent debounce gate #2 |
| load-more error (list pagination) | Local UI state | `ParentLinksScreen` | `ParentStudentLinkFailure["type"] | null` | mirrors audit-log's `loadMoreError` — a failed `fetchNextPage` must not blank already-loaded rows |

---

## 3. State Flow

```
RSC page.tsx
  reads q/classId/cursor(=null for first paint) from URLSearchParams
  → makeListParentStudentLinksUseCase().execute({q, classId, cursor: null, limit})
  → maps to ParentLinksScreenVM: { initialFilter, initialPage, initialErrorKey, classOptions, *Action refs }
  → <ParentLinksScreen {...vm} />

ParentLinksScreen (client)
  appliedFilter = parseFilterFromParams(useSearchParams())   // URL is truth for the query key
  draft = useState(initialFilter); draft←→URL sync exactly like audit-log (see §4.1)
  useInfiniteQuery(parentLinksKeys.list(appliedFilter), listLinksAction, initialData=RSC page IF filter matches)
  useMutation(create) / useMutation(unlink)  →  onSuccess: queryClient.invalidateQueries(...)

  dialogState.kind === "detail"
    → PLDetailDialog mounts → useQuery(parentLinksKeys.consent(studentId,parentId), enabled: true while mounted)
      (dialog itself is only rendered when open, so "enabled" is implicit via mount;
       equivalent to moderation's `enabled: detailOpen && !!selectedReportId` if the
       component-architect prefers always-mounted+hidden — confirm mount-vs-enabled
       choice with them, functionally identical either way)

  dialogState.kind === "create"
    → PLCreateDialog mounts, owns 2× [rawQ, debouncedQ] + 2× useQuery (search)

SSE / realtime: none for this feature (no realtime taxonomy entry needed — links/
consent changes are admin-driven request/response only, not server-pushed).
```

### 3.1 RSC ↔ client boundary (explicit)

| Concern | RSC (`page.tsx`) | Client (`ParentLinksScreen` + dialogs) |
| --- | --- | --- |
| First paint of links table | Fetches page 1 for `q`/`classId` from URL at request time; maps to VM | Hydrates `useInfiniteQuery` with `initialData` **only if** `appliedFilter` (parsed from `useSearchParams()` at mount) still equals `initialFilter` the RSC rendered — identical guard to audit-log's `filtersEqual` check |
| Filter change after mount | Never re-invoked (no re-render of `page.tsx` on client nav within the same route) | `useInfiniteQuery` re-keys on `parentLinksKeys.list(appliedFilter)` and fetches fresh via `listLinksAction` (Server Action, not a new RSC render) |
| Consent detail, search candidates | Never — these are always client-lazy | 100% client `useQuery`, gated by dialog-open / debounced-non-empty-text |
| Mutations | Never | `useMutation` → Server Action ref passed as VM prop → invalidate on settle |
| Class filter options (`classOptions`) | RSC-fetched once, passed as static VM prop (not re-fetched client-side — it's dropdown metadata, not query-keyed data) | Read-only prop into `FilterBar`'s class `Select` |

---

## 4. Query Key Hierarchy + Cache Policy

```ts
export const parentLinksKeys = {
  all: () => ["parent-links"] as const,

  lists: () => [...parentLinksKeys.all(), "list"] as const,
  list: (filter: ParentLinksFilter) =>
    [...parentLinksKeys.lists(), filter] as const,
  // filter = { q?: string; classId?: string } — cursor deliberately EXCLUDED.
  // Rationale (mirrors audit-log/moderation): cursor is useInfiniteQuery's own
  // pageParams state, not a cache-partitioning dimension. Two different cursors
  // for the SAME {q, classId} belong to the SAME query (same list, more pages) —
  // including cursor in the key would fracture one logical list into N cache
  // entries and break getNextPageParam/hasNextPage bookkeeping entirely.

  details: () => [...parentLinksKeys.all(), "detail"] as const,
  detail: (linkId: string) => [...parentLinksKeys.details(), linkId] as const,
  // Reserved: this story's detail dialog reads row data already in the list
  // cache (no separate INT for the link itself), so `detail(linkId)` is NOT
  // populated by its own useQuery — it exists ONLY as an invalidation target
  // in case a future story (or a concurrent open dialog) keys a fetch by it.
  // Do not implement a fetch against this key in this story; wire the
  // invalidation call so it's a no-op today and correct once something keys by it.

  consent: (studentId: string, parentId: string) =>
    [...parentLinksKeys.all(), "consent", studentId, parentId] as const,

  studentSearch: (q: string, classId?: string) =>
    [...parentLinksKeys.all(), "student-search", q, classId] as const,

  parentSearch: (q: string) =>
    [...parentLinksKeys.all(), "parent-search", q] as const,
} as const;
```

### Cache policy

| Query | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Notes |
| --- | --- | --- | --- | --- |
| `list(filter)` (`useInfiniteQuery`) | `30_000` | default (5 min) | `false` | Matches audit-log exactly — admin data, not so volatile it needs focus-refetch; explicit invalidation drives freshness after mutations |
| `consent(studentId, parentId)` | `0` | default | n/a (mounts fresh each dialog open) | Matches moderation's detail-sheet `staleTime: 0` — always want current consent state when admin opens detail, cheap single-record fetch |
| `studentSearch(q, classId?)` | `10_000` | `60_000` (shorter than default — typeahead candidate sets shouldn't linger) | `false` | Typeahead — no long-lived caching value; short `gcTime` keeps memory bounded across many keystroke-driven keys |
| `parentSearch(q)` | `10_000` | `60_000` | `false` | Same rationale as student search |

- `retry`: `(failureCount, error) => isRetryable(error) && failureCount < 2` for every
  query — identical predicate shape to audit-log/moderation, driven by the failure
  union's `retryable` flag surfaced through the thrown `ThrownFailure` shape (see §7).
- List `initialPageParam: null as string | null`; `getNextPageParam: (last) => last.data.hasMore ? last.data.nextCursor : undefined` — identical to audit-log.

---

## 5. Invalidation Map

| Trigger | Keys invalidated | Notes |
| --- | --- | --- |
| `createLink` mutation `onSuccess` | `parentLinksKeys.lists()` | New row must appear (AC-003.2); broad `lists()` invalidation (not a specific `list(filter)`) so it refetches regardless of which filter is currently applied, same as moderation's `lists()` broad-invalidate |
| `unlinkLink` mutation `onSuccess` | `parentLinksKeys.lists()`, **conditionally** `parentLinksKeys.detail(linkId)` and `parentLinksKeys.consent(studentId, parentId)` if a detail dialog for that same link happens to be open concurrently | Row disappears via refetch, not manual removal (AC-005.4/.3). The conditional part only matters if UI allows unlinking from a *different* row's menu while a detail dialog for *another* row is open (row-menu action currently implies the acted-on row === any open dialog's row, but invalidate defensively rather than assume) |
| `unlinkLink` mutation `onError`, `errorKey === "not-found"` (404 race, AC-005.7) | `parentLinksKeys.lists()` | **Still invalidate** — server truth wins; row disappears via refetch (not a client-side splice), toast "đã được gỡ trước đó" |
| `unlinkLink` mutation `onError`, `errorKey === "forbidden"` (403) | **nothing** | Dialog reopens/stays with inline error; row must NOT be touched — this is the AC-005.5/.6 proof surface, cache must stay exactly as it was pre-mutation |
| `unlinkLink` mutation `onError`, `errorKey === "network-error"` | **nothing** | Dialog stays open with retry; no cache disturbance (transient, not server truth) |
| `createLink` mutation `onError`, any errorKey (`validation`/`already-linked`/`network-error`/`forbidden`) | **nothing** | Dialog stays open, fields preserved, inline/toast error — table is unaffected because nothing changed server-side |
| Filter (`q`/`classId`) change | n/a (new query key via URL change → new cache entry) | Not an "invalidation" — a re-key. Previous filter's cache entry is left alone (still valid if user navigates back) |
| Debounced search text change (both comboboxes) | n/a (new query key per `debouncedQ`) | Same re-key note; old candidate-set entries just age out via short `gcTime` |
| Dialog close (create/detail/unlink) | **nothing** | Closing a dialog is pure local UI state, never a cache event |

No SSE/realtime invalidation applies to this feature (confirmed in §3 — no server-pushed events for parent-student-links in this story's scope).

---

## 6. Mutations & Optimistic Strategy

### 6.1 `createLinkMutation` — optimistic is safe here, but kept simple (no optimism used)

```ts
const createLinkMutation = useMutation({
  mutationFn: async (vars: CreateLinkInput): Promise<ParentStudentLink> => {
    const res = await createLinkAction(vars);
    if (!res.ok) {
      throw { type: res.errorKey, fields: res.fields, retryable: res.retryable } as ThrownFailure;
    }
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
    toast.success(t("toasts.created"));
    setDialogState({ kind: "none" });
  },
  onError: () => {
    // validation/already-linked/network-error/forbidden: dialog stays open,
    // fields preserved (they're plain useState in PLCreateDialog, untouched
    // by this mutation's error path), inline/toast error rendered from
    // createLinkMutation.error — no cache disturbance either way.
  },
});
```

No `onMutate`/rollback needed — create has no meaningful "optimistic" affordance the
spec asks for (AC-003.2 explicitly describes dialog-close-then-refetch, not an
instant optimistic row). Do not add one.

### 6.2 `unlinkLinkMutation` — the load-bearing non-optimistic constraint

**Hard requirement (AC-005.4, high-risk lane): NO `onMutate`. NO `setQueryData`.**
The row must remain visible, unmodified, in the `lists()` cache until the server
responds 2xx. Copy the moderation `removeMutation` shape near-verbatim:

```ts
// *** NO onMutate. NO optimistic setQueryData. *** (AC-005.4, high-risk lane —
// see plan.md §"High-Risk Security Enforcement" point 2. A reviewer/engineer
// adding onMutate here is a gate failure, not a style nit.)
const unlinkLinkMutation = useMutation({
  mutationFn: async (vars: UnlinkVars): Promise<void> => {
    // vars = { linkId, studentId, parentId } — studentId/parentId only needed
    // to target consent() invalidation below, not sent to the server (INT-003
    // request is path-param linkId only).
    const res = await unlinkLinkAction(vars.linkId);
    if (!res.ok) {
      throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
    }
  },
  onSuccess: (_data, vars) => {
    queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
    // Defensive: only matters if a detail dialog for this same link is open.
    queryClient.invalidateQueries({ queryKey: parentLinksKeys.detail(vars.linkId) });
    queryClient.invalidateQueries({
      queryKey: parentLinksKeys.consent(vars.studentId, vars.parentId),
    });
    toast.success(t("toasts.unlinked"));
    setDialogState({ kind: "none" });
  },
  onError: (err, vars) => {
    const type = failureType(err); // "forbidden" | "not-found" | "network-error"
    if (type === "not-found") {
      // 404 race (AC-005.7): server truth wins — row IS gone, just not via
      // this client's mutation. Invalidate so refetch removes it; this is
      // NOT the forbidden case's "touch nothing" rule — a 404 confirms the
      // resource state changed, a 403 confirms it did NOT.
      queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
      setDialogState({ kind: "none" });
      toast.info(t("toasts.alreadyRemoved"));
      return;
    }
    // "forbidden" (403) and "network-error": touch NOTHING in the cache.
    // Dialog stays open (forbidden: reopens with inline error per AC-005.6;
    // network: stays open with retry per AC-005.8) — both handled by
    // deriving `unlinkErrorSlot` below, not by closing/reopening state here.
  },
});

const unlinkErrorSlot: DestructiveConfirmErrorSlot | undefined = (() => {
  if (!unlinkLinkMutation.isError) return undefined;
  const type = failureType(unlinkLinkMutation.error);
  if (type === "forbidden") {
    return { tone: "forbidden", message: t("errors.unlinkForbidden") };
  }
  if (type === "network-error" || isRetryable(unlinkLinkMutation.error)) {
    return {
      tone: "transient",
      message: t("errors.unlinkNetwork"),
      onRetry: () => unlinkVars && unlinkLinkMutation.mutate(unlinkVars),
    };
  }
  return undefined; // "not-found" already closed the dialog above via onError
})();
```

**Per-error-type outcome table (spec.md Unlink error table, confirmed exact mapping)**:

| `errorKey` | Cache touched? | Dialog | Toast | Row |
| --- | --- | --- | --- | --- |
| (none, success 2xx) | `lists()` + `detail(linkId)` + `consent(...)` invalidated | closes | success | disappears via refetch |
| `forbidden` (403) | **nothing** | reopens/stays open with inline `errorSlot` (tone `forbidden`, no retry per `DestructiveConfirmDialog`'s existing suppression) | none | stays, unmodified |
| `not-found` (404) | `lists()` invalidated | closes | info "already removed" | disappears via refetch (server truth, NOT manual splice) |
| `network-error` | **nothing** | stays open, `errorSlot` tone `transient` with `onRetry` | none (error is inline) | stays, unmodified |

`unlinkVars`/`removeVars`-equivalent local state (`UnlinkVars` captured at dialog-open
time) must be retained in `ParentLinksScreen` so `onRetry` can re-`mutate()` with the
same input — exact mirror of moderation's `removeVars`.

### 6.3 Detail-dialog consent sub-fetch — not a mutation, scoped async state

```ts
const consentQuery = useQuery({
  queryKey: parentLinksKeys.consent(target.studentId, target.parentId),
  queryFn: async () => {
    const res = await getLinkConsentDetailAction(target.studentId, target.parentId);
    if (!res.ok) throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
    return res.data;
  },
  enabled: dialogState.kind === "detail",
  staleTime: 0,
  retry: (count, err) => isRetryable(err) && count < 2,
});
```

Confirmed (task point 4): this does **not** block the rest of `PLDetailDialog` —
student/parent/relationship/note fields come from the already-fetched list-row data
passed as a prop into the dialog (no fetch needed for them at all), so
`consentQuery.isLoading`/`isError` only ever gates the consent-badge sub-section
(skeleton/error scoped to that one region, AC-004.3/.4). The dialog's `Close` action
and every other field render regardless of `consentQuery`'s status.

---

## 7. Async State Machine

Shared `ThrownFailure`/helper shape (mirrors moderation exactly):

```ts
interface ThrownFailure {
  type: ParentStudentLinkFailure["type"];
  retryable: boolean;
  fields?: { field: string; message: string }[]; // create's 422 field errors
}
function isRetryable(err: unknown): boolean {
  return Boolean((err as ThrownFailure | undefined)?.retryable);
}
function failureType(err: unknown): ParentStudentLinkFailure["type"] {
  return (err as ThrownFailure | undefined)?.type ?? "network-error";
}
```

| Surface | Loading | Empty | Error | Success | i18n error mapping |
| --- | --- | --- | --- | --- | --- |
| Links table (`useInfiniteQuery`) | `PLSkeleton` (5-row shimmer) while `query.isLoading` and no cached page yet | Two variants per FR-008: `query.data` resolved, `items.length === 0` — branch on whether `appliedFilter` is empty (`{}`) → `PLEmpty` no-filter variant vs filtered variant | `query.isError && items.length === 0` (first-page error; a failed load-more must NOT blank already-loaded rows — separate `loadMoreError` state, exact audit-log pattern) → `PLError` + retry, `errorKey → t(\`parentLinks.errors.${errorKey}\`)` | rows render | `parentLinks.errors.network-error` / `.forbidden` (should not surface — 403 redirects before reaching this state) |
| Create dialog | submit button `aria-busy`/disabled while `createLinkMutation.isPending` | n/a | `already-linked` → inline `role="alert"` on dialog body; `validation` → per-field via `.fields[]` mapped onto the relevant `PLCombobox`/`Select`; `network-error`/`forbidden` → dialog-level inline+toast, fields preserved (untouched local state) | dialog closes, toast, table refetches | `parentLinks.errors.alreadyLinked` / `.validation` / `.network` |
| Detail dialog (consent sub-fetch) | skeleton **inside consent section only** | consent record absent is not a defined empty state per spec (always exists once a link exists) — n/a | error **inside consent section only**, rest of dialog fully usable | consent badges render | `parentLinks.errors.consentUnavailable` |
| Unlink dialog | confirm button `aria-busy`/disabled while `unlinkLinkMutation.isPending`; row stays visible (AC-005.4) | n/a | see §6.2 table | dialog closes, row gone via refetch, toast | `parentLinks.errors.unlinkForbidden` / `.unlinkNetwork`; `not-found` uses a toast key, not an error-slot key: `parentLinks.toasts.alreadyRemoved` |
| Student/parent comboboxes | inline spinner in the listbox while `enabled && isFetching` | "không tìm thấy" empty-option row when resolved with 0 candidates | inline combobox error row + retry (network only — these are read-only searches, no 403 case expected once route-gated) | candidate options render | `parentLinks.errors.searchNetwork` |
| Role-gate (route) | n/a (RSC redirect happens before any client paint) | n/a | n/a | full page renders for `admin` | n/a — handled entirely by `(app)/admin/layout.tsx`, not this feature's query layer |
| Mobile `PLCardList` (<760px) | same `PLSkeleton`, card-shaped | same 2 empty variants, restacked | same error+retry, restacked | card-list renders, same query/mutation wiring as desktop (no separate query keys — pure layout swap) | same mapping as table |

**Stale/refetching treatment**: filter change → `useInfiniteQuery` flips to
`isLoading`/`isFetching` for the *new* key while the *old* key's cache entry is
untouched (React Query default) — per AC-002.3, this must render the loading
indicator, not a flash of the old filter's now-irrelevant rows; component-architect's
`PLSkeleton`/loading treatment should key off `query.isLoading` for the currently
active key (TanStack already scopes `isLoading` per-key, so this falls out for free —
no extra guard needed, unlike a single-key `useQuery` that could show stale data by
default. Confirm `placeholderData` is NOT set for this query — we deliberately want
the loading flash on filter change, matching audit-log's existing behavior, not
`keepPreviousData` smoothing).

---

## 8. Race Conditions & Resolution

| Race | Resolution |
| --- | --- |
| Two admins unlink the same link concurrently; this admin's request lands after the other's already succeeded | Server returns 404 on the second DELETE → handled by the `not-found` branch (§6.2) — invalidate `lists()`, toast "already removed", dialog closes. Never treated as a client bug; server truth wins. |
| Admin opens the unlink dialog, then in another tab/session their role is downgraded before confirming | Server-side re-check (per plan.md's `authCtx`) returns 403 on confirm → `forbidden` branch, cache untouched, dialog shows inline error. This is exactly why the mutation is non-optimistic — a race here must never have shown the row as removed and then "corrected." |
| Admin submits create-link while the list's `useInfiniteQuery` is mid-refetch from a just-applied filter change | Independent queries (`create` mutation vs `list` query) — no shared in-flight state to corrupt; `createLinkMutation.onSuccess` invalidates `lists()` regardless, the in-flight filter refetch either already reflects the new data (rare timing) or the invalidation triggers one more refetch — both converge to correct state, no manual reconciliation needed. |
| Rapid filter/search keystrokes fire many `list()`/`studentSearch()`/`parentSearch()` query-key changes before debounce settles | Debounce happens **before** the key changes (draft state), so only the settled key ever reaches `useInfiniteQuery`/`useQuery` — no request-cancellation logic needed beyond TanStack's own default (stale in-flight requests for an abandoned key are simply never observed again; short `gcTime` on search keys keeps memory bounded). |
| Detail dialog open for link A while admin unlinks link A from the row menu of a *different* render (e.g. two browser tabs) | Covered by the defensive `detail(linkId)`/`consent(...)` invalidation in `unlinkLinkMutation.onSuccess` (§5) — if this tab's detail dialog for that exact link happens to be open, its `consentQuery` will refetch (and likely 404/soft-fail) rather than showing stale consent data for a now-deleted link. Component-architect should decide the detail dialog's UX for "link vanished while I was viewing it" (out of this doc's scope — flagged, not blocking, since dialogs are rare-timing not primary flow). |
| Unlink `onError` "not-found" fires, but the admin already navigated away / closed the dialog manually first | `setDialogState({kind:"none"})` in the `not-found` branch is idempotent — closing an already-closed dialog is a no-op; the `invalidateQueries` still fires and is harmless. |
| First-page list error vs load-more error overlap (both could theoretically set state) | Exact audit-log precedent: `loadMoreError` is a separate piece of state from `query.isError`, and is reset via the "adjust state during render on filter-key change" pattern (`prevQs`/`prevFilterKey` comparison) — not an effect — so it never paints stale for a frame. Mirror verbatim, do not invent a new synchronization mechanism. |

---

## 9. Confirmed reuse / no-new-abstraction checklist

- [x] No global store introduced.
- [x] `filter-search-params.ts` helper **shape** (parse/serialize/equality trio) is
  directly reusable — this story needs its own file (`ParentLinksFilter` has different
  fields: `q`+`classId` vs audit-log's 5 fields) but follows the exact same 3-function
  contract (`parseFilterFromParams`, `filterToQueryString`, `filtersEqual`). This is a
  new **file**, not a new **pattern** — confirms the task's assumption.
- [x] No new debounce hook — inline `useEffect`+`setTimeout`, 3rd repo precedent.
- [x] `detail(linkId)` key reserved for invalidation-only use in this story (no query
  populates it yet) — documented so `fe-nextjs-engineer` doesn't treat its absence as
  a gap.
- [x] Consent lazy sub-fetch does not block dialog rendering (§6.3).
- [x] Two independent debounce+enabled gates for the two comboboses, each with its own
  key and short `staleTime`/`gcTime` (§4, §6.3 sibling note).
