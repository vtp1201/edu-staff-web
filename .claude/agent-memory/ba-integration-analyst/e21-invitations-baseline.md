---
name: e21-invitations-baseline
description: US-E21.1/E21.2 tenant invitations integration map — existing IAM_MEMBER_EP wiring, resend/batch/preview gaps, ADR 0051 accept contract
metadata:
  type: project
---

E21 tenant-invitations epic (2026-07-12) integration maps written to:
- `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/integration.md`
- `docs/stories/epics/E21-tenant-invitations/US-E21.2-invite-accept/integration.md`

Key baseline facts (all `iam` service, no openapi.yaml accessible from this repo — everything cross-checked against already-wired code, not the authoritative spec):

- `IAM_MEMBER_EP` (`src/bootstrap/endpoint/iam-member.endpoint.ts`, US-E06.4)
  ALREADY has `invitations(tenantId)`, `invitation(tenantId, invId)`,
  `acceptInvitation` endpoint constants. `IIamMemberRepository` already has
  `inviteMember` (single-email), `revokeInvitation`, `acceptInvitation(token)`
  (signed-in-join shape only, returns `Promise<void>`, no tokens).
- `iam-member.failure.ts` collapses `INVITATION_NOT_FOUND`/`INVITATION_EXPIRED`
  into ONE type `invitation-not-found` — too coarse for E21.2's 3-distinct-state
  requirement (expired/used/invalid); needs extension.
- E21.1 gaps found: no list-GET repo method; `inviteMember` is single-email but
  FR needs N-email batch send (shape unconfirmed — loop vs array payload); no
  BE-documented resend endpoint (DR-015 only has create+revoke) — resolved as
  best-effort `POST .../invitations/{id}/resend` action-suffix (mirrors
  `activateTenant`/`deactivateTenant` convention already in this same endpoint
  file), same-row in-place update, NOT confirmed.
- E21.2 (ADR 0051 binding): accept request is `{token,fullName,password}` (new
  account) or `{token}` (signed-in join) — NEVER role/tenantId, ever. Resolved
  OQ-3: recommend TWO calls — GET preview/resolve (new, unbuilt, path proposed
  as `GET /iam/api/v1/invitations/preview?token=`) + POST accept (extends
  existing). Accept response (guest) should mirror `TokenResponseDto` exactly
  like signin, then chain `GET /users/me` for role (same signin→me pattern
  documented in api-integration.md) — recommended for BOTH guest and signed-in
  branches for one consistent redirect-role-resolution code path.
- Open questions flagged to ba-lead: preview endpoint contract, 3 distinct
  failure codes (INVITATION_EXPIRED/USED/INVALID), email-mismatch behavior
  (still unresolved per ADR 0051's own follow-up), USER_EMAIL_ALREADY_EXISTS
  handling on guest accept, batch-send request shape for E21.1.

See also [[social-service-status]], [[error-mapping-conventions]] for general
conventions this builds on.
