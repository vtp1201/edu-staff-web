# US-E09.5 — Staff Discipline (Violations + Conduct Notes) — State & Query Architecture

Author: `fe-state-engineer`. Scope: state/query design only — **no store/hook
implementation code**. Feeds `fe-nextjs-engineer` (plan.md Phase 5) and
`fe-component-architect` (VM boundary, `staff-discipline-screen.i-vm.ts`). No
global client store introduced — 100% TanStack Query (server state) + local
component state (tab, filter drafts, dialog forms), per CLAUDE.md's decision
framework.

Precedent mirrored: `src/features/moderation/presentation/moderation-screen/moderation-screen.tsx`
— RSC-seeds-page-1 `initialData` guard, `ThrownFailure`-shaped errors read off
`error.type`/`error.retryable` (never `error.message`), **never-optimistic**
mutation shape (`removeContent`) for the two dialogs that must stay open until
settled. Unlike moderation, both lists here are **unpaginated** (spec.md §8
OQ1 — no confirmed `meta.pagination` on INT-002/INT-006), so both queries are
plain `useQuery`, not `useInfiniteQuery`.

---

## 1. State Architecture Summary

- **Two fully independent query subtrees** under one root `staffDisciplineKeys`:
  `violations` and `conductNotes`. Each has its own `list(filter)` key, its own
  `useQuery` instance, its own loading/error/empty derivation. **Nothing is
  shared** between them — no combined "screen-level" query, no combined error
  boundary. This directly satisfies AC-010.3 (switching tabs must not carry
  over the other tab's error state) — see §7 confirmation.
- **8 mutations, each scoped to exactly one sub-resource's subtree**:
  `createViolation` / `submitViolation` / `approveViolation` /
  `rejectViolation` invalidate only `staffDisciplineKeys.violations()`;
  `setConductNote` / `submitConductNote` / `approveConductNote` /
  `rejectConductNote` invalidate only `staffDisciplineKeys.conductNotes()`.
  No mutation ever touches the other sub-resource's keys (unlike
  `discipline`'s `recordViolation` → also busting `conduct`, there is no
  cross-sub-resource derived data here — violations and conduct notes are
  fully independent records, not one deriving from the other).
- **No optimistic UI anywhere** (spec.md §5, explicit) — all 8 mutations are
  shaped like moderation's `removeContent`: `onSuccess`/`onError` only, **no
  `onMutate`, no `setQueryData` before the promise resolves**. The
  create-violation dialog, the set-conduct-note dialog, and both reject panels
  (`SDRejectPanel`, shared component) stay open and disabled (`aria-busy`)
  until the mutation settles; they close only from `onSuccess`.
- **Only `staffMemberId` (both lists) and `termId` (conduct notes) are real
  server query params** (spec.md §8 OQ3, INT-002/INT-006). `state`/`severity`
  (violations) are **client-side narrowing over the already-fetched array** —
  they do NOT appear in the query key and do NOT trigger a refetch, they only
  filter the in-memory list before render.
- **RSC↔client boundary**: `page.tsx` seeds `initialViolations` +
  `initialConductNotes` (+ shared `initialErrorKey` — soft-fail per plan.md,
  not a thrown 500) + `staffRoster` (static, never a query — FR-009/FR-013,
  no network call ever fires for the roster picklist). Both lists are RSC-
  fetched **unfiltered by any client-narrowing param** (principal: all staff;
  teacher: server-forced own `staffMemberId` — NFR-008). If the principal
  later picks a `staffMemberId`/`termId` filter client-side, that produces a
  **new** query key and refetches past the RSC seed (§4).
- **Role/scope caching edge case (explicitly checked, spec.md ask)**: teacher
  and principal are served by two different route segments
  (`(app)/principal/staff-discipline` vs `(app)/teacher/staff-discipline`),
  each with its own RSC page and its own `StaffDisciplineScreen` client-tree
  mount — there is no in-session mechanism today for one browser tab to hold
  both a principal-scoped and a teacher-scoped query simultaneously under the
  same key. Because the query key includes the caller's actual `staffMemberId`
  when one is in play (teacher always passes their own; principal passes
  `undefined` for "all" or an explicit id when filtering to one person), a
  principal filtering down to staff member X and a teacher viewing their own
  record (X) would legitimately hit the **same** key — which is correct, not a
  leak: the server is the single source of truth for that person's records
  regardless of which actor is asking, and NFR-008 re-enforces the caller's
  own authorization independently of what key the client happens to compute.
  Flagged as a non-issue today; **if a future story ever lets one client
  session switch role/impersonate without a full page reload**, add
  `viewerRole` as a leading key segment to force cache separation — not needed
  now (see §8 note 6).

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Active tab (`violations`\|`conductNotes`) | Local UI state | `useState` in `StaffDisciplineScreen` | `"violations" \| "conductNotes"` | FR-008 explicitly requires no navigation; spec has no shareable-deep-link AC for the tab (unlike `moderation`'s URL-synced tab) — plain `useState` is sufficient and keeps the two query lifecycles trivially independent (mount-order irrelevant, both `useQuery` hooks always run regardless of active tab so switching never triggers a fresh loading state for data already fetched). |
| Violations list | Server state | `useQuery` | `StaffViolationEntity[]` | INT-002, unpaginated per OQ1. |
| Violations client-narrowing filter (`state`, `severity`) | Local UI state | `useState` in `SDViolationsTab` (or lifted to screen if the filter bar needs to survive a tab remount — implementer's call, not query-affecting either way) | `{ state?: ApprovalTransitionState; severity?: Severity }` | Client-side only per OQ3 — narrows the already-fetched `StaffViolationEntity[]`, never part of `staffDisciplineKeys.violations.list()`. |
| Violations server filter (`staffMemberId`) | Local UI state (principal only; fixed for teacher) | `useState` in `SDViolationsTab`, teacher gets a constant (`viewerStaffMemberId`) never exposed as a control | `string \| undefined` | Real INT-002 query param — drives the query key. |
| Conduct notes list | Server state | `useQuery` | `StaffConductNoteEntity[]` | INT-006, unpaginated per OQ1. |
| Conduct notes server filter (`staffMemberId`, `termId`) | Local UI state (principal: both selectable; teacher: `staffMemberId` fixed to own, `termId` fixed to active term, no selector rendered — AC-006.3/.6) | `useState` in `SDConductNotesTab` | `{ staffMemberId?: string; termId: string }` | Real INT-006 query params (AC-006.6: term change re-queries). |
| Create-violation mutation | Server state (write) | `useMutation` | input `CreateStaffViolationInput` | INT-001; dialog stays open until settled (AC-002.6/.7). |
| Submit-violation mutation | Server state (write) | `useMutation` | `{ recordId: string }` | INT-003. |
| Approve-violation mutation | Server state (write) | `useMutation` | `{ recordId: string }` | INT-004. |
| Reject-violation mutation | Server state (write) | `useMutation` | `{ recordId: string; rejectionReason: string }` | INT-004; reject panel stays open until settled (AC-005.6). |
| Set-conduct-note mutation | Server state (write) | `useMutation` | `SetStaffConductNoteInput` | INT-005; dialog stays open until settled (AC-007.8/.9), never opens at all on an `APPROVED` target (client pre-check reads current list-cache state, not a query). |
| Submit-conduct-note mutation | Server state (write) | `useMutation` | `{ staffMemberId: string; termId: string }` | INT-007. |
| Approve-conduct-note mutation | Server state (write) | `useMutation` | `{ staffMemberId: string; termId: string }` | INT-008. |
| Reject-conduct-note mutation | Server state (write) | `useMutation` | `{ staffMemberId: string; termId: string; rejectionReason: string }` | INT-008; shared `SDRejectPanel`, same stay-open rule. |
| Create-violation dialog form fields | Local form state | react-hook-form + zod inside the dialog | `{ staffMemberId; category; description; severity; occurredAt }` | Not shared; validated client-side as defense-in-depth over server's `VIOLATION_INVALID_SEVERITY`/`INVALID_INPUT`. |
| Set-conduct-note dialog form fields | Local form state | react-hook-form + zod inside the dialog | `{ staffMemberId; termId; academicYearId; rating; note }` | `note` ≤5000 chars (AC-007.10); pre-filled on overwrite, empty on new (AC-007.1/.2). |
| Reject-panel textarea (`rejectionReason`) | Local form state | plain controlled input inside `SDRejectPanel` (single field, react-hook-form not needed) | `{ rejectionReason: string }` | ≥10-char client UX guard (AC-005.1) distinct from server's non-empty guard (AC-005.3) — two independently testable layers per spec §6 INT-009 grouping note. |
| `viewerRole`, `viewerStaffMemberId` | Server-resolved prop (not query) | RSC → VM prop | `"principal" \| "teacher"`, `string \| undefined` | Defensive UI-hiding/empty-state copy only — the real gate is server-side re-authorization (NFR-008); resolved once at RSC render, never refetched client-side. |
| `staffRoster` (`SD_STAFF_ROSTER`) | Static prop (not a query) | RSC → VM prop, passed once | `StaffRosterEntry[]` | FR-009/FR-013 — same static array every render, zero network calls, confirmed by AC-002.2's negative assertion. |

---

## 3. State Flow

```
RSC (principal/teacher page.tsx)
  → makeStaffDisciplineRepository() (or list use-cases) — two calls:
      listStaffViolations({ staffMemberId: teacher ? own : undefined })
      listStaffConductNotes({ staffMemberId: teacher ? own : undefined, termId: teacher ? activeTermId : undefined })
    (soft-fail to a shared initialErrorKey per plan.md — NOT a thrown 500;
     each list independently may fail, but both share one initialErrorKey slot
     since RSC fetch happens once per page load — see note below)
  → maps to StaffDisciplineScreenVM:
      { viewerRole, viewerStaffMemberId, staffRoster,
        initialViolations, initialConductNotes, initialErrorKey,
        <10 Server Action refs> }
  → <StaffDisciplineScreen {...vm} />

Client (staff-discipline-screen.tsx, 'use client')
  tab = useState(initial "violations")

  [SDViolationsTab]
    violationsFilter = useState({ staffMemberId: viewerRole==="teacher" ? viewerStaffMemberId : undefined })
    useQuery(staffDisciplineKeys.violations.list(violationsFilter))
      initialData = seeded ONLY if violationsFilter matches the RSC-seeded
      default filter AND !initialErrorKey (same guard shape as moderation's
      `queueInitialData`/audit-log's `filtersEqual`)
    stateFilter/severityFilter narrow `query.data` in-memory (no key impact)

  [SDConductNotesTab]
    conductFilter = useState({ staffMemberId: ..., termId: ... })
    useQuery(staffDisciplineKeys.conductNotes.list(conductFilter))
      initialData = seeded ONLY if conductFilter matches the RSC-seeded default

  useMutation × 4 (violations) → onSuccess: invalidate staffDisciplineKeys.violations()
  useMutation × 4 (conduct notes) → onSuccess: invalidate staffDisciplineKeys.conductNotes()
  (NO onMutate on any of the 8 — see §6)

SSE: none — this story has no realtime requirement (principal self-navigates
to act; not a live cross-session push feed), same reasoning as
academic-record-seal / moderation's "self-navigate, not live-push" precedent.
```

**Note on the shared `initialErrorKey`**: plan.md's VM contract (§4) carries
one `initialErrorKey?: StaffDisciplineFailure["type"]` slot for both lists,
since the RSC page makes both calls in one request cycle and a soft-fail on
either is equally "the page couldn't establish initial state." Once the
client mounts, however, **each tab's `useQuery` is independent** — if the
principal retries only the Violations tab's query, that retry does not touch
`conductNotes()`'s cache or its own subsequent error state, and vice versa.
The single `initialErrorKey` only describes the **first paint**; from the
first client-side query onward the two error states are fully decoupled
(this is what makes AC-010.3 true structurally, not just at first paint).

---

## 4. Query Key Hierarchy + Cache Policy

```ts
// src/features/staff-discipline/presentation/staff-discipline-screen/staff-discipline.query-keys.ts
// (key factory colocated with the container — matches parentLinksKeys /
// moderationKeys precedent; safe to import in client components, pure TS)

export type ViolationsFilter = { staffMemberId?: string };
export type ConductNotesFilter = { staffMemberId?: string; termId?: string };

export const staffDisciplineKeys = {
  all: () => ["staff-discipline"] as const,

  violations: () => [...staffDisciplineKeys.all(), "violations"] as const,
  violationsLists: () =>
    [...staffDisciplineKeys.violations(), "list"] as const,
  violationsList: (filter: ViolationsFilter) =>
    [...staffDisciplineKeys.violationsLists(), filter] as const,

  conductNotes: () => [...staffDisciplineKeys.all(), "conduct-notes"] as const,
  conductNotesLists: () =>
    [...staffDisciplineKeys.conductNotes(), "list"] as const,
  conductNotesList: (filter: ConductNotesFilter) =>
    [...staffDisciplineKeys.conductNotesLists(), filter] as const,
} as const;
```

Note: `staffDisciplineKeys.violations()`/`conductNotes()` (the bare
sub-resource root) is what every mutation invalidates — busting the whole
`lists` subtree for that sub-resource regardless of which `staffMemberId`/
`termId` variant is cached, so a principal who mutates while filtered to staff
member X also gets a fresh unfiltered list if they clear the filter afterward.
There is no `detail()` key in this feature — unlike `moderation`, no row ever
opens an independent detail fetch; both tabs render entirely from the list
array (rows carry every field the UI needs, per the entity shapes in spec.md
§6).

| Key | Query type | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Rationale |
| --- | --- | --- | --- | --- | --- |
| `staffDisciplineKeys.violationsList(filter)` | `useQuery` | `30_000` | `300_000` | `false` | Matches `moderation`'s queue cadence — HR-adjacent admin list, not realtime-critical, but short enough that revisiting the tab after an approve/reject elsewhere in the same session looks fresh. |
| `staffDisciplineKeys.conductNotesList(filter)` | `useQuery` | `30_000` | `300_000` | `false` | Same rationale; conduct notes carry the same rigor (NFR-008/NFR-009) as violations, no reason to diverge cache policy between the two sub-resources. |

Global default (`react-query-provider.tsx`, unchanged): `staleTime: 60_000`,
`retry: 1`, `refetchOnWindowFocus: false`. The `30_000` override on both keys
is an intentional deviation (shorter than global default, matching
`moderation`'s admin-list cadence) — recorded per the
`[[query-key-conventions]]` memory pattern.

**Retry policy** (all queries + all mutations) — read `error.retryable` off
the thrown `StaffDisciplineFailure`-shaped object, never blanket-retry, never
branch on `error.message`:

```ts
retry: (failureCount, error) =>
  Boolean((error as ThrownFailure | undefined)?.retryable) && failureCount < 2,
```

`forbidden` / `not-found` / `locked` / `invalid-transition` /
`already-processed` / `same-actor` / `missing-reject-reason` /
`term-not-found` / `invalid-rating` / `invalid-severity` / `validation` never
retry (`retryable: false`, per how the mock repository throws them per plan.md
Phase 2); only the mapped `network-error` bucket retries.

---

## 5. Invalidation Map

| Trigger (mutation) | Invalidates | Does NOT touch | Why |
| --- | --- | --- | --- |
| `createViolation` success (INT-001) | `staffDisciplineKeys.violations()` (whole subtree — every `staffMemberId` filter variant) | `staffDisciplineKeys.conductNotes()` | New DRAFT row must appear regardless of which filter the principal is currently viewing; conduct notes are an unrelated record type (spec.md: no derived-score relationship like `discipline`'s violations→conduct point recalculation). |
| `submitViolation` success (INT-003) | `staffDisciplineKeys.violations()` | `conductNotes()` | State transition only affects the violations list. |
| `approveViolation` success (INT-004) | `staffDisciplineKeys.violations()` | `conductNotes()` | Same. `selfApproved`/`approverMemberId` land via the refetched entity, never recomputed client-side. |
| `rejectViolation` success (INT-004) | `staffDisciplineKeys.violations()` | `conductNotes()` | Same; `rejectionReason` lands via refetch. |
| `setConductNote` success (INT-005) | `staffDisciplineKeys.conductNotes()` (whole subtree — every filter/term variant) | `violations()` | Create/overwrite must be visible regardless of the principal's current `staffMemberId`/`termId` filter. |
| `submitConductNote` success (INT-007) | `staffDisciplineKeys.conductNotes()` | `violations()` | — |
| `approveConductNote` success (INT-008) | `staffDisciplineKeys.conductNotes()` | `violations()` | Immediately re-fetching means the just-approved record comes back `state: "APPROVED"`, which is what makes the lock (AC-007.4/AC-008.9) take effect "with no additional wiring" — the *next* time the set-dialog's open-guard reads the list cache it already sees the locked state. |
| `rejectConductNote` success (INT-008) | `staffDisciplineKeys.conductNotes()` | `violations()` | — |
| Tab switch (no mutation) | — (new/existing key, no manual reset) | — | Switching tabs never invalidates anything; each `useQuery` simply is/isn't mounted-enabled independently — see §7. |
| Client-side filter change (`state`/`severity`) | — (no key change, in-memory narrowing only) | — | Per OQ3 — these never touch the network. |
| Server-param filter change (`staffMemberId`/`termId`) | — (new key = new cache slot, auto-fetched) | — | Standard "filter-key-drives-reset" convention (matches `moderation`/`audit-log`) — never manually cleared. |

---

## 6. Mutations & Optimistic Strategy

**All 8 mutations share one shape — no `onMutate`, ever** (spec.md §5: "No
optimistic UI is required ... the set-conduct-note form and both reject panels
MUST NOT close until the request settles"):

```ts
const createViolationMutation = useMutation({
  mutationFn: async (input: CreateStaffViolationInput) => {
    const res = await createViolationAction(input);
    if (!res.ok) throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
    return res.data;
  },
  // *** NO onMutate. NO optimistic setQueryData. ***
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: staffDisciplineKeys.violations() });
    // dialog close + toast handled by the dialog's own onSuccess callback,
    // not inside the mutation definition (mirrors moderation's separation)
  },
  onError: () => {
    // dialog stays open, fields preserved (AC-002.7) — the dialog owns its
    // own react-hook-form state, untouched by this mutation's failure;
    // inline field errors (severity/description) are read off error.type
    // by the dialog, never by this mutation object
  },
});
```

The other 7 mutations (`submitViolation`, `approveViolation`,
`rejectViolation`, `setConductNote`, `submitConductNote`,
`approveConductNote`, `rejectConductNote`) are structurally identical:
`mutationFn` throws a `ThrownFailure`-shaped object on `!res.ok`; `onSuccess`
invalidates the one subtree it owns (§5); `onError` does nothing to the cache
(no rollback needed — nothing was ever set optimistically) and lets the
calling row/panel/dialog render its own inline error from `mutation.error`.

**Reject mutations specifically** (`rejectViolation`, `rejectConductNote`) —
`SDRejectPanel` (shared component, per plan.md §4) captures `recordId` (or
`{staffMemberId, termId}`) **at panel-open time**, not re-read from the live
filtered list — same "capture the target at dialog-open time" rule as the
admin two-step approval / moderation precedent, so a filter change while the
reject textarea is open doesn't retarget the mutation.

**`setConductNote` specifically** — the lock pre-check (AC-007.4: form must
not even open on an `APPROVED` record) reads the **already-cached list data**
(`queryClient.getQueryData(staffDisciplineKeys.conductNotesList(filter))` or
simply the row's `state` prop the tab already has in hand) — it is NOT a
separate query. The server backstop (AC-007.5, `STAFF_CONDUCT_NOTE_LOCKED`
409) is what the `mutationFn`'s thrown `{ type: "locked" }` surfaces if a
stale/bypassed request still reaches the server; `onError` renders the same
inline lock message the pre-check would have shown, dialog stays open only
long enough to display it (or closes — implementer's call per AC-007.5's
wording; either satisfies "server backstop", the dialog is not required to
mimic the pre-check's "never opens" behavior for a race it couldn't have
predicted).

**`onSettled` is not used on any of the 8** — invalidation is done explicitly
in `onSuccess` only; there is no error branch here (unlike `moderation`'s
`already-resolved` 409 sub-case) that requires invalidating on failure, since
none of this story's documented failure branches (`invalid-transition`,
`not-found`, `forbidden`, `locked`, `same-actor`, validation-shaped errors)
represent "a real state change landed anyway" — they are all rejections of
the attempted write, so the cache is correctly left untouched on every error
path.

---

## 7. Async State Machine — and confirmation of independent per-tab error state

**Structural confirmation (spec.md AC-010.3)**: YES, satisfied. `SDViolationsTab`
and `SDConductNotesTab` each own a **separate `useQuery` call** against a
**separate key subtree** (`violationsList`/`conductNotesList`). There is no
shared "screen-level" query, no shared error `useState`, no combined
loading/error boolean computed from both. Switching the active `tab` value
never unmounts either `useQuery` (both hooks are declared unconditionally in
their respective tab components, which — per plan.md's component tree — are
both always instantiated inside `<Tabs>`; only their **visibility** toggles).
Consequently: if the Violations tab is showing an error (e.g. a transient
`network-error` on its `useQuery`), switching to Conduct Notes renders that
tab's own, independently-resolved state (loading/empty/success/error) with
zero carry-over — there is structurally nothing to carry over, since the two
`error` objects live in two different `useQuery` instances.

### Per-list state machine (identical shape for both `violationsList` and `conductNotesList`)

| State | Condition | UI treatment |
| --- | --- | --- |
| loading | `query.isLoading` (no cached data yet) | `EduSkeleton` rows×4 (NFR-006, ≤320ms) |
| empty (principal) | resolved, `data.length === 0`, `viewerRole === "principal"` | `EduEmpty` + create/set CTA (AC-001.4/AC-006.4) |
| empty (teacher) | resolved, `data.length === 0`, `viewerRole === "teacher"` | `EduEmpty`, no CTA (AC-001.5/AC-006.5) |
| error | `query.isError` | `EduError` + retry (AC-001.6/AC-006.7); conduct notes' `term-not-found` renders inline on the term selector instead, list not fetched (AC-006.8) |
| success | `data.length > 0` | rows render, client-side `state`/`severity` narrowing applied in-memory (violations only) |

Failure→i18n mapping (per `[[failure-union-i18n]]` convention): 9 shared codes
→ `discipline.errors.<type>` verbatim; the 3 conduct-note-specific codes
(`locked`, `term-not-found`, `invalid-rating`) → `staffDiscipline.errors.<type>`
(already authored per spec.md §8 [CONFLICT] resolution — do not regenerate).

### Per-mutation state machine (identical shape for all 8)

| State | Condition | UI treatment |
| --- | --- | --- |
| idle | `mutation.isIdle` | normal button/submit enabled |
| pending | `mutation.isPending` | button/submit `aria-busy` + disabled; dialog/panel **stays open**, no field reset |
| error | `mutation.isError` | inline field/panel error keyed off `error.type` (never `error.message`); dialog/panel **stays open**, values preserved (AC-002.7/AC-007.9) |
| success | `mutation.isSuccess` | dialog/panel closes (create-violation, set-conduct-note, reject panels) or nothing to close (submit/approve — inline row action); toast; cache invalidated per §5 |

---

## 8. Race Conditions & Resolution

1. **Double-click / concurrent transition on the same record** (e.g. approve
   clicked twice, or submit + approve racing). Resolution: row-level action
   buttons are disabled while `mutation.isPending`; the server is
   authoritative — a losing concurrent request gets `invalid-transition` or
   `already-processed`, surfaced inline, no client-side mutex beyond the
   disabled button is needed (identical reasoning to moderation's race note
   §8.1).

2. **Reject panel open on a record another actor (or the same principal in
   another tab) has already transitioned.** `SDRejectPanel` captures
   `recordId`/`{staffMemberId,termId}` at open-time (§6); if the server
   returns `already-processed`/`invalid-transition` on submit, the panel shows
   that inline error and stays open (matches AC-005.4/AC-008.7's stay-open
   requirement) — the principal must close it manually and re-open against
   the now-refreshed row (which the next `staffDisciplineKeys.violations()`/
   `conductNotes()` invalidation, or a manual retry, will show correctly).

3. **Set-conduct-note lock race** (AC-007.5): client pre-check passes (record
   was DRAFT/absent/REJECTED at dialog-open time), but the record reaches
   `APPROVED` before the mutation lands (another approve went through
   concurrently). Server returns 409 `{ type: "locked" }`; `onError` renders
   the same inline lock message the pre-check would have shown. No special
   client-side polling is added to detect this earlier — the 409 backstop
   (NFR-009 point 4) is the designed detection mechanism, not a gap.

4. **Filter change while a mutation is in flight** (principal changes
   `staffMemberId`/`termId` mid-reject-confirm). The mutation's captured
   variables (§6) are independent of the live filter state, and its
   `onSuccess` invalidation target is the **whole subtree**
   (`violations()`/`conductNotes()`), not a single filter variant — so
   whichever filter is active when the mutation settles still gets a fresh
   refetch. No stale-key invalidation risk (same reasoning as moderation §8.4).

5. **Tab-switch mid-mutation.** Both tab components (and their `useQuery`/
   `useMutation` hooks) are always mounted per plan.md's component tree (only
   visibility toggles via `<Tabs>`/`<TabsContent>`), so switching tabs while a
   mutation is pending does not unmount the mutation — it completes normally
   and its `onSuccess`/`onError` still fire, still invalidate the correct
   subtree, regardless of which tab is currently visible. If a future revision
   changes `SDViolationsTab`/`SDConductNotesTab` to unmount on inactive tabs
   (`forceMount={false}` behavior), an in-flight mutation's side effects
   (`queryClient.invalidateQueries`) are still safe — `queryClient` is a
   stable singleton, not tied to component lifecycle; only local dialog-close
   callbacks would become no-ops on an unmounted tree, which is harmless.

6. **Role-scope key collision (defense-in-depth only, see §1).** Not a
   demonstrated race in this story's routing model (principal/teacher are
   separate route segments, separate RSC page mounts) — carried forward as a
   flag, not a fix: if a later story introduces same-session role-switching
   (e.g. an admin "view as" mode) without a full page reload, add `viewerRole`
   as a leading key segment on both `violationsList`/`conductNotesList` to
   force cache separation. No action needed today.

---

## Local/URL state — explicitly out of TanStack Query's scope

- **Active tab** (`"violations" | "conductNotes"`): local `useState`, not URL
  — FR-008 only requires "no navigation," not shareability; no AC in this
  story asks for a deep-linkable tab (unlike `moderation`'s URL-synced tab).
- **Filter drafts**: `state`/`severity` (violations, pure client-side
  narrowing per OQ3) and `staffMemberId`/`termId` (both lists, real server
  params but still plain `useState` driving the query key — no AC in this
  story requires shareable filtered URLs, so this design intentionally does
  NOT URL-sync them; flagged as an easy future enhancement, not a gap against
  any AC).
- **Dialog/panel form state**: create-violation dialog, set-conduct-note
  dialog, reject-panel textarea — plain local form state (react-hook-form +
  zod for the two multi-field dialogs; a single controlled input for the
  reject textarea, matching `[[query-key-conventions]]`'s guidance not to
  reach for react-hook-form on a single field). None of this is a TanStack
  Query concern; it lives entirely in the owning dialog/panel component.

---

## Flags to `fe-lead`

1. **No ADR needed** — no global store introduced, no new auth/token handling,
   no new data-contract decision beyond what integration.md/spec.md already
   stage as open questions (pagination shape OQ1, `same-actor` semantics OQ2).
2. **Filters are not URL-synced in this design** (see previous section) —
   intentional, since no AC demands it; flag if `uiux-lead`/`ba-lead` later
   want shareable filtered links, at which point this becomes a
   `useSearchParams` draft/applied split identical to `moderation`'s pattern.
3. **`viewerRole` key-partitioning is deferred, not built** (§1/§8.6) — only
   relevant if same-session role-switching is ever introduced; not applicable
   to this story's route-per-role model.
4. **Repository shape**: this design is agnostic to plan.md §1's still-open
   "one repo vs two repos + facade" question — the query-key/invalidation
   graph is identical either way, since keys are a presentation-layer concern
   that only ever calls through the 10 Server Actions in the VM contract, never
   the repository directly.
