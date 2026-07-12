# Use Cases + Acceptance Criteria — US-E23.1 (Header Tenant-Switch Menu + Dialog)

Source: `requirements.md` (TR-E23.1), `integration.md` (INT-001/INT-002).
High-risk lane — Authorization is a hard gate: every AC that results in a
tenant/role scope change MUST be traceable to a server-side round-trip
(`switchTenantAction` → `SwitchTenantUseCase` → `POST /members/switch-tenant`
→ `setAuthCookies`, httpOnly). No AC in this packet is satisfied by a
client-only state mutation.

## 1. Use Case Scope Summary

- **6 use cases** (UC-001..UC-006), all reusing existing `iam` endpoints
  (INT-001, INT-002); no new BE surface.
- **Actors**: teacher, principal, student, parent — identical behavior across
  all four (no role-gated visibility beyond membership count, confirmed in
  requirements §Prioritized Requirements).
- **Boundaries**: header user-menu item + "Chọn trường" dialog only. Does
  NOT cover post-login routing (US-E23.2), does NOT cover `RoleSwitcher`
  (orthogonal, ba-lead-confirmed non-redundant), does NOT introduce new
  endpoints.
- **Authorization boundary (explicit)**: this packet models both (a) UI
  visibility gating (menu item shown/hidden) AND (b) server-side enforcement
  (the actual scope change is only ever accepted/rejected by BE — UI gating
  is a convenience, not the security boundary). See AC-004.6 / AC-004.7 /
  AC-006.* for the explicit server-side-enforcement criteria.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| Teacher | Human, authenticated | View current tenant badge; open switch dialog if ≥2 ACTIVE memberships; select a target tenant card; switch |
| Principal | Human, authenticated | Same as Teacher |
| Student | Human, authenticated | Same as Teacher |
| Parent | Human, authenticated | Same as Teacher |
| System (header data loader) | Non-human | Fetches membership list on header render (INT-001) |
| System (SwitchTenantUseCase / switchTenantAction) | Non-human, server-side only | Mints tenant-scoped token pair via INT-002; sets httpOnly cookies; is the ONLY path that changes effective role/tenant scope |
| BE (`iam` service) | External system | Enforces ACTIVE-membership check on switch-tenant call (403 if not a member); authoritative source of truth — UI gating is advisory only |

## 3. Use Case Catalogue

### UC-001: Render current-tenant header block

- **Primary actor**: any authenticated caller (teacher/principal/student/parent).
- **Secondary actor**: System (header data loader), BE `iam`.
- **Preconditions**: caller has a valid access token with a `tenantId` claim; header renders on any authenticated app route.
- **Main success scenario**:
  1. Header requests the membership list (INT-001) and decodes `tenantId` from the access token (`decodeTenantId`, `src/bootstrap/lib/jwt.ts`).
  2. System matches the decoded `tenantId` against the resolved membership list.
  3. Header renders the matching membership's logo/initial + role badge (FR-007).
- **Alternative flows**:
  - A1 — Matching membership found but list has exactly 1 ACTIVE membership: current-tenant block still renders (FR-007 is independent of FR-001/002's menu-item gating).
- **Exception flows**:
  - E1 — No matching membership found (stale/foreign `tenantId`, e.g. caller was removed from the tenant encoded in their still-valid token): fall back to role-only display (existing behavior); header must not crash (FR-007 errorConditions).
  - E2 — INT-001 fetch fails: header still renders (fail closed per FR-008); current-tenant block falls back to role-only display (same as E1) since there is no membership data to match against.
- **Business rules**: current-tenant match is by `tenantId` claim, never by client-cached state alone — the claim is decoded from the actual token in the httpOnly cookie server-side/at render time, not persisted client state.
- **Non-functional constraints**: NFR-006 (i18n), header must not block render on this failure (FR-008).

### UC-002: Show "Đổi trường" menu item (≥2 memberships) — positive gating

- **Primary actor**: teacher/principal/student/parent.
- **Preconditions**: membership list resolved (INT-001 succeeded), count of ACTIVE, switchable memberships ≥ 2.
- **Main success scenario**:
  1. Header user-menu renders.
  2. System evaluates ACTIVE membership count ≥ 2.
  3. "Đổi trường" item renders with `role=menuitem`, `switchHorizontal` icon (FR-001).
- **Alternative flows**: none (single deterministic branch).
- **Exception flows**:
  - E1 — Membership count resolves to ≥2 but INT-001 is still in flight when the menu first paints: item MUST NOT render optimistically (integration.md INT-001 "Empty/loading expectation") — render only once the count is known, to avoid a flash-then-disappear for the eventual single-tenant case.
- **Business rules**: FR-001 threshold is strictly `>= 2` ACTIVE + switchable; INACTIVE/SUSPENDED/LEFT memberships never count toward this threshold.
- **Non-functional constraints**: no flash-of-item; item is keyboard-operable (native `menuitem` semantics).

### UC-003: Hide "Đổi trường" menu item — zero-noise negative gating (single-tenant + fail-closed)

- **Primary actor**: teacher/principal/student/parent.
- **Preconditions**: EITHER membership count resolves to exactly 1 ACTIVE switchable membership (FR-002), OR the INT-001 fetch fails (FR-008).
- **Main success scenario (single-tenant)**:
  1. Header user-menu renders.
  2. System evaluates ACTIVE membership count == 1.
  3. No "Đổi trường" item is rendered; no dialog trigger exists anywhere in the DOM; the menu is otherwise unchanged from pre-E23.1 behavior.
- **Alternative flows**:
  - A1 — Fetch-fails path (FR-008): System swallows the INT-001 error, logs it, and renders the header exactly as if single-tenant (no item, no broken trigger, no error banner in the menu).
- **Exception flows**: none — this UC IS the exception-handling UC for UC-002.
- **Business rules**: "zero-noise" means literally **no added DOM node** for the menu item, not a disabled/greyed item — this is asserted as a **negative** AC (absence of an element), not merely "not covered by other tests."
- **Non-functional constraints**: no additional network calls or visual flicker introduced by the gating logic itself.

### UC-004: Open dialog, select target tenant, switch succeeds

- **Primary actor**: teacher/principal/student/parent.
- **Secondary actor**: System (`SwitchTenantUseCase`/`switchTenantAction`), BE `iam`.
- **Preconditions**: UC-002 satisfied (menu item visible); caller activates it.
- **Main success scenario**:
  1. Caller activates "Đổi trường" (click or Enter/Space) → dialog opens, focus-trapped, focus moves to first focusable element (FR-003).
  2. Dialog lists every ACTIVE switchable membership as a real `<button>` card (logo/initial, name, address, role badge; "Hiện tại" badge on the membership matching the caller's current `tenantId`).
  3. Caller activates a non-current card.
  4. Card enters per-card loading state (`aria-busy`, `role=status`/`aria-live=polite`, sr-only "Đang chuyển…") within 100ms (NFR-003/005).
  5. Client invokes `switchTenantAction` (Server Action) — the ONLY invocation path; the action calls `SwitchTenantUseCase` → `POST /members/switch-tenant` (INT-002).
  6. BE validates the caller still holds an ACTIVE membership in the target tenant and returns a fresh tenant-scoped token pair.
  7. `switchTenantAction` persists the pair via `setAuthCookies` (httpOnly, server-side) — no token value ever reaches the client bundle.
  8. Success toast "Đã chuyển sang {school}" shown; caller navigated into the target tenant's default workspace route; dialog closes.
- **Alternative flows**:
  - A1 — Caller selects the already-current card (FR-005): treated as no-op — no network call, dialog stays open or closes without a toast.
  - A2 — Caller dismisses via Escape/backdrop click while no card is loading (FR-006): dialog closes, focus returns to the trigger.
- **Exception flows**:
  - E1 — BE 403 mid-flow (membership revoked between list-fetch and select — race condition): inline error rendered on the clicked card; dialog stays open; **no navigation occurs; no cookie mutation occurs** (the failed server round-trip means `setAuthCookies` is never reached); caller remains in their prior tenant context.
  - E2 — Network/5xx/timeout: error toast shown; card returns to idle state; dialog stays open; caller may retry.
  - E3 — Caller attempts Escape/backdrop dismiss WHILE a card is in loading state (FR-006): dismiss is blocked until the call settles (prevents an orphaned in-flight mint from being abandoned mid-UI-teardown).
  - E4 — 401 mid-flow (token expired before the switch call lands): existing reactive-refresh interceptor retries once (decision `0018`); if that also fails, treat as E2.
- **Business rules**: selecting the current-tenant card is always a no-op (FR-005); a busy dialog cannot be dismissed (FR-006); the current-tenant match uses the SAME `tenantId`-claim-matching logic as UC-001 (single source of truth for "current").
- **Non-functional constraints**: NFR-001–003 (a11y), NFR-004 (responsive), NFR-005 (perf budget), **NFR-007/NFR-008 (security — see UC-006 for the dedicated server-enforcement AC set)**.

### UC-005: Dialog dismiss (Escape / backdrop) when idle

- **Primary actor**: teacher/principal/student/parent.
- **Preconditions**: dialog open, no card in loading state.
- **Main success scenario**: caller presses Escape or clicks the backdrop → dialog closes → focus returns to the "Đổi trường" trigger.
- **Alternative flows**: caller uses the dialog's explicit close control (same outcome).
- **Exception flows**:
  - E1 — Dismiss attempted while a card IS loading: blocked (see UC-004 E3); this UC does not apply until the in-flight call settles.
- **Business rules**: FR-006.
- **Non-functional constraints**: NFR-002 (focus-trap semantics, visible focus ring).

### UC-006: Server-side-enforcement guarantee (cross-cutting, applies to UC-004)

This UC exists specifically because the lane is high-risk-authorization: it
makes explicit that NO scenario in this packet is satisfied by client-only
state, independent of which UI flow triggers it.

- **Primary actor**: BE `iam` (authoritative enforcement point).
- **Secondary actor**: `SwitchTenantUseCase`/`switchTenantAction` (server-only orchestration).
- **Preconditions**: any UI action that would change effective role/tenant scope (UC-004 main flow).
- **Main success scenario**:
  1. UI never mutates any client-visible "current tenant"/"current role" state directly in response to a card click — it only sets a **pending/loading** UI flag and awaits the server round-trip.
  2. The ONLY code path that can change the header's rendered current-tenant/role badge is a re-render driven by a NEW access token (new `tenantId` claim) that was minted server-side and persisted via `setAuthCookies`.
  3. `switchTenantAction` never returns the token pair to the caller (verified: it only performs `redirect()`), so no client code has an opportunity to fabricate/replay a scope change.
- **Alternative/exception flows**: identical to UC-004 A1/E1–E4 — this UC's guarantee is what makes E1 (403) safe: because the enforcement is server-side, a client that "thinks" it should be allowed to switch (stale UI state) is still rejected by BE, and no client-only fallback exists to bypass that rejection.
- **Business rules** (hard gate, NFR-007):
  - No client component reads/writes token values (bundle boundary: `infrastructure/`/`bootstrap/di/` remain `server-only`-guarded, unchanged by this story).
  - No optimistic UI update of "current tenant" ahead of the server round-trip completing.
  - Post-switch context reload MUST NOT leak previous-tenant-scoped cached data (NFR-008) — verified at integration/E2E level, mechanism owned by fe-state-engineer.
- **Non-functional constraints**: NFR-007 (security — token handling), NFR-008 (security — no stale cross-tenant data).

## 4. Acceptance Criteria

```
UC-001: Current-tenant header block
  AC-001.1 Happy path — Given a caller with a valid access token whose tenantId claim matches a membership in the resolved list, When the header renders, Then the header shows that membership's logo/initial + role badge.
  AC-001.2 Stale/foreign tenantId — Given a caller whose tenantId claim matches NO membership in the resolved list, When the header renders, Then the header falls back to role-only display and does not throw/crash.
  AC-001.3 Fetch fails — Given INT-001 (GET /members/me/tenants) fails, When the header renders, Then the current-tenant block falls back to role-only display and the header still renders (no full-header failure).

UC-002: "Đổi trường" menu item — positive gating (≥2 memberships)
  AC-002.1 Success/shown — Given the caller has ≥2 ACTIVE switchable memberships (INT-001 resolved), When the header user-menu renders, Then a "Đổi trường" item is present with role=menuitem and the switchHorizontal icon.
  AC-002.2 Loading — Given INT-001 is still in flight, When the header user-menu first paints, Then the "Đổi trường" item is NOT rendered yet (no optimistic render), and it appears only once the count is resolved to ≥2 — assert no flash-then-removal in a single render pass.
  AC-002.3 Keyboard operability — Given the item is shown, When the caller tabs to it and presses Enter or Space, Then the dialog opens (same as a click).

UC-003: "Đổi trường" menu item — negative gating (zero-noise)
  AC-003.1 Exactly 1 membership (NEGATIVE assertion) — Given the caller has exactly 1 ACTIVE switchable membership, When the header user-menu renders, Then the DOM contains NO "Đổi trường" menu item node, NO dialog trigger, and NO dialog markup anywhere in the document — assert element absence via query, not merely "test does not exercise this."
  AC-003.2 Fetch fails (fail-closed, NEGATIVE assertion) — Given INT-001 fails (network/5xx/timeout), When the header user-menu renders, Then the DOM contains NO "Đổi trường" menu item node (same negative assertion as AC-003.1), the failure is logged, and no error banner/broken trigger is shown in its place.
  AC-003.3 No regression to existing single-tenant menu — Given a single-tenant caller, When the header user-menu renders, Then the remaining menu items (existing behavior) are unchanged in order/count from the pre-E23.1 baseline.

UC-004: Dialog open → select → switch (happy path + error paths)
  AC-004.1 Dialog open — Given the "Đổi trường" item is activated, When the dialog opens, Then it is focus-trapped, focus moves to the first focusable element, and every ACTIVE switchable membership renders as a real <button> card (logo/initial, name, address, role badge), with the "Hiện tại" badge on the membership matching the caller's current tenantId claim (same matching logic as AC-001.1).
  AC-004.2 Empty membership list at open-time (should not happen) — Given the dialog opens but the membership list resolves to empty at that instant, When rendered, Then the dialog shows the tenant.select.empty copy instead of a blank dialog body.
  AC-004.3 Per-card loading — Given a non-current card is activated, When the switch call is in flight, Then that card shows aria-busy=true, role=status (or aria-live=polite), and an sr-only label "Đang chuyển…", visible within 100ms of activation.
  AC-004.4 Success — Given the switch call (POST /members/switch-tenant) succeeds, When the response is received, Then new auth cookies are set server-side, a success toast "Đã chuyển sang {school}" appears, the caller is navigated into the target tenant's default workspace route, and the dialog closes.
  AC-004.5 No-op on current card — Given the caller activates the card carrying the "Hiện tại" badge, When activated, Then no network call is made and no toast appears (dialog may stay open or close, either is acceptable per FR-005 Should).
  AC-004.6 403 — target membership non-member/suspended/inactive (covers the revoked-mid-flow race AND any other reason BE rejects the target as non-switchable per the iam openapi 403 description, e.g. membership already SUSPENDED/INACTIVE at select-time, not only a race) — Given the target membership is not an ACTIVE member (whether due to a revoke race between list-fetch and select, or already non-ACTIVE), When POST /members/switch-tenant returns 403, Then an inline error renders on the clicked card, the dialog remains open, NO navigation occurs, and NO cookie mutation occurs (assert cookies unchanged from pre-click state, not merely "no visible navigation").
  AC-004.7 Network/5xx failure — Given the switch call fails with network error or 5xx, When the failure occurs, Then an error toast appears, the card returns to idle (not stuck loading), and the dialog remains open for retry.
  AC-004.8 401 mid-flow — Given the access token expires exactly as the switch call is made, When the reactive-refresh interceptor retries once and succeeds, Then the flow proceeds as AC-004.4; When the retry also fails, Then the flow follows AC-004.7.
  AC-004.9 Dismiss blocked while busy — Given a card is in its loading state, When the caller presses Escape or clicks the backdrop, Then the dialog does NOT close (dismiss is blocked until the call settles).
  AC-004.10 Dismiss allowed while idle — Given no card is loading, When the caller presses Escape or clicks the backdrop, Then the dialog closes and focus returns to the "Đổi trường" trigger.

UC-005: Idle dismiss
  AC-005.1 Happy path — Given the dialog is open and idle, When Escape is pressed, Then the dialog closes and focus returns to the trigger element (not lost to <body>).

UC-006: Server-side-enforcement guarantee (cross-cutting hard-gate AC)
  AC-006.1 No client-only scope mutation — Given a caller activates a non-current card, When the UI updates during the pending state, Then the ONLY state change visible before server response is a loading/pending UI flag on that card — assert no client-side write to any "current tenant"/"current role" representation occurs before the server round-trip resolves.
  AC-006.2 Server round-trip is mandatory — Given the switch flow completes successfully, When inspecting the call graph, Then the current-tenant badge change is traceable ONLY to a re-render driven by a new access-token tenantId claim set via setAuthCookies (server-side) — there is no code path that updates the displayed current tenant without that server round-trip having occurred first.
  AC-006.3 No token exposure — Given the switch call succeeds, When inspecting client-visible state/props/logs, Then no accessToken/refreshToken/sessionId value is present anywhere in client-reachable memory or console output.
  AC-006.4 BE rejection cannot be bypassed — Given BE returns 403 (AC-004.6), When the client has any stale/optimistic belief it should be allowed to switch, Then the rejection still results in no navigation and no cookie mutation — i.e., there is no client-only fallback path that grants the scope change despite BE's rejection.
  AC-006.5 No stale cross-tenant data leak — Given a successful switch (AC-004.4), When the caller lands on the new tenant's workspace, Then no data belonging to the previous tenant is visible/readable at any point after the switch and before the new tenant's data has loaded (NFR-008; mechanism decided by fe-state-engineer, but the absence-of-leak is asserted here as the acceptance bar).
```

## 5. Edge Case Matrix

| Feature / scenario | Empty | Max-length (name/address) | Concurrent (double-activate) | Auth-expired mid-flow | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Menu item visibility (UC-002/003) | 0 memberships → item hidden (treated as ≤1, zero-noise; also covered by FR-002's negative gate) | long tenant name truncates in current-tenant block (existing header truncation pattern), does not affect gating logic | rapid re-render (route change) must not double-render item — idempotent evaluation of count | n/a (visibility gating doesn't call BE) | INT-001 fails → hidden (AC-003.2) | n/a — identical across teacher/principal/student/parent (confirmed no role-variant) |
| Dialog card list (UC-004) | 0 ACTIVE memberships at open-time (should-not-happen) → tenant.select.empty copy (AC-004.2) | long name/address in a card truncates per NFR-004 responsive rule, card must not overflow at 320px | double-click same card while pending → second activation must be a no-op (card already busy/disabled during loading) — [OPEN QUESTION: not explicitly in FR-004/006, flag to ba-lead if double-submit guard needs its own AC] | AC-004.8 (401 mid-flow → refresh-then-retry-once, else network path) | AC-004.7 | n/a — same for all 4 roles |
| Switch action (UC-004/006) | n/a | n/a | two dialogs cannot be open simultaneously (single Radix Dialog instance) — [OPEN QUESTION: what if caller opens dialog in two browser tabs and switches in one — does the other tab's stale dialog need a cross-tab invalidation? Not covered by DR-018, flag as out-of-scope-unless-ba-lead-says-otherwise] | AC-004.8 | AC-004.6 (403 race), AC-004.7 (5xx) | n/a |
| Server-enforcement (UC-006) | n/a | n/a | n/a | AC-006.4 (BE rejection cannot be bypassed even if client state is stale) | AC-006.4 | n/a |

## 6. Open Questions

- `[OPEN QUESTION]` Double-activation guard: FR-004/FR-006 describe the busy-block for *dismiss*, but not explicitly whether a second click on the SAME card while its own call is already pending must be a no-op (idempotent) or could fire a second concurrent switch call. Recommend treating the per-card loading state as implicitly disabling further activation of that card (standard button-disabled-while-busy pattern), but flagging to `ba-lead`/`fe-lead` since it is not an explicit FR line item.
- `[OPEN QUESTION]` Cross-tab consistency: if a caller has the app open in two tabs and switches tenant in one, should the other tab's header/menu reactively invalidate (e.g. next focus/visibility-change triggers a re-fetch), or is this explicitly out of scope for E23.1 (DR-018 does not mention multi-tab)? No AC written for this; flag before considering the story done if multi-tab is a realistic caller pattern for this product.
- `[RESOLVED]` (2026-07-12, ba-lead relay) — `ba-integration-analyst` confirmed directly against edu-api's `openapi.yaml` that `MembershipSummary`'s wire schema genuinely has NO `tenantName`/`address`/`logoColor`. Tenant-card display fields (name/address/logo) are **mock-first with certainty** (decision `0014`), not a pending DTO-widening option — AC-004.1/AC-002.1's card fields are sourced from the agreed mock lookup table, not a real wire field. `RoleSwitcher` overlap already resolved by ba-lead as non-redundant (no ADR needed).
