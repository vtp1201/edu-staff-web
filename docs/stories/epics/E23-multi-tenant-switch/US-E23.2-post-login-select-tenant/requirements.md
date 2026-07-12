# US-E23.2 — Multi-Tenant Switch: Post-Login Select Screen — Requirements

Source: `docs/design-requests/DR-018-multi-tenant-switch.md` (delivered,
2026-07-12) · `docs/product/design-spec.jsonc` → `screens.selectTenant` ·
`docs/product/screens.md` (row: "Select tenant (post-login, ≥2 tenants)") ·
**existing implemented flow**: `src/app/[locale]/(auth)/select-tenant/{page.tsx,select-tenant.tsx,actions.ts}`,
backed by `src/features/tenant/domain/*` (already implemented — see
Consolidation Recommendation below).

> **ba-lead correction (2026-07-12):** the analyst's original draft attributed
> the existing `(auth)/select-tenant` implementation to US-E01.2. That is
> incorrect — US-E01.2 is "Login SSO (VNeID + Google) + Multi-Role Select"
> (still `planned`, targets the DIFFERENT route `(auth)/select-role` for
> choosing among multiple ROLES after auth). The actual owner of the shipped
> `(auth)/select-tenant` route is **`US-001-tenant-path-resolver`**
> (`docs/stories/epics/E05-multi-tenancy/US-001-tenant-path-resolver/`,
> high-risk, implemented — git history tags it "US-E05.1"). All references
> below to "US-E01.2" as the existing screen's owner should be read as this
> E05 story instead. The consolidation reasoning (§0) and recommendation
> stand unchanged; only the cross-reference is corrected.
>
> **ba-lead decision:** Consolidation recommendation CONFIRMED — US-E23.2 is
> scoped as an in-place enhancement of the existing `(auth)/select-tenant`
> screen (extend `TenantMembership`/`MembershipSummaryDto` with display
> fields; replace the raw-list markup with the card-grid design). No new
> route. `US-001-tenant-path-resolver` stays `implemented` in Harness (its
> routing/guard logic is unchanged and correct); this story's Harness Delta
> should note "extends US-001-tenant-path-resolver's UI," not "supersedes."

## 0. Consolidation Recommendation — E23.2 vs. existing E01.2 (read first)

DR-018 itself flags this ambiguity ("uiux-lead/ba to confirm at spec time
whether consolidating tenant.select and tenant.switch.postLogin into one
screen is worthwhile"). Findings from reading the existing implementation:

- **Same route, same trigger, same purpose.** Both target
  `(auth)/select-tenant`, both fire on "memberships.length ≥ 2, no tenant
  chosen yet, immediately post-login" (`design-spec.jsonc:selectTenant.shownWhen`
  vs. the existing page's unconditional render — the existing page has no
  zero-noise check of its own today; that check currently lives in
  `(app)/layout.tsx`'s guard redirect, not in the select-tenant page itself).
  Two screens cannot coexist at the same slot for the same moment — this is
  not two variants, it is one screen with two candidate visual specs.
- **The existing implementation is functionally behind the new spec, not a
  deliberately different design.** `select-tenant.tsx` currently renders
  `m.tenantId` (a raw UUID) as the "name" — there is no display name, address,
  or logo in play at all, because `TenantMembership` (entity + DTO) only
  carries `tenantId`, `roles: string[]`, `status`. This looks like a genuine
  data/UI gap in the shipped US-E01.2 slice, not an intentional simpler
  alternative design.
- **Recommendation: US-E23.2 should be scoped as an in-place enhancement of
  the existing `(auth)/select-tenant` screen** (same route, same
  `page.tsx`/`select-tenant.tsx`/`actions.ts`, same domain use-cases),
  extending the `TenantMembership` entity/DTO with display fields (name,
  address, logo/color — see data-dependency gap below) and replacing the
  current list markup with the card-grid design — **not** a net-new parallel
  screen. If Harness treats US-E01.2 as a closed/implemented story, US-E23.2's
  packet should say explicitly it *supersedes/extends* US-E01.2's UI, and
  `ba-lead` should decide whether US-E01.2 needs a superseded/closed
  annotation in its own packet (bookkeeping decision, not made here).
- This recommendation is **reported to `ba-lead`, not applied unilaterally** —
  the two Harness stories (US-E01.2, US-E23.2) are left as-is; only the
  requirements below assume the "enhance in place" scope.

## 1. Requirements Summary

After login, when the authenticated caller (teacher/principal/student/parent)
belongs to ≥2 ACTIVE switchable tenant memberships and has not yet entered a
tenant workspace, the system must show a "Chọn trường để tiếp tục" screen with
a personalized greeting and a card grid (logo/initial, name, address, role
badge — no "current" badge, pre-entry) so the caller can enter their chosen
tenant's workspace. Single-tenant callers skip this screen entirely
(zero-noise, existing behavior). Authorization is a hard gate: this screen is
the pre-workspace token-minting gate — selecting a tenant mints a
tenant-scoped token pair server-side before any workspace route is reachable.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E23.2",
  "title": "Post-Login Select-Tenant Screen (enhance existing route)",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["view own switchable memberships", "select a tenant to enter its workspace"] },
    { "role": "principal", "capabilities": ["same as teacher"] },
    { "role": "student", "capabilities": ["same as teacher"] },
    { "role": "parent", "capabilities": ["same as teacher"] }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001", "priority": "Must",
      "description": "The system SHALL redirect an authenticated caller with ≥2 ACTIVE switchable memberships and no yet-selected tenant to `(auth)/select-tenant` before allowing entry to any `/t/[tenant]/(app)/**` route.",
      "trigger": "post-login navigation attempt into a tenant workspace route",
      "preconditions": ["valid access token", "membership count (ACTIVE) >= 2", "no tenant context established yet"],
      "postconditions": ["caller lands on select-tenant screen"],
      "errorConditions": ["membership fetch fails → see FR-008"]
    },
    {
      "id": "FR-002", "priority": "Must",
      "description": "The system SHALL render heading 'Chọn trường để tiếp tục' and a personalized subheading including the caller's name and membership count ('Xin chào {name} — tài khoản của bạn thuộc {count} trường.'), falling back to a name-less variant if display name is unavailable.",
      "trigger": "select-tenant screen render",
      "preconditions": ["FR-001 satisfied"],
      "postconditions": ["heading + subheading visible"],
      "errorConditions": []
    },
    {
      "id": "FR-003", "priority": "Must",
      "description": "The system SHALL render one card per ACTIVE switchable membership in a grid (logo/initial, name, short address, role badge); no 'current' badge is shown (not yet entered any tenant).",
      "trigger": "select-tenant screen render, memberships loaded",
      "preconditions": ["memberships.length >= 2"],
      "postconditions": ["N cards rendered, each a real <button>"],
      "errorConditions": []
    },
    {
      "id": "FR-004", "priority": "Must",
      "description": "The system SHALL, on card selection, show a per-card loading state, then mint a tenant-scoped token pair (reuse SwitchTenantUseCase / switchTenantAction), persist it via httpOnly cookies, and redirect the caller into the selected tenant's workspace at the membership's role.",
      "trigger": "click/keyboard-activate a card",
      "preconditions": ["screen rendered", "target membership.status === ACTIVE"],
      "postconditions": ["auth cookies set for target tenant", "navigation to `/t/{tenantId}/{role}` (or equivalent default route)"],
      "errorConditions": ["BE 403 (race: membership revoked between list-fetch and select) → inline error on card, no navigation, no cookie mutation, caller stays on screen", "network/5xx → error toast, card returns to idle"]
    },
    {
      "id": "FR-005", "priority": "Should",
      "description": "The system SHALL show a footnote informing the caller they can switch tenants later from the account menu ('Bạn có thể đổi trường bất kỳ lúc nào từ menu tài khoản.').",
      "trigger": "select-tenant screen render",
      "preconditions": ["US-E23.1 header re-entry point exists/ships"],
      "postconditions": ["footnote visible"],
      "errorConditions": []
    },
    {
      "id": "FR-006", "priority": "Must",
      "description": "The system SHALL skip this screen entirely (zero-noise) and route directly into the sole tenant's workspace when the caller has exactly 1 ACTIVE switchable membership — preserving current behavior.",
      "trigger": "post-login routing decision",
      "preconditions": ["membership count (ACTIVE) == 1"],
      "postconditions": ["caller never sees select-tenant UI"],
      "errorConditions": []
    },
    {
      "id": "FR-007", "priority": "Must",
      "description": "The system SHALL show an explicit empty state ('Bạn chưa thuộc tổ chức nào') when the caller has 0 ACTIVE memberships, with no dead-end (existing `tenant.select.empty` copy, needs a clear caller-facing next action e.g. contact admin / logout).",
      "trigger": "select-tenant screen render, memberships.length === 0 (or none ACTIVE)",
      "preconditions": [],
      "postconditions": ["empty-state message + at least a logout affordance visible"],
      "errorConditions": []
    },
    {
      "id": "FR-008", "priority": "Should",
      "description": "The system SHALL show an error state with a retry action when `GET /members/me/tenants` fails on this screen — currently undefined in DR-018 ('n/a empty/error at this granularity... /ba to define the error path'); this is a hard gate before workspace access so a silent/blank failure is not acceptable.",
      "trigger": "membership fetch fails on screen load",
      "preconditions": [],
      "postconditions": ["error message + retry button; no auto-redirect loop"],
      "errorConditions": ["repeated failure → keep caller on this screen, do not bounce them back to login unless the access token itself is invalid"]
    }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "Cards are real <button>s; name+address+role read as one accessible unit via aria-label (no 'current' clause here, unlike the header dialog).", "measurableTarget": "WCAG 2.1 AA, zero critical/serious axe/impeccable violations" },
    { "id": "NFR-002", "category": "Responsive", "requirement": "Layout reuses the `screens.login` centered auth-shell tokens; must not break at narrow viewports.", "measurableTarget": "no layout break at 320px; grid reflows to single column below ~440px maxWidth column" },
    { "id": "NFR-003", "category": "Performance", "requirement": "Membership list must not leave the caller on a blank screen while loading.", "measurableTarget": "skeleton/loading state shown if fetch exceeds 300ms; per-card switching loading shown within 100ms of activation" },
    { "id": "NFR-004", "category": "i18n", "requirement": "All copy sourced from `tenant.switch.postLogin.*` (new) — do not silently repurpose `tenant.select.*` strings that read differently (simpler list copy) without updating both vi/en.", "measurableTarget": "typed message keys compile-check clean; no hardcoded VI/EN literals in the screen/component" },
    { "id": "NFR-005", "category": "Security", "requirement": "This screen is the sole pre-workspace authorization gate for multi-tenant callers — token minting must remain server-side only (existing `switchTenantAction` pattern); the redirect target tenantId must be validated against the caller's own membership list (no client-influenced open redirect).", "measurableTarget": "target route only reachable for a tenantId present in the caller's own membership list; token pair never exposed to client JS" },
    { "id": "NFR-006", "category": "Performance", "requirement": "No stale data from a previously-selected tenant (in the rare case of a caller returning to this screen after already having a tenant context, e.g. deep-linking back) may be visible.", "measurableTarget": "same cross-tenant cache-leak guard as US-E23.1 NFR-008 — flagged, mechanism deferred to state-engineer" }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "iam", "entity": "MembershipSummary (tenantId, roles[], status) — GET /members/me/tenants", "sensitivity": "Confidential" },
    { "source": "iam", "entity": "tenant-scoped token pair — POST /members/switch-tenant", "sensitivity": "Restricted" },
    { "source": "mock", "entity": "tenant display name / address / logo-color — same gap as US-E23.1: not present in current TenantMembership entity/DTO (screen today literally renders raw tenantId as the name)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "enhance the EXISTING (auth)/select-tenant route/component to the card-grid design",
      "personalized greeting, footnote, per-card loading, empty state (existing) + NEW error state",
      "entity/DTO extension for display fields (flag to ba-integration-analyst)"
    ],
    "outOfScope": [
      "header re-entry point / 'Đổi trường' dialog (that is US-E23.1)",
      "new BE endpoints beyond a possible MembershipSummary field extension",
      "remembering a preferred tenant across sessions / auto-skip on subsequent logins",
      "admin role (not part of the tenant-role model per roles-permissions.md)"
    ],
    "externalDependencies": ["iam service: GET /members/me/tenants, POST /members/switch-tenant (already integrated)"]
  },
  "assumptions": [
    "[ASSUMPTION] US-E23.2 is scoped as an in-place enhancement of the existing (auth)/select-tenant screen (US-E01.2's shipped slice), not a second parallel screen — see §0 Consolidation Recommendation. Reported to ba-lead for confirmation, not applied unilaterally.",
    "[ASSUMPTION] FR-005's footnote referencing the account-menu re-entry point is only accurate once US-E23.1 ships; if US-E23.2 ships first, either omit the footnote or the two stories must land together — flagging as a sequencing dependency, not a blocking one (footnote is Should-priority).",
    "[ASSUMPTION] tenant display name / address / logo are sourced the same way as decided for US-E23.1 (shared entity extension) — the two stories should NOT diverge on this data shape since both render the same TenantCard concept per design-spec.jsonc."
  ],
  "openQuestions": [
    "Confirm with ba-lead whether to formally mark US-E01.2 as superseded/extended-by US-E23.2 in Harness, or keep US-E01.2 closed as shipped-then-redesigned (bookkeeping only, does not change the technical requirements above).",
    "Same BE schema-gap question as US-E23.1 — should be answered once by ba-integration-analyst and referenced from both packets."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Priority | Rationale |
| --- | --- | --- |
| FR-001/006 | Must | Core routing gate — must correctly branch on membership count; zero-noise for the majority (single-tenant) case is an explicit DR-018 requirement. |
| FR-002/003/004 | Must | The screen's entire purpose — greeting + card grid + selection → workspace entry. |
| FR-005 | Should | Nice-to-have discoverability hint; only fully truthful once US-E23.1 ships (sequencing note above). |
| FR-007 | Must | Existing behavior (empty state) must be preserved, not regressed, by the redesign. |
| FR-008 | Should | DR-018 explicitly left this undefined; adding it now closes a real hard-gate gap (a blank/broken pre-workspace screen has no fallback route). |
| NFR-005 | Must | Hard authorization gate — non-negotiable per lane designation. |
| NFR-001–004 | Must/Should | Baseline a11y/responsive/i18n/perf per repo-wide rules with measurable targets. |

## 4. Handoff Notes

- **To `ba-lead`**: consolidation recommendation in §0 above — please confirm
  or override before `ba-use-case-modeler` writes AC, since AC will assume
  "enhance existing screen" rather than "build new screen from scratch."
- **To `ba-integration-analyst`**: same BE schema-gap flag as US-E23.1
  (tenant displayName/address/logo missing from `MembershipSummaryDto`) —
  resolve once, reference from both packets so the two stories don't diverge
  on the entity shape. Also verify the existing `switchTenantAction` redirect
  target (`tenantUrl(tenantId, role)`) is validated against the caller's own
  membership list (NFR-005) and not client-influenced.
- **To `ba-use-case-modeler`**: model Given/When/Then for FR-001/006/007/008
  (the four branch outcomes of post-login routing: ≥2 active → screen, 1 →
  skip, 0 active → empty, fetch fails → error+retry) plus the FR-004 select
  → mint → redirect happy path and its 403-race error path.
