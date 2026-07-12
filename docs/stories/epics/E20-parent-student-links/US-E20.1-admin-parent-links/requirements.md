# US-E20.1 — Admin Parent–Student Link Management — Requirements

Source: `docs/design-requests/DR-014-parent-student-links.md` (delivered
2026-07-12) · `docs/product/design-spec.jsonc` → `screens.parentLinks` (line
~3966) · `docs/product/screens.md` (admin section row) ·
`docs/product/roles-permissions.md`.

## 1. Requirements Summary

The system SHALL let school-admin actors (`principal` acting through the
`(app)/admin/**` route group) view, search/filter, create, inspect, and remove
parent–student links, plus see each link's notification-consent status. The
destructive Unlink action removes the parent's data-visibility grant (grades,
conduct, attendance, notifications) for that child without deleting either
account, and its confirm dialog must state that consequence explicitly. All
four async UI states (loading/empty/error/success) are required. Data source
is the `core` service (parent-student-links endpoints, not yet built) — this
screen is **mock-first** (decision `0014`) until `core` ships.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E20.1",
  "title": "Admin Parent-Student Link Management",
  "status": "Draft",
  "actors": [
    {
      "role": "principal",
      "capabilities": [
        "view parent-student links table for own tenant",
        "search links by student or parent name",
        "filter links by class",
        "create a new parent-student link (student + parent combobox, relationship, optional note)",
        "view link detail (read-only dialog)",
        "unlink (remove) an existing parent-student link with explicit consequence confirmation",
        "view each link's notification-consent status (read-only badge; cannot edit consent on the parent's behalf)"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL display a table of parent-student links for the admin's tenant, showing student (avatar+name+class), parent (avatar+name+phone), relationship badge, consent-status badge (agreed/pending/declined, icon+text), and link date.",
      "trigger": "Admin navigates to /admin/parent-links",
      "preconditions": ["actor authenticated as principal", "tenant resolved"],
      "postconditions": ["table renders current links for the tenant"],
      "errorConditions": ["network/API failure -> error state with retry"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL let the admin filter the table by free-text search (student or parent name) and by class selector (single class or 'all classes'), combining both filters.",
      "trigger": "Admin types in search box or selects a class",
      "preconditions": ["table has loaded"],
      "postconditions": ["table rows reflect combined filter; filtered count shown"],
      "errorConditions": ["no rows match -> filtered empty state with 'clear filters' action"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL open a create-link dialog (student combobox, parent combobox restricted to parent-role accounts, relationship select [father/mother/guardian], optional note) when the admin activates 'Tạo liên kết'.",
      "trigger": "Admin clicks 'Tạo liên kết'",
      "preconditions": ["actor is principal"],
      "postconditions": ["dialog opens with empty/reset fields"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL validate that a given (studentId, parentId) pair is not already linked before submit, and SHALL reject duplicate submissions with an inline error ('Liên kết đã tồn tại') without creating a second link.",
      "trigger": "Admin submits create-link dialog with a student+parent pair that already has an active link",
      "preconditions": ["dialog open", "student and parent both selected"],
      "postconditions": ["no new link created", "existing link untouched"],
      "errorConditions": ["duplicate pair -> inline validation error, role=alert"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL create a new parent-student link on valid submit, close the dialog, refresh the table, and show a success toast confirming the link and that a consent request was sent to the parent.",
      "trigger": "Admin submits create-link dialog with a valid, non-duplicate student+parent pair",
      "preconditions": ["FR-004 validation passed"],
      "postconditions": ["new link row appears with consent status = pending", "toast shown"],
      "errorConditions": ["API failure -> dialog stays open, inline/toast error, no partial link created"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL open a read-only detail dialog (student, parent, relationship, consent, linked-on date, note) when the admin selects 'Xem chi tiết' from a row's action menu.",
      "trigger": "Admin opens row action menu and selects 'Xem chi tiết'",
      "preconditions": ["row exists"],
      "postconditions": ["detail dialog renders that link's data"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL, on 'Gỡ liên kết' (Unlink) selection, open a confirm dialog that explicitly states the consequence: the parent will lose access to grades, conduct, attendance, and all notifications for that student; neither account is deleted. The system SHALL only perform the unlink after explicit confirm, never on menu-item click alone.",
      "trigger": "Admin selects 'Gỡ liên kết' from a row's action menu",
      "preconditions": ["row exists", "actor is principal"],
      "postconditions": ["on confirm: link removed, row disappears, success toast shown; on cancel: no change"],
      "errorConditions": ["API failure on confirm -> dialog stays open (or reopens) with error, link not removed"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL show a per-class empty state ('Lớp này chưa có liên kết nào' + create-link CTA) when a class filter yields zero unfiltered links, distinct from the filtered-empty state ('Không có liên kết nào khớp bộ lọc' + clear-filters action).",
      "trigger": "Table query returns zero rows",
      "preconditions": ["table has loaded (not first paint)"],
      "postconditions": ["correct empty variant shown based on whether a search/keyword filter is active"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL show an error state with retry when the links list, create, or unlink request fails (network/API error), without silently swallowing the failure.",
      "trigger": "API call fails",
      "preconditions": [],
      "postconditions": ["error UI shown; retry re-issues the failed request"],
      "errorConditions": []
    },
    {
      "id": "FR-010",
      "priority": "Should",
      "description": "The system SHALL restrict the parent combobox in the create-link dialog to accounts holding the parent role in the current tenant only (not students/teachers).",
      "trigger": "Admin types in parent combobox",
      "preconditions": ["dialog open"],
      "postconditions": ["only parent-role members returned as matches"],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Could",
      "description": "The system SHALL let the admin add an optional free-text note when creating a link (e.g. legal guardian, supporting documents) and display it in the detail dialog.",
      "trigger": "Admin fills note field in create-link dialog",
      "preconditions": ["dialog open"],
      "postconditions": ["note persisted with the link and visible in detail dialog"],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Won't",
      "description": "The system SHALL NOT let the admin edit or override a parent's notification-consent toggles from this screen (consent status is read-only here; only the parent themselves can change it, per US-E20.2).",
      "trigger": "N/A — explicit scope exclusion",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Consent-status and relationship badges must carry an icon in addition to color/text so status is not conveyed by color alone.",
      "measurableTarget": "WCAG 2.1 AA 1.4.1 — every badge renders icon+text; contrast >=4.5:1 for badge text, >=3:1 for badge icon/border"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "The student/parent comboboxes use correct combobox/listbox/option ARIA roles and are fully keyboard-operable (open, filter, arrow-navigate, select, escape).",
      "measurableTarget": "WCAG 2.1 AA 4.1.2 + 2.1.1 — keyboard-only walkthrough completes create-link flow with no mouse"
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "The Unlink confirm dialog and row action menu are reachable and operable by keyboard; the destructive action button is visually and semantically distinguished (danger styling) from Cancel.",
      "measurableTarget": "focus trapped in dialog while open; Escape/Cancel returns focus to the triggering row menu button"
    },
    {
      "id": "NFR-004",
      "category": "Responsive",
      "requirement": "The links table collapses to a stacked card-list layout on narrow viewports without losing any column's data.",
      "measurableTarget": "no horizontal scroll/clipping at 320px; explicit card-list variant below 760px per design-spec; verified at 375/768/1280"
    },
    {
      "id": "NFR-005",
      "category": "Performance",
      "requirement": "Table shows a skeleton (5 rows) while the links list request is in flight, not a blank screen.",
      "measurableTarget": "skeleton renders within one paint frame of navigation; replaced by data/error within perceived-loading budget (<=~1s typical, no hard block)"
    },
    {
      "id": "NFR-006",
      "category": "i18n",
      "requirement": "All UI copy (table headers, dialogs, toasts, empty/error states) is sourced from the `parentLinks` i18n namespace in vi/en, no hardcoded strings.",
      "measurableTarget": "vi.json is source of truth; en.json mirrors every key under `parentLinks`; `tsc --noEmit` catches any missing/mistyped key"
    },
    {
      "id": "NFR-007",
      "category": "Security",
      "requirement": "The route and all mutating actions (create link, unlink) are role-gated to principal (admin) only; a non-principal actor hitting the route or action must be denied/redirected.",
      "measurableTarget": "unauthorized role -> 403/redirect to actor's own workspace, verified server-side (Server Action), not just UI-hidden"
    },
    {
      "id": "NFR-008",
      "category": "Security",
      "requirement": "The parent combobox result set is scoped to the admin's own tenant; cross-tenant student/parent data must never be selectable or visible.",
      "measurableTarget": "search results always filtered server-side by resolved tenantId, never client-side only"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "core", "entity": "parent-student-links (GET/POST /api/v1/parent-student-links)", "sensitivity": "Confidential" },
    { "source": "core", "entity": "parent-student-links/{linkId} (DELETE)", "sensitivity": "Confidential" },
    { "source": "core", "entity": "parent-student-links/consents (GET, read-only display here)", "sensitivity": "Confidential" },
    { "source": "iam", "entity": "member search (student/parent lookup for combobox, scoped to tenant + role)", "sensitivity": "Internal" },
    { "source": "mock", "entity": "all of the above until `core` service ships (decision 0014, mock-first)", "sensitivity": "Confidential" }
  ],
  "scope": {
    "inScope": [
      "table with search + class filter",
      "create-link dialog with duplicate validation",
      "detail (read-only) dialog",
      "unlink with consequence-stating confirm dialog",
      "4 UI states (loading/empty [2 variants]/error/success)",
      "role-gate to principal/admin route group"
    ],
    "outOfScope": [
      "editing a parent's notification-consent toggles from admin side (US-E20.2, parent-only)",
      "bulk link creation / CSV import",
      "audit history of who created/removed a link (may be covered by existing admin/audit-log screen, not this story)",
      "cross-tenant link management"
    ],
    "externalDependencies": [
      "core service parent-student-links endpoints (not yet built as of 2026-07-12 — mock-first)",
      "iam member search for student/parent lookup"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] 'admin' in design-spec roles [\"principal\",\"admin\"] refers to the principal system role operating the existing (app)/admin/** route group (same pattern already used by admin/academic-records, admin/audit-log, admin/invitations) — there is no separate 'admin' UserRole in roles-permissions.md; the actor is `principal`.",
    "[ASSUMPTION] `core` service is not yet built (only `iam` + `notification` exist per api-integration.md) — this screen ships mock-first per decision 0014, with repository interfaces ready to swap to real `core` endpoints later.",
    "[ASSUMPTION] Consent status shown in this screen's table is read-only, sourced from the same consent record the parent edits in US-E20.2 — no separate admin-side consent write path."
  ],
  "openQuestions": [
    "Should Unlink be reversible (re-link recreates a fresh pending-consent record) or does the BE track link history/audit trail? Affects whether `core` API needs a distinct DELETE-vs-archive semantic.",
    "Does removing a link need to also revoke/clear the parent's existing notification-consent record server-side, or does the BE handle that as a cascade on DELETE /parent-student-links/{linkId}?"
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Table of links w/ consent status | Must | Core screen purpose |
| FR-002 | Search + class filter | Must | DR explicitly specifies filter bar; needed at scale |
| FR-003 | Create-link dialog | Must | Primary admin action |
| FR-004 | Duplicate-link validation | Must | Data integrity; DR calls out inline validation explicitly |
| FR-005 | Create-link success + toast | Must | Completes the create flow |
| FR-006 | Detail dialog | Must | DR-specified row action |
| FR-007 | Unlink w/ consequence confirm | Must | Destructive action; DR mandates explicit consequence copy (a11y + risk) |
| FR-008 | Empty states (2 variants) | Must | Hard 4-states rule (tdd.md/DR) |
| FR-009 | Error state + retry | Must | Hard 4-states rule |
| FR-010 | Parent combobox scoped to parent role | Should | Correctness, prevents mis-linking, low complexity |
| FR-011 | Optional note field | Could | Convenience, not blocking core flow |
| FR-012 | No consent-edit from admin side | Won't | Explicit scope boundary vs US-E20.2 |

## 4. Handoff Notes

**For `ba-integration-analyst`:** `core` service parent-student-links endpoints
(`GET/POST /api/v1/parent-student-links`, `DELETE .../{linkId}`, `GET/PUT
.../consents`) are not yet built — confirm against current edu-api service
list and produce the mock-first data contract (entity shape: link id,
studentId, parentId, relationship, note, consentStatus, linkedOn). Also map the
`iam` member-search endpoint used by the create-dialog comboboxes (student and
parent lookup, tenant + role scoped).

**For `ba-use-case-modeler`:** Please model these use cases with full
Given/When/Then AC: (1) load table + both empty variants + error+retry, (2)
search/filter combination, (3) create link incl. duplicate rejection, (4) view
detail, (5) unlink incl. the confirm dialog's consequence copy as an explicit
assertion (not just "dialog opens"), (6) role-gate check (non-principal actor
denied). Please also assert the mobile card-list variant (<760px) as its own
AC per FR-001/FR-002 since the design-spec calls it out as a distinct layout,
not just a squeeze.

## Risk-profile note (to `ba-lead`, not implemented unilaterally)

**Recommendation: consider escalating US-E20.1 to high-risk**, specifically
because of FR-007 (Unlink). Rationale: the confirm-dialog copy itself
documents that Unlink strips a parent's visibility into a child's grades,
conduct, attendance, and notifications — a real access/authorization change to
another user's data scope, adjacent to the "authorization is a hard gate"
principle in `docs/product/roles-permissions.md`. It's not a routing/RBAC rule
change, so it may not strictly require a new ADR, but the destructive-scope
mutation warrants the same rigor as an RBAC change (server-side
authorization test, no client-only role gate, explicit audit trail
consideration — see open question above). Lane decision left to you.

## Ba-Lead Decisions (2026-07-12)

- **Lane escalated: normal → high-risk.** Confirmed per the recommendation
  above — Unlink is an Authorization hard gate (data-visibility change for
  another user), not just a "normal" destructive-confirm pattern. `story.md`
  in this packet should carry `Lane: high-risk`; AC must include a
  server-side-enforcement assertion, not just a client confirm-dialog check.
- **Actor role correction: `admin`, not `principal`.** `docs/product/roles-permissions.md`
  was stale (only listed 4 roles); decision `0022` added a 5th role `admin`
  for the `(app)/admin/**` route group, which is exactly where DR-014 places
  this screen (`(app)/admin/parent-links`). The route/role gate for this story
  is `admin`, matching the existing `(app)/admin/layout.tsx` RSC guard
  (`role === "admin"`, decision `0022`/`0024`, with the documented mock-role
  bypass for `NEXT_PUBLIC_USE_MOCK=true`). `roles-permissions.md` has been
  patched to reflect the 5-role model and this route mapping. Use `admin` in
  all downstream AC ("role-gate check: non-admin actor denied"), not
  "non-principal."
