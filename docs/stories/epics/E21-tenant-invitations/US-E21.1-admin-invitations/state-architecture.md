# State Architecture — US-E21.1 Admin Tenant Invitation Management

Author: `fe-state-engineer`. Finalizes `plan.md` Phase 3's "State classification"
hand-off sketch — does not contradict it, resolves the items it left open
(exact hook signatures, invalidation call sites, toast composition for the
fan-out reconciliation). Ground truth: `integration.md` §6 (fe-lead
correction, 2026-07-18) — list/resend are **permanently mock**, send/revoke
are **real** (client-side fan-out for send). No global client store
(Zustand/Redux/Jotai) — server state via TanStack Query, everything else is
local-component state, per `.claude/CLAUDE.md`. Per `.claude/CLAUDE.md` §HTTP/
Data Fetching ("Dùng TanStack Query cho client-side caching. Không dùng
`useState` cho remote data"), the invitation list is modeled as a real
`useQuery` — **not** the `RSC + local useState` mock-first variant used by
`staff-leave`/`staffing` (checked both; see [[rsc-readonly-pattern]]). This
screen needs client-triggered refetch ("Làm mới" button) + post-mutation
reconciliation, which is exactly the "when TanStack Query IS appropriate"
case in that convention doc — closest shipped precedent is
`grade-approval-container.tsx` (`useQuery` + 3×`useMutation`, mock-first
repository, `invalidateQueries` on settle), read in full before writing this.

---

## 1. State Architecture Summary

- **Server state (TanStack Query):** exactly ONE query — the full tenant
  invitation list. No pagination (mock fixture is ~8-10 rows, `integration.md`
  §6.1 confirms no real list endpoint exists, ever). No per-status/per-search
  sub-keys — status tab + search are **local component state** that filter
  the single cached list client-side (UC-002's own business rule: "filtering
  source-of-truth is server-side if supported ([OPEN QUESTION]) — else
  client-side over fetched page", and ground-truth #1 resolves that open
  question permanently to "else": there is no `GET` route at all, so
  client-side filtering over one cached list is the ONLY possible
  implementation, not a fallback).
- **Mutations (`useMutation`, mirrors `grade-approval-container.tsx` 1:1):**
  `sendInvitationBatch`, `resendInvitation`, `revokeInvitation` — 3 mutation
  hooks, each wrapping a thin Server Action that calls the matching
  `make*UseCase()` from `admin-invitations.di.ts`. All three invalidate the
  ONE list query key on the specific outcomes enumerated in §5 — never a
  blanket `onSettled`.
- **Send is explicitly NOT optimistic** (AC-003.12) — no `onMutate`/
  `setQueryData` pre-write at all. Wait for the fan-out's per-email
  succeeded/failed reconciliation (`SendBatchOutcome`), then invalidate only
  if at least one email succeeded.
- **Resend/revoke row-level pending state comes from the mutation's own
  `isPending` + `variables`** (which `invitationId` is in flight), not a
  query-cache optimistic patch — see §6.2/§6.3.
- **RSC↔client boundary:** `page.tsx` calls `makeListInvitationsUseCase()`
  once for `initialInvitations`, seeds `useQuery`'s `initialData` — no
  loading flash on first paint, matches `staffing/page.tsx`'s RSC-fetch shape
  but adds the client `useQuery` wrapper staffing doesn't have (staffing has
  no client-triggered refetch requirement; this screen does — "Làm mới" +
  post-mutation reconciliation).
- **URL state:** none. Status tab + search are local `useState`
  (`use-cases.md` UC-002's own resolution + OQ-B "stale until next fetch",
  no deep-linking AC anywhere).
- **Local-form state:** send-dialog chip array + role radio + expiry select
  — plain `useState` (matches plan.md Phase 3's call: small bespoke form, no
  react-hook-form needed).
- **No new global store, no ADR trigger.** One feature-local query key
  namespace (`admin-invitations`), not shared with any other screen.

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Invitation list | Server (`useQuery`) | `InvitationsScreen` container hook | `Invitation[]` (screen-shaped entity, plan.md Phase 1) | single mock-backed list, RSC-seeded, client-refetchable (AC-001.4 retry, "Làm mới") |
| Status tab (`all\|pending\|accepted\|expired\|revoked`) | Local (`useState`) | container | `StatusTab` union | UC-002, no server param exists to key by (ground-truth #1) |
| Search text (debounced) | Local (`useState` + debounce) | container | `string` | UC-002, client-side substring filter only |
| Raw-vs-filtered count | Local, derived (`useMemo`) | container | `{ raw: number; filtered: number }` | distinguishes AC-001.3 (zero raw) from AC-002.4 (zero filtered, non-empty raw) — pure derivation, no extra query |
| Send-dialog open | Local (`useState`) | container | `boolean` | ephemeral UI state |
| Send-dialog chip array | Local-form | `SendInvitationDialog` | `{ email: string; valid: boolean; serverError?: string }[]` | per-chip valid/invalid + server-returned per-email duplicate error (AC-003.10) rendered inline, not in a shared form-lib |
| Send-dialog role | Local-form | `SendInvitationDialog` | `InviteRoleOption \| undefined` | single-select, required |
| Send-dialog expiry | Local-form | `SendInvitationDialog` | `7 \| 14 \| 30` (default 14) | UI-only per ground-truth #7, no wire effect |
| `sendInvitationBatch` mutation | Server write (`useMutation`) | container | `UseMutationResult<SendBatchActionResult, never, SendInvitationBatchInput>` | fan-out result reconciliation, §5/§6.1 |
| Revoke-confirm dialog open + target row | Local (`useState`) | container | `{ open: boolean; row: InvitationRowVM \| null }` | reused `DestructiveConfirmDialog`, per component-organization.md |
| `resendInvitation` mutation | Server write (`useMutation`) | container | `UseMutationResult<ResendActionResult, never, string /* invitationId */>` | row-level pending via `mutation.isPending && mutation.variables === row.id`, §6.2 |
| `revokeInvitation` mutation | Server write (`useMutation`) | container | `UseMutationResult<RevokeActionResult, never, string /* invitationId */>` | same pattern, §6.3 |
| Copy-link | Client-only, no state | row action | n/a | constructs URL from data already in the VM row, no repo/query involved (ground-truth #7: no token ever on the wire, so this stays a pure client compute over whatever the mock exposes) |

---

## 3. State Flow

**Read flow (RSC → ViewModel → client):**

```
page.tsx (RSC)
  → const repo = await makeInvitationRepository()          // plan.md Phase 2
  → const result = await makeListInvitationsUseCase().execute()
  → initialInvitations = result.ok ? result.value : []
  → loadFailed = !result.ok                                  // AC-001.4 first-paint error case
  → <InvitationsScreen
       initialInvitations={initialInvitations}
       loadFailed={loadFailed}
       tenantId={params.tenant}                              // route segment, already client-visible in the URL — NOT the NFR-006 server-derived-only value used in request bodies, just a query-key/display segment
       onRefresh={refreshAction}
       onSendBatch={sendInvitationBatchAction}
       onResend={resendInvitationAction}
       onRevoke={revokeInvitationAction}
     />

InvitationsScreen ('use client', container hook e.g. use-invitations-screen.ts)
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: invitationKeys.list(tenantId),
    queryFn: async () => {
      const res = await onRefresh();               // Server Action, thin wrapper over makeListInvitationsUseCase()
      if (!res.ok) throw res.errorKey;              // caught via listQuery.error, mapped to i18n (§7)
      return res.data;
    },
    initialData: !loadFailed ? initialInvitations : undefined,
    // no initialData at all when the RSC read itself failed — forces the
    // client query to actually run and hit the SAME error path a client-
    // triggered retry would, rather than seeding an empty [] that would
    // wrongly render as AC-001.3's "zero invitations" empty state instead
    // of AC-001.4's error state.
  });
```

**Write flow (mutation → Server Action → invalidation) — see §5/§6 for the
full per-mutation contract.**

**No SSE/realtime** — OQ-B resolved as "stale until next fetch"; no event
taxonomy entry needed.

---

## 4. Query Key Hierarchy + Cache Policy

```ts
// src/features/admin/invitations/presentation/invitations.query-keys.ts
export const invitationKeys = {
  all: () => ["admin-invitations"] as const,
  list: (tenantId: string) => ["admin-invitations", tenantId] as const,
};
```

No sub-keys for status/search — both are pure client-side `.filter()` over
the single cached `Invitation[]` (§2). Do **not** key by status/search: there
is no server param to key against (ground-truth #1: no `GET` route exists,
period), so a status/search-keyed factory would fragment the cache into N
entries that all fetch the identical mock response — the same anti-pattern
flagged in [[query-key-conventions]]'s "client-side tabs filtering an
already-fetched full list → do NOT put the filter in the query key" entry
(US-E11.6 precedent), directly applicable here.

`detail(id)` key is **not** introduced — no screen ever reads a single
invitation independently of the list (no edit/detail route exists per the
component tree in plan.md Phase 3); do not mint a reserved/latent key with no
plausible consumer (contrast with question-bank's `detail(id)`, which had a
named plausible future consumer — this feature has none).

| Query | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Notes |
| --- | --- | --- | --- | --- |
| `list(tenantId)` | repo global default (`60_000`) — no override | repo global default | `false` (repo global default) | RSC-seeded `initialData`; correctness comes from explicit `invalidateQueries` calls on mutation settle (§5), not from staleTime expiry — matches the "eager invalidateQueries, not staleTime expiry" convention already established for read-only audit-trail-style lists |

No override needed: unlike `question-bank`/`messaging` (real BE, real
network variance to tune against), this is a single small mock-backed list
with explicit invalidation on every mutation outcome that matters — tuning
`staleTime` down would only add needless background refetches of a fixture
that never changes except through this screen's own mutations.

---

## 5. Invalidation Map

| Trigger | Invalidates `invitationKeys.list(tenantId)`? | Notes |
| --- | --- | --- |
| `sendInvitationBatch` — `result.succeeded.length > 0` (full OR partial success) | **Yes** | AC-003.9/AC-003.10 — at least one new Pending row must appear; invalidate even on partial success (some emails duplicate-failed) since the succeeded ones are real |
| `sendInvitationBatch` — `result.succeeded.length === 0` (all failed: network, all-duplicate, etc.) | No | Nothing changed server-side; AC-003.12 explicit "no optimistic row added" — a no-op invalidate would also be wasteful, not just unnecessary |
| `sendInvitationBatch` — action-level `{ok:false}` (e.g. session/transport failure before any fan-out call could even be attempted) | No | Same as above — no request succeeded |
| `resendInvitation` — success (`ok:true`) | **Yes** | AC-005.3 — row transitions to Pending with refreshed expiry; re-fetch is the authoritative source (mock repo owns the new `expiresAt`) |
| `resendInvitation` — race (`ok:false, errorKey:"invalid-state"`) | **Yes** | AC-005.4 — "list is refetched to reconcile"; another actor already changed this row's status, only a fresh GET shows the truth |
| `resendInvitation` — network/unknown error | No | AC-005.5 — "row unchanged"; nothing changed server-side, avoid a pointless refetch/skeleton flash on a row that didn't move |
| `revokeInvitation` — success (`ok:true`) | **Yes** | AC-006.5 — row → Revoked, dimmed, actions removed |
| `revokeInvitation` — race (`ok:false, errorKey:"invitation-invalid"`) | **Yes** | AC-006.6 — "list is refetched"; matches ground-truth #6 (revoke's not-found race is `invitation-invalid`, NOT `invitation-not-found` — the spec.md/integration.md pre-correction code does not exist on the wire) |
| `revokeInvitation` — network/unknown error | No | AC-006.7 — "row unchanged", confirm dialog stays open/reopens |
| `onRefresh` ("Làm mới" button) | N/A — this IS the query's own `refetch()`, not an invalidate of a different key | Manual refetch, same query instance |

**Why success AND the specific race branch invalidate, but plain network
error does not:** this mirrors the established repo-wide "never-optimistic
mutation's `onError` still invalidates on the specific already-resolved-style
race branch" rule (see [[query-key-conventions]]'s moderation/US-E19.2
entry) — a 409-style race means someone else's concurrent action already
changed real server state, so only a fresh GET can show the truth; a
transient network/5xx failure changed nothing, so invalidating would only
cost an unnecessary refetch cycle for content that's still accurate.

---

## 6. Mutations — Hook Contracts

### 6.1 `sendInvitationBatch`

```ts
// container hook
const sendMutation = useMutation({
  mutationFn: (input: SendInvitationBatchInput) => onSendBatch(input), // Server Action prop
});

// Server Action contract (actions.ts)
type SendBatchActionResult =
  | { ok: true; result: SendBatchOutcome } // SendBatchOutcome = { succeeded: {email,invitationId}[]; failed: {email,failure}[] } — plan.md Phase 1
  | { ok: false; errorKey: "network-error" | "unknown" }; // reserved for a total pre-fan-out failure (e.g. session refresh failure) — the normal path always returns ok:true with the per-email split, never throws away partial results
```

Submit handler (in the send-dialog's local hook, mirrors
`use-question-bank-builder.ts`'s `handleSaveDraft` shape):

```ts
async function handleSubmit(input: SendInvitationBatchInput) {
  const res = await sendMutation.mutateAsync(input);
  if (!res.ok) {
    toast.error(t("toast.networkError"));
    return; // dialog stays open, AC-003.12
  }
  const { succeeded, failed } = res.result;
  if (succeeded.length > 0) {
    queryClient.invalidateQueries({ queryKey: invitationKeys.list(tenantId) });
  }
  if (failed.length === 0) {
    // AC-003.9 — full success
    toast.success(
      succeeded.length === 1
        ? t("toast.sentOne", { email: succeeded[0].email })
        : t("toast.sentMany", { count: succeeded.length, role: roleLabel }),
    );
    closeDialog();
    return;
  }
  if (succeeded.length > 0) {
    // Partial — AC-003.10. Dialog stays OPEN, showing only the failed chips
    // with their inline server error; succeeded chips are removed from the
    // input (they're already sent, re-submitting would re-send them).
    toast.warning(
      t("toast.sentPartial", { succeeded: succeeded.length, failed: failed.length }),
    ); // NEW i18n key — not yet in plan.md Phase 3's list, flagging below
    applyPerChipErrors(failed); // maps failed[].email → failed[].failure.type → chip.serverError
    return;
  }
  // succeeded.length === 0, failed.length === input.emails.length — total failure
  if (failed.every((f) => f.failure.type === "network-error")) {
    toast.error(t("toast.networkError")); // AC-003.12-equivalent for the fan-out path
  } else {
    applyPerChipErrors(failed); // duplicate/validation failures — AC-003.10/AC-003.11 shown inline, no toast needed when every chip already shows its own error
  }
}
```

**i18n gap to flag to `fe-lead`:** plan.md Phase 3's i18n key list does not
include a partial-success toast key. Add
`invitations.toast.sentPartial` (ICU plural on both `succeeded`/`failed`
counts) to both `vi.json`/`en.json` alongside the other `invitations.toast.*`
keys — needed for the `SendDialogPartialFailure` Storybook state already
enumerated in plan.md Phase 3.

**Per-chip failure mapping** (`InvitationFailure["type"]` → chip inline
error key, presentation-only per `i18n.md`):
`invitation-invalid` (server-side duplicate-in-tenant, AC-003.10) →
`invitations.sendDialog.duplicateEmailError`; `validation` (422 field errors,
AC-003.11) → the specific field message from `failure.fields`; anything else
→ generic `invitations.toast.networkError` fallback (should not occur
per-email in practice, defensive branch only).

### 6.2 `resendInvitation`

```ts
const resendMutation = useMutation({
  mutationFn: (invitationId: string) => onResend(invitationId), // Server Action prop
  onSuccess: (res, invitationId) => {
    if (!res.ok) {
      if (res.errorKey === "invalid-state") {
        toast.error(t("toast.resendRaceError"));
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(tenantId) }); // AC-005.4
        return;
      }
      toast.error(t("toast.resendNetworkError")); // AC-005.5, no invalidate
      return;
    }
    toast.success(t("toast.resentTo", { email: res.data.email })); // AC-005.3
    queryClient.invalidateQueries({ queryKey: invitationKeys.list(tenantId) });
  },
});

// Row-level pending flag (AC-005.2 — "that row's action shows an inline
// spinner/disabled state, no full-table skeleton"):
const isRowResending = (row: InvitationRowVM) =>
  resendMutation.isPending && resendMutation.variables === row.id;
```

Row-keyed pending via `variables === row.id` (not a single shared
`isPending` boolean) is necessary because a table has N rows and only ONE
row can be resending at a time in practice, but the mutation object itself
is shared across the whole container — checking `variables` scopes the
spinner to the exact row that triggered it, preventing every expired row
from showing a spinner simultaneously.

### 6.3 `revokeInvitation`

```ts
const revokeMutation = useMutation({
  mutationFn: (invitationId: string) => onRevoke(invitationId), // Server Action prop
  onSuccess: (res, invitationId) => {
    if (!res.ok) {
      if (res.errorKey === "invitation-invalid") {
        toast.error(t("toast.revokeNotFoundRace"));
        closeConfirmDialog();
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(tenantId) }); // AC-006.6
        return;
      }
      toast.error(t("toast.revokeNetworkError")); // AC-006.7 — dialog stays open/reopens, no invalidate
      return;
    }
    toast.success(t("toast.revokedOf", { email: res.data.email })); // AC-006.5 (Server Action returns the row's email for the toast — cheap, container already has it in the VM row it triggered from, so this could equally be read from the closed-over `row` instead of the action response; either is fine, pick whichever the engineer finds simpler)
    closeConfirmDialog();
    queryClient.invalidateQueries({ queryKey: invitationKeys.list(tenantId) });
  },
});

const isRowRevoking = (row: InvitationRowVM) =>
  revokeMutation.isPending && revokeMutation.variables === row.id;
```

Confirm-dialog loading state (AC-006.4, "confirm button shows aria-busy +
spinner") is simply `revokeMutation.isPending` (only one row can be mid-
revoke at a time since the confirm dialog is modal — no `variables` check
needed there, only needed for the row-level action-button spinner which
might theoretically render while the dialog is still open for the SAME row,
so both read the identical `isPending` truthily; no divergence risk).

---

## 7. Async State Machine

| State | Query/mutation signal | UI treatment |
| --- | --- | --- |
| List loading (first paint, no RSC seed — only when `loadFailed` from RSC forced no `initialData`) | `listQuery.isPending` | `EduSkeleton(rows=5)` — AC-001.1, ≤320ms |
| List success | `listQuery.data` populated, `!listQuery.isPending` | Table renders (§ component tree, plan.md Phase 3) |
| List empty (zero raw) | `listQuery.data?.length === 0` AND no status/search filter active | `EduEmpty` "Chưa có lời mời nào" + CTA — AC-001.3 |
| List empty (zero filtered, non-empty raw) | `listQuery.data?.length > 0` AND filtered subset `.length === 0` | Distinct `EduEmpty` "Không có lời mời nào khớp bộ lọc" + Clear-filters CTA — AC-002.4 |
| List error | `listQuery.isError` (mapped `errorKey` via `listQuery.error`) | `EduError` + retry → `listQuery.refetch()` — AC-001.4/.5 |
| List refetching (after "Làm mới"/mutation invalidate) | `listQuery.isFetching && !listQuery.isPending` (background refetch, data already present) | No skeleton — table stays rendered with existing data (matches repo-wide "don't flash a skeleton on a background refetch that already has data" convention); optionally a subtle refresh affordance, not required by any AC |
| Send-dialog submitting | `sendMutation.isPending` | Submit button `aria-busy` + spinner + disabled — AC-003.8 |
| Send success (full) | resolved, `failed.length===0` | Dialog closes, success toast, table re-populates on invalidated refetch — AC-003.9 |
| Send partial | resolved, `succeeded.length>0 && failed.length>0` | Dialog stays open, partial toast, failed chips show inline error — AC-003.10 |
| Send full failure (network) | resolved, `succeeded.length===0`, all `network-error` | Dialog stays open, error toast, **no** optimistic row — AC-003.12 |
| Send full failure (validation/duplicate) | resolved, `succeeded.length===0`, non-network failures | Dialog stays open, inline chip/field errors, no toast needed (or a generic summary toast — engineer's call, not AC-mandated) — AC-003.10/.11 |
| Resend row loading | `isRowResending(row)` | Inline row spinner/disabled action — AC-005.2, no full-table skeleton |
| Resend success | resolved `ok:true` | Row updates in place (post-invalidate refetch), toast — AC-005.3 |
| Resend race | resolved `ok:false, invalid-state` | Error toast + list refetch (reconciles the row from server truth) — AC-005.4 |
| Resend network error | resolved `ok:false`, other | Error toast, row unchanged, no refetch — AC-005.5 |
| Revoke confirm loading | `revokeMutation.isPending` | Confirm button `aria-busy` + spinner — AC-006.4 |
| Revoke success | resolved `ok:true` | Dialog closes, toast, row → Revoked (post-invalidate refetch renders dimmed/no-actions) — AC-006.5 |
| Revoke race | resolved `ok:false, invitation-invalid` | Error toast, dialog closes, list refetch — AC-006.6 |
| Revoke network error | resolved `ok:false`, other | Error toast, dialog stays open/reopens, row unchanged, no refetch — AC-006.7 |

**Error → failure → i18n key mapping** (presentation-only translation, per
`i18n.md`/[[failure-union-i18n]]):

| `InvitationFailure["type"]` (plan.md Phase 1) | Where it surfaces | i18n key |
| --- | --- | --- |
| `network-error` | list load, send (whole-batch/action-level), resend, revoke | `invitations.error.*` (list) / `invitations.toast.*NetworkError` (mutations) |
| `invalid-state` | resend only | `invitations.toast.resendRaceError` |
| `invitation-invalid` | revoke only (ground-truth #6 — reused verbatim, not `invitation-not-found`) | `invitations.toast.revokeNotFoundRace` |
| `validation` (with `fields`) | send only (422) | inline field errors on the specific chip(s), `invitations.sendDialog.*` namespace, not a toast |
| `unknown` | any | generic fallback in each surface's own namespace |

---

## 8. Race Conditions & Resolution

1. **Resend/revoke race (server-side state changed between row-render and
   click)** — AC-005.4/AC-006.6. Resolution: the mutation's own `ok:false`
   branch for the specific race error code (`invalid-state` /
   `invitation-invalid`) triggers `invalidateQueries` immediately (§5/§6.2/
   §6.3) — the UI never silently retries or assumes success; the next
   render reflects the mock repo's authoritative current state.
2. **Concurrent resend + revoke on the SAME row from two different admin
   sessions** (OQ-B's "stale until next fetch" — no realtime). One session's
   action wins server-side; the other session's action call will itself hit
   the `invalid-state`/`invitation-invalid` race branch above the next time
   it's attempted, OR — if the OTHER session simply doesn't act on that row
   again — its table simply shows stale data until its own next
   manual "Làm mới"/mutation. This is the explicitly accepted product
   decision (OQ-B), not a gap this design needs to close.
3. **Send-batch double-submit** (admin double-clicks submit while the fan-
   out is in flight) — resolved by `sendMutation.isPending` gating the
   submit button disabled + `aria-busy` (AC-003.8), identical to the
   established "mutual in-flight guard" pattern used elsewhere
   ([[query-key-conventions]] question-bank/lesson-plan precedent) — no
   request-cancellation needed since Server Actions aren't abortable in this
   codebase (see [[query-key-conventions]]'s `AbortSignal`-to-Server-Action
   reasoning, US-E11.9).
4. **Resend/revoke clicked on two DIFFERENT rows in quick succession** — safe
   by construction: `resendMutation`/`revokeMutation` are React Query
   mutation objects whose `variables` reflect only the MOST RECENTLY
   triggered call; if the container needs true independent concurrent
   per-row mutations (e.g. resend row A while row B's resend is still
   in-flight), a single shared `useMutation` instance would show BOTH rows'
   spinners as the same `isPending`/`variables` pair incorrectly attributed
   to whichever call is currently in flight. **Flag as a design constraint,
   not silently accepted**: given this screen's actions are individually
   confirmed/deliberate (resend/revoke are not bulk actions), realistic
   admin usage is one row at a time — but if `fe-component-architect`/
   `fe-nextjs-engineer` want true independent concurrent row mutations,
   the fix is `useMutation` keyed per row (e.g. a `Map<string,
   UseMutationResult>` via a small wrapper hook, or React Query's
   `mutationKey` + `useMutationState` to track multiple in-flight instances)
   — NOT attempted here since no AC requires concurrent multi-row actions
   and the simpler single-shared-mutation shape is sufficient for the
   spec'd one-row-at-a-time flow.
5. **Send-batch invalidate racing a background "Làm mười" refetch** — both
   ultimately call `invalidateQueries`/`refetch` on the exact same
   `invitationKeys.list(tenantId)` key; TanStack Query's own dedup means a
   second concurrent invalidate simply re-runs the query once more, no
   double-fetch storm, no stale-write risk (single query, no optimistic
   writes to lose).

---

## Cross-references

- `plan.md` Phase 3 "State classification" (hand-off sketch this document
  finalizes), Phase 1 (`IInvitationRepository`/`SendBatchOutcome`/
  `InvitationFailure` shapes), Phase 4 (`actions.ts` shape).
- `integration.md` §6 (ground-truth correction — binding on every failure
  code cited above).
- `use-cases.md` UC-001..UC-007, AC-001.1..AC-007.4.
- Sibling precedent read in full: `src/features/grades/presentation/
  grade-approval-screen/grade-approval-container.tsx` (+
  `grade-approval-keys.ts`) — closest shipped `useQuery`+3×`useMutation`
  mock-first-repository container in this repo.
- Repo memory: `query-key-conventions.md` (client-filter-vs-server-param
  rule, race-branch invalidation precedent), `rsc-readonly-pattern.md` (why
  this screen graduates past the RSC+useState pattern).
