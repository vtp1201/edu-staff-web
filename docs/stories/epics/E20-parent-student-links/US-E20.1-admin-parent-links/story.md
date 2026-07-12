# US-E20.1 Admin Parent–Student Link Management

## Status

planned

## Lane

high-risk

## Dependencies

- Depends on: none
- Blocks: none (US-E20.2 is independent — shares the `ParentStudentLink`/consent
  entity shape conceptually, but builds against its own mock repository)
- Feature module(s) chạm: `src/features/admin/parent-links/` (new; per
  `docs/product/screens.md` proposed home `features/admin/parent-links`)
- Shared contract/file: `IParentStudentLinkRepository` (new interface; entity
  shape agreed with US-E20.2's `ParentStudentConsent`/`LinkedStudentSummary`,
  independent repositories); `(app)/admin/layout.tsx` RSC guard (existing,
  reused — decision `0022`/`0024`)

## Product Contract

Admin (role `admin`, route `(app)/admin/parent-links`) views, searches/filters,
creates, inspects, and removes parent–student links for their tenant, and sees
each link's notification-consent status read-only. The table shows student
(avatar+name+class), parent (avatar+name+phone), relationship badge,
consent-status badge (agreed/pending/declined, icon+text), and link date, with
combined free-text + class filter and two distinct empty-state variants
(no-filter vs filtered). Create-link opens a dialog (student combobox, parent
combobox scoped to parent-role accounts, relationship select, optional note)
with server-side duplicate-pair rejection. Detail is a read-only dialog. Unlink
is a **high-risk authorization mutation**: it strips a parent's data-visibility
grant (grades, conduct, attendance, notifications) for a child without deleting
either account; the confirm dialog states this consequence explicitly, and the
removal is enforced server-side independent of the client having already
passed the route's role gate — see spec.md §"High-risk security enforcement"
for the non-negotiable AC. All four async UI states are required. Data source
is `core` (mock-first, decision `0014`) plus an `iam` member-search lookup for
the create-dialog comboboxes (also mock-first for this story, pending a
confirmed `iam` search-by-role contract).

## Relevant Product Docs

- `docs/design-requests/DR-014-parent-student-links.md`
- `docs/product/design-spec.jsonc` → `screens.parentLinks` (line ~3966)
- `docs/product/screens.md` — admin section row (`(app)/admin/parent-links`)
- `docs/product/roles-permissions.md` — 5-role model, `admin` route group (decision `0022`)
- `design_src/edu/parent-links.jsx` — `ParentLinksScreen`
- `docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/spec.md`
- `.claude/rules/api-integration.md` (mock-first, envelope, camelCase)

## Acceptance Criteria

Condensed checklist — full Given/When/Then in `use-cases.md` (AC-001.x …
AC-007.x); this list groups by use case for traceability. See spec.md §9 for
the full traceability matrix.

- **UC-001 (table load):** skeleton (5 rows) → success renders all columns; two
  distinct empty variants (no-filter vs filtered, AC-001.3/.4); error+retry
  (AC-001.5); 403 → redirect, not an in-page error (AC-001.6).
- **UC-002 (search+filter):** combined `q` + `classId` filter (AND); filtered
  count with "(đã lọc)" suffix; clear-filters action; loading/error handling
  during refilter (no stale-row flash).
- **UC-003 (create link):** dialog opens empty; happy path creates row with
  `consentStatus: pending` + toast; duplicate pair → inline `role="alert"`
  error, dialog stays open, no row created; 422 → per-field error; network
  error → dialog stays open, fields preserved; parent combobox scoped to
  parent-role + own tenant (server-side); full keyboard operability.
- **UC-004 (view detail):** read-only dialog (student/parent/relationship/
  consent/linkedOn/note); no note → omitted, not an error; consent-detail
  sub-fetch has its own skeleton/error scoped to that dialog section only; no
  edit control present (FR-012).
- **UC-005 (unlink, HIGH-RISK):** confirm dialog states the exact consequence
  copy (visibility loss + no-account-deletion, interpolated {parent}/{student}/
  {class}); danger-styled confirm, focus trap, focus returns to trigger on
  close; no optimistic removal — row stays until server 2xx; **server-side
  authorization re-check independent of client route gate** (AC-005.5, the
  high-risk assertion); 403 → dialog reopens with error, row not removed; 404
  race → "already removed" toast, row disappears via refetch; network error →
  dialog stays open, retry.
- **UC-006 (role-gate):** non-`admin` actor denied server-side at the route
  (RSC guard) AND at each mutating Server Action (create, unlink) independent
  of any client-side hiding.
- **UC-007 (mobile <760px):** distinct stacked card-list layout (not a
  squeezed table), full data parity per card, no clipping at 320px (verified
  375/768/1280), action menu keyboard-operable identically to desktop.

## Design Notes

- Commands: `createParentStudentLink`, `unlinkParentStudentLink`
- Queries: `listParentStudentLinks` (q, classId, cursor), `getParentStudentLinkDetail`
  (or reuse list item + lazy consent-detail fetch), `getLinkConsentDetail`
  (3 category booleans), `searchStudentCandidates`, `searchParentCandidates`
  (role=parent, tenant-scoped)
- API (mock-first — `core` not yet built, decision `0014`):
  - `GET  /api/v1/parent-student-links` (INT-001)
  - `POST /api/v1/parent-student-links` (INT-002)
  - `DELETE /api/v1/parent-student-links/{linkId}` (INT-003, high-risk)
  - `GET  /api/v1/parent-student-links/consents` (INT-004, detail-dialog lazy fetch)
  - `iam` student/parent search (INT-005/INT-006) — no confirmed real endpoint
    contract yet; treat as mock-first for this story
- Tables: parent-student-links list (cursor-paginated); mobile card-list variant <760px
- Domain rules: duplicate (studentId, parentId) rejected server-side (FR-004);
  parent combobox restricted to parent-role + own-tenant (FR-010/NFR-008,
  server-side only, never client-filter-only); Unlink server-side
  re-authorizes role=admin + tenant match independent of the route gate
  (high-risk, see spec.md); no optimistic removal on Unlink
- UI surfaces: `ParentLinksScreen` (table+filters+header), `PLCreateDialog`,
  `PLUnlinkDialog` (danger, consequence copy), `PLDetailDialog` (read-only),
  `PLSkeleton`, `PLEmpty` (2 variants), `PLError`, mobile card-list variant
  (per `design_src/edu/parent-links.jsx`)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E20.1 --unit 1 --integration 1 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Domain use-cases: create-link (ok/duplicate/validation-error), unlink (ok/forbidden/not-found/network-error), search filtering logic |
| Integration | `IParentStudentLinkRepository` mock: seeded list, duplicate-pair rejection, delete-by-id, simulated forbidden-role/cross-tenant response for the high-risk Unlink AC (AC-005.5), member-search candidate pools |
| E2E | Storybook interaction: Loading / Success / EmptyNoFilter / EmptyFiltered / Error / CreateDialog(happy+duplicate+validation+network) / DetailDialog(withNote+noNote+consentError) / UnlinkDialog(consequence-copy assertion+confirm+403+404+network+cancel) / RoleGateDenied / MobileCardList(320/375/768/1280) |
| Platform | `bunx tsc --noEmit` clean; `bun run build` succeeds; route `(app)/admin/parent-links` present in build output |
| Release | design-review gate pass (tokens/a11y/states); security review sign-off on the high-risk Unlink server-side re-authorization test (non-optional gate before `implemented`) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E20.1 (planned, high-risk)
- `docs/product/screens.md`: parent-links admin row already present
  ("🎨 design-ready") — update to "🚧 in-progress" when `/fe` claims this story
- [FLAG for `ba-lead`]: Unlink reversibility/audit-trail semantics — carried
  from requirements.md/integration.md's open question. `ba-integration-analyst`
  found the existing generic audit-log (`AuditEvent`, US-E12.12,
  `entityType: "grade"|"conduct"|"record"|"setting"`) a plausible fit for
  tracking link create/delete history, but extending `AuditEntityType` with a
  new `"parent-student-link"` variant is a shared-type change outside this
  story's unilateral scope — **recommend a decision (ADR candidate, decision
  ≥ 0023) on whether Unlink/Create should emit into that generic audit-log**.
  Not decided in this spec.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
