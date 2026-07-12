# Use Cases + Acceptance Criteria — US-E23.2 (Post-Login Select-Tenant Screen)

Source: `requirements.md` (TR-E23.2), `integration.md` (INT-001/INT-002, shared
with US-E23.1), and `docs/stories/epics/E05-multi-tenancy/US-001-tenant-path-resolver/design.md`
(existing routing/guard owner — this packet's AC are written to be **consistent
with, not a replacement for**, that guard's `resolveTenant`/membership-check
logic; this story enhances `(auth)/select-tenant`'s presentation in place, per
ba-lead's confirmed consolidation decision).

High-risk lane — this screen is the **sole pre-workspace authorization gate**
for multi-tenant callers (NFR-005): no `/t/[tenant]/(app)/**` route is
reachable before it resolves. Every AC that results in workspace entry MUST be
traceable to the same server-side token-minting round-trip used by US-E23.1
(`switchTenantAction` → `SwitchTenantUseCase` → `POST /members/switch-tenant`
→ `setAuthCookies`) — this packet intentionally mirrors US-E23.1's UC-006
error-path pattern since both share the identical mint mechanism.

## 1. Use Case Scope Summary

- **5 use cases** (UC-001..UC-005) covering the 4 branch outcomes of
  post-login routing (≥2 active → screen, 1 → skip, 0 active → empty,
  fetch-fails → error+retry) plus the select→mint→redirect flow and its
  403-race error path.
- **Actors**: teacher, principal, student, parent — identical behavior; no
  role-variant beyond membership count (same as US-E23.1).
- **Boundaries**: this is an in-place enhancement of the EXISTING
  `(auth)/select-tenant` route (owner: US-001-tenant-path-resolver). The
  routing GATE decision itself (whether the caller lands on this route at
  all) is owned by existing guard logic in `(app)/layout.tsx` / the tenant
  path resolver — UNCHANGED by this story. This packet models the SCREEN's
  own behavior once the caller has already been routed here, PLUS the
  screen-adjacent branch outcomes (skip / empty / error) as they are
  observable from the screen's perspective.
- **Explicit non-goal**: header re-entry point ("Đổi trường") is US-E23.1;
  this packet does not duplicate UC-004/UC-006 of that packet but DOES mirror
  its error-path shape for consistency (see UC-004/UC-005 below).

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| Teacher | Human, authenticated, post-login, no tenant context yet | View own switchable memberships; select a tenant to enter its workspace |
| Principal | Human, authenticated, post-login | Same as Teacher |
| Student | Human, authenticated, post-login | Same as Teacher |
| Parent | Human, authenticated, post-login | Same as Teacher |
| System (existing routing guard, US-001-tenant-path-resolver) | Non-human | Decides whether the caller reaches this route at all (unchanged by this story) |
| System (screen data loader) | Non-human | Fetches membership list (INT-001) + caller profile name (existing `AUTH_EP.me`) to compose the greeting |
| System (SwitchTenantUseCase / switchTenantAction) | Non-human, server-side only | Mints tenant-scoped token pair via INT-002; sets httpOnly cookies; redirects to `/t/{tenantId}/{role}` — the ONLY path that grants workspace entry |
| BE (`iam` service) | External system | Authoritative membership/ACTIVE-status check on switch-tenant call (403 if not a member) |

## 3. Use Case Catalogue

### UC-001: Routing branch — ≥2 ACTIVE memberships → screen shown

- **Primary actor**: teacher/principal/student/parent, post-login.
- **Preconditions**: valid access token; no tenant context established yet; membership count (ACTIVE, switchable) ≥ 2 (FR-001).
- **Main success scenario**:
  1. Caller attempts to navigate into a tenant workspace route (or lands here directly post-login) with no tenant context.
  2. Existing routing guard resolves membership count ≥ 2.
  3. Caller lands on `(auth)/select-tenant`, which renders heading "Chọn trường để tiếp tục" + personalized subheading ("Xin chào {name} — tài khoản của bạn thuộc {count} trường.") + a card grid, one card per ACTIVE membership (FR-002/003).
- **Alternative flows**:
  - A1 — Caller's profile name is unavailable (e.g. profile fetch races/fails): subheading falls back to a name-less variant (FR-002).
- **Exception flows**: none in this UC (covered by UC-003/UC-004 below as separate branches of the same routing decision).
- **Business rules**: threshold is strictly ACTIVE + switchable count ≥ 2 (same rule as US-E23.1 FR-001); no "current" badge on any card since the caller has not yet entered any tenant (unlike US-E23.1's dialog).
- **Non-functional constraints**: NFR-001 (a11y), NFR-002 (responsive), NFR-004 (i18n — `tenant.switch.postLogin.*` namespace, not a silent repurpose of `tenant.select.*`).

### UC-002: Routing branch — exactly 1 ACTIVE membership → screen skipped (zero-noise)

- **Primary actor**: teacher/principal/student/parent, post-login.
- **Preconditions**: membership count (ACTIVE, switchable) == 1 (FR-006).
- **Main success scenario**:
  1. Existing routing guard resolves membership count == 1.
  2. Caller is routed directly into the sole tenant's workspace — this screen is never rendered.
- **Alternative flows**: none.
- **Exception flows**: none.
- **Business rules**: this is EXISTING, preserved behavior (FR-006 explicitly requires no regression) — the routing decision itself lives in the guard owned by US-001-tenant-path-resolver, unchanged by this story.
- **Non-functional constraints**: zero-noise — asserted as a NEGATIVE AC (no select-tenant markup rendered at all for this caller), same assertion style as US-E23.1 UC-003.

### UC-003: Routing branch — 0 ACTIVE memberships → empty state with next action

- **Primary actor**: teacher/principal/student/parent, post-login.
- **Preconditions**: membership list resolves successfully but contains 0 ACTIVE (switchable) memberships (FR-007).
- **Main success scenario**:
  1. Screen renders (or the guard routes here, per existing behavior) with 0 usable memberships.
  2. Screen shows the empty-state message ("Bạn chưa thuộc tổ chức nào") — existing `tenant.select.empty` copy.
  3. Screen ALSO surfaces at least one next-action affordance (logout, and/or contact-admin guidance) so the caller is not left at a dead end (FR-007 closes a prior gap: the existing implementation had no escape action).
- **Alternative flows**: none.
- **Exception flows**: none (this UC is itself a graceful-degradation branch of UC-001's fetch).
- **Business rules**: "0 ACTIVE" includes the case where memberships exist but are all INACTIVE/SUSPENDED/LEFT — same ACTIVE-only counting rule as UC-001/US-E23.1.
- **Non-functional constraints**: NFR-001 (a11y — the logout/next-action control must be keyboard-operable, not just the empty text).

### UC-004: Routing branch — membership fetch fails → error state with retry (NEW)

- **Primary actor**: teacher/principal/student/parent, post-login.
- **Preconditions**: caller reaches this screen (guard already decided ≥2-or-unknown), but `GET /members/me/tenants` (INT-001) fails (network/5xx/timeout) on screen load.
- **Main success scenario**:
  1. Screen shows an error message + an explicit retry button (FR-008 — this closes a gap DR-018 left undefined).
  2. Caller activates retry → INT-001 is re-attempted.
  3. On success, screen transitions to UC-001's success rendering (card grid).
- **Alternative flows**:
  - A1 — Retry also fails: screen remains in the error state (no auto-redirect loop); caller may retry again or use any available logout affordance.
- **Exception flows**:
  - E1 — The underlying failure is actually a 401 (access token itself invalid, not a membership-fetch problem): this is NOT treated as the membership error path — the existing reactive-refresh/redirect-to-login flow handles it instead (FR-008 errorConditions explicitly distinguishes this).
- **Business rules**: this is a **hard gate** — unlike US-E23.1's header (which degrades to "menu item hidden" on the same fetch failure), THIS screen has no fallback route, so silent/blank failure is unacceptable; an explicit error+retry UI is mandatory, not optional (FR-008 is "Should" priority in MoSCoW terms but is functionally required to avoid a dead end per the requirements' own framing).
- **Non-functional constraints**: NFR-003 (loading/skeleton distinct from this error state), no auto-redirect loop (must not bounce the caller back to login repeatedly on transient errors).

### UC-005: Select tenant → mint token → redirect into workspace (happy path + 403-race error path)

- **Primary actor**: teacher/principal/student/parent.
- **Secondary actor**: System (`SwitchTenantUseCase`/`switchTenantAction`), BE `iam`.
- **Preconditions**: UC-001 satisfied (screen showing card grid).
- **Main success scenario**:
  1. Caller activates a card (click/keyboard).
  2. Card enters per-card loading state within 100ms (same NFR pattern as US-E23.1).
  3. `switchTenantAction` is invoked with `tenantId` + `role` sourced DIRECTLY from the selected membership object (the same object returned by the caller's own `GET /members/me/tenants` response) — never from client-supplied free text (NFR-005 no-open-redirect guarantee, confirmed by code inspection in integration.md §3).
  4. BE validates ACTIVE membership, mints a tenant-scoped token pair (INT-002).
  5. `setAuthCookies` persists the pair server-side (httpOnly); no token value reaches the client.
  6. Caller is redirected to `/t/{tenantId}/{role}` (or equivalent default route) — the target tenant's workspace.
- **Alternative flows**: none additional beyond the happy path (this screen has no "current tenant" no-op case since no card is pre-marked current — every card is a fresh entry).
- **Exception flows**:
  - E1 — BE 403 (membership revoked between list-fetch and select — the same race class as US-E23.1 UC-004 E1): inline error on the clicked card; caller stays on THIS screen (not navigated); NO cookie mutation occurs; card returns to a state where the caller can retry or pick a different card.
  - E2 — Network/5xx/timeout: error toast; card returns to idle; caller remains on the screen.
  - E3 — 401 mid-flow: existing reactive-refresh interceptor retries once; if that also fails, treat as E2 (identical pattern to US-E23.1 UC-004 E4).
- **Business rules**: the redirect target is ALWAYS validated against the caller's own membership list — there is no code path where a client-influenced/arbitrary `tenantId` reaches `switchTenantAction` (NFR-005; confirmed in integration.md, not merely assumed).
- **Non-functional constraints**: NFR-003 (perf — per-card loading within 100ms), NFR-005 (security — server-only minting, validated redirect target), NFR-006 (no stale cross-tenant data visible if the caller reaches this screen with residual state from a prior tenant context, e.g. deep-linking back).

## 4. Acceptance Criteria

```
UC-001: ≥2 memberships → screen shown
  AC-001.1 Happy path — Given a caller with ≥2 ACTIVE switchable memberships and no tenant context yet, When they reach (auth)/select-tenant, Then the heading "Chọn trường để tiếp tục" and subheading "Xin chào {name} — tài khoản của bạn thuộc {count} trường." render, and one real <button> card per ACTIVE membership renders (logo/initial, name, address, role badge) with NO "Hiện tại"/current badge on any card.
  AC-001.2 Name unavailable fallback — Given the caller's profile name is unavailable at render time, When the screen renders, Then the subheading falls back to a name-less variant (no literal "undefined"/blank interpolation visible).
  AC-001.3 Loading — Given the membership fetch (and/or profile fetch) is still in flight and exceeds 300ms, When the screen is rendering, Then a skeleton/loading state is shown (not a blank screen) — per NFR-003.
  AC-001.4 Footnote conditional on US-E23.1 — Given US-E23.1's header re-entry point has shipped, When this screen renders, Then the footnote "Bạn có thể đổi trường bất kỳ lúc nào từ menu tài khoản." is shown; Given US-E23.1 has NOT shipped yet, Then the footnote is omitted (not shown referencing a non-existent affordance) — sequencing dependency per requirements assumption.

UC-002: Exactly 1 membership → screen skipped (NEGATIVE assertion, zero-noise)
  AC-002.1 Skip — Given a caller with exactly 1 ACTIVE switchable membership, When they complete post-login routing, Then they are routed directly into that tenant's workspace and the select-tenant screen/markup is NEVER rendered — assert absence of the select-tenant DOM/route visit, not merely "not tested."
  AC-002.2 No regression — Given this is existing preserved behavior, When compared to pre-US-E23.2 baseline, Then the single-membership routing path is unchanged (same target route, same redirect mechanism).

UC-003: 0 ACTIVE memberships → empty state + next action
  AC-003.1 Empty — Given the caller has 0 ACTIVE (switchable) memberships, When the screen renders, Then the message "Bạn chưa thuộc tổ chức nào" is shown.
  AC-003.2 Next action present (closes prior gap) — Given the empty state is shown, When the caller looks for a way forward, Then at least one actionable control (e.g. logout) is visible and keyboard-operable — assert its presence explicitly, since the pre-existing implementation had none.
  AC-003.3 All-inactive counts as empty — Given the caller has memberships but all are INACTIVE/SUSPENDED/LEFT, When the screen renders, Then it treats this identically to 0 memberships (AC-003.1/002), not as a partial/broken card grid.

UC-004: Membership fetch fails → error + retry (NEW state)
  AC-004.1 Error shown — Given GET /members/me/tenants fails (network/5xx/timeout) on screen load, When the screen renders, Then an error message + a retry button are shown (not a blank/broken screen).
  AC-004.2 Retry succeeds — Given the caller activates retry and the re-fetch succeeds, When the response resolves, Then the screen transitions to the UC-001 success rendering (card grid).
  AC-004.3 Retry fails again — Given the caller activates retry and it fails again, When the response resolves, Then the screen remains in the error state (no auto-redirect loop, no infinite spinner).
  AC-004.4 401 is NOT treated as membership error — Given the underlying failure is actually token invalidity (401), When detected, Then the existing refresh/redirect-to-login flow handles it instead of this screen's error+retry UI (assert the two failure classes are distinguished, not conflated).

UC-005: Select → mint → redirect (happy path + 403-race error path)
  AC-005.1 Happy path — Given the caller activates a non-current card (all cards are "non-current" on this screen), When the switch call (POST /members/switch-tenant) succeeds, Then new auth cookies are set server-side, and the caller is redirected to /t/{tenantId}/{role} matching the selected membership.
  AC-005.2 Per-card loading — Given a card is activated, When the switch call is in flight, Then that card shows a loading state within 100ms of activation (same NFR pattern/assertion as US-E23.1 AC-004.3).
  AC-005.3 403 — target membership non-member/suspended/inactive (covers the revoked-mid-flow race AND any other reason BE rejects the target as non-switchable per the iam openapi 403 description) — Given the target membership is not an ACTIVE member at select-time (race OR already non-ACTIVE), When POST /members/switch-tenant returns 403, Then an inline error renders on the clicked card, the caller remains on THIS screen (no navigation into any workspace), and NO cookie mutation occurs — mirrors US-E23.1 AC-004.6's assertion pattern exactly (same underlying mint mechanism).
  AC-005.4 Network/5xx failure — Given the switch call fails with network error or 5xx, When the failure occurs, Then an error toast appears and the card returns to idle (mirrors US-E23.1 AC-004.7).
  AC-005.5 401 mid-flow — Given the token expires exactly as the switch call is made, When the reactive-refresh interceptor retries once and succeeds, Then the flow proceeds as AC-005.1; When the retry also fails, Then the flow follows AC-005.4 (mirrors US-E23.1 AC-004.8).
  AC-005.6 Redirect-target validation (server-side-enforcement AC, hard gate) — Given a caller selects a card, When switchTenantAction is invoked, Then the tenantId/role pair passed to it is READ DIRECTLY from the selected membership object sourced from the caller's own GET /members/me/tenants response — assert there is no code path where a client-supplied/arbitrary tenantId reaches switchTenantAction (NFR-005; no open-redirect surface).
  AC-005.7 No client-only scope mutation (server-side-enforcement AC, hard gate, mirrors US-E23.1 UC-006) — Given a caller activates a card, When the UI updates during the pending state, Then the ONLY state change visible before server response is a loading/pending flag on that card — no client-side write to any "entered tenant" representation occurs before setAuthCookies has actually persisted a new token server-side; the only way to reach a workspace route is via the redirect issued AFTER that server round-trip.
  AC-005.8 No stale cross-tenant data on re-entry — Given a caller returns to this screen after already having had a tenant context (e.g. deep-linking back), When the screen renders and a new selection is made, Then no data belonging to a previously-selected tenant is visible/readable at any point during or after this new switch (NFR-006, same guard class as US-E23.1 NFR-008).
```

## 5. Edge Case Matrix

| Feature / scenario | Empty | Max-length (name/address) | Concurrent (double-activate) | Auth-expired mid-flow | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Routing branch (UC-001/002/003/004) | 0 ACTIVE → UC-003 empty state (AC-003.1–3) | long name/address in card truncates per NFR-002, no overflow at 320px | rapid re-navigation to this route while a fetch is in flight must not double-fire INT-001 — [OPEN QUESTION: no explicit FR line; recommend standard request de-dupe] | n/a for routing itself; 401 is redirected to login (AC-004.4), not treated as this screen's error | UC-004 (AC-004.1–3) | n/a — identical across teacher/principal/student/parent |
| Card grid render (UC-001) | 0 memberships handled by UC-003, not UC-001 | same truncation rule as above | n/a | n/a | n/a | n/a |
| Select → mint → redirect (UC-005) | n/a (grid only renders with ≥2 cards per UC-001 precondition) | n/a | double-click same card while pending → [OPEN QUESTION, mirrors US-E23.1's open question: recommend disabling the card during its own loading state; not an explicit FR line here either] | AC-005.5 (401 mid-flow → refresh-then-retry-once, else network path) | AC-005.3 (403 race), AC-005.4 (5xx) | n/a |
| Server-enforcement (AC-005.6/005.7) | n/a | n/a | n/a | AC-005.5 | AC-005.3 (BE rejection final — no client bypass) | n/a |
| Zero-noise skip (UC-002) | n/a | n/a | n/a | n/a | n/a | n/a — negative assertion applies uniformly |

## 6. Open Questions

- `[OPEN QUESTION]` Double-activation guard on a single card during its own pending state — same gap noted in US-E23.1's packet; recommend treating per-card loading as implicitly disabling further activation, but not an explicit FR line item here either. Flag once for both stories (do not resolve differently per packet).
- `[OPEN QUESTION]` Request de-dupe if the caller rapidly re-navigates to `(auth)/select-tenant` while a membership fetch is already in flight (e.g. back/forward navigation) — not specified in FR-001/FR-008; recommend standard single-flight fetch behavior but flagging since this screen is server-fetched (RSC) today per integration.md's note ("loading applies if/when this becomes a client fetch").
- `[OPEN QUESTION]` (carried, bookkeeping only, not technical) — whether US-001-tenant-path-resolver's Harness packet should gain an annotation noting its UI is now extended by US-E23.2 (ba-lead decision, does not change any AC above).
- `[RESOLVED]` (2026-07-12, ba-lead relay) — tenant displayName/address/logo confirmed absent from the wire (`MembershipSummary` openapi schema checked directly) — mock-first with certainty (decision `0014`), shared identical `TenantCard` data contract with US-E23.1, not a pending DTO-widening question anymore.
- `[OPEN QUESTION]` FR-005's footnote sequencing (AC-001.4) — if US-E23.2 ships before US-E23.1, confirm with `ba-lead`/`fe-lead` whether to omit the footnote entirely or hold this story until both can land together; this packet's AC assumes a feature-flag-like conditional render rather than a hard sequencing block, but that assumption should be confirmed, not treated as decided.
