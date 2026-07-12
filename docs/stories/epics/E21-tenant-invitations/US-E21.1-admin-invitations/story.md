# US-E21.1 Admin Tenant Invitation Management

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none (US-E06.4 already wired `IIamMemberRepository.inviteMember`/`revokeInvitation`/`acceptInvitation` — this story extends that repo, does not replace it)
- Blocks: none technically; US-E21.2 (public accept) is only *meaningfully* end-to-end demoable once this story ships the invite-generation surface that produces real tokens (soft sequencing, not a hard dependency)
- Feature module(s) chạm: `src/features/auth/` (existing `IIamMemberRepository` extension — list/batch-send/resend) or a new `src/features/admin/invitations/` slice — `fe-component-architect`/`fe-lead` to decide canonical home, not decided here
- Shared contract/file: `bootstrap/endpoint/iam-member.endpoint.ts` (`IAM_MEMBER_EP.invitations`/`.invitation`), `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts` (`InvitationResponseDto` — needs extension), `src/features/auth/domain/failures/iam-member.failure.ts`

## Product Contract

Admin (real system role `admin`, decision `0022`/`0024`) manages tenant-scoped
invitations at `(app)/admin/invitations`. Sends 1..N email invitations per
submit (chip input), each batch tied to exactly one role — from
`teacher|student|parent|manager|admin` (UI labels; `manager` is a display
alias for `principal`, `admin` is the real 5th system role — see spec.md §3
for the full mapping) — and one expiry (7/14/30 days, default 14). Views a
filterable/searchable table (status: pending/accepted/expired/revoked) and can
copy-link (pending), resend (expired), or revoke (pending, destructive
confirm) any row. Full engineering detail, traceability, and open questions
are in `spec.md` (this packet).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.invitations` (line ~4162)
- `docs/product/screens.md` — row "Tenant Invitations" (`(app)/admin/invitations`)
- `design_src/edu/invitations.jsx` — `InvitationsScreen`
- `docs/design-requests/DR-015-tenant-invitations.md`
- `docs/product/roles-permissions.md` — admin route-gate row (decision `0022`/`0024`)
- Sibling packet: `docs/stories/epics/E21-tenant-invitations/US-E21.2-invite-accept/` (public accept flow, out of this story's scope)

## Acceptance Criteria

Condensed — full Given/When/Then in `use-cases.md` (this packet), §4
(AC-001.x .. AC-007.x, 7 use cases). Summary by use case:

- UC-001 View invitation table: loading skeleton (5 rows), success table render, zero-invitations empty state + CTA, fetch-error state + retry, tenant-scoping invariant.
- UC-002 Filter and search: status-tab filter with count badges, email-substring search, combinable, distinct no-match empty state + clear-filters CTA.
- UC-003 Send invitation batch: chip input (valid/invalid/paste-multiple/keyboard-remove), role+expiry required, submit label reflects count, success toast + row(s) prepended, per-email server duplicate error, 422 validation, network error.
- UC-004 Copy invite link: pending-only, clipboard success/denied toast, action gated off non-pending rows.
- UC-005 Resend invitation: expired-only, row-level loading, in-place row update to pending on success, race/network error toasts.
- UC-006 Revoke invitation: pending-only, destructive confirm dialog, cancel path, loading, success (row dimmed 0.65 opacity, actions removed), not-found race, network error.
- UC-007 Expiry countdown: ≥3 days default text; <3 days bold + `alertTriangle` icon in `--edu-warning-text` (never color-only); expired = muted + `calendarX`; accepted/revoked = em-dash.

## Design Notes

- Route: `(app)/admin/invitations` — role-gated `admin` (decision `0022`/`0024`)
- Design file: `design_src/edu/invitations.jsx` — `InvitationsScreen`
- Commands (indicative, not binding on FE implementation naming): send-invite-batch, resend-invitation, revoke-invitation
- Queries: list-invitations (tenant-scoped, filter/search)
- API (`iam` service — see spec.md §6 for full contract + open questions):
  - `GET /iam/api/v1/tenants/{tenantId}/invitations` — list (repo method gap, needs adding)
  - `POST /iam/api/v1/tenants/{tenantId}/invitations` — send (existing single-email method under-shaped for FR-004's batch; `[OPEN QUESTION]` batch request shape)
  - `DELETE /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}` — revoke (existing)
  - `POST /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend` — resend (best-effort/unconfirmed, `[OPEN QUESTION]`)
- Domain rules: tenantId always server-derived, never client-supplied (NFR-006); role+expiry apply to the whole batch, not per-email; countdown urgency never color-only (decision `0046`).
- UI surfaces: invitation table (+ mobile card-list <820px), status tabs + search toolbar, send-invite dialog (email chips, role radiogroup, expiry select), revoke confirm dialog, copy-link/resend/revoke row actions, loading/empty/error states (`EduSkeleton`/`EduError` per design-spec).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E21.1 --unit 0 --integration 0 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases: list-invitations (filter/search combination), send-invitation-batch (valid/duplicate/validation), resend-invitation (ok/invalid-state race), revoke-invitation (ok/not-found race) |
| Integration | `IIamMemberRepository` extension — list/batch-send/resend against mock + real HTTP boundary once BE contract confirmed |
| E2E | Storybook interaction: Loading / EmptyNoInvitations / EmptyNoMatch / Error+Retry / SendDialog (chip states) / CopyLink / Resend / RevokeConfirm / RevokedRow / CountdownVariants |
| Platform | `bun build` + `tsc --noEmit` clean |
| Release | design-review gate pass (`docs/DESIGN_REVIEW.md`) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E21.1 (planned, normal lane)
- `docs/product/screens.md`: already has a design-ready row for this screen (see Relevant Product Docs) — update status to spec-ready once this spec lands
- No ADR required for this story — OQ-1 (role vocabulary) already resolved by `ba-lead` without a new decision record (existing decision `0022` covers it, see `spec.md` §8)
- Open contract questions (batch-send shape, resend endpoint shape, missing DTO fields `invitedBy`/`createdAt`/`token`, server- vs client-side filter/search) are carried to `fe-lead`/BE team in `spec.md` §8 — not blocking spec completion, but block `/fe` implementation of the affected FRs until resolved
