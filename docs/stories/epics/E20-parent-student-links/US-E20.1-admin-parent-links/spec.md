# Feature Spec — Admin Parent–Student Link Management (US-E20.1)

Status: Draft   Lane: high-risk
Sources: `requirements.md` (TR-E20.1, FR-001..012, NFR-001..008) ·
`integration.md` (INT-001..006) · `use-cases.md` (UC-001..007, AC-001.x..
AC-007.x, Edge Case Matrix) · `docs/product/design-spec.jsonc` →
`screens.parentLinks` (line ~3966) · `design_src/edu/parent-links.jsx`
(`ParentLinksScreen`) · `docs/product/screens.md` (admin row) ·
`docs/product/roles-permissions.md` (5-role model, decision `0022`)

## 1. Scope & Objectives

**Purpose:** Give the school `admin` actor a single screen to manage
parent–student links for their tenant — who is linked to whom, in what
relationship, and whether the parent has consented to notifications — and to
create or remove those links.

**In-scope:** links table (search+class filter, both empty variants,
error+retry, loading skeleton), create-link dialog with server-side duplicate
rejection, read-only detail dialog, high-risk Unlink flow with explicit
consequence copy and server-side re-authorization, role-gate to `admin`,
mobile card-list layout (<760px).

**Out-of-scope:** editing a parent's notification-consent toggles from the
admin side (that is US-E20.2, parent-only, read-only badge here); bulk
link creation/CSV import; a standalone audit-history view of link changes
(may live in the existing admin/audit-log screen — not built here, see §8);
cross-tenant link management.

**Definitions:**
- **Link** — a `(studentId, parentId)` pair with a `relationship`
  (father/mother/guardian), optional `note`, aggregate `consentStatus`
  (agreed/pending/declined), and `linkedOn` date.
- **Unlink** — hard removal of a link record. Does not delete either the
  parent's or the student's account; it removes the parent's data-visibility
  grant (grades, conduct, attendance, notifications) for that child.
- **Consent status** — read-only in this screen; it is the same underlying
  record the parent edits in US-E20.2's `ParentConsentSection`.

## 2. Actors & Roles

| Actor | Visibility / capability |
| --- | --- |
| `admin` | Full: view/search/filter table, create link, view detail, unlink (high-risk), view read-only consent badges. This is the `principal` system role operating the existing `(app)/admin/**` route group (decision `0022` added the 5th route-group role `admin`; there is no separate `UserRole.admin` enum value — see §8 [ASSUMPTION]). |
| `teacher` | None — route denied server-side (RSC guard), never receives table/dialog data. |
| `principal` (non-admin-route session) | None on this route — same denial as teacher; `admin` here refers to the route-group role, not a parallel principal capability. |
| `parent` | None — cannot view or reach this screen; their own consent editing happens in US-E20.2's Profile section, a completely separate surface. |
| `student` | None — same denial as teacher. |

Role-gated visibility is enforced by the existing `(app)/admin/layout.tsx` RSC
guard (`role === "admin"`, decision `0022`/`0024`, with the documented
mock-role bypass under `NEXT_PUBLIC_USE_MOCK=true`) — reused, not
reimplemented, by this story.

## 3. Functional Requirements

### FR-001 — Links table (Must, TR-E20.1/UC-001)
The system SHALL display a table of parent-student links for the admin's
tenant: student (avatar+name+class), parent (avatar+name+phone), relationship
badge, consent-status badge (agreed/pending/declined, icon+text), and link
date.
- AC: Given the admin navigates to `/admin/parent-links`, When the page
  mounts and the list request is in flight, Then a 5-row skeleton renders
  within one paint frame (AC-001.1).
- AC: Given the list resolves with items, Then every row shows all 6 fields
  (student/parent/relationship/consent/date/action-menu) sourced from the
  `parentLinks` i18n namespace (AC-001.2).
- Dependencies: INT-001.

### FR-002 — Search + class filter (Must, UC-002)
The system SHALL let the admin filter by free-text search (student or parent
name) AND by class selector, combined (AND, not OR).
- AC: Given a search term AND a class are both set, Then only rows matching
  both render, and the header shows the filtered count with "(đã lọc)"
  (AC-002.1).
- AC: Given a filter change is in flight, Then a loading indicator renders
  (no flash to an incorrect empty/stale state) (AC-002.3); a failed refetch
  shows the same error+retry UI, not silently-stale rows (AC-002.4).
- Dependencies: FR-001, INT-001.

### FR-003 — Create-link dialog (Must, UC-003)
The system SHALL open a create-link dialog (student combobox, parent
combobox restricted to parent-role accounts, relationship select
[father/mother/guardian], optional note) on "Tạo liên kết".
- AC: Given the admin clicks "Tạo liên kết", Then the dialog opens with empty
  comboboxes, no relationship selected, empty note (AC-003.1).
- AC: Given the admin uses only a keyboard, Then the full create-link flow
  (open/filter/arrow-navigate/select in either combobox) completes with no
  mouse (AC-003.8, NFR-002).
- Dependencies: INT-005, INT-006.

### FR-004 — Duplicate-link validation (Must, UC-003)
The system SHALL reject a duplicate `(studentId, parentId)` submission
server-side with an inline error, no second link created.
- AC: Given the pair already has an active link, When submitted, Then an
  inline `role="alert"` error "Liên kết đã tồn tại" renders, dialog stays
  open, no row created, no toast (AC-003.3).
- AC: Given the selected parent is not actually parent-role (422), Then a
  per-field inline error renders on the parent combobox (AC-003.4).
- Dependencies: INT-002.

### FR-005 — Create-link success (Must, UC-003)
The system SHALL create the link on valid submit, close the dialog, refresh
the table, and toast a confirmation that a consent request was sent.
- AC: Given a valid non-duplicate pair + relationship, When submitted, Then
  the dialog closes, table refetches, a new row appears with
  `consentStatus: pending`, and the toast text is shown (AC-003.2).
- AC: Given INT-002 fails (network/5xx), Then the dialog stays open, an
  inline/toast error shows, and previously entered field values are preserved
  for retry (AC-003.6).
- Dependencies: FR-004, INT-002.

### FR-006 — Detail dialog (Must, UC-004)
The system SHALL open a read-only detail dialog (student, parent,
relationship, consent, linked-on date, note) from a row's action menu.
- AC: Given the admin selects "Xem chi tiết", Then the dialog opens showing
  all fields; a missing note renders as omitted, not an error (AC-004.1/.2).
- AC: Given the consent-detail sub-fetch (INT-004) is in flight or fails,
  Then only that section shows a skeleton/error, the rest of the dialog stays
  usable (AC-004.3/.4).
- Dependencies: INT-001 (row data), INT-004.

### FR-007 — Unlink with consequence confirm (Must, HIGH-RISK, UC-005)
The system SHALL, on "Gỡ liên kết", open a confirm dialog explicitly stating
the consequence (parent loses access to grades/conduct/attendance/
notifications; neither account deleted), and SHALL only unlink after
explicit confirm.
- AC: the confirm dialog renders the EXACT DR-014 consequence copy with
  `{parent}/{student}/{class}` interpolated — generic "are you sure?" fails
  this AC (AC-005.1).
- AC: no optimistic removal — the row stays visible until the server responds
  2xx (AC-005.4).
- AC: **the server independently re-checks role=admin + tenant match at the
  API boundary** — this is the load-bearing high-risk assertion, see §"High
  -risk security enforcement" below (AC-005.5).
- Dependencies: INT-003.

### FR-008 — Two empty-state variants (Must, UC-001)
The system SHALL show a per-class empty state (no active filter) distinct
from a filtered-empty state (active search/class filter, zero matches).
- AC: AC-001.3 (no-filter variant + "Tạo liên kết" CTA) and AC-001.4 (filtered
  variant + "Xoá bộ lọc" action) must render different copy/CTA.
- Dependencies: INT-001.

### FR-009 — Error state + retry (Must, UC-001/002/003/005)
The system SHALL show an error state with retry on any list/create/unlink
failure, never silently swallowed.
- AC: AC-001.5 (list), AC-003.6 (create), AC-005.8 (unlink) — each shows an
  error UI whose retry re-issues exactly the failed request.
- AC: 403 responses are NOT rendered as an in-page error — they redirect
  (AC-001.6, AC-005.6 handles 403 differently — dialog stays open with an
  error, since that is the explicit high-risk assertion path, not a redirect;
  the distinction is: list-level 403 → redirect [should not occur once routed
  past the gate]; unlink-level 403 → in-dialog error, because this is the
  proof point that server-side authorization is independently enforced).
- Dependencies: INT-001, INT-002, INT-003.

### FR-010 — Parent combobox scope (Should, UC-003)
The system SHALL restrict the parent combobox to parent-role accounts in the
current tenant only.
- AC: AC-003.7 — only parent-role, own-tenant candidates appear, server-scoped
  (never client-filtered-only, NFR-008).
- Dependencies: INT-006.

### FR-011 — Optional note (Could, UC-003/004)
The system SHALL let the admin add an optional free-text note, shown later in
the detail dialog.
- AC: note persists and appears in FR-006's detail dialog (AC-003 A2, AC-004.1).
- AC: [GAP] no confirmed max length — see §8.
- Dependencies: INT-002.

### FR-012 — No consent editing from admin side (Won't, explicit exclusion)
The system SHALL NOT let the admin edit or override a parent's
notification-consent toggles from this screen.
- AC: AC-004.5 — the detail dialog exposes only a Close action, no consent
  control.
- AC: consent badges throughout the table/detail dialog are read-only.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | Consent/relationship badges carry icon+text, not color alone | WCAG AA 1.4.1; badge text ≥4.5:1, icon/border ≥3:1 | axe/impeccable audit + manual greyscale check |
| NFR-002 (a11y) | Comboboxes use combobox/listbox/option ARIA, fully keyboard-operable | WCAG AA 4.1.2 + 2.1.1; keyboard-only walkthrough completes create-link flow (AC-003.8) | Storybook keyboard interaction test |
| NFR-003 (a11y) | Unlink dialog + row action menu keyboard-operable, danger button visually/semantically distinguished | focus trapped while open; Escape/Cancel returns focus to triggering row menu button (AC-005.2/.9) | Storybook focus-trap interaction test |
| NFR-004 (responsive) | Table collapses to card-list <760px without losing column data | no horizontal scroll/clipping at 320px; card variant (not squeezed table) below 760px; verified 375/768/1280 | Storybook viewport stories at all 4 widths (UC-007) |
| NFR-005 (perf) | Skeleton (5 rows) while list in flight, not blank screen | skeleton within one paint frame; replaced by data/error within perceived-loading budget (~1s typical) | Storybook loading-state story + manual timing spot-check |
| NFR-006 (i18n) | All copy from `parentLinks` namespace, vi source + en mirror | `tsc --noEmit` catches missing/mistyped key; grep confirms no hardcoded VN-diacritic strings outside messages | `bunx tsc --noEmit`; hardcoded-string grep per `.claude/rules/i18n.md` |
| NFR-007 (security) | Route + mutating actions (create, unlink) role-gated to `admin` server-side | non-`admin` → 403/redirect verified server-side (Server Action), not UI-hidden only | RBAC unit test invoking Server Action directly with non-admin role (AC-006.2/.3) |
| NFR-008 (security) | Parent/student search results scoped to admin's own tenant, server-side | search results always filtered server-side by resolved tenantId, never client-side-only | mock repository test asserting cross-tenant candidates never returned (AC-003.7) |

## 5. UI States & Flows

Per-async-surface state matrix (loading/empty/error/success required
everywhere data is fetched or mutated):

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Links table (INT-001) | 5-row skeleton (AC-001.1) | 2 variants: no-filter (AC-001.3) / filtered (AC-001.4) | error+retry (AC-001.5); 403 → redirect not error (AC-001.6) | rows render all 6 columns (AC-001.2) |
| Create dialog (INT-002) | submit button pending/disabled, `aria-busy` (AC-003.5) | n/a (dialog always has fields) | duplicate inline `role="alert"` (AC-003.3); 422 per-field (AC-003.4); network → dialog stays open + fields preserved (AC-003.6) | dialog closes, toast, table refetch, new row `pending` (AC-003.2) |
| Detail dialog (row data + INT-004) | consent-detail section skeleton only (AC-004.3) | no-note → omitted (AC-004.2) | consent-detail section-scoped error only, rest of dialog usable (AC-004.4) | all fields render read-only (AC-004.1) |
| Unlink dialog (INT-003) | confirm button pending/disabled; row stays visible (AC-005.4) | n/a | 403 → dialog reopens w/ error, row not removed (AC-005.6); 404 → "already removed" toast, row disappears via refetch (AC-005.7); network → dialog stays open, retry (AC-005.8) | dialog closes, row disappears, toast (AC-005.3) |
| Role-gate (route) | n/a | n/a | non-admin → server-side redirect before any markup ships (AC-006.1) | admin → full page renders |
| Mobile <760px (UC-007) | same skeleton, card-shaped | same 2 empty variants, restacked (AC-007.3) | same error+retry, restacked (AC-007.4) | card-list, full data parity (AC-007.1/.2) |

Key flows: table-load → optional filter → (create-link OR view-detail OR
unlink) → table reflects change. Unlink is the only flow requiring
server-round-trip-before-UI-update (no optimism) per the high-risk lane.

## 6. Data & Integration

Per INT-XXX in `integration.md` §2 (source of truth; summarized here for
handoff completeness). All 6 endpoints are **mock-first** (`core` not built,
decision `0014`); the `iam` search (INT-006) is also mock-first for this story
pending a confirmed real search-by-role contract.

| INT | Service | Method+Path | Request (camelCase) | Response | Error→UI | Pagination | Auth/role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | core (mock) | GET `/api/v1/parent-student-links` | `q`, `classId`, `cursor`, `limit` (tenantId resolved server-side) | `items[]` (linkId, student.{memberId,fullName,avatarUrl,className}, parent.{memberId,fullName,avatarUrl,phone}, relationship, consentStatus, note?, linkedOn) | 403→redirect; 5xx/timeout→error+retry; empty+no-filter→FR-008 variant A; empty+filter→variant B | cursor (`meta.pagination.nextCursor`/`hasMore`) | admin |
| INT-002 | core (mock) | POST `/api/v1/parent-student-links` | studentId, parentId, relationship, note? | created link, `consentStatus: pending` | 409 LINK_ALREADY_EXISTS→inline error; 422→per-field; 403→redirect (should not occur); 5xx→dialog error+retry | none | admin |
| INT-003 | core (mock) | DELETE `/api/v1/parent-student-links/{linkId}` | path `linkId` only | 204/empty (or `{linkId}` echo, TBD) | 404→"already removed" toast+refetch; **403→dialog error, row not removed (high-risk assertion)**; 5xx→dialog error+retry | none | admin, ⚠ HIGH-RISK |
| INT-004 | core (mock) | GET `/api/v1/parent-student-links/consents` | linkId or (studentId+parentId) [OPEN QUESTION exact shape] | disciplineAlerts/absenceAlerts/gradeAlerts booleans | 5xx→section-scoped error in detail dialog | none | admin, read-only |
| INT-005 | core (mock) | none confirmed — student search | q, classId? | candidates[] (memberId, fullName, avatarUrl, className) | network→inline combobox error+retry | none (cap ~20) | admin |
| INT-006 | iam (mock for this story) | GET `/iam/api/v1/tenants/{tenantId}/members` (candidate anchor, no confirmed `q`/`role` filter contract yet) | q, role="parent" (server-enforced) | candidates[] (memberId, fullName, avatarUrl, phone) | network→inline combobox error+retry | none (cap ~20) | admin |

Entity (mock, shared conceptually with US-E20.2, independent repositories):

```ts
interface ParentStudentLink {
  linkId: string;
  studentId: string; studentName: string; studentAvatarUrl?: string; studentClassName: string;
  parentId: string; parentName: string; parentAvatarUrl?: string; parentPhone: string;
  relationship: "father" | "mother" | "guardian";
  note?: string;
  consentStatus: "agreed" | "pending" | "declined";
  linkedOn: string; // ISO date
}
interface ParentStudentConsent {
  studentId: string; parentId: string;
  disciplineAlerts: boolean; absenceAlerts: boolean; gradeAlerts: boolean;
}
```

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Load parent-student links table | FR-001, FR-008, FR-009 | 6 (AC-001.1–.6) |
| UC-002 | Search + class filter | FR-002 | 4 (AC-002.1–.4) |
| UC-003 | Create parent-student link | FR-003, FR-004, FR-005, FR-010, FR-011 | 8 (AC-003.1–.8) |
| UC-004 | View link detail (read-only) | FR-006, FR-012 | 5 (AC-004.1–.5) |
| UC-005 | Unlink a parent-student link (HIGH-RISK) | FR-007, FR-009 | 9 (AC-005.1–.9) |
| UC-006 | Role-gate enforcement | NFR-007 | 4 (AC-006.1–.4) |
| UC-007 | Mobile card-list layout (<760px) | NFR-004 | 6 (AC-007.1–.6) |

## 8. Constraints & Assumptions

**Technical constraints:**
- `core` service does not exist yet — this entire screen is mock-first
  (decision `0014`); repository interface must be swap-ready for real `core`
  endpoints later.
- No local `openapi.yaml` for `core` to cross-reference; endpoint paths/error
  codes below are best-effort per DR-014 + sibling mock-first features
  (discipline, academic-records, audit-log, admin-roster).

**Confirmed [ASSUMPTION]s (carried from requirements.md, ba-lead-affirmed):**
- `admin` refers to the `principal` system role operating the existing
  `(app)/admin/**` route group (decision `0022` 5th route-group role); there
  is no separate `UserRole.admin` enum value. Use `admin` in all AC per
  ba-lead's 2026-07-12 correction (see requirements.md).
- Consent status shown here is read-only, sourced from the same record the
  parent edits in US-E20.2 — no separate admin-side consent write path.

**[GAP]:**
- Optional note field (FR-011) has no confirmed max length — treat as
  unconstrained client-side until `ba-lead`/`core` team sets a cap (e.g. 500
  chars); server may still 422 on an unbounded value.
- Long student/parent name truncation UX (table + mobile cards) is
  unspecified — flag to `uiux-lead` if a real long-name case surfaces during
  build.

**[CONFLICT]:** none identified between requirements/integration/use-cases
inputs for this story.

**[OPEN QUESTION]s (carried forward, NOT resolved here):**
1. **Unlink reversibility / audit-trail semantics.** `ba-integration-analyst`
   found the existing generic audit-log (`AuditEvent`, US-E12.12) a plausible
   fit for tracking link create/delete history without needing
   DELETE-vs-archive semantics on the link itself (Unlink stays a hard
   DELETE; re-linking recreates a fresh `pending` record). This **requires
   extending the shared `AuditEntityType` union** with a
   `"parent-student-link"` variant — a shared-domain-type change outside this
   story's scope to decide unilaterally. **Recommendation to `ba-lead`: this
   is an ADR candidate (decision ≥ 0023)** — confirm whether CREATE/DELETE on
   parent-student-links should emit into the existing generic audit-log, and
   if so, register the `AuditEntityType` extension. Not decided in this spec.
2. **Consent-cascade-on-unlink behavior.** Does DELETE
   `/parent-student-links/{linkId}` cascade-clear the associated consent
   record server-side, or must the web layer issue a separate consent-clear
   call? Recommend BE-side cascade (simpler contract) but this needs `core`
   team confirmation — not decided here. Affects whether US-E20.2's mock and
   this story's mock need to coordinate a shared clear-on-delete behavior.
3. Exact error code for duplicate-link rejection (assumed
   `LINK_ALREADY_EXISTS`-style, UPPER_SNAKE) — confirm once `core`'s
   `ERROR_CODES.md` exists; AC-003.3 is written against the UI behavior
   (inline error, dialog stays open), which holds regardless of the exact
   code.
4. Whether `consentStatus` on INT-001's list items is server-computed
   (aggregate of 3 category booleans) or client-derived from a separate
   INT-004 fetch — recommend server-side inlining into INT-001 to avoid N+1;
   not a web-team decision.
5. INT-006's real-endpoint anchor (`IAM_MEMBER_EP.members(tenantId)`) has no
   confirmed `q`/`role`-filter contract today — needs `iam` team confirmation
   before this can move off mock-first independent of `core`.
6. `GET /api/v1/members/{memberId}/linked-parents` (DR-014 task brief) is NOT
   consumed by this screen — flagged for a future reverse-lookup story, not
   mapped here.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Links table | TR-E20.1 FR-001 | UC-001 | INT-001 | Must |
| FR-002 Search + class filter | TR-E20.1 FR-002 | UC-002 | INT-001 | Must |
| FR-003 Create-link dialog | TR-E20.1 FR-003 | UC-003 | INT-005, INT-006 | Must |
| FR-004 Duplicate validation | TR-E20.1 FR-004 | UC-003 | INT-002 | Must |
| FR-005 Create-link success | TR-E20.1 FR-005 | UC-003 | INT-002 | Must |
| FR-006 Detail dialog | TR-E20.1 FR-006 | UC-004 | INT-001, INT-004 | Must |
| FR-007 Unlink + consequence confirm | TR-E20.1 FR-007 | UC-005 | INT-003 | Must (HIGH-RISK) |
| FR-008 Two empty variants | TR-E20.1 FR-008 | UC-001 | INT-001 | Must |
| FR-009 Error state + retry | TR-E20.1 FR-009 | UC-001, UC-002, UC-003, UC-005 | INT-001, INT-002, INT-003 | Must |
| FR-010 Parent combobox scope | TR-E20.1 FR-010 | UC-003 | INT-006 | Should |
| FR-011 Optional note | TR-E20.1 FR-011 | UC-003, UC-004 | INT-002 | Could |
| FR-012 No consent edit | TR-E20.1 FR-012 | UC-004 | n/a (exclusion) | Won't |
| NFR-001 Badge icon+text | TR-E20.1 NFR-001 | UC-001, UC-004 | INT-001, INT-004 | Must |
| NFR-002 Combobox a11y | TR-E20.1 NFR-002 | UC-003 | INT-005, INT-006 | Must |
| NFR-003 Unlink dialog a11y | TR-E20.1 NFR-003 | UC-005 | INT-003 | Must |
| NFR-004 Mobile card-list | TR-E20.1 NFR-004 | UC-007 | INT-001 | Must |
| NFR-005 Skeleton perf | TR-E20.1 NFR-005 | UC-001 | INT-001 | Must |
| NFR-006 i18n namespace | TR-E20.1 NFR-006 | all | all | Must |
| NFR-007 Role-gate security | TR-E20.1 NFR-007 | UC-006 | INT-002, INT-003 | Must (HIGH-RISK) |
| NFR-008 Tenant-scoped search | TR-E20.1 NFR-008 | UC-003 | INT-005, INT-006 | Must (HIGH-RISK-adjacent) |

## High-Risk Security Enforcement (non-negotiable, FR-007/UC-005)

This section exists because the lane is **high-risk**: Unlink (INT-003) is an
authorization-adjacent mutation — it revokes another user's (the parent's)
data-visibility grant over a third party's (the student's) records. The
following is a hard gate, not a nice-to-have, and MUST be true before this
story can be marked `implemented`:

1. **Server-side re-authorization is mandatory and independent of the client
   route gate.** The route (`(app)/admin/parent-links`) already denies
   non-admin actors via the `(app)/admin/layout.tsx` RSC guard — that guard is
   necessary but **explicitly insufficient** for Unlink. Every call to
   INT-003 (and, defensively, INT-002 create) MUST re-check, at the API/
   Server-Action boundary: (a) the caller's authenticated session role is
   `admin`, (b) the link belongs to the caller's own tenant. This must hold
   even against a forged/replayed request, a stale session whose role
   changed after the page loaded, or a direct API call that never rendered
   the UI at all.
2. **No optimistic client-only removal.** The row MUST remain visible in the
   table until the server responds 2xx. A client that removes the row before
   the DELETE resolves violates the high-risk lane's rigor even if the
   removal is later "corrected" on failure — the risk is a false sense of
   success, not just eventual consistency.
3. **The assertion must be testable pre-`core`.** Since `core` does not exist
   yet, the mock repository is the enforcement boundary for now: it MUST
   simulate rejecting a non-admin/cross-tenant call (AC-005.5), and this
   rejection must be exercised by **directly invoking the repository/Server
   Action with a forged/altered role** — not merely by confirming the "Gỡ
   liên kết" menu item is hidden in the UI for non-admins (AC-006.4). A test
   suite that only proves the button is hidden does NOT satisfy this
   requirement.
4. **Explicit consequence copy is part of the security contract, not just
   copy-editing.** The confirm dialog (AC-005.1) must render the DR-014
   consequence text verbatim with `{parent}/{student}/{class}` interpolated
   — a generic "are you sure?" dialog fails this AC because it does not
   inform the admin of the specific data-visibility change they are about to
   make.
5. **Consequence scope is precise:** neither the parent's nor the student's
   account is deleted or otherwise affected — only the link record (and,
   pending the open question in §8, possibly the associated consent record)
   is removed. Implementation must not conflate "unlink" with any
   account-level action.
6. **Audit trail is flagged, not required, for this story's `implemented`
   gate** — see §8 [OPEN QUESTION] 1. If `ba-lead` decides to require it via
   ADR before build, that becomes an additional hard gate; until then it is
   out of this story's confirmed scope.

`fe-tech-lead-reviewer` and any dedicated security review MUST verify points
1–3 above with a concrete test (unit or integration) that exercises a
forged/non-admin role directly against the repository or Server Action layer
— UI-only role-hiding tests are insufficient proof for this story.

## 10. Handoff to FE

`fe-lead` should build:
- `src/features/admin/parent-links/` (domain: `ParentStudentLink` entity,
  `IParentStudentLinkRepository`, use-cases for list/create/unlink/detail;
  infrastructure: mock repo per §6/integration.md §4 fixtures, DTOs, mappers,
  endpoint constants; presentation: `ParentLinksScreen` + `PLCreateDialog` +
  `PLUnlinkDialog` + `PLDetailDialog` + `PLSkeleton`/`PLEmpty`(×2)/`PLError` +
  mobile card-list variant).
- Route `(app)/admin/parent-links/page.tsx` + `actions.ts`, reusing the
  existing `admin/layout.tsx` RSC guard (no new route-level guard needed) and
  following the `requireRole(["admin"])`-per-Server-Action pattern already
  used by `admin/grades/approval/actions.ts` / `admin/academic-records`.
- Reference design: `design_src/edu/parent-links.jsx` (`ParentLinksScreen`)
  and its `docs/product/design-spec.jsonc` entry `screens.parentLinks` (line
  ~3966) — tokens, badge color mapping (relation/consent), dialog max-widths,
  and the `mobileVariant` card-list spec are normative per decision `0011`.

**Suggested lane:** high-risk (per ba-lead decision) — pipeline should include
the mandatory security-focused review pass on INT-003 (see above section)
before the design-review gate, not after.

**Proof owed (→ TEST_MATRIX rows):**
- Unit: create/unlink/list-filter use-cases (ok + all documented failure
  branches per §9).
- Integration: mock repository including the simulated forbidden-role/
  cross-tenant Unlink rejection (AC-005.5) as its own explicit test — this is
  the load-bearing high-risk proof, not optional coverage.
- E2E: Storybook stories per Validation table in `story.md` — all 4 UI states
  × all 3 dialogs + role-gate-denied + mobile viewport set (320/375/768/1280).
- Platform: `tsc --noEmit` clean, `bun run build` succeeds with the new route
  present.
- Release: design-review gate (tokens/a11y/states) AND a dedicated
  confirmation that the high-risk server-side re-authorization test exists
  and passes — this is a release-blocking item distinct from the general
  design-review gate.
