# Feature Spec — Parent Notification Consent Section (US-E20.2)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-E20.2, FR-001..009, NFR-001..007) ·
`integration.md` (INT-001..003) · `use-cases.md` (UC-001..007, AC-001.x..
AC-007.x, Edge Case Matrix) · `docs/product/design-spec.jsonc` →
`screens.parentLinks.consentSection` (line ~4090) ·
`design_src/edu/parent-links.jsx` (`ParentConsentSection`) ·
`docs/product/screens.md` (All-roles Profile row) · existing implementation
`src/features/user/presentation/profile/` (`profile-screen.tsx`,
`profile-screen.i-vm.ts`, US-E08.5)

## 1. Scope & Objectives

**Purpose:** Let a `parent` actor see, per linked child, three
notification-consent toggles and change them instantly, scoped strictly to
their own linked students — extending the existing Profile screen rather
than adding a new route.

**In-scope:** `ParentConsentSection` card embedded in Profile's identity
column (parent role only); 3 toggles per linked child with instant persist +
toast (no confirm modal); loading/empty/error/success states scoped to the
section; privacy footnote; own-namespace i18n
(`parentLinks.consentSection.*`).

**Out-of-scope:** creating/removing parent-student links (US-E20.1,
admin-only); editing relationship/note on the link; a standalone `/consent`
route (`ParentConsentScreen` in the mockup — not required for this story
unless product/`fe-lead` decides otherwise later); notification
delivery/sending itself (`noti` service's concern).

**Definitions:**
- **Linked student / child** — a student the authenticated parent has an
  active link to (the `ParentStudentLink` row created via US-E20.1, or
  seeded in this story's independent mock).
- **Consent category** — one of `discipline` (violation/conduct alerts),
  `absence` (attendance alerts), `grades` (grade alerts).
- **Own-data scoping** — every read/write here is resolved server-side to
  the authenticated parent's own `memberId`; a client-supplied id must never
  be trusted, per FR-004/NFR-007.

## 2. Actors & Roles

| Actor | Visibility / capability |
| --- | --- |
| `parent` | Full: view own linked children, view/toggle 3 consent categories per child, read privacy footnote. Section renders on the shared `(app)/(shared)/profile` route only for this role. |
| `teacher` / `principal` / `student` / `admin` | None — on the same shared Profile route, the section MUST NOT render, and `ProfileScreenVM.parentConsent` MUST NOT be populated for these sessions (server-driven omission, not a client-side hide of already-fetched data). |

Role-gated visibility is enforced in the ViewModel layer: `ProfileScreenVM`
only populates the optional `parentConsent` field when the resolved session
role is `parent`; the presentation layer never receives the data to hide for
other roles.

## 3. Functional Requirements

### FR-001 — Render child-cards (Must, TR-E20.2/UC-001)
The system SHALL render a `ParentConsentSection` card, embedded in the
parent's Profile screen, listing one child-card per linked student (identity
+ "Đã liên kết" badge).
- AC: Given the parent's Profile screen renders, Then `ParentConsentSection`
  mounts in the identity column, below `AccountRequestsCard`, not as a 4th
  tab (AC-001.5).
- AC: Given INT-001+INT-002 resolve with ≥1 student, Then one child-card
  renders per student with avatar+name+"Đã liên kết" badge (AC-001.2).
- Dependencies: INT-001, INT-002.

### FR-002 — 3 consent toggles per child (Must, UC-001)
The system SHALL show exactly 3 toggles per child-card (discipline/conduct,
absence, grades), each a real Switch with a 1-line muted description,
reflecting the current persisted value.
- AC: Given a child-card renders with data loaded, Then all 3 toggles show
  the last-saved on/off state (AC-001.2).
- AC: Given linked-students resolves before consents, Then toggles render
  disabled/skeleton (not a guessed default) until consents arrive (AC-001.3).
- Dependencies: INT-001, INT-002.

### FR-003 — Instant persist, no confirm modal (Must, UC-004/005/006)
The system SHALL persist a toggle change immediately (no confirm dialog) and
show a success toast on save; on failure, SHALL revert the toggle and show
an error.
- AC: Given a toggle is flipped, Then no confirm dialog appears, a brief
  pending state shows, INT-003 fires, and on success the toggle stays at the
  new value (reconciled to the server echo) with toast "Đã cập nhật quyền
  nhận thông báo" (AC-004.1/AC-005.1 — same toast copy both directions).
- AC: Given INT-003 fails (any code — 422/403/network/5xx), Then the toggle
  reverts to its prior last-confirmed value and a distinct error indication
  shows; the UI must never display an unconfirmed state as persisted
  (AC-006.1/.2/.4).
- Dependencies: INT-003.

### FR-004 — Strict own-data scoping (Must, UC-001/UC-007)
The system SHALL scope all children/consent data strictly to the
authenticated parent's own linked students; the parent SHALL NOT view or
infer any other parent's data via this section.
- AC: AC-007.3 — server resolves the acting parent's memberId from the
  Bearer token; no client-supplied identifier can select another parent's
  data.
- AC: AC-002.2 — a 403 memberId-scoping rejection renders as the error state,
  never conflated with the genuine-empty state.
- Dependencies: INT-001, INT-002, INT-003.

### FR-005 — Empty state (Must, UC-002)
The system SHALL show an empty state ("Chưa có con nào được liên kết" +
contact-school guidance) when the parent has zero linked students.
- AC: AC-002.1 — a genuine 200 with `students: []` shows this state, distinct
  from the 403 hard-error case (AC-002.2).
- Dependencies: INT-001.

### FR-006 — Error state, section-scoped (Must, UC-003)
The system SHALL show a retry-capable error state scoped to the section
when the linked-children or consent fetch fails, without breaking the rest
of Profile.
- AC: AC-003.1/.2 — error+retry confined to the section's mount point;
  personal/security/sessions tabs remain fully interactive throughout.
- AC: AC-003.3 — retry re-issues the failed fetch(es), transitioning through
  loading → success/empty per the new result.
- Dependencies: INT-001, INT-002.

### FR-007 — Privacy footnote (Must, UC-001)
The system SHALL display a privacy footnote explaining consent-based
notification sending, scoped-to-linked-students, and that toggling off does
not affect in-app data access.
- AC: AC-001.4 — exact copy per DR-014 (vi + en mirror) visible whenever the
  section renders with ≥1 linked child.
- Dependencies: none (static copy, i18n only).

### FR-008 — Section-scoped loading skeleton (Should, UC-001)
The system SHALL show a loading skeleton for the section while data is
fetched, distinct from the rest of Profile's own loading state.
- AC: AC-001.1 — skeleton within one paint frame; rest of Profile already
  interactive.
- Dependencies: INT-001, INT-002.

### FR-009 — No link/unlink editing (Won't, explicit exclusion)
The system SHALL NOT let the parent edit link relationship, note, or unlink
themselves from a child via this section (admin-only, US-E20.1).
- AC: no such control exists anywhere in `ParentConsentSection` or its
  child-cards.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | Each toggle has `aria-labelledby`/`aria-describedby` pointing at its own label/description | WCAG AA 4.1.2/1.3.1; axe/impeccable reports 0 unlabeled-switch violations | Storybook a11y addon + manual screen-reader spot-check |
| NFR-002 (a11y) | Toggle state conveyed via `role=switch`/`aria-checked` + visible label text, not color alone | WCAG AA 1.4.1; state readable with color removed/greyscale | Storybook keyboard interaction test (AC-004.3) |
| NFR-003 (a11y) | Toggles meet 44×44px touch target despite compact 42×24 visual size | WCAG AA 2.5.5; tap target ≥44×44px verified at 375px | Storybook viewport story + manual measurement |
| NFR-004 (responsive) | Child-cards stack correctly within Profile's existing grid | no layout break/clipping at 320px; verified 375/768/1280 within Profile's own breakpoints | Storybook viewport stories |
| NFR-005 (perf) | Section shows its own skeleton without blocking rest of Profile | skeleton visible within one paint frame; other Profile tabs interactive while section loads | Storybook loading-state story + manual timing spot-check |
| NFR-006 (i18n) | All copy from own `parentLinks.consentSection.*` sub-tree, separate from `profile` namespace | vi.json/en.json both have full tree; `tsc --noEmit` passes; no duplication into `profile.*` (grep-verified) | `bunx tsc --noEmit`; grep `profile.*` keys for consent-section strings (AC-007.4) |
| NFR-007 (security) | Section + toggle mutation gated to `parent` role; every read/write scoped server-side to the authenticated parent's memberId | a parent cannot fetch/mutate another parent's record by manipulating request params (verify once `core` exists; mock must simulate the boundary now) | mock repository test asserting memberId is never taken from client input; RBAC-equivalent VM-omission test (AC-007.2) |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Section (INT-001+INT-002) | section-local skeleton within one paint frame, rest of Profile interactive (AC-001.1) | "Chưa có con nào được liên kết" + guidance (AC-002.1) | "Không tải được dữ liệu" + retry, section-confined; rest of Profile unaffected (AC-003.1/.2); 403-scoping failure treated as this error state, never the empty state (AC-002.2) | N child-cards, each with 3 toggles at last-saved values + privacy footnote (AC-001.2/.4) |
| Individual toggle (INT-003) | brief pending/disabled state, optimistic-with-rollback (AC-004.1) | n/a | any failure code → revert to prior value + distinct error indication, no dedicated retry-button required (AC-006.1/.2/.3) | toggle stays at new value, reconciled to server echo, toast "Đã cập nhật quyền nhận thông báo" (AC-004.1/AC-005.1) |
| Toggles-pending sub-state | consents not yet resolved while linked-students has → toggles disabled/skeleton, never a guessed value (AC-001.3) | — | — | resolves into normal toggle rendering once consents arrive |
| Role-gate (VM) | n/a | n/a | n/a (not an error — omission) | `parent` → `parentConsent` populated + section renders (AC-007.1); other roles → `parentConsent` absent, section never renders (AC-007.2) |

Key flow: Profile mounts → (if role=parent) section mounts alongside existing
tabs → linked-children+consents resolve → parent flips any toggle → instant
persist-with-rollback → toast. The section never blocks or is blocked by the
rest of Profile's own state (personal/security/sessions remain independently
interactive at all times, FR-006/NFR-005).

## 6. Data & Integration

Per INT-XXX in `integration.md` §2. Both endpoints (plus the PUT) are
**mock-first** (`core` not built, decision `0014`) — same posture as
US-E20.1, **independent mock repository**, shared entity-shape convention
only.

| INT | Service | Method+Path | Request (camelCase) | Response | Error→UI | Pagination | Auth/role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | core (mock) | GET `/api/v1/members/{memberId}/linked-students` | path `memberId` — MUST be server-resolved from the authenticated session, never trusted from the client at face value (server verifies it matches/derives from the authenticated principal, else 403) | `students[]` (studentId, fullName, avatarUrl?, linkId) | 403 (memberId-scoping failure) → hard section error, NEVER the empty state (distinguish from genuine empty); 5xx/timeout → section error+retry; 200 empty → FR-005 empty state | none expected (small list; confirm with core team if `meta.pagination` should still be present for consistency) | parent |
| INT-002 | core (mock) | GET `/api/v1/parent-student-links/consents` | none beyond auth (server resolves parent's memberId, returns consents for every student in INT-001's set) | `consents[]` (studentId, disciplineAlerts, absenceAlerts, gradeAlerts) | 5xx → shared section error with INT-001 (FR-006 — parent doesn't need "which fetch failed", just "section failed") | none | parent |
| INT-003 | core (mock) | PUT `/api/v1/parent-student-links/consents` | **recommended** (BE contract TBD, see §8 [OPEN QUESTION]): `{studentId, category: "discipline"\|"absence"\|"grades", enabled: boolean}` — one category at a time, to avoid a stale-read-then-overwrite race between near-simultaneous toggles for the same child | updated consent row (studentId + all 3 booleans) — echoed back so UI reconciles without a full INT-002 refetch | 422/403/network/5xx → toggle reverts to prior value, error surfaced (toast or inline), never a silent no-op | none | parent |

Entity (mock, shared shape convention with US-E20.1's integration.md §4,
independent repositories):

```ts
interface ParentStudentConsent {
  studentId: string;
  parentId: string; // resolved server-side; mock can hardcode "self"
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
interface LinkedStudentSummary {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  linkId: string;
}
```

Mock behaviors needed: 0-children seed (empty state), 1–3-children seed
(typical), a simulated save failure on one toggle (revert path, FR-003
errorConditions). Guard with `NEXT_PUBLIC_USE_MOCK`, matching existing
precedent (discipline/roster/academic-records/audit-log).

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Load consent section with linked children | FR-001, FR-002, FR-007, FR-008 | 5 (AC-001.1–.5) |
| UC-002 | Empty state (zero linked children) | FR-005 | 2 (AC-002.1–.2) |
| UC-003 | Error state (section-scoped, retry) | FR-006 | 3 (AC-003.1–.3) |
| UC-004 | Toggle a consent on | FR-003 | 3 (AC-004.1–.3) |
| UC-005 | Toggle a consent off | FR-003 | 1 (AC-005.1) |
| UC-006 | Toggle-save failure (revert + error) | FR-003 | 4 (AC-006.1–.4) |
| UC-007 | Role-gate + mount-point (shared Profile route) | FR-004, FR-009 | 4 (AC-007.1–.4) |

## 8. Constraints & Assumptions

**Technical constraints:**
- `core` service does not exist yet — mock-first (decision `0014`), same
  posture as US-E20.1; independent mock repository, shared entity-shape
  convention only (no code file sharing required, per each story's own
  handoff note).
- Extends `ProfileScreenVM` (currently
  `fullName/email/phone/role/sessions/linkedAccounts`) additively with an
  optional `parentConsent` shape — must not break US-E08.5's existing
  contract or its consumers.

**Confirmed [ASSUMPTION]s (carried from requirements.md, ba-lead-affirmed by
inclusion of both packets under one DR-014):**
- Mount point is the existing parent Profile screen (US-E08.5), NOT the
  standalone `/consent` route also present in the mockup as
  `ParentConsentScreen` — scoped to Profile-embed only per DR-014 +
  screens.md; the standalone route is a future story if ever needed.
- Section is visible only when the authenticated actor's active role is
  `parent`; on the shared `(app)/(shared)/profile` route, non-parent
  sessions must not render this section — server-driven, not client-hidden.
- No blocking dependency on US-E20.1 — the two stories build independently
  against their own mocks of the same conceptual entity.

**[GAP]:** none identified beyond the open questions below — the AC set is
otherwise self-contained.

**[CONFLICT]:** none identified between requirements/integration/use-cases
inputs for this story.

**[OPEN QUESTION]s (carried forward, NOT resolved here):**
1. Does `PUT /parent-student-links/consents` take one category at a time or
   a full per-child object? §6 documents the **recommended** per-toggle
   shape (avoids a cross-toggle race) but this is a BE-contract decision, not
   decided unilaterally by web-side analysis — confirm against the real
   `core` OpenAPI once authored. AC-004.1/AC-005.1 assert the request shape
   against the recommendation; if `core` ships a full-object PUT instead,
   only the request-shape assertion needs updating, not the user-facing
   behavior.
2. Should INT-002 (consents) be a separate call from INT-001 (linked
   students), or should `core` inline the 3 booleans directly into each
   linked-student item? Recommend inlining (avoids a second round-trip and a
   race between the two fetches resolving at different times) — not
   blocking for this spec since AC-001.3 already covers the case where they
   resolve at different times regardless.
3. Exact error code(s) for a consent-update failure (e.g. `VALIDATION_ERROR`
   vs a bespoke `CONSENT_UPDATE_FAILED`) — unknown until `core`'s
   `ERROR_CODES.md` exists; AC-006.1 is written to cover "any error code" →
   the same revert+error behavior, so this does not block implementation.
4. Whether `core` should return `meta.pagination` on the linked-students list
   for consistency with other list endpoints — unlikely to matter given
   small counts; no AC written against pagination.
5. `GET /api/v1/members/{memberId}/linked-parents` (DR-014 task brief) is NOT
   consumed by this screen — same note as US-E20.1's integration.md, flagged
   for a future reverse-lookup story.
6. **Shared with US-E20.1's spec.md §8:** whether DELETE
   `/parent-student-links/{linkId}` cascades to clear this story's consent
   record server-side — affects whether this section's data is instantly
   consistent post-unlink from the admin side. Not blocking for this story's
   own AC (scoped to the parent's own read/write flow), but flagged for a
   future consistency check between the two stories' mocks once `core`
   exists. Resolution owned by US-E20.1's ADR-candidate flag, not this spec.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Render child-cards | TR-E20.2 FR-001 | UC-001 | INT-001, INT-002 | Must |
| FR-002 3 toggles per child | TR-E20.2 FR-002 | UC-001 | INT-001, INT-002 | Must |
| FR-003 Instant persist, no modal | TR-E20.2 FR-003 | UC-004, UC-005, UC-006 | INT-003 | Must |
| FR-004 Strict own-data scoping | TR-E20.2 FR-004 | UC-001, UC-007 | INT-001, INT-002, INT-003 | Must |
| FR-005 Empty state | TR-E20.2 FR-005 | UC-002 | INT-001 | Must |
| FR-006 Error state, section-scoped | TR-E20.2 FR-006 | UC-003 | INT-001, INT-002 | Must |
| FR-007 Privacy footnote | TR-E20.2 FR-007 | UC-001 | n/a (static copy) | Must |
| FR-008 Section-scoped loading skeleton | TR-E20.2 FR-008 | UC-001 | INT-001, INT-002 | Should |
| FR-009 No link/unlink editing | TR-E20.2 FR-009 | n/a (exclusion) | n/a | Won't |
| NFR-001 Switch aria-labelledby/describedby | TR-E20.2 NFR-001 | UC-001 | INT-001, INT-002 | Must |
| NFR-002 Switch role/aria-checked + label | TR-E20.2 NFR-002 | UC-004 | INT-003 | Must |
| NFR-003 Touch target 44px | TR-E20.2 NFR-003 | UC-001 | n/a (layout) | Must |
| NFR-004 Responsive stacking | TR-E20.2 NFR-004 | UC-001 | n/a (layout) | Must |
| NFR-005 Section-scoped skeleton perf | TR-E20.2 NFR-005 | UC-001 | INT-001, INT-002 | Must |
| NFR-006 i18n namespace boundary | TR-E20.2 NFR-006 | UC-007 | all | Must |
| NFR-007 Own-memberId server scoping | TR-E20.2 NFR-007 | UC-001, UC-007 | INT-001, INT-002, INT-003 | Must |

## 10. Handoff to FE

`fe-lead` should build:
- An extension to `src/features/user/presentation/profile/`: add
  `parentConsent` (optional) to `ProfileScreenVM`, mount
  `ParentConsentSection` in the identity column below `AccountRequestsCard`
  when populated, plus an `onToggleConsent` action prop alongside the
  existing `onLinkAccount`/`onUnlinkAccount` pattern (per requirements.md's
  handoff note).
- A domain/infrastructure slice for `LinkedStudentSummary` +
  `ParentStudentConsent` + a repository interface (independent of US-E20.1's
  repository, but matching its field names per §6) with a mock
  implementation seeding 0/1–3-children cases and a simulated toggle-save
  failure.
- `ParentConsentSection` + `PLChildConsentCard` presentational components per
  `design_src/edu/parent-links.jsx` and the `screens.parentLinks
  .consentSection` design-spec entry (line ~4090) — tokens, icon-box sizing,
  toggle layout are normative per decision `0011`.
- New i18n sub-tree `parentLinks.consentSection.*` in both `vi.json`/`en.json`
  — do NOT add any of this copy under the existing `profile` namespace
  (AC-007.4 is a direct test of this boundary).

**Suggested lane:** normal (per ba-lead — no escalation raised for this
story; the strict own-data server-side scoping in NFR-007 is standard
multi-tenant rigor already established elsewhere in the codebase, not a
lane-escalating novelty).

**Proof owed (→ TEST_MATRIX rows):**
- Unit: get-linked-students-with-consents (ok/empty/403-as-error),
  update-consent (ok/revert-on-any-failure-code), single-(studentId,
  category)-scope invariant.
- Integration: mock repository — 0-children, 1–3-children, simulated
  toggle-save failure, memberId-scoping enforcement (never trusts a
  client-supplied id).
- E2E: Storybook stories per Validation table in `story.md` — all 4 section
  states, both toggle directions, the revert path, the VM-omission
  role-gate check (AC-007.2 must be provable as "field absent", not "DOM
  hidden"), and keyboard toggle operability.
- Platform: `tsc --noEmit` clean with the extended `ProfileScreenVM`; `bun
  run build` succeeds; a grep pass confirming zero consent-section strings
  under `profile.*`.
- Release: design-review gate (tokens/a11y/states) with the i18n
  namespace-boundary check called out explicitly in review notes.
