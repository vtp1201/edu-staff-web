# US-E14.6 — State Architecture (Academic Record Seal)

Author: fe-state-engineer. No global store (TanStack Query + URL state + local
form state only), per `.claude/CLAUDE.md`. This refines Phase 3 of `story.md`
against confirmed repo conventions (`grade-approval`, `announcements`,
`notification`, `attendance`, `academic-record` viewer).

## 1. Summary

- **Server state** (4 resources) → TanStack Query, driven from a client
  container (`academic-record-seal-container.tsx`); this feature currently has
  **zero** existing TanStack Query usage (the sibling viewer screen is pure
  RSC), so no key-collision risk on the `academic-records` namespace.
- **Selector** (classId/term/year) → URL `searchParams`, read via
  `useSearchParams` and written via `router.replace` (pattern: `AcademicRecordContainer` in this same feature) — shareable deep link to a batch,
  consistent with the plan's Phase 3 note.
- **Active tab** (Seal | Unseal) → URL searchParams too (`?tab=seal|unseal`),
  not local `useState` — reload/share should preserve which workflow is open;
  cheap addition alongside the selector params.
- **Reason textarea, dialog open/close, selected co-signer choice** → local
  component state / `useState` (or later react-hook-form if validation grows;
  a single 20-char-min textarea does not need RHF — plain controlled input +
  derived boolean is enough, matching `unseal-initiate-form.tsx`'s sketch).
- **`currentAdminId`** resolved server-side in `page.tsx` via
  `decodeSubClaim` on the access token (cheap, synchronous, no extra request).
  **`currentAdminName`** is NOT separately resolved server-side — the client
  derives it from the `tenant-admins` query once it settles (see §3). This
  avoids a second server-side identity call and avoids a null-flash for the
  common case where the admin's own name doesn't block critical AC (AC-8's
  hard rule only needs **id** equality, not the display name).
- Mutations: `sealBatch`, `initiateUnseal`, `confirmUnseal` — each via
  Server Action → DI use-case, invoked through `useMutation` from the
  container for pending/toast/error UX (pattern: `grade-approval-container`).

## 2. Query Key Hierarchy (factory, matches `announcementKeys`/`notificationKeys` convention — preferred over the older flatter `gradeApprovalKeys` style)

```ts
// academic-record-seal-keys.ts
export const academicRecordSealKeys = {
  all: ["academic-records", "seal"] as const,

  sealStatus: (key: SealBatchKey) =>
    ["academic-records", "seal", "status", key.classId, key.term, key.year] as const,

  auditTrail: (filter?: Partial<SealBatchKey>) =>
    filter
      ? ["academic-records", "seal", "audit-trail", filter.classId ?? null, filter.term ?? null, filter.year ?? null] as const
      : ["academic-records", "seal", "audit-trail", "all"] as const,

  pendingUnsealRequests: () =>
    ["academic-records", "seal", "unseal-requests", "pending"] as const,

  tenantAdmins: () =>
    ["academic-records", "seal", "tenant-admins"] as const,
} as const;
```

Notes:
- Root `["academic-records", "seal"]` is a **distinct sub-namespace** from the
  viewer feature's future keys (currently none exist) — safe, and groups
  everything invalidated together via `["academic-records", "seal"]` prefix
  if ever needed (e.g. a "refresh all" action), matching how
  `notificationKeys.all` / `announcementKeys.all` are used for broad
  invalidation.
- `sealStatus` takes the full `SealBatchKey` object (not a stringified
  composite) — matches `gradeApprovalKeys.batchDetail(id)` positional-arg
  style, keeps key parts introspectable in devtools.
- `auditTrail(filter?)` supports both the unfiltered global table (AC-6, no
  filter args in the current design) and a future per-batch filtered variant
  without a breaking key-shape change.

### Cache policy

| Key | staleTime | gcTime | refetch |
| --- | --- | --- | --- |
| `sealStatus(key)` | `0` (always refetch on selector change / mount — allLocked gate must reflect the latest grade-lock state, this is a safety-critical gate) | default (5min) | `refetchOnWindowFocus: true` (admin may lock grades in another tab, come back) |
| `auditTrail()` | `15_000` (matches `announcements` list precedent) | default | default |
| `pendingUnsealRequests()` | `0` — Admin 2 must see a just-created request as soon as they land on the screen (AC-8 pending-list model, no realtime push); also `refetchOnWindowFocus: true` | default | default |
| `tenantAdmins()` | `5 * 60_000` (rarely changes within a session) | default | default |

No SSE/realtime wiring for this story (no `academic-records.*` event exists in
`bootstrap/realtime/event-invalidation.ts`) — Admin 2's "sees pending request"
relies on **fresh navigation + `staleTime: 0` + focus refetch**, not push.
This is consistent with ADR 0037 Amendment's pending-list model (self-navigate,
not live/same-session).

## 3. RSC ↔ Client Boundary

`page.tsx` (RSC, `admin/academic-records/`):
- Resolves `currentAdminId = decodeSubClaim(accessToken)` server-side (reuse
  `bootstrap/lib/jwt.ts`, same helper family as `decodeRoleClaim`/`decodeTenantId`
  already used by `require-role.server.ts` / `teacher-class.di.ts`). No new
  accessor needed — this answers the plan's [OPEN QUESTION].
- Does **NOT** resolve `currentAdminName` server-side. Rationale (simpler
  option, chosen over cross-referencing tenant-admins server-side):
  - Fetching `listTenantAdmins()` in the RSC just to look up one name adds a
    second server round-trip for a value that's cosmetic (only used in the
    self-approve-fallback warning text and the audit trail's "confirmed by"
    display) — AC-8's actual **hard gate** (`same-admin-as-initiator`) is
    enforced by `coSignerId === requestedById`, a plain ID comparison that
    never needs the display name.
  - The client already queries `tenant-admins` (needed for the co-signer
    context / fallback detection: `adminCount === 1`). The container derives
    `currentAdminName = tenantAdmins.find(a => a.id === currentAdminId)?.name ?? currentAdminId`
    once that query settles — one extra `.find()`, zero extra requests.
  - VM ships `currentAdminId: string` (non-null, always resolvable — RBAC
    guard already guarantees an authenticated admin reached this route) and
    does **not** include `currentAdminName` in `AcademicRecordSealScreenVM`;
    it becomes a client-derived value inside the container, threaded to
    children as a plain prop.
- Passes `actions` (Server Action refs) + `currentAdminId` into
  `AcademicRecordSealContainer`. RBAC already covered by `admin/layout.tsx`.
- No searchParams read needed in `page.tsx` itself (unlike `attendance`/`admin/roster`) because this screen does NOT do RSC-driven refetch-per-navigation — selector state is consumed client-side by `useQuery`, not by re-rendering the RSC tree. `page.tsx` stays selector-agnostic.

Client (`academic-record-seal-container.tsx`):
- Reads `classId`/`term`/`year`/`tab` from `useSearchParams()`.
- Runs the 4 queries (§2) with `enabled: Boolean(classId && term && year)` for
  `sealStatus` (audit trail / pending requests / tenant admins are
  unconditional — they don't depend on the selector).
- Runs the 3 mutations (§4), all going through `'use server'` action refs
  passed down as `actions` props — never importing `bootstrap/di` directly
  (Clean Architecture boundary).

## 4. Mutations & Invalidation Map

| Mutation | Trigger | `onSuccess` invalidates | Notes |
| --- | --- | --- | --- |
| `sealBatch` | AC-4 confirm dialog OK | `sealStatus(key)`, `auditTrail()` | No optimistic update — sealing is a one-way, safety-critical transition; wait for server confirmation before flipping the UI (avoid a false "sealed" flash if the server rejects on `not-all-locked`/`already-sealed` race). |
| `initiateUnseal` | AC-7 reason form submit | `pendingUnsealRequests()` (**not** `sealStatus`/`auditTrail` — sealing status is unchanged until Step 2 confirms; only the pending-list view changes) | Confirms the plan's `story.md` framing: initiation alone does not touch seal state. |
| `confirmUnseal` (incl. self-approve fallback, `coSignerId: null`) | AC-8 Admin-2 confirm, or single-admin fallback confirm | `pendingUnsealRequests()`, `auditTrail()`, `sealStatus(key)` (the underlying term flips `SEALED → UNSEALED`) | All three — the term's displayed status (badge on this screen / on the E14.5 viewer once that screen re-queries) must reflect UNSEALED immediately. |

No `onMutate` optimistic writes for any of the three — this is a high-risk
data-integrity lane (ADR 0037): correctness of the gate (`allLocked`,
`same-admin-as-initiator`, `no-pending-request`) must be server-confirmed
before the UI advances state. Optimistic UI here would risk showing "sealed"/
"unsealed" for an action the server then rejects — worse UX than a short
pending spinner for a low-frequency admin action.

`onError`: no rollback needed (no optimistic snapshot taken); surface the
mapped failure (see §6).

`onSettled`: none needed beyond the `onSuccess` invalidations above (no
optimistic state to reconcile).

## 5. Async State Machine

**Seal workflow** (per `SealBatchKey` selection):

```
idle (selector incomplete)
  → loading (sealStatus query pending, AC-1 skeleton)
    → allLocked-ok   (AC-2: green indicator, Seal button enabled)
    → allLocked-notOk (AC-3: warning banner role="alert", list of unlocked subjects, Seal button disabled)
    → already-sealed  (indicator "Đã niêm phong" + sealedBy/sealedAt, AC-5)
  → [allLocked-ok] confirm-dialog-open (AC-4, focus-trapped)
    → sealing (mutation pending — disable dialog OK button, show spinner)
      → sealed-success (toast + invalidate → refetch flips to already-sealed state) | seal-error (toast, dialog stays open or closes per UX — recommend: close dialog, surface toast, banner reflects re-fetched real state)
```

**Unseal workflow** (only reachable when `status === "SEALED"`):

```
idle
  → reason-entry (AC-7 form open, char-count live vs 20-min, submit disabled until valid)
    → submitting (initiateUnseal mutation pending)
      → pending (request created, visible in pendingUnsealRequests list to ANY admin who (re)loads/refocuses the screen)
        → [current session is same admin who initiated, OR only 1 tenant admin exists]
             self-approve-available → confirming (self-approve fallback dialog, ADR 0037 warning banner) → confirmUnseal(coSignerId: null) → unsealing → unsealed-success
        → [different admin loads screen, sees the pending row]
             confirming (co-signer confirm dialog) → confirmUnseal(coSignerId: currentAdminId) → unsealing → unsealed-success
        → [same admin as initiator attempts to confirm their own request, adminCount >= 2]
             same-admin-error (AC-8: inline dialog error "Cần admin khác xác nhận" — NOT a toast, because it's a direct consequence of the action they just took inside an open dialog; toast would be missed once dialog closes)
```

State-to-UI treatment:

| State | UI treatment |
| --- | --- |
| loading (initial `sealStatus`/`auditTrail`/`pendingUnsealRequests`) | Skeleton (AC-1) — never a spinner for page-level data, per repo convention |
| refetching (focus refetch, selector unchanged) | Keep prior data visible (`isPending` false, `isFetching` true) — no skeleton flash; optional subtle "đang cập nhật" affordance on the audit table only if `isFetching && !isPending` |
| empty (no audit entries yet / no pending requests) | Explicit empty state text in `AuditTrailTable`/pending list, not a blank table |
| error (query failure) | Inline error state on the affected panel (not a global page error) — map failure → i18n key (§6); retry action re-triggers `refetch()` |
| mutation pending | Disable the triggering button + show inline spinner on it (dialog OK button state), consistent with `grade-approval-container`'s `isApproving`/`isBulkLocking` flags |
| mutation success | `sonner` toast (`toast.success`), matches every other feature container reviewed |
| mutation domain error (`not-all-locked`, `already-sealed`, `not-sealed`, `reason-too-short`, `no-pending-request`) | `sonner` toast (`toast.error`) — these are transient/incidental (stale data, race) |
| `same-admin-as-initiator` | **inline dialog error**, not toast — happens synchronously inside the confirm dialog the admin just opened; a toast could be missed if the dialog auto-closes |

## 6. Failure → i18n mapping

Presentation-side map (container), same shape as `grade-approval-container`'s
`ERROR_KEY` record — keyed by `AcademicRecordsFailure["type"]`, translated via
`useTranslations("academicRecordSeal")`, values are `errors.<type>` paths per
the story's i18n plan (`errors.not-all-locked`, `errors.already-sealed`,
`errors.not-sealed`, `errors.reason-too-short`, `errors.no-pending-request`,
`errors.same-admin-as-initiator`, plus the pre-existing 4 generic ones). No
translation happens below presentation (Server Action returns the bare
`errorKey`, per `.claude/rules/i18n.md`).

## 7. Race Conditions & Resolution

1. **Two seal attempts in quick succession (double-click / two tabs).**
   Resolution: no optimistic update (§4); second `sealBatch` call hits the
   server, which returns `already-sealed` — surfaced as a toast, and the
   `sealStatus` refetch (invalidated by the first success) shows the true
   state. Also disable the Seal button while `sealing` (`mutation.isPending`).

2. **Admin 2 confirms a request that a third party already confirmed
   (double-confirm race).** Server returns `no-pending-request` (or an
   equivalent already-resolved error) on the second `confirmUnseal` call;
   toast shown; `pendingUnsealRequests()` invalidation (from the first
   successful confirm) removes the row from Admin 2's list on next
   focus/refetch. Recommend: also call `invalidateQueries(pendingUnsealRequests())`
   in the mutation's `onError` path when the error type is
   `no-pending-request`, so a stale row disappears immediately instead of
   waiting for the next natural refetch.

3. **`sealStatus` refetch (focus refetch) resolves while the confirm dialog
   for `sealBatch` is still open** (admin tabbed away, grades got unlocked
   elsewhere, tabbed back). Resolution: `enabled` query keeps running in the
   background; if `allLocked` flips to `false` while the dialog is open, the
   dialog's "Seal" action should be disabled reactively (bind to the live
   query's `allLocked`, not a snapshot taken when the dialog opened) — avoids
   sealing against stale gate state.

4. **Reading `currentAdminName` before `tenantAdmins()` has resolved.**
   Container falls back to `currentAdminId` as the display value until the
   query settles (§3) — no loading flicker required since this is
   non-blocking cosmetic text, not a gate.

5. **Selector changed while a mutation for the previous selector is still
   pending** (admin changes classId mid-seal). Low likelihood given the
   confirm-dialog gate, but: keep the mutation keyed to the `SealBatchKey`
   captured at dialog-open time (pass `key` as a mutation variable, not read
   fresh from searchParams inside `mutationFn`), so a selector change during
   an in-flight mutation doesn't seal the wrong batch. On success, invalidate
   `sealStatus(capturedKey)` specifically (not "whatever the selector shows
   now").
