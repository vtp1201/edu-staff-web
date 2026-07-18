---
name: project-e21-tenant-invitations
description: E21 Tenant Invitations epic — US-E21.1 admin invitations + US-E21.2 invite-accept implemented; ADR 0059 ground-truth correction on the accept flow
metadata:
  type: project
---

US-E21.1 Admin Tenant Invitation Management implemented and merged to main
(`74f7ef6`, 2026-07-18). `(app)/admin/invitations` — tenant-scoped invitation
table, status tabs/search, send-batch dialog (email chips), copy-link/resend/
revoke row actions, mobile card-list.

**Why:** DR-015 part 1 (US-E21.2 public accept flow is the sibling, out of
scope). Story packet pre-existed from `/ba` but its BE-contract assumptions
were stale/speculative (packet said "no openapi.yaml accessible" — but ground-
truthing the actual edu-api Go source found much more than the packet assumed).

**Ground-truth findings (see `integration.md` §6 in the packet, and cross-repo
asks #29/#30 in `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`):**
- Real IAM only has 3 invitation routes: POST invite (single email, roles[]
  uppercase 6-value enum `ADMIN MANAGER TEACHER STAFF STUDENT PARENT`),
  DELETE revoke, POST accept. **No GET list, no resend — genuinely absent
  (repo port has no `List` method either), not a wiring gap.** Permanently
  mock-first, mirroring `staff-leave.di.ts`/`discipline.di.ts` precedent.
- `InvitationResponse` (real wire) is `{invitationId, email, roles[],
  expiresAt}` only — no status/invitedBy/createdAt/token. The whole table
  beyond a freshly-sent row is necessarily mock-composed.
- Role vocab is a clean 1:1 uppercase mapping (`manager`→`"MANAGER"`,
  `admin`→`"ADMIN"`) — NO alias/collapse needed. This corrected the BA
  packet's wrong assumption that "manager is a display alias for principal"
  (that's a DIFFERENT, unrelated mapping in `role-meta.ts`/decision 0036 for
  login-time appRole routing — this screen's `InvitationRole` type is
  intentionally its own thing, do not reuse `UserRole`/`appRoleOf`).
- Send-batch (1..N emails) = client-side fan-out of N single-email POSTs
  (same pattern as US-E13.2 attendance-history fan-out, US-E18.5 roster
  enroll) — no batch endpoint exists.
- Expiry select (7/14/30d) has zero wire effect (no `expiryDays` field on
  `InviteRequest`) — kept in UI per AC/design-spec, comment at the mock
  boundary.

**How to apply:** when a `/ba` packet says "no openapi.yaml accessible, BE
contract inferred/best-effort" for a service that DOES exist in edu-api
(iam/core/lms/noti/social all do), always re-ground-truth against the Go
source directly (routes.go + handler + dto + port interface) BEFORE
delegating to planner/engineer — packet assumptions can be wrong in ways that
change the canonical-home decision, the DI force-mock scoping, and even
whether an AC (like 422 field validation, DEF-2 this story) is reachable at
all. See also [[feedback-concurrent-agent-file-collision]].

## US-E21.2 Public Invitation Accept (merged `c6ff397`, 2026-07-18)

**ADR 0059 (amends 0051) — the BA spec's entire premise was unbuildable.**
The sibling packet's ADR `0051` assumed an unauthenticated guest submits
`{token, fullName, password}` to create an account inline. Ground-truthing
the real IAM Go source (`routes.go`, `invitation_handler.go`,
`accept_invitation.go`, `invitation.go` entity/valueobject, `ERROR_CODES.md`)
**before** briefing the planner found: `POST /api/v1/invitations/accept`
requires `RequireAuth` (Bearer), body is `{token}` only (no
`fullName`/`password` field exists anywhere in the DTO/use-case), response is
`MemberResponse{tenantId, userId, roles, status}` (not a session/token
shape), and no preview/resolve GET endpoint exists at all (consistent with
E21.1's "only 3 invitation routes" finding — invite/revoke/accept, period).
Corrected scope: auth-gate for guests (plain `/login` link, deliberately NO
`returnTo` param — the visitor just re-opens the same emailed link after
signing in, avoiding a shared-file touch to `login/actions.ts`) + a
signed-in "Join" action only, session refresh via the EXISTING
`switchTenant` mint (reused verbatim from `select-tenant/actions.ts`, not a
new session-issuance path), 2 terminal error codes (`invitation-invalid`
covers not-found/used/revoked as ONE code, `invitation-expired` separate)
plus a CONFIRMED `invitation-email-mismatch` (403, F8 hard reject — resolves
ADR 0051's own open "email-mismatch" question). **This roughly halved the
BA spec's use cases (dropped UC-102 guest-signup, UC-101 preview, UC-104
account-conflict) — do the Go-source ground-truth pass BEFORE writing the
engineer brief, not after; an ADR amendment this size is far cheaper to
absorb pre-implementation.**

**Canonical DI home missed by planner+engineer**: `bootstrap/di/iam-member.di.ts`
already existed with a `USE_MOCK`-gated `makeRepo()` facade
(`makeInviteMemberAction()`) exposing `acceptInvitation`/`switchTenant` for
exactly this repository — but the plan (and engineer) built a NEW,
mock-unaware `makeAcceptInvitationUseCase` factory in `auth.di.ts` instead.
QA caught the `USE_MOCK` bypass as a "minor nit"; fixed by adding the
`USE_MOCK` branch matching every other `IIamMemberRepository` consumer (a
fuller fix would route through `iam-member.di.ts` directly, but the
minimal fix was sufficient here). **Lesson: when briefing a planner for a
new DI factory touching an EXISTING repository interface, explicitly tell
it to grep `bootstrap/di/*.ts` for existing facades over that repository
first** — checking only domain/infrastructure for reuse isn't enough.

**Spawned-agent relay failure (real incident)**: `fe-accessibility-auditor`'s
structured A11Y-001..006 findings did not relay through the background-agent
notification channel with sufficient detail (summary was thin; a follow-up
`SendMessage` resume also didn't recover it). Re-derived the findings
directly by reading the flagged files against `.claude/rules/accessibility.md`
and fixed them in place (self-audit fallback) rather than idling. Findings
of note: (1) `.dark{}` in `globals.css` had overridden `--edu-error-text`
but NOT `--edu-error-light`/`--edu-warning-light` — a **dark-mode token
override COMPLETENESS** bug (not just a light-mode token-choice issue like
prior `text-muted-foreground` findings), ~2.2:1 in dark mode, fixed to
≥9.5:1 via WCAG relative-luminance calculation (python one-liner, no
external tool needed); (2) decorative gradient text needing a `bg-black/45`
scrim for contrast (2nd occurrence of this pattern after E10.6); (3) inline
text-buttons <44px touch target; (4) missing `<main>` landmark on a new
public route; (5) terminal error states being dead-ends with no way back to
sign-in. **When a spawned auditor/reviewer's findings don't relay with
enough specificity to act on, don't wait/re-spawn — re-derive directly from
the flagged files + rule file and fix, recording it in the story packet.**
