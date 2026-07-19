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

Design review: pass
- design-system: conform — `StatusBadge` tone reuse (father→info, mother→purple,
  guardian→muted, agreed→teal, pending→warning, declined→error-dark) matches
  `design-spec.jsonc` `screens.parentLinks` exactly; dialog max-widths (create
  470, detail 440) match spec; no raw colors introduced (confirmed by
  `fe-tech-lead-reviewer`'s hex/gray/slate scan).
- a11y: WCAG AA — `fe-accessibility-auditor` found 1 blocker (A11Y-001, focus
  not returning to row-menu trigger after Unlink/Detail dialog close) + 2
  majors (A11Y-002 missing 422 error text on student combobox; A11Y-003
  keyboard-select focus loss in `SearchCombobox`) + 2 minors (touch targets).
  All 5 fixed by `fe-nextjs-engineer` on commit `9a2a2eb`, re-verified with new
  Storybook assertions (`UnlinkCancelReturnsFocus`, `UnlinkEscapeReturnsFocus`,
  `DetailReturnsFocus`, `CreateDialogValidationStudent`,
  `KeyboardSelect`-focus-assertion). Keyboard-operable, focus ring intact,
  reduced-motion gated globally (`globals.css`).
- impeccable audit: manual conformance pass against `design-spec.jsonc`
  `screens.parentLinks` (route/layout/badges/dialogs) — no divergence found;
  no `/impeccable` CLI findings beyond what the a11y auditor already caught
  and fixed above.
- states: loading (5-row skeleton) / empty (2 variants) / error+retry /
  success all covered per Storybook interaction sweep; responsive verified at
  all 4 mandated viewports 320/375/768/1280 (`MobileCardList{320,375,768,1280}`
  stories, added in the QA-fix commit `6a30614` — an earlier claim of
  "320/375/768/1280 verified" before that commit was inaccurate, only 375 had
  been tested; corrected here) plus mobile-empty/mobile-error restacked
  stories and mobile row-menu keyboard-operability (AC-007.3/.4/.6); mobile
  card-list uses the same `PLRelationBadge` as desktop (fixed from a plain-text
  divergence QA caught, DEF-3).

QA gate (`fe-qa-playwright`): **first pass FAILED** — 2 blocker defects found
by live reproduction (not inferred): DEF-1 (AC-001.6, list-load 403 rendered a
generic in-page error instead of redirecting) and DEF-2 (AC-003.8, keyboard
arrow+Enter selection inside the actual `PLCreateDialog` silently failed to
commit a selection — a real nested-Command-in-Dialog defect, not a headless-test
artifact as first assumed) — plus 3 major gaps (UC-002 search/filter had zero
interaction-level proof; mobile-viewport claim overstated; mobile card
diverged from the shared relationship badge). All fixed on commit `6a30614`:
DEF-2's root cause was the Popover-portaled cmdk input escaping the Dialog's
`FocusScope` (Radix `modal` alone did not keep it in-scope) — fixed by
rendering `SearchCombobox`'s panel inline (no Portal) as an absolute sibling
inside the dialog's own focus scope. DEF-1 fixed via a server-side redirect in
the RSC `page.tsx` when the initial fetch's errorKey is `forbidden`. Re-routed
to QA for re-verification — see the second QA verdict below before this story
is marked `implemented`.

Security review (high-risk gate, spec.md §"High-Risk Security Enforcement"):
pass — `fe-tech-lead-reviewer` independently verified (not from self-report)
the mock repository re-checks role+tenant before existence in
`unlinkLink`/`createLink`, the two forged-authCtx tests
(`mock-parent-student-link.repository.test.ts`) directly invoke the repository
with a forged non-admin role and a cross-tenant admin and assert `forbidden`,
`actions.test.ts` asserts zero repo/use-case calls on the guard short-circuit,
no optimistic removal in the unlink mutation, and the consequence copy states
the exact data-visibility-loss text with `{parent}/{student}/{class}`
interpolated.

Test proof (post QA-fix commit `6a30614`, corrected counts):
- Unit + integration (scoped to this feature): 66 (use-cases, mapper,
  `toFailure` code-vs-message divergence, mock repo incl. both forged-authCtx
  forbidden tests / duplicate-pair / 404 race / tenant-role-scoped search,
  `actions.test.ts` RBAC short-circuit zero-call proof, `page.test.ts` (new,
  DEF-1 redirect proof), `filter-search-params.test.ts` (new, 12 tests, UC-002))
- E2E (Storybook interaction): **42** total (`parent-links-screen.stories.tsx`
  36, `search-combobox.stories.tsx` 5, `command.stories.tsx` 1) — an earlier
  claim of "27" was wrong (QA-caught count-accuracy issue); corrected here.
  Covers all states/dialogs, focus-return (unlink cancel/escape, detail),
  UC-002 filter interaction stories, all 4 mobile viewports + mobile
  empty/error/keyboard, and the DEF-2 keyboard-selection-completes assertion
  inside the actual create dialog.
- Full repo regression: `bun vitest run` 2409/2409 pass (373 files); Storybook
  suite 42/42 green for `parent-links`/`search-combobox`/`command` (baseline
  failures in unrelated features unaffected).
- Platform: `bunx tsc --noEmit` clean; `NEXT_PUBLIC_USE_MOCK=true bun run build`
  succeeds, route `(app)/admin/parent-links` present in build output.

Note: the `RoleGateDenied` Storybook story referenced in the original
Validation table was never created — the underlying AC-006.2/.3/.4 behavior is
soundly proven at `actions.test.ts` + `page.test.ts` instead (Server Action and
RSC-route layers), which is sufficient; the dangling story reference in the
Validation table is a documentation artifact, not a functional gap.
- Platform: `bunx tsc --noEmit` clean; `NEXT_PUBLIC_USE_MOCK=true bun run build`
  succeeds, route `(app)/admin/parent-links` present in build output
