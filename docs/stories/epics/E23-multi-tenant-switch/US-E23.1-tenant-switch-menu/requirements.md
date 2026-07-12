# US-E23.1 — Multi-Tenant Switch: Header Menu + Dialog — Requirements

Source: `docs/design-requests/DR-018-multi-tenant-switch.md` (delivered,
2026-07-12) · `docs/product/design-spec.jsonc` → `screens.tenantSwitch` ·
`docs/product/roles-permissions.md` · reused code:
`src/features/tenant/domain/{use-cases,repositories,entities}`,
`src/app/[locale]/(auth)/select-tenant/actions.ts` (`switchTenantAction`),
`src/components/layout/app-shell/header/{header.tsx,role-switcher.tsx}`.

## 1. Requirements Summary

The header's user-menu must gain a persistent "Đổi trường" re-entry point,
visible only when the authenticated caller (teacher/principal/student/parent)
belongs to ≥2 ACTIVE switchable tenant memberships, opening a "Chọn trường"
dialog (card grid: logo/initial, name, address, role badge, "Hiện tại" badge)
that switches the active tenant — minting a new tenant-scoped token pair and
reloading the app context into the target tenant's workspace. Zero-noise for
single-tenant users (no menu item, no dialog). Authorization is a hard gate:
switching tenant changes the caller's effective role/permission scope, so the
switch MUST go through the existing server-side `switchTenant` flow (httpOnly
cookies only) — never a client-only role toggle.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E23.1",
  "title": "Header Tenant-Switch Menu + Dialog",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["view current tenant + role badge in header", "open switch dialog if ≥2 memberships", "switch active tenant"] },
    { "role": "principal", "capabilities": ["same as teacher"] },
    { "role": "student", "capabilities": ["same as teacher"] },
    { "role": "parent", "capabilities": ["same as teacher"] }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001", "priority": "Must",
      "description": "The system SHALL render a 'Đổi trường' item in the header user-menu when the caller has ≥2 ACTIVE (isSwitchable) tenant memberships.",
      "trigger": "Header user-menu render (any authenticated app route)",
      "preconditions": ["caller authenticated", "membership list resolved (GET /members/me/tenants)"],
      "postconditions": ["menu item visible with role=menuitem, icon switchHorizontal"],
      "errorConditions": ["membership fetch fails → item hidden (fail closed, not fail noisy) per FR-008"]
    },
    {
      "id": "FR-002", "priority": "Must",
      "description": "The system SHALL NOT render the 'Đổi trường' menu item, the dialog, or any switch affordance when the caller has exactly 1 ACTIVE switchable membership (zero-noise).",
      "trigger": "Header user-menu render",
      "preconditions": ["membership count == 1"],
      "postconditions": ["no added UI surface vs. current single-tenant header"],
      "errorConditions": []
    },
    {
      "id": "FR-003", "priority": "Must",
      "description": "The system SHALL open a 'Chọn trường' modal dialog on menu-item activation, listing every ACTIVE switchable membership as a real <button> card (logo/initial, name, address, role badge; 'Hiện tại' badge on the membership matching the caller's current tenantId).",
      "trigger": "activate 'Đổi trường' menu item (click or keyboard Enter/Space)",
      "preconditions": ["FR-001 satisfied"],
      "postconditions": ["dialog open, focus-trapped, focus moved to first focusable element"],
      "errorConditions": ["membership list empty at open-time → should not happen (menu item implies ≥2); if it does, show tenant.select.empty text, not a blank dialog"]
    },
    {
      "id": "FR-004", "priority": "Must",
      "description": "The system SHALL, on selecting a non-current card, invoke the existing tenant-switch flow (SwitchTenantUseCase → POST /members/switch-tenant → mint tenant-scoped token pair → persist via httpOnly cookies), show a per-card loading state during the call, then a success toast ('Đã chuyển sang {school}') and navigate the caller into the target tenant's default workspace route.",
      "trigger": "click/keyboard-activate a non-current TenantCard",
      "preconditions": ["dialog open", "target membership.status === ACTIVE"],
      "postconditions": ["new auth_token(+exp)/refresh cookies set for target tenant", "caller navigated to target tenant workspace", "dialog closed", "success toast shown"],
      "errorConditions": ["BE 403 (caller no longer a member) → inline error on card, dialog stays open, no navigation, no cookie mutation", "network/5xx → error toast, card returns to idle, dialog stays open"]
    },
    {
      "id": "FR-005", "priority": "Should",
      "description": "The system SHALL treat selecting the already-current card as a no-op (ignored or visually disabled) — it must not re-trigger a switch call.",
      "trigger": "click the card carrying the 'Hiện tại' badge",
      "preconditions": ["dialog open"],
      "postconditions": ["no network call, dialog stays open or closes without a toast"],
      "errorConditions": []
    },
    {
      "id": "FR-006", "priority": "Must",
      "description": "The system SHALL allow the dialog to be dismissed via Escape or backdrop click UNLESS a switch is in-flight (a card is in its loading state), in which case dismiss is blocked until the call settles.",
      "trigger": "Escape key / backdrop click",
      "preconditions": ["dialog open"],
      "postconditions": ["dialog closes and focus returns to the trigger, when not busy"],
      "errorConditions": []
    },
    {
      "id": "FR-007", "priority": "Must",
      "description": "The system SHALL display the caller's CURRENT tenant (logo/initial + role badge) in the header user-menu block, determined by matching the decoded tenantId JWT claim (see `decodeTenantId`, `src/bootstrap/lib/jwt.ts`) against the resolved membership list.",
      "trigger": "header render for any authenticated route",
      "preconditions": ["valid access token with tenantId claim"],
      "postconditions": ["header shows the matching membership's name/logo + role badge"],
      "errorConditions": ["no matching membership found (stale/foreign tenantId) → fall back to role-only display (current behavior), do not crash the header"]
    },
    {
      "id": "FR-008", "priority": "Should",
      "description": "The system SHALL fail closed on membership-list fetch failure: hide the 'Đổi trường' entry point rather than show a broken/empty dialog trigger.",
      "trigger": "GET /members/me/tenants fails on header data load",
      "preconditions": [],
      "postconditions": ["header renders as if single-tenant (no menu item)"],
      "errorConditions": ["swallow and log; do not block header render entirely"]
    },
    {
      "id": "FR-009", "priority": "Won't",
      "description": "This story SHALL NOT introduce new BE endpoints — it reuses `GET /members/me/tenants` and `POST /members/switch-tenant`, already wired in `src/features/tenant`.",
      "trigger": "n/a", "preconditions": [], "postconditions": [], "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "TenantCard is a real <button>; name+address+role+current-state read as one accessible unit via aria-label; current-state also conveyed by visible text ('Hiện tại'), not color alone.", "measurableTarget": "WCAG 2.1 AA — axe/impeccable audit zero critical/serious violations on the dialog" },
    { "id": "NFR-002", "category": "Accessibility", "requirement": "Dialog uses standard focus-trap semantics (Radix Dialog): Tab loop, Escape, visible focus ring on cards and the close control.", "measurableTarget": "focus ring visible (uses --ring token), no focus escape from dialog while open" },
    { "id": "NFR-003", "category": "Accessibility", "requirement": "Per-card loading state is announced to AT.", "measurableTarget": "loading region has aria-busy + role=status/aria-live=polite with sr-only label 'Đang chuyển…'" },
    { "id": "NFR-004", "category": "Responsive", "requirement": "Dialog and cards must not break or overflow at narrow viewports.", "measurableTarget": "no horizontal scroll / clipped content at 320/375/768/1280px; dialog maxWidth 440 per design-spec, cards stack single-column below 440" },
    { "id": "NFR-005", "category": "Performance", "requirement": "Per-card loading affordance must appear promptly so the switch doesn't look unresponsive.", "measurableTarget": "loading state shown within 100ms of activation; toast/redirect on success within design's simulated 900ms budget or actual BE latency, whichever governs" },
    { "id": "NFR-006", "category": "i18n", "requirement": "All new copy (menu item, dialog title/description/current/switching, aria-label templates, toast) sourced from `tenant.switch.*` in both vi and en message files.", "measurableTarget": "zero hardcoded Vietnamese/English literal strings in the new components; `bunx tsc --noEmit` passes with typed message keys" },
    { "id": "NFR-007", "category": "Security", "requirement": "Tenant switch is an authorization-scope-changing action: new tokens MUST be set via server-side httpOnly cookie mutation only (reuse `setAuthCookies`); the client bundle must never read or hold the token pair.", "measurableTarget": "no token value appears in client component state/props/logs; `infrastructure/`/`bootstrap/di/` server-only import boundary unchanged" },
    { "id": "NFR-008", "category": "Security", "requirement": "Post-switch context reload MUST NOT leak role/tenant-scoped data cached from the prior tenant (e.g. stale TanStack Query cache entries not keyed by tenantId).", "measurableTarget": "no data belonging to the previous tenant is visible/readable in the UI at any point after the switch completes and before the new tenant's data has loaded — verified by an integration/E2E check that switches tenants and asserts the workspace shows only target-tenant data (mechanism — full navigation vs. query-cache invalidation — is a state-engineer/integration decision, not decided here)" }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "iam", "entity": "MembershipSummary (tenantId, roles[], status) — GET /members/me/tenants", "sensitivity": "Confidential" },
    { "source": "iam", "entity": "tenant-scoped token pair — POST /members/switch-tenant", "sensitivity": "Restricted" },
    { "source": "mock", "entity": "tenant display name / address / logo-color — NOT present in current TenantMembership entity or MembershipSummaryDto (only tenantId/roles/status exist today; the select-tenant screen currently renders raw tenantId as the name). DR-018's card design requires these fields — must be sourced from BE (schema addition) or mocked until available.", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "header user-menu 'Đổi trường' item + visibility rule",
      "'Chọn trường' dialog (card list, current badge, per-card loading, focus-trap)",
      "current-tenant header block (logo/initial + role badge)",
      "reuse of existing SwitchTenantUseCase / ListMyMembershipsUseCase / switchTenant server action"
    ],
    "outOfScope": [
      "new BE endpoints or contract changes (flag any gap to ba-integration-analyst)",
      "admin role (tenant-role model per roles-permissions.md covers teacher/principal/student/parent only)",
      "remembering a preferred/last-used tenant across sessions",
      "resolving the header's existing standalone RoleSwitcher (`header/role-switcher.tsx`) — see open question below"
    ],
    "externalDependencies": ["iam service: GET /members/me/tenants, POST /members/switch-tenant (already integrated)"]
  },
  "assumptions": [
    "[ASSUMPTION] The header re-entry point reuses the existing `switchTenantAction`/`SwitchTenantUseCase` as-is (mint tokens → setAuthCookies → redirect into target tenant URL segment `/t/[tenantId]/...`); no new use-case is required for the CORE switch action — only new presentation (menu item + dialog) and a way to fetch/pass the membership list + current-tenant match to the header.",
    "[ASSUMPTION] 'Context reload' is satisfied by the existing full route redirect across the `[tenant]` dynamic segment (Next.js re-renders the guarded layout tree); this requirement does NOT mandate a hard browser reload, but does mandate no stale cross-tenant data leak (NFR-008) — the concrete mechanism is for fe-state-engineer to design.",
    "[ASSUMPTION] tenant display name / address / logo are either added to the BE MembershipSummary contract or mocked client-side until available (mock-first, decision 0014) — flagged as an open data-dependency gap, not resolved here."
  ],
  "openQuestions": [
    "Existing header ships a separate `RoleSwitcher` popover that switches 'role' independently of tenant. Per roles-permissions.md the role is a property of the (role, tenant) pair, not globally switchable on its own — once tenant-switch ships, does RoleSwitcher become redundant/conflicting, or does it represent switching between multiple roles WITHIN the same tenant (TenantMembership.roles is already an array)? This touches authorization semantics — flagging to ba-lead for an ADR-level decision rather than resolving unilaterally in this story.",
    "Which BE/schema owns tenant displayName/address/logo-color (not in current MembershipSummaryDto)? Needs ba-integration-analyst to confirm against `iam` service's openapi.yaml or scope a mock-first stand-in."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Priority | Rationale |
| --- | --- | --- |
| FR-001/002 | Must | Zero-noise rule is explicit in DR-018 and screens.md; wrong-by-default would add UI noise for the majority (single-tenant) users. |
| FR-003/004 | Must | Core value of the story — the switch itself, reusing an already-hardened use-case. |
| FR-005 | Should | Prevents a confusing redundant no-op call; low risk if deferred but cheap to include. |
| FR-006 | Must | Blocking dismiss mid-switch prevents orphaned in-flight token mutation / confusing UX. |
| FR-007 | Must | Without this the header can't show "current tenant" at all — a named DR-018 requirement. |
| FR-008 | Should | Graceful degradation; not implementing it risks a broken-looking header on transient API failure. |
| FR-009 | Won't (this story) | Explicit non-goal — no new BE contract needed. |
| NFR-007/008 | Must | Hard authorization/security gate per lane designation — non-negotiable. |
| NFR-001–006 | Must/Should | Baseline a11y/i18n/responsive per repo-wide rules; measurable targets given. |

## Ba-Lead Decisions (2026-07-12)

- **RoleSwitcher overlap — NOT redundant.** `TenantMembership.roles` is
  confirmed an array (`roles: string[]`) per one membership/tenant — i.e. a
  caller CAN hold multiple roles at the SAME tenant. `RoleSwitcher`
  (`components/layout/app-shell/header/role-switcher.tsx`) switches ROLE
  within the current tenant; the new "Đổi trường" menu item switches TENANT
  (which may also change the available role set). These are two orthogonal
  header controls, not competing UI for the same axis — both stay in the
  header, presented as distinct menu items/controls. No ADR needed; this is a
  scope clarification, not an architecture change.
- **Tenant display fields (name/address/logo) BE gap** — treat as mock-first
  (decision `0014`) pending `ba-integration-analyst` confirmation against the
  `iam` service contract; do not block this story's spec on it.

## 4. Handoff Notes

- **To `ba-integration-analyst`**: confirm whether `POST /members/switch-tenant` response/`GET /members/me/tenants` response already carries or will carry tenant displayName/address/logo — this DR's card design cannot be built with the current `MembershipSummaryDto` (tenantId/roles/status only). Also confirm the existing `switchTenant.endpoint` used by `tenant.repository.ts` (`TENANT_EP.switchTenant`) matches the contract quoted in DR-018 (`POST /api/v1/members/switch-tenant`).
- **To `ba-use-case-modeler`**: model Given/When/Then for FR-003–FR-006 (dialog open/select/dismiss/busy-block) and the FR-007 current-tenant matching fallback; include the role-variant note (identical behavior across all 4 roles — no role-gated visibility differences beyond membership count).
- **Open questions above (RoleSwitcher overlap, missing tenant display fields) reported back to `ba-lead`** — not resolved unilaterally.
