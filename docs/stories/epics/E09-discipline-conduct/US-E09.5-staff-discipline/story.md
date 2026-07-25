# US-E09.5 Staff Discipline (violations + conduct notes, tabbed)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none identified
- Blocks: none
- Feature module(s) chạm: `src/features/staff-discipline/` (new feature)
- Shared contract/file: `discipline.errors.*` i18n namespace (verbatim reuse,
  read-only for this story); `SDStateBadge`/reject-panel pattern mirrors
  `discipline`/`staff-leave` precedents but is its own component set — no
  shared file edited in-place.

## Product Contract

`principal` (BE conduct sub-domain's `ADMIN` authoring + `MANAGER` approving
capacity, both collapsed onto this app's single `principal` role per ADR
`0062` — **not** the app's separate route-guard `admin` role) manages two
staff-conduct sub-resources on one tabbed screen:

**Tab 1 — Violations (`staff-violations`):** `principal` creates a violation
record in `DRAFT` (staff-member from a fixed mock roster, category, severity
MINOR/MODERATE/SEVERE, occurredAt, description), submits their own DRAFT
(→ SUBMITTED), and approves or rejects a SUBMITTED record (reject requires a
reason, ≥10-char client UX guard on top of the server's non-empty
requirement). `teacher` sees their own record read-only, zero mutation
controls.

**Tab 2 — Conduct Notes (`staff-conduct-notes`):** keyed by natural key
`(termId, staffMemberId)`. `principal` sets (creates/overwrites) a note
(rating SATISFACTORY/NEEDS_IMPROVEMENT/UNSATISFACTORY + note text ≤5000
chars) while the target is absent/DRAFT/REJECTED; once `APPROVED` the record
is **permanently locked** — the set form must not even open (client
pre-check), and a bypassed request still gets `STAFF_CONDUCT_NOTE_LOCKED`
(409) server-side (ADR `0074`). Same submit/approve/reject lifecycle as
Violations. `teacher` self-view has no term selector — scoped to the active
term only.

**Shared across both tabs:** identical `ApprovalTransition` state machine
(`DRAFT → SUBMITTED → APPROVED | REJECTED`); `selfApproved` annotation (ADR
`0073`) — shown (never hidden) whenever `approverMemberId === authorMemberId`,
the expected common case in this single-`principal`-tenant model; every
mutating action MUST be re-authorized server-side by role, independent of
the client route guard (non-negotiable, same rigor as a high-risk lane even
though this story's lane is normal).

Routes: `(app)/principal/staff-discipline`, `(app)/teacher/staff-discipline`
(ADR `0062` — corrects DR-022's original `/admin/staff-discipline`, which is
dropped). Mock-first: BE `core` conduct sub-domain endpoints are already
shipped and ground-truthed (US-E18.14), but the web client stays permanently
mock-first because of the roster-UUID gap — no live roster search exists to
resolve `staffMemberId` → display name/department (FR-009/FR-013 explicit
exclusion).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.staffDiscipline` (line ~10217)
- `design_src/edu/staff-discipline.jsx` — `StaffDisciplineScreen`,
  `SDViolationsTab`, `SDConductNotesTab`, `SDStateBadge`, `SDSeverityBadge`,
  `SDRatingBadge`, `SDRejectPanel`, `SDSelfApprovedNote`
- `docs/design-requests/DR-022-staff-conduct-absences.md`
- `docs/decisions/0062-staff-discipline-absences-route-actor-fix.md` (route
  correction — binding)
- This packet's `requirements.md` / `integration.md` / `use-cases.md` /
  `spec.md` (consolidated, engineering-ready)

## Acceptance Criteria

Condensed checklist — full Given/When/Then AC live in `use-cases.md`
(AC-001.x .. AC-010.x) and are consolidated with FR/NFR mapping in
`spec.md` §3/§9.

- UC-001 Load Violations tab: loading skeleton, principal/teacher success
  variants, two empty variants, error+retry, principal-only filter.
- UC-002 Create violation (principal only): form open, static mock-roster
  select (no live search), happy path, severity/description validation,
  pending state, network-error retry.
- UC-003 Submit violation: own-DRAFT happy path, not-own-record no action,
  invalid-transition/not-found/forbidden handling.
- UC-004 Approve violation: non-self happy path, `selfApproved` ALWAYS
  visible when approver=author, invalid-transition/not-found/forbidden,
  `VIOLATION_SAME_ACTOR` generic handling (open question).
- UC-005 Reject violation: 10-char client guard, happy path, server
  non-empty guard (distinct layer), invalid-transition, cancel, network
  error.
- UC-006 Load Conduct Notes tab: loading, principal/teacher success (no term
  selector for teacher), two empty variants, term change re-query, error,
  term-not-found.
- UC-007 Set conduct note: new/overwrite form open, happy path, LOCKED
  client pre-check (form never opens on APPROVED), LOCKED server backstop,
  term/rating validation, pending state, network error, 5000-char cap.
- UC-008 Submit/approve/reject conduct note: mirrors UC-003/004/005;
  post-approval immutability takes effect immediately (no extra wiring).
- UC-009 Role-gate enforcement (non-negotiable): route denial for
  wrong role; teacher/other-role mutation denial server-side (not client-only
  hiding); list-scope enforcement (teacher forced to own `staffMemberId`);
  conduct-note lock also server-enforced.
- UC-010 Tab switcher + responsive: click/keyboard switch, ARIA
  tablist/tab, independent per-tab state, responsive reflow at
  320/375/768/1280px (no distinct card layout specced), motion-safe panel
  expand.

## Design Notes

- Routes: `(app)/principal/staff-discipline` (principal), `(app)/teacher/
  staff-discipline` (teacher) — ADR `0062`.
- Design file: `design_src/edu/staff-discipline.jsx` — `StaffDisciplineScreen`
  + `SDViolationsTab`/`SDConductNotesTab` + shared `SDStateBadge`/
  `SDRejectPanel`/`SDSelfApprovedNote`.
- Commands: `createStaffViolation`, `submitStaffViolation`,
  `approveStaffViolation`, `rejectStaffViolation`, `setStaffConductNote`,
  `submitStaffConductNote`, `approveStaffConductNote`,
  `rejectStaffConductNote`.
- Queries: `listStaffViolations(staffMemberId?)`,
  `listStaffConductNotes(staffMemberId?, termId?)`.
- API (real, ground-truthed on BE; MOCK-FIRST on web per roster-UUID gap):
  - `POST /core/api/v1/conduct/staff-violations`
  - `GET  /core/api/v1/conduct/staff-violations?staffMemberId=`
  - `POST /core/api/v1/conduct/staff-violations/{id}/submit`
  - `POST /core/api/v1/conduct/staff-violations/{id}/approve`
  - `POST /core/api/v1/conduct/staff-violations/{id}/reject`
  - `POST /core/api/v1/conduct/staff-conduct-notes`
  - `GET  /core/api/v1/conduct/staff-conduct-notes?staffMemberId=&termId=`
  - `POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/submit?termId=`
  - `POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/approve?termId=`
  - `POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/reject?termId=`
- Domain rules:
  - `ApprovalTransition`: `DRAFT → SUBMITTED → APPROVED | REJECTED` (shared
    shape both sub-resources).
  - `selfApproved = (approverMemberId === authorMemberId)` — always rendered,
    never hidden (ADR `0073`).
  - Conduct-note natural key `(termId, staffMemberId)`; POST overwrites
    DRAFT/REJECTED in place; `APPROVED` is permanently immutable via this
    endpoint (409 `STAFF_CONDUCT_NOTE_LOCKED`, ADR `0074`).
  - Reject-reason two-layer validation: client ≥10 chars (UX guard) vs
    server non-empty (`VIOLATION_REJECTION_REASON_REQUIRED`, authoritative).
  - Server-side role re-check on every mutating action, independent of
    client route guard (NFR-008); teacher list requests server-scoped to
    own `staffMemberId` (NFR-008); conduct-note lock also server-enforced
    (NFR-009).
- UI surfaces: 2-tab layout (`role=tablist`); create-violation dialog;
  set-conduct-note dialog (pre-fills on overwrite); inline `SDRejectPanel`
  (not modal); `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge`
  (icon+text, never color-only); `SDSelfApprovedNote` annotation; two empty
  states per tab (principal+CTA / teacher no-CTA); `EduSkeleton`
  variant='rows' count=4.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E09.5 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | create/submit/approve/reject-violation use-cases (ok + VIOLATION_* failure branches); set/submit/approve/reject-conduct-note use-cases (ok + STAFF_CONDUCT_NOTE_* failure branches + lock guard); `selfApproved` derivation (approver===author); reject-reason two-layer validation (client 10-char guard as a pure function, server guard as a use-case branch) |
| Integration | Mock repository: full state-machine transitions both sub-resources; simulated non-`principal` `forbidden` rejection (NFR-008, direct repository/Server Action invocation, not UI-hidden-only); simulated `STAFF_CONDUCT_NOTE_LOCKED` (409) on an APPROVED fixture (NFR-009); teacher list-scope enforcement (server-forced own `staffMemberId`) |
| E2E | Storybook: ViolationsTab_Loading/Populated_Principal/Populated_Teacher/Empty_Principal/Empty_Teacher/Error; CreateViolationDialog_Happy/Validation/NetworkError; RejectPanel_ClientGuard/ServerGuard/Happy; ConductNotesTab_Populated_Principal/Populated_Teacher(no term selector)/Empty×2/Error/TermChange; SetConductNoteDialog_New/Overwrite/Locked; TabSwitcher_Keyboard; Responsive_320_375_768_1280 |
| Platform | `bunx tsc --noEmit` clean; `bun run build` succeeds with both new routes present |
| Release | design-review gate (tokens/a11y/states) AND dedicated confirmation that NFR-008/NFR-009 security-grade tests exist and pass (release-blocking, per spec.md §"High-Risk-Grade Security Enforcement") |

## Harness Delta

- `docs/TEST_MATRIX.md`: US-E09.5 row already registered by `ba-lead`
  (`planned`, no/no/no/no) — flip proof columns to `yes` only when real
  tests/evidence land per `.claude/rules/tdd.md`.
- `docs/product/design-spec.jsonc` `screens.staffDiscipline`: no change
  needed (routes already corrected under ADR `0062` in the same edit as the
  decision).
- No new i18n namespace needed — `staffDiscipline` + verbatim
  `discipline.errors.*` reuse already exist in
  `src/bootstrap/i18n/messages/{vi,en}.json` (see `spec.md` §8 [CONFLICT]
  note on the `rejectDialog` sub-namespace's actual-vs-planned shape).
- New feature folder: `src/features/staff-discipline/`.
- New endpoint file: `bootstrap/endpoint/staff-discipline.endpoint.ts` (or a
  reasonable equivalent name chosen by `fe-lead`/`fe-component-architect`).

## Evidence

Add commands, reports, screenshots, or links after validation exists.
