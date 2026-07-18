---
name: project-e21-tenant-invitations
description: E21 Tenant Invitations epic — US-E21.1 admin invitations implemented; ground-truth found BE list/resend endpoints don't exist at all
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
