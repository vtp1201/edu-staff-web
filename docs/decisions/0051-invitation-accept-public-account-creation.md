# 0051 Public Invitation-Accept Account Creation (US-E21.2)

Date: 2026-07-12

## Status

Accepted

## Context

DR-015 / US-E21.2 introduces the repo's first **unauthenticated public route
that creates an account and assigns a role + tenant**: `/invitations/accept?token=...`.
This is a genuine Auth + Authorization + External-systems (email) + Public-contract
hard gate per `docs/FEATURE_INTAKE.md` — it must not be treated as an ordinary
"normal" screen just because it reuses the existing signup form shape. The BA
requirements pass (`docs/stories/epics/E21-tenant-invitations/US-E21.2-invite-accept/requirements.md`)
surfaced the specific risks and recommended this decision be recorded before
`/fe` implements it.

## Decision

The invitation-accept flow follows these binding rules:

1. **Server-authoritative token validation.** Token single-use, expiry, and
   validity are enforced entirely server-side (BE `POST /api/v1/invitations/accept`).
   The client never optimistically assumes success and never caches/logs the
   raw token beyond the URL it arrived in.
2. **No client-supplied role or tenant.** The accept request body is
   `{ token, fullName, password }` (new account) or `{ token }` (already
   signed-in "Join"). Role and `tenantId` are ALWAYS resolved server-side from
   the invitation record — the client never sends or can override them. This
   is the primary privilege-escalation guard for this flow.
3. **Email is immutable and server-resolved.** The accept form's email field
   is read-only, populated from the server-resolved invitation, never a
   free-text client value.
4. **Session issuance reuses the existing hybrid token convention** (decision
   `0018`) — no new token/session mechanism is introduced. Successful accept
   sets the same httpOnly-cookie pair (`auth_token`, refresh, `auth_token_exp`,
   `sessionId`) as email/SSO signin.
5. **Password policy: minimum 6 characters** (per the DR-015 mockup). No
   stronger password policy exists elsewhere in `src/features/auth` today, so
   this is the baseline going forward, not a weakening of an existing rule.
6. **Already-signed-in branch does not silently merge accounts.** If the
   caller is authenticated as a different account than the invited email, the
   UI must show an explicit "switch account" affordance rather than silently
   joining the tenant under the wrong identity. Exact BE behavior on email
   mismatch is an open question the integration analyst must resolve against
   the `iam` `openapi.yaml` before `/fe` implements it — do not guess.
3 error states (expired / used / invalid token) never leak raw server error
text — each maps to one of three fixed, translated messages.

## Alternatives Considered

1. Let the client pass an intended role/tenant and have BE just validate it
   matches the invitation — rejected: unnecessary attack surface (a client
   bug or tampered request could probe/guess invitation shape); server-only
   resolution is strictly simpler to reason about and audit.
2. Treat this as a "normal" lane story since it reuses the existing signup
   form visually — rejected: the FEATURE_INTAKE hard-gate checklist (Auth,
   Authorization, External systems, Public contracts) applies regardless of
   visual reuse; lane stays high-risk.

## Consequences

Positive:

- Clear, auditable contract for `/fe` and for `fe-tech-lead-reviewer`'s
  security diff on this story: reject any accept-payload shape that includes
  `role`/`tenantId` from the client.
- Reuses decision `0018`'s token hybrid — no new auth mechanism to maintain.

Tradeoffs:

- Email-mismatch-on-already-signed-in behavior remains an explicit open
  question pending BE contract confirmation (tracked in the story packet, not
  resolved here) — `/fe` must not ship a guessed behavior for that branch.

## Follow-Up

- `ba-integration-analyst` confirms the exact `iam` `/api/v1/invitations/accept`
  request/response shape (including the email-mismatch branch) against
  `openapi.yaml` before `/fe` implements.
- `fe-tech-lead-reviewer` checks the accept Server Action payload against
  rule 2 above as a mandatory security-diff item for US-E21.2.
