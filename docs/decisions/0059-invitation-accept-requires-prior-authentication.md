# 0059 Invitation-accept requires prior authentication (amends ADR 0051)

Date: 2026-07-18

## Status

Accepted

## Context

US-E21.2 (epic `E21-tenant-invitations`) implements the public
`/invitations/accept?token=...` screen. ADR `0051` (binding, 2026-07-12) was
written from the BA spec's premise: an unauthenticated **guest** can submit
`{token, fullName, password}` to this endpoint and have the BE create a brand
new account, join the invited tenant, and issue a fresh session — mirroring
signin's decision-`0018` cookie flow.

Ground-truthing `edu-api` Go source directly before `/fe` implementation
(`services/iam/internal/membership/adapter/http/{routes.go,invitation_handler.go,dto/invitation_dto.go}`
+ `core/application/usecase/accept_invitation.go` +
`core/domain/entity/invitation.go` + `core/domain/valueobject/invitation.go` +
`docs/ERROR_CODES.md`) shows this premise does not hold, on **either** side of
the stack:

1. **The route requires auth.** `routes.go`:
   `app.Post("/api/v1/invitations/accept", d.RequireAuth, d.Invitations.Accept)`
   — `RequireAuth` Bearer-JWT middleware gates it, same as every tenant-admin
   route. It is not a public/unauthenticated endpoint.
2. **The request body is `{token}` only.** `dto.AcceptRequest` has exactly one
   field (`Token`). There is no `fullName`/`password`/any account-creation
   field anywhere in the DTO, use-case input (`AcceptInvitationInput{ Token,
   ActorUserID, ActorEmail }`), or handler. `ActorUserID`/`ActorEmail` come
   from the verified JWT claims (`pkghttpmw.ClaimsFrom(c)`), never the body.
3. **The use case never creates a user.** `accept_invitation.go` only creates
   a `Member` (tenant-membership row) for the ALREADY-authenticated caller; it
   never touches the `user`/auth bounded context. There is no account-creation
   capability reachable from this endpoint, full stop.
4. **F8 — server-side email match, hard reject.** `inv.Email().Equals(in.ActorEmail)`
   compares the invited email to the AUTHENTICATED caller's own verified
   email; mismatch → `invitation_email_mismatch` (403), confirmed in
   `docs/ERROR_CODES.md` line 118. This is exactly ADR `0051` rule 6's
   "no silent merge" concern, now CONFIRMED (not `[OPEN QUESTION]`) as a hard
   reject, no conditional-allow branch exists.
5. **Only 2 terminal error codes exist, not 3.** `invitation_invalid` (410)
   covers unknown/already-used/revoked in ONE code (`ERROR_CODES.md` line
   116: "unknown, already used, or revoked"); `invitation_expired` (410) is
   separate. There is no distinct "used" code — ADR `0051`'s "3 error states
   (expired/used/invalid)" and this story's UC-105 (3 illustrations) do not
   match the wire; "used" and "invalid" are the SAME code and must render the
   SAME state.
6. **No `USER_EMAIL_ALREADY_EXISTS`/account-conflict state is reachable.**
   Since accept never creates an account, the 4th state (UC-104,
   `ba-lead`'s 2026-07-12 UX resolution) cannot occur through this endpoint —
   it was modeling a code path that doesn't exist server-side.
7. **No preview/resolve endpoint exists.** Consistent with US-E21.1's
   ground-truth finding (`integration.md` §6: only 3 invitation routes total —
   invite, revoke, accept) — there is no `GET .../invitations/preview` or
   equivalent. The invite token itself is fully opaque (`crypto/rand`
   256-bit, SHA-256-hashed for lookup — `invitation_token_codec.go`), so no
   client-side decode is possible either. UC-101's pre-action summary card
   (school/inviter/role/expiry, shown before any submit) is **not buildable**
   against any real data source — showing fabricated placeholder data to a
   real invitee on a production public page is unacceptable, unlike US-E21.1's
   admin-only mocked list (internal audience, not public-facing fiction).
8. **No self-serve account registration screen exists in this app today.**
   `src/app/[locale]/(auth)/` only has `forgot-password`, `login`,
   `select-role`, `select-tenant` — no `register` route, and `login/actions.ts`
   has no `returnTo`/`redirect` param to bounce a visitor back to an arbitrary
   URL post-auth. Building a public self-serve registration flow is a
   materially larger, separate feature (its own hard-gate: Auth +
   Authorization + first-time account provisioning) — explicitly out of this
   story's scope, not something to backfill silently to preserve ADR `0051`'s
   original "guest" framing.

## Decision

ADR `0051` is **amended** (not superseded — its underlying security
principles hold, just re-grounded in what the real BE actually does):

1. **This screen is authenticated-action-only.** There is no guest/inline
   account-creation branch. An unauthenticated visitor who follows the invite
   link sees an **auth-gate** state: a message explaining they must sign in
   with the invited account (or contact their school admin if they don't have
   one yet — this app has no self-serve registration), plus a plain link to
   `/login`. No `returnTo` wiring is added to the shared `login/actions.ts`
   (would touch a file every authenticated screen depends on, for a benefit
   this story does not need — the visitor re-opens the SAME emailed link,
   which still carries `?token=`, after signing in).
2. **Signed-in branch is the entire actionable surface.** Current session's
   email is shown (from the existing session, not a fabricated preview);
   single "Tham gia" (Join) action submits `{token}` — unchanged from ADR
   `0051` rule 2's "no client role/tenant" invariant, now simply the ONLY
   code path (no guest variant exists to also guard).
3. **No pre-action invitation summary card.** UC-101's preview
   (school/inviter/role/expiry before the user acts) is dropped — no real
   data source exists and mocking it for a public page is a fabrication risk.
   Post-success, the confirmed `MemberResponse{ tenantId, userId, roles,
   status }` drives the success screen's content (real data, server-truth,
   shown only AFTER the action, never before).
4. **Session refresh reuses `switchTenant`, not `signin()`.** Since the
   caller already has a session (this is no longer a from-scratch login),
   successful accept mints a tenant-scoped token for the NEWLY-joined
   `tenantId` (the value the server just returned, never client-supplied) via
   the EXISTING `IIamMemberRepository.switchTenant(tenantId, clientId)` +
   `setAuthCookies()` path already used by `select-tenant/actions.ts` —
   still the decision-`0018` httpOnly-cookie hybrid, just the tenant-refresh
   variant of it rather than login's from-scratch variant. No new
   session-issuance code is written.
5. **Two terminal error states, not three; one mismatch state.**
   `invitation-invalid` (covers not-found/used/revoked — ONE state, matching
   the wire's single code) and `invitation-expired` (separate state) replace
   UC-105's 3-illustration model. `invitation-email-mismatch` (403, ADR
   `0051` rule 6, now CONFIRMED not `[OPEN QUESTION]`) renders an explicit
   error + a switch-account (sign-out) affordance — unchanged intent from
   ADR `0051`, now backed by a real code.
6. **UC-104 (account-conflict / `USER_EMAIL_ALREADY_EXISTS`) is dropped.**
   Unreachable through this endpoint (finding 6 above); not implemented.
7. **ADR `0051` rules 3 (email locked in a form) and 5 (min-6-char password)
   are dropped** — there is no form to lock a field in or a password to
   validate; no account-creation surface exists on this screen. Rules 1
   (server-authoritative validation, no client caching), 2 (no client
   role/tenant — the primary privilege-escalation guard), 4 (as amended in
   point 4 above), and 6 (no silent merge) all still hold and are the
   entirety of this story's security surface now.

## Alternatives Considered

1. **Build the self-serve registration screen too, to preserve the original
   "guest" UX** — rejected: a materially larger, separately hard-gated
   feature (Auth + Authorization + first-time provisioning), not something to
   backfill into this story to rescue an incorrect premise; flagged as a
   follow-up ask instead.
2. **Add a `returnTo` param to the shared login flow so a guest can be
   bounced back here after signing in** — rejected for THIS story: touches
   `login/actions.ts`, a shared file every authenticated screen depends on,
   for marginal benefit (the invite email link already re-lands the visitor
   here with the token intact after they sign in manually). Worth
   reconsidering if a future story needs generic post-login redirect, but not
   justified by this one.
3. **Mock the preview summary card with placeholder/fixture data, matching
   US-E21.1's list precedent** — rejected: US-E21.1's list is admin-only
   (internal audience who already knows the real invitations exist); this
   screen is public-facing to the actual invitee, where fabricated
   school/inviter data would be materially misleading, not a benign UI
   placeholder.

## Consequences

Positive:

- Matches the ACTUAL BE contract — no guessed behavior on a security-critical
  path, honoring ADR `0051`'s own "do not guess" instruction for exactly the
  branches (email-mismatch, error codes) it had flagged as open questions.
- Materially smaller, simpler, lower-risk implementation: no new
  account-creation code path, no new session-issuance mechanism (reuses
  `switchTenant` verbatim), no password-policy surface to secure.
- Still fully honors ADR `0051`'s core privilege-escalation guard (rule 2)
  and no-silent-merge guard (rule 6) — the amendment narrows scope, it does
  not weaken the security invariants.

Tradeoffs:

- UX is less polished than the original vision: an unauthenticated visitor
  gets a plain auth-gate message instead of an inline account-creation form
  with a preview summary. Acceptable given neither capability exists
  server-side today.
- A visitor with no account at all has no self-serve path forward from this
  screen (must contact their school admin) — flagged as a follow-up ask, not
  solved here.

## Follow-Up

- Cross-repo ask (edu-api): if self-serve public registration tied to an
  invitation token is ever wanted, it needs new BE surface (account creation
  + invitation consumption in one transaction) — track as a future ask,
  filed in `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` §Cross-repo
  requests (ask #31).
- If a future story needs generic "return to this URL after login," design
  a `returnTo` mechanism for `login/actions.ts` deliberately, not as a
  side-effect of this one.
