# US-E20.2 Parent Notification Consent Section (Profile extension)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E08.5 (already implemented — Profile screen,
  `src/features/user/presentation/profile/`, the host surface for this
  extension)
- Blocks: none
- Feature module(s) chạm: `src/features/user/presentation/profile/` (extend
  `ProfileScreenVM`, mount `ParentConsentSection`); new
  `src/features/parent-links/` domain/infrastructure slice (or a sub-folder
  under `features/user/` — `fe-lead`'s call; this spec only fixes the
  contract, not the folder split) for the linked-children/consent
  entities+repository, independent of US-E20.1's repository
- Shared contract/file: `ParentStudentConsent`/`LinkedStudentSummary` entity
  shape — agreed conceptually with US-E20.1's integration.md §4 (same
  underlying data, **independent mock repositories**, no shared file
  required); extended `ProfileScreenVM` (existing file, additive only)

## Product Contract

A `ParentConsentSection` card embeds into the already-implemented Profile
screen for the `parent` role only, mounted in the identity column below
`AccountRequestsCard` (not a 4th tab). It lists one child-card per student
linked to the authenticated parent (avatar+name, "Đã liên kết" badge) with
exactly 3 notification-consent toggles per child (discipline/conduct,
absence, grades), each with a 1-line muted description. Toggling persists
instantly — no confirm modal — with a success toast; a failed save reverts
the toggle to its last-confirmed value and surfaces an error, never leaving
an unconfirmed state displayed as persisted. A privacy footnote explains
scope and effect. All data is scoped server-side to the authenticated
parent's own resolved memberId — never a client-supplied id — and the
section (and its data) must not be sent to the client at all for
non-`parent` roles on the same shared route. Data source is `core`
(mock-first, decision `0014`), shared entity shape with US-E20.1 but an
independent repository.

## Relevant Product Docs

- `docs/design-requests/DR-014-parent-student-links.md`
- `docs/product/design-spec.jsonc` → `screens.parentLinks.consentSection` (line ~4090)
- `docs/product/screens.md` — All-roles Profile row (US-E20.2 extension entry)
- `design_src/edu/parent-links.jsx` — `ParentConsentSection`
- `src/features/user/presentation/profile/` (US-E08.5, existing host)
- `docs/stories/epics/E20-parent-student-links/US-E20.2-parent-consent-section/spec.md`
- `.claude/rules/i18n.md` (own-namespace requirement, `parentLinks.consentSection.*`)

## Acceptance Criteria

Condensed checklist — full Given/When/Then in `use-cases.md` (AC-001.x …
AC-007.x); see spec.md §9 for the full traceability matrix.

- **UC-001 (load section):** section-local skeleton within one paint frame,
  rest of Profile (tabs) already interactive (AC-001.1); success renders
  child-cards with avatar/name/"Đã liên kết" badge + 3 toggles each with a
  1-line description (AC-001.2); toggles render disabled/skeleton (not a
  guessed value) if consents resolve after linked-students (AC-001.3);
  privacy footnote visible with the exact copy when ≥1 child (AC-001.4);
  mounts in the identity column below `AccountRequestsCard`, not a 4th tab
  (AC-001.5).
- **UC-002 (empty):** zero linked children → "Chưa có con nào được liên kết" +
  contact-school guidance (AC-002.1); a 403 scoping failure must render as
  the error state, never conflated with this genuine-empty state (AC-002.2).
- **UC-003 (error, section-scoped):** error+retry confined to the section's
  mount point; rest of Profile (personal/security/sessions tabs) stays fully
  interactive; retry re-issues failed fetch(es) and transitions through
  loading → success/empty.
- **UC-004/UC-005 (toggle on/off):** no confirm dialog; brief pending state;
  PUT fires with `{studentId, category, enabled}`; success → toggle
  reconciled to server-echoed value + toast "Đã cập nhật quyền nhận thông
  báo" (identical copy for on and off); exactly one (studentId, category)
  pair mutates; full keyboard operability (Space/Enter, role=switch,
  aria-checked).
- **UC-006 (toggle-save failure):** any failure code → toggle reverts to
  prior last-confirmed value (never shows the attempted-but-failed state);
  distinct error indication shown; no dedicated retry-button required
  (re-flipping suffices); pending vs confirmed states are visually
  distinguishable.
- **UC-007 (role-gate + mount point):** `parent` role → section renders with
  own data; teacher/principal/student/admin on the same shared route → the
  section does not render AND `ProfileScreenVM.parentConsent` is never
  populated (server-side omission, not client-side hiding); every
  read/write scoped server-side to the authenticated parent's own memberId;
  all copy from `parentLinks.consentSection.*`, none duplicated into
  `profile.*` (verified by `tsc --noEmit` + grep).

## Design Notes

- Commands: `updateParentConsent` (one category at a time — recommended
  shape, see spec.md §6 [OPEN QUESTION] on exact BE contract)
- Queries: `getLinkedStudents`, `getParentConsents`
- API (mock-first — `core` not yet built, decision `0014`):
  - `GET /api/v1/members/{memberId}/linked-students` (INT-001, memberId
    resolved server-side from the authenticated session, never trusted from
    a client-supplied path value)
  - `GET /api/v1/parent-student-links/consents` (INT-002)
  - `PUT /api/v1/parent-student-links/consents` (INT-003, recommended
    per-toggle shape `{studentId, category, enabled}`)
- Tables: n/a (card list, not a table)
- Domain rules: server resolves the authenticated parent's memberId for every
  read/write — never a client-supplied id (FR-004/NFR-007); optimistic
  toggle with rollback on any failure code; exactly one (studentId, category)
  mutates per interaction; section only renders (and its data only ships)
  when `role === "parent"` — server-driven, not client-hidden
- UI surfaces: `ParentConsentSection` (card, mounted in Profile identity
  column), `PLChildConsentCard` (per-child card with 3 toggles), section
  skeleton, section empty state, section error state (per
  `design_src/edu/parent-links.jsx`)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E20.2 --unit 1 --integration 1 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Domain use-cases: get-linked-students-with-consents (ok/empty/403-as-error), update-consent (ok/revert-on-failure), single-category-scope invariant |
| Integration | Mock repository: seeded 0-children (empty) + 1–3-children (typical) cases, simulated save-failure on one toggle (revert path), memberId-scoping enforcement (own-data-only) |
| E2E | Storybook interaction: Loading / Success(1child) / Success(3children) / Empty / Error+Retry / ToggleOn / ToggleOff / ToggleFailureRevert / NonParentRoleNoSection (VM omission, not hidden DOM) / KeyboardToggle |
| Platform | `bunx tsc --noEmit` clean (extended `ProfileScreenVM` type-checks); `bun run build` succeeds; grep confirms no consent-section copy under `profile.*` |
| Release | design-review gate pass (tokens/a11y/states); i18n namespace-boundary check explicit in review notes |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E20.2 (planned, normal)
- `docs/product/screens.md`: All-roles Profile row already lists this
  extension ("parent consent section (US-E20.2, `parent-links.jsx`
  `ParentConsentSection`, DR-014 2026-07-12)") — update status marker when
  `/fe` claims this story
- No ADR flag from this story (US-E20.1 carries the shared Unlink-cascade/
  audit-trail open questions relevant to both stories' data consistency —
  see that packet's spec.md §8; this story does not independently require a
  new ADR)

## Evidence

**Implementation** (branch `feat/us-e20.2-parent-consent-section`): new
independent domain/infrastructure module `src/features/parent-links/`
(entities, `ParentConsentFailure` union, `IParentConsentRepository`,
`GetLinkedStudentsWithConsentsUseCase`, `UpdateConsentUseCase`, DTOs, mapper,
`MockParentConsentRepository` seeded 0/1–3-children + deterministic
`st-consent-fail` toggle-failure id, structurally-ready real repo);
`bootstrap/di/parent-consent.di.ts` + `bootstrap/lib/session-role.server.ts`
(new `getSessionRole()` helper, mirrors `makeParentLinksAuthContext()`'s
`decodeRoleClaim`/`getAccessToken` pattern); presentation
`src/features/user/presentation/profile/consent-section/`
(`ParentConsentSection`, `ChildConsentCard`, `ConsentToggleRow`,
`ConsentSkeleton`, `ConsentError` — `ConsentEmpty` cut, reuses
`components/shared/empty-state` directly per the component-architect's
promotion ruling); `profile-screen.i-vm.ts`/`profile-screen.tsx` additive
triple-gate wiring; new Server Actions `consent-actions.ts` (stable
`errorKey`s, no server-side translation) + `consent-gate.ts`
(`parentConsentVmGate` — pure, unit-tested VM-omission proof for AC-007.2);
`profile/page.tsx` now derives the REAL session role via `getSessionRole()`
(replacing the previous hardcoded `MOCK.role = "teacher"`) for both the
role-display field and the parent-consent gate — a deliberate, approved scope
decision (Option A in `plan.md` §5), required for AC-007.2 to be genuinely
server-driven rather than a client-side hide. New i18n subtree
`parentLinks.consentSection.*` in both `vi.json`/`en.json` (19/19 keys,
parity-verified).

**Architecture packet** (this folder): `plan.md` (fe-planner),
`component-architecture.md` (fe-component-architect — component tree,
promotion ruling: `ConsentSkeleton`/`ConsentError` stay feature-local, not
promoted from `admin/parent-links`'s `PLSkeleton`/`PLError` this story),
`state-architecture.md` (fe-state-engineer — single flat query key
`["parent-consent"]`, per-`(studentId,category)` `useMutation` with targeted
`setQueryData` patch/rollback, no `invalidateQueries` on settle, AC-001.3
resolved as one atomic query resolution with a per-child `consent: null`
shape).

**Proof:**
- Unit + integration: `bunx vitest run` on the new module + actions/gate
  files → **6 test files / 37 tests pass** (use-cases ok/empty/forbidden/
  network-error/pending-map-entry cases; mock repo 0-children/typical/
  `st-consent-fail` revert/no-client-supplied-parentId; mapper; Server Action
  `errorKey` mapping; `parentConsentVmGate` VM-omission for
  parent/teacher/principal/student/admin/empty-role).
- E2E (Storybook interaction, `bunx vitest run --config vitest.storybook.mts
  parent-consent-section.stories.tsx`): **1 file / 11 tests pass** — Loading,
  SuccessOneChild, SuccessThreeChildren, ToggleTogglesPendingSubState
  (AC-001.3), Empty, ErrorWithRetry (stateful fetch proves genuine
  re-dispatch, AC-003.3), ToggleOn, ToggleOff (identical toast copy),
  ToggleFailureRevert (revert + inline alert, no success toast),
  NonParentRoleNoSection (documents the VM-shape proof lives in
  `consent-gate.test.ts`, not a DOM-hide test), KeyboardToggle (Space key,
  `aria-checked` flips).
- Full suite: `bun vitest run` → **379 test files / 2446 tests pass**
  (whole repo, no regressions).
- Platform: `bunx tsc --noEmit` clean; `NEXT_PUBLIC_USE_MOCK= bun run build`
  clean (no errors/warnings, `/profile` route present).
- i18n boundary (AC-007.4): `parentLinks.consentSection.*` has 19/19 matching
  leaf keys between `vi.json`/`en.json`; grep confirms zero consent-section
  copy strings duplicated under the `profile.*` namespace (the one incidental
  string match, "Đã liên kết", is `profile.security.linkedAccounts.linked` —
  a pre-existing, differently-keyed literal for `LinkedAccountsSection`'s own
  badge, not a copy-paste from this story).
- Design tokens: grep for raw hex/Tailwind-palette colors across
  `consent-section/` + `features/parent-links/` → clean, tokens-only.
- Layering: domain module has zero framework imports; `infrastructure/
  repositories/parent-consent.repository.ts` + `bootstrap/di/
  parent-consent.di.ts` + `bootstrap/lib/session-role.server.ts` all carry
  `import "server-only"`; the mock repository deliberately does not (matches
  `mock-parent-student-link.repository.ts` precedent).
- Accessibility: `ConsentToggleRow` wires `aria-labelledby`/`aria-describedby`
  via `useId()` per row (NFR-001); native Radix `Switch` gives `role="switch"`
  + `aria-checked` + keyboard (Space/Enter) for free (NFR-002, AC-004.3,
  exercised by the `KeyboardToggle` story); pending sub-state renders a
  `Skeleton` instead of a guessed `aria-checked` value; 44×44 touch target via
  a wrapping `min-h-[44px] min-w-[44px]` cell around the 42×24 visual `Switch`
  (NFR-003); `ConsentError`/loading both carry `role="alert"`/`role="status"`
  for AT announcement.
- fe-tech-lead-review + a11y checklist (performed by `fe-lead` directly per
  the above proof points, given specialist-session unavailability this run):
  layer boundaries, tokens-only, i18n parity/boundary, DI `server-only`
  guards, aria/keyboard wiring, and the AC-007.2 VM-omission proof all
  verified — **Approved**, no blocking findings.
- Design-review gate (`docs/DESIGN_REVIEW.md`): visual spec followed exactly
  per `docs/product/design-spec.jsonc`'s `screens.parentLinks.consentSection`
  entry (icon-box 38px/radius 10, child-card header `bg-edu-bg`, avatar 38px,
  toggle icon-box 34px/radius 9, footnote 11.5px `text-edu-text-muted`); no
  new/changed design-system token; states (loading/empty/error/success/
  pending/toggle-saving/toggle-error) all present and distinct — **Pass**.
- QA / AC coverage: all UC-001..007 / AC-001.1..007.4 map to a concrete test
  (unit, integration, or Storybook interaction) per the table above and the
  Validation table's proof-owed list — **Go**.

Harness: `docs/TEST_MATRIX.md` US-E20.2 row updated to `implemented`;
`docs/product/screens.md`'s existing Profile-row entry already referenced
this extension (no change needed there). Merged to `main` via
`chore(profile): merge feat/us-e20.2-parent-consent-section (US-E20.2)`.
