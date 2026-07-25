---
name: project-dr022-e09.5-e09.6-specs
description: DR-022 (staff-discipline + student-absences) BA spec packets, ADR 0062 route fix, and the "BE-role-name != app-role" trap
metadata:
  type: project
---

DR-022 (2026-07-25) delivered two net-new screens (`staff-discipline.jsx`,
`student-absences.jsx`) with real, already-shipped `edu-api` core `conduct`
sub-domain BE contracts (ground-truthed by US-E18.14). Turned into two BA
packets extending **E09-discipline-conduct** (not a new epic — same actor
model, same conduct domain as the existing E09.1/E09.3): **US-E09.5** (Staff
Discipline: staff-violations + staff-conduct-notes, ApprovalTransition +
`selfApproved` fallback ADR 0073) and **US-E09.6** (Student Absences:
record/edit/one-way-flag, NOT an approval workflow). Both lane=normal. Full
5-doc packets (`requirements.md`/`integration.md`/`use-cases.md`/`spec.md`/
`story.md`) at `docs/stories/epics/E09-discipline-conduct/US-E09.{5,6}-*/`.

**Critical catch — ADR 0062 (registered same session):** DR-022's own route
placement (`/admin/staff-discipline`, `/admin/absences` alias) was WRONG. The
DR conflated `edu-api`'s conduct-domain `ADMIN`/`MANAGER` authorization-role
NAMES (BGH-capacity actors inside that BE sub-domain) with this app's
distinct, narrower `admin` route-guard role (decision 0022, school-setup/
roster/parent-links/invitations only). Both mockups' actual role checks
(`staff-discipline.jsx:280`, `student-absences.jsx:147-148`) use
`role === 'principal'`, never `'admin'`. `(app)/admin/layout.tsx`'s
`evaluateAdminAccess` strictly redirects `role==='principal'` away — so the
DR's own routes would have made the feature unreachable by its intended
actor. Fixed by re-routing to `(app)/principal/staff-discipline` +
`(app)/teacher/staff-discipline` (self-view) and keeping the already-correct
`(app)/teacher/absences` + `(app)/principal/absences` (dropped the `/admin/
absences` alias). Corrected `screens.md` + `design-spec.jsonc` route arrays
in the same session (factual fix, not a redesign — no ADR needed for
uiux-lead to re-touch the jsx).

**Why this matters going forward:** whenever a DR's BE-contract section
quotes BE authorization role names verbatim (`ADMIN`, `MANAGER`, `STAFF`,
etc.) — ALWAYS grep the actual `design_src/edu/<slug>.jsx` for its real
`role === '...'` checks before trusting the DR's stated route/actor mapping.
The DR's prose can drift from what the mockup's author actually coded,
especially when BE role vocabulary overlaps this app's own distinct 5-role
names (`admin` is the worst collision — BE conduct domain's "ADMIN" ≠ this
app's `admin` role, see [[actor-role-patterns]] cross-ref in
ba-requirements-analyst memory).

**Mock-first classification nuance:** both stories are mock-first for a
DIFFERENT reason than most `core` stories in this repo — the BE contract is
REAL and SHIPPED (not "core doesn't exist yet"), the web is blocked purely by
the roster-UUID gap (no staffName/studentName field on any response, asks
#9/#15/#22). Same precedent class as `staff-leave`/`discipline`. State this
distinction explicitly in integration.md so `/fe` knows this becomes wireable
when the roster gap closes, not on some future `core` ship date.

No new i18n/token ADR needed — DR-022 pre-staged `staffDiscipline`/
`studentAbsences` i18n namespaces and reused existing severity/rating/status
badge tokens verbatim (zero new tokens).
