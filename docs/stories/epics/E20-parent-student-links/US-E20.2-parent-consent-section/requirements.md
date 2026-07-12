# US-E20.2 — Parent Notification Consent Section — Requirements

Source: `docs/design-requests/DR-014-parent-student-links.md` (delivered
2026-07-12) · `docs/product/design-spec.jsonc` →
`screens.parentLinks.consentSection` (line ~4090) · `docs/product/screens.md`
(All-roles Profile row) · `docs/product/roles-permissions.md` ·
existing implementation `src/features/user/presentation/profile/`
(`profile-screen.tsx`, `profile-screen.i-vm.ts`, US-E08.5).

This is an **extension** of the already-implemented Profile screen, not a new
route. It adds an embeddable card block, `ParentConsentSection`, sourced from
`design_src/edu/parent-links.jsx`.

## 1. Requirements Summary

The system SHALL let a `parent` actor view, per linked child, three
notification-consent toggles (discipline/conduct, absence, grades) and change
them instantly (no confirm modal — toggle + toast), scoped strictly to
children linked to that parent's own account. The section composes into the
existing Profile screen for the parent role only; it must not be visible to
teacher/principal/student roles, and a parent must never see another parent's
links or consent data. All four async UI states are required. Data source is
`core` service's parent-student-links consents endpoints (not yet built) —
mock-first (decision `0014`).

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E20.2",
  "title": "Parent Notification Consent Section (Profile extension)",
  "status": "Draft",
  "actors": [
    {
      "role": "parent",
      "capabilities": [
        "view own linked children in the consent section",
        "view 3 notification-consent toggles per linked child (discipline/conduct, absence, grades)",
        "toggle any of the 3 consents on/off, instantly persisted",
        "read the privacy footnote explaining scope and effect of toggling"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a `ParentConsentSection` card, embedded in the parent's Profile screen, listing one child-card per student linked to the authenticated parent, each showing the child's identity (avatar, name) and a 'Đã liên kết' badge.",
      "trigger": "Parent navigates to their Profile screen",
      "preconditions": ["actor authenticated with role parent", "actor has >=0 linked students"],
      "postconditions": ["one child-card rendered per linked student"],
      "errorConditions": ["fetch failure -> error state, section-scoped (does not break the rest of Profile)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL show exactly 3 consent toggles per child-card — discipline/conduct alerts, absence alerts, grade alerts — each as a real `<Switch>`-equivalent control with a 1-line muted description underneath, reflecting the current persisted consent value.",
      "trigger": "Child-card renders with data loaded",
      "preconditions": ["FR-001 satisfied for this child"],
      "postconditions": ["each toggle's on/off state matches the parent's last-saved consent for that child+category"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL persist a toggle change immediately on interaction (no confirm dialog) and SHALL show a success toast ('Đã cập nhật quyền nhận thông báo') once the change is saved.",
      "trigger": "Parent flips a toggle for a linked child",
      "preconditions": ["toggle is enabled/interactive"],
      "postconditions": ["consent record updated for that (child, category)", "toast shown"],
      "errorConditions": ["save failure -> toggle SHALL revert to its prior state and an error indication SHALL be shown (toast or inline); the UI must never show a toggle state that was not actually persisted"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL scope all children/consent data strictly to the authenticated parent's own linked students; the parent SHALL NOT be able to view or infer any other parent's links or consent settings via this section.",
      "trigger": "Section loads or refetches",
      "preconditions": ["actor authenticated as parent"],
      "postconditions": ["only the authenticated parent's own linked-children data is fetched/rendered"],
      "errorConditions": ["server SHALL scope by resolved parent memberId — never rely on client-supplied identifiers"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL show an empty state ('Chưa có con nào được liên kết' + contact-school guidance) when the parent has zero linked students.",
      "trigger": "Linked-students fetch returns zero results",
      "preconditions": ["fetch succeeded with empty result set"],
      "postconditions": ["empty-state UI shown in place of child-cards"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL show an error state (retry-capable) scoped to the consent section when the linked-children or consent fetch fails, without breaking the rest of the Profile page (personal/security/sessions tabs remain usable).",
      "trigger": "Fetch for linked-students or consents fails",
      "preconditions": [],
      "postconditions": ["section shows its own error UI; other Profile tabs unaffected"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL display a privacy footnote explaining that the school only sends notifications with consent, scoped to linked students only, and that turning notifications off does not affect the parent's in-app access to the child's data.",
      "trigger": "Consent section renders with >=1 linked child",
      "preconditions": [],
      "postconditions": ["footnote text visible near the toggle list"],
      "errorConditions": []
    },
    {
      "id": "FR-008",
      "priority": "Should",
      "description": "The system SHALL show a loading skeleton for the consent section while the linked-children/consent data is being fetched, distinct from the rest of the Profile page's own loading state.",
      "trigger": "Profile screen mounts and consent data has not yet resolved",
      "preconditions": [],
      "postconditions": ["skeleton placeholder rendered in the section's mount point"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Won't",
      "description": "The system SHALL NOT let the parent edit link relationship, note, or unlink themselves from a child via this section (that is admin-only, US-E20.1).",
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
      "requirement": "Each consent toggle (Switch) has aria-labelledby pointing at its own label and aria-describedby pointing at its own 1-line description, so screen readers announce the exact scope of what is being toggled.",
      "measurableTarget": "WCAG 2.1 AA 4.1.2 / 1.3.1 — axe/impeccable audit reports 0 unlabeled-switch violations"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "Toggle on/off state is conveyed via accessible switch semantics (role=switch, aria-checked) and visible label text ('Bật'/'Tắt' or equivalent), not by color alone.",
      "measurableTarget": "WCAG 2.1 AA 1.4.1 — state readable with color removed/greyscale"
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "Toggle switches meet the 44x44px touch-target minimum on mobile despite the compact 42x24 visual switch size (hit-area padding).",
      "measurableTarget": "WCAG 2.1 AA 2.5.5 — tap target >=44x44px verified at 375px viewport"
    },
    {
      "id": "NFR-004",
      "category": "Responsive",
      "requirement": "The consent section's child-cards stack correctly within the Profile screen's existing responsive grid without breaking at narrow widths.",
      "measurableTarget": "no layout break/clipping at 320px; verified at 375/768/1280 within the Profile screen's own breakpoints"
    },
    {
      "id": "NFR-005",
      "category": "Performance",
      "requirement": "The consent section shows a skeleton in its own mount point rather than blocking the rest of Profile from rendering.",
      "measurableTarget": "skeleton visible within one paint frame; Profile's other tabs (personal/security/sessions) remain interactive while consent data is in flight"
    },
    {
      "id": "NFR-006",
      "category": "i18n",
      "requirement": "All consent-section copy comes from its own `parentLinks.consentSection.*` i18n sub-tree (vi source + en mirror), kept separate from the `profile` namespace so it composes without key collisions.",
      "measurableTarget": "vi.json/en.json both have full `parentLinks.consentSection` tree; `tsc --noEmit` passes; no copy duplicated into `profile` namespace"
    },
    {
      "id": "NFR-007",
      "category": "Security",
      "requirement": "The section and its mutating action (toggle change) are gated to the `parent` role only, and every read/write is scoped server-side to the authenticated parent's own memberId — never trusting a client-supplied child/parent id.",
      "measurableTarget": "server-side scoping verified — a parent cannot fetch or mutate another parent's consent record by manipulating request params (would require API/BE-level check, flag to be verified once `core` exists)"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "core", "entity": "GET /api/v1/members/{memberId}/linked-students (own children list)", "sensitivity": "Confidential" },
    { "source": "core", "entity": "GET/PUT /api/v1/parent-student-links/consents (read + toggle per child+category)", "sensitivity": "Confidential" },
    { "source": "mock", "entity": "all of the above until `core` service ships (decision 0014, mock-first)", "sensitivity": "Confidential" }
  ],
  "scope": {
    "inScope": [
      "ParentConsentSection card embedded into existing Profile screen for parent role",
      "3 consent toggles per linked child, instant persist + toast",
      "loading/empty/error/success states scoped to the section",
      "privacy footnote copy",
      "own-namespace i18n (parentLinks.consentSection.*)"
    ],
    "outOfScope": [
      "creating/removing parent-student links (US-E20.1, admin-only)",
      "editing relationship/note on the link",
      "a standalone `/consent` route (design-spec lists it as an option but DR/screens.md route this into Profile; standalone wrapper `ParentConsentScreen` in the mockup is not required for this story unless `/fe`/product decides otherwise)",
      "notification delivery/sending itself (that's `noti` service's concern, not this UI)"
    ],
    "externalDependencies": [
      "core service parent-student-links + linked-students/consents endpoints (not yet built as of 2026-07-12 — mock-first)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] `core` service is not yet built — mock-first per decision 0014, matching US-E20.1.",
    "[ASSUMPTION] Mount point is the existing parent's Profile screen (US-E08.5, src/features/user/presentation/profile/), NOT the standalone `/consent` route variant also present in the mockup as `ParentConsentScreen` — per DR-014 and screens.md which both describe it as attaching to Profile.",
    "[ASSUMPTION] Section is visible only when the authenticated actor's active role is `parent`; on the shared `(app)/(shared)/profile` route (all roles), teacher/principal/student sessions must not render this section at all (not just hide it client-side)."
  ],
  "openQuestions": [
    "Confirmed with ba-lead: does `/fe` need to also build the standalone `ParentConsentScreen` route (`/consent`) from the mockup, or is embedding into Profile the full scope for this story? Recommend scoping this story to Profile-embed only and treating the standalone route as a future story if needed.",
    "Does a save failure on toggle need a distinct retry affordance (retry button) beyond the revert+toast in FR-003, or is revert+toast sufficient? Left as an AC-modeling decision for ba-use-case-modeler."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Render child-cards for own linked students | Must | Core screen purpose |
| FR-002 | 3 toggles per child w/ description | Must | DR-specified content |
| FR-003 | Instant persist + toast (no confirm modal) | Must | DR explicitly says no modal confirm for this action |
| FR-004 | Strict own-data scoping | Must | Privacy/security — parent must never see others' data |
| FR-005 | Empty state (no linked children) | Must | Hard 4-states rule |
| FR-006 | Error state, section-scoped | Must | Hard 4-states rule; must not break rest of Profile |
| FR-007 | Privacy footnote | Must | DR a11y/trust requirement, explicit copy provided |
| FR-008 | Section-scoped loading skeleton | Should | Perceived performance; Profile itself already has its own loading pattern to extend |
| FR-009 | No link/unlink editing here | Won't | Explicit scope boundary vs US-E20.1 |

## 4. Handoff Notes

**For `ba-integration-analyst`:** Map `core` service's
`GET /api/v1/members/{memberId}/linked-students` and
`GET/PUT /api/v1/parent-student-links/consents` — confirm exact response
shape needed (per-child, per-category consent boolean) and whether `PUT`
takes one category at a time or a full consent object per child. Flag that
`core` isn't built yet (mock-first, decision 0014) — same BE dependency as
US-E20.1's data, so the two stories may eventually share one repository/entity
(`ParentStudentLink`) even though they're independent to build.

**For `ba-use-case-modeler`:** Model use cases: (1) load section with N linked
children + loading skeleton, (2) empty (0 linked children), (3) error +
retry (section-scoped, rest of Profile unaffected), (4) toggle a consent on,
(5) toggle a consent off, (6) toggle-save failure -> revert + error surfaced,
(7) role-gate: non-parent actor on shared Profile route never sees the
section. Please also write an AC asserting the i18n namespace boundary
(`parentLinks.consentSection.*` used, not duplicated into `profile.*`) since
that's an explicit DR instruction likely to drift during implementation.

## Dependencies

- **Depends on US-E08.5 (already implemented)** — the Profile screen at
  `src/features/user/presentation/profile/` (`profile-screen.tsx` +
  `profile-screen.i-vm.ts`) is the existing host surface. Exact mount point
  for `/fe`: `ProfileScreen` currently renders an identity column (`Card` +
  `AccountRequestsCard`) plus a `Tabs` (`personal`/`security`/`sessions`).
  `ParentConsentSection` should mount **in the identity column** (alongside
  `AccountRequestsCard`, below it) when the active role is `parent` — it is a
  standalone card block per the design spec (`component: ParentConsentSection`,
  own header with icon+title), not a 4th tab, since the mockup shows it as an
  always-visible card rather than tab-gated content. `/fe` should extend
  `ProfileScreenVM` (currently `fullName/email/phone/role/sessions/linkedAccounts`)
  with an optional `parentConsent` shape (linked children + their consent
  toggles) populated only when `role === "parent"`, and add an `onToggleConsent`
  action prop alongside the existing `onLinkAccount`/`onUnlinkAccount` pattern.
- **No blocking dependency on US-E20.1** — per DR-014, independent of
  DR-012/013/017, and the consent section only *reads/writes* a parent's own
  consent record; it does not require the admin link-management UI to exist
  first (though both need `core` service or mocks of the same underlying
  entity).
