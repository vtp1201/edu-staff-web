# Integration Map — US-E21.1 Admin Tenant Invitation Management

Source of truth checked: `.claude/rules/api-integration.md` (service map,
envelope, camelCase, error mapping). No `edu-api/services/iam/docs/openapi.yaml`
accessible from this repo (sibling repo) — endpoint shapes below are inferred
from the ALREADY-WIRED code in `src/features/auth/{domain,infrastructure}` +
`src/bootstrap/endpoint/iam-member.endpoint.ts` (built US-E06.4), which already
declares `invitations`, `invitation`, `acceptInvitation` routes. Where this
story needs something not yet wired (list-GET, resend), it is called out as a
**gap** (repo/DI change needed, out of this analyst's scope to implement).

## 1. Integration Overview

- **Endpoints consumed**: 4 (list, create/batch-send, revoke, resend).
- **Service**: `iam` only (member/invitation bounded context) — no `core`/`lms`/`social` involved.
- **Status**: 3 of 4 are REAL-shaped (list/create/revoke already have endpoint
  constants + revoke/create already have a repository method from US-E06.4);
  **resend has no BE contract in DR-015 or the existing endpoint file** — its
  shape is this analyst's best-effort resolution of OQ-2 (see §2, INT-004),
  **not confirmed against iam's actual `openapi.yaml`**.
- **Risk notes**:
  - The existing `inviteMember(tenantId, req)` repo method sends ONE email at a
    time (`InviteMemberRequest = { email, roles }` — singular `email`). FR-004
    requires a **batch** send (1..N emails per submit). This is a **contract
    gap**: either the BE endpoint already accepts an array and the existing
    DTO/method under-models it (likely, US-E06.4 only needed single-invite),
    or the FE must loop N `POST` calls client-side. Flagged as
    `[OPEN QUESTION]` below — resolve before `/fe` implements the send-dialog.
  - No `listInvitations` method exists yet on `IIamMemberRepository` — FR-001's
    table needs a new **GET** repository method (`IAM_MEMBER_EP.invitations(tenantId)`
    already resolves to the right URL for both GET and POST, REST-conventional).
  - Role enum for the request body: use the **5 system roles** per Ba-Lead's
    OQ-1 resolution — `teacher | student | parent | principal | admin` (the
    invite dialog's `manager` UI option maps to `principal` in the wire
    payload; see INT-002 request contract).

## 2. Endpoint Catalogue

### INT-001 List tenant invitations

```
Service: iam                          Method+Path: GET /iam/api/v1/tenants/{tenantId}/invitations
Status: REAL (endpoint constant exists: IAM_MEMBER_EP.invitations(tenantId), US-E06.4)
        — repository method NOT yet implemented (gap: add `listInvitations` to
        IIamMemberRepository + IamMemberRepository)
Protected: yes   Role required: admin (route-gated per decision 0022/0024)

Request (outbound, camelCase):
  tenantId — path param, from admin's current tenant session context (never client-typed) | Internal
  (optional query, pagination) cursor — opaque cursor for next page | Internal
  (optional query) status — filter hint if BE supports server-side filtering; if not, FE filters client-side over the fetched page (design-spec shows tabs — confirm with iam openapi whether status filter is server- or client-side) | Internal

Response payload (inbound, after envelope unwrap): array of Invitation
  invitationId — unique id, used for row key + revoke/resend target | Internal
  tenantId — owning tenant (should always equal the requesting admin's tenant; FE never trusts a mismatched value) | Internal
  email — invitee email | PII
  roles — string[] (system role vocabulary: teacher|student|parent|principal|admin) — table renders first/only entry as the role badge | Internal
  status — pending | accepted | expired | revoked | Internal
  invitedBy — name/id of the sending admin (reused as "Invited by" column; NOT on current InvitationResponseDto — gap, see below) | Internal
  createdAt / sentAt — sent date for the "Sent date" column (NOT on current DTO — gap) | Internal
  expiresAt — ISO timestamp, drives FR-005 countdown (already on InvitationResponseDto) | Internal

  [GAP] Current `InvitationResponseDto` (src/features/auth/infrastructure/dtos/iam-member-response.dto.ts)
  only has { invitationId, tenantId, email, roles, status, expiresAt } — no
  `invitedBy` / `createdAt`. FR-001 needs both for the "Invited by" and
  "Sent date" columns. `[OPEN QUESTION]` whether iam's actual response
  already includes these fields (likely, since admins need audit trail) and
  the DTO here is simply under-modeled from US-E06.4's narrower need.

Pagination: cursor (meta.pagination.nextCursor/hasMore) per envelope standard — list endpoint
Errors → UI behavior:
  - network/5xx (statusOf undefined or 5xx) → generic error state, FR-011 retry button | retryable
  - 403 FORBIDDEN_ACTION → should not normally occur (route already role-gated) but if surfaced: error state, no retry (permission won't change on retry) | not retryable
Empty / loading expectation: FR-010 skeleton (5 row placeholders) on first load;
  FR-012 "no invitations" empty state with "Gửi lời mời" CTA when zero AND no
  active filter/search; FR-009's "no matches" empty state when filter/search
  yields zero from a non-empty base set (client-side distinction: track raw
  count vs filtered count).
```

### INT-002 Send invitation batch

```
Service: iam                          Method+Path: POST /iam/api/v1/tenants/{tenantId}/invitations
Status: REAL endpoint constant; repository method exists (`inviteMember`) but
        is SINGLE-email shaped — batch shape is `[OPEN QUESTION]` (see below)
Protected: yes   Role required: admin

Request (outbound, camelCase) — CURRENT single-invite shape (US-E06.4):
  email — invitee email | PII
  roles — string[] (system role, e.g. ["teacher"]) | Internal

Request — PROPOSED batch shape needed for FR-002/003/004 (not yet on BE contract we can see):
  emails — string[], 1..N invitee addresses from the chip input | PII
  role — single system-role string applied to the whole batch (teacher|student|parent|principal|admin;
         UI's "manager" option is sent as "principal" per Ba-Lead's OQ-1 resolution) | Internal
  expiryDays — 7 | 14 | 30 (default 14) | Internal

  [OPEN QUESTION] Does iam's real POST /tenants/{id}/invitations endpoint
  accept `{ emails: string[], role, expiryDays }` in one call (server fans out
  N invitation records + N emails), or does the FE need to issue N sequential
  `{ email, roles: [role] }` calls (current DTO shape) and reconcile partial
  failure (e.g. 3 succeed, 1 duplicate-fails) into the per-email inline error
  UX described in FR-004? This determines: (a) whether "partial success"
  toast/row-append logic is needed, (b) whether the existing single-email
  `InviteMemberRequest`/`inviteMember()` can be reused as-is (looped) or a new
  `inviteMembersBatch()` method + DTO is needed. Flag to `ba-lead`/iam team —
  resolve before `/fe` builds the send-dialog submit handler.

Response payload (inbound): either the created Invitation (single-call shape,
  same fields as INT-001 row) or an array of { email, invitationId | error }
  per-item results (batch shape) — shape depends on the OPEN QUESTION above.

Pagination: none (single mutating call)
Errors → UI behavior:
  - per-email duplicate ("this email already has a pending invite in this
    tenant") → best-effort code `INVITATION_ALREADY_EXISTS` (inferred; not
    confirmed) → FR-004's per-email inline error, that email's chip flagged,
    others in the batch still succeed if BE processes independently | not retryable (that item); user can remove & resubmit
  - 422 validation (malformed email slipping past client check, no role selected) → error.fields[] → inline field errors | not retryable until fixed
  - network/5xx → dialog stays open, generic error toast, no optimistic row added (FR-004) | retryable
Empty / loading expectation: dialog submit button shows spinner/disabled state
  while in flight; on success dialog closes + toast + table refresh/prepend.
```

### INT-003 Revoke invitation

```
Service: iam                          Method+Path: DELETE /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}
Status: REAL — endpoint constant + repository method exist (`revokeInvitation`, US-E06.4)
Protected: yes   Role required: admin

Request (outbound): tenantId, invitationId — both path params, never body | Internal
Response payload (inbound): 204/empty, or the updated Invitation with status="revoked" — confirm which with iam contract; current repo method returns `Promise<void>` (assumes empty body) | Internal

Pagination: none
Errors → UI behavior:
  - not-found (invitation already gone/consumed race) → best-effort code
    `INVITATION_NOT_FOUND` (already mapped in `iam-member.failure.ts` →
    `{ type: "invitation-not-found" }`) → error toast "Không thể thu hồi lời
    mời (có thể đã được xử lý)", row refreshed from server truth on retry-fetch | not retryable, but triggers list refresh
  - 403 forbidden (row not in admin's tenant, shouldn't happen given tenant-scoped list, but server-authoritative) → error toast, no local row mutation | not retryable
  - network/5xx → error toast, confirm dialog stays open or reopens (FR-008), row unchanged | retryable
Empty / loading expectation: destructive confirm dialog (FR-008) has its own
  loading/disabled state on the confirm button while the DELETE is in flight.
```

### INT-004 Resend invitation (OQ-2 resolution)

```
Service: iam                          Method+Path: [BEST-EFFORT, NOT CONFIRMED] POST /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend
Status: MOCK-FIRST / UNCONFIRMED — no endpoint constant exists for this today;
        DR-015 documents only create+revoke (per this story's own source line).
Protected: yes   Role required: admin
```

**Resolution of OQ-2** (best-effort, from REST convention + this repo's own
existing action-suffix pattern — `IAM_MEMBER_EP.activateTenant`/`deactivateTenant`
= `POST /iam/api/v1/tenants/{id}/activate|deactivate`, an action verb suffixed
onto a resource path rather than a new top-level resource):

- Recommend resend as a **dedicated action endpoint**, `POST
  /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend`, mirroring
  the `activate`/`deactivate` convention already used for tenants in this same
  service. This is **not** a re-`POST` to the list-create endpoint (that would
  create a second invitation record with a new `invitationId`, contradicting
  FR-007's "row transitions back to Pending" — i.e. the SAME row updates in
  place) and **not** a `PATCH` on the invitation resource (PATCH implies
  partial field edit by the client, but expiry/token regeneration is a
  server-driven side effect, closer semantically to an action/command than a
  field update — matching why `activate`/`deactivate` are POST-actions, not
  PATCH, elsewhere in this same endpoint file).
- **Assumed effect**: SAME `invitationId` is reused; server regenerates the
  token + `expiresAt`, flips `status` back to `pending`. FE therefore does a
  **single row update** (not a two-row transition) — this resolves FR-007's
  "row transitions back to Pending" as an in-place status/expiry patch on the
  existing row key, avoiding any duplicate-row flash in the table.
- `[OPEN QUESTION]` — flag to `ba-lead`: this is inferred, not read from
  `iam/openapi.yaml` (inaccessible from this repo). Confirm with the iam/BE
  team before `/fe` builds `resendInvitation()` on `IIamMemberRepository`. If
  BE instead creates a new invitation record (old one superseded), the FE
  needs to handle the row transiently disappearing/reappearing under a new id
  — a materially different implementation.

```
Request (outbound): tenantId, invitationId — path params only, no body | Internal
Response payload (inbound, assumed): updated Invitation row — same shape as INT-001, status="pending", refreshed expiresAt | Internal
Pagination: none
Errors → UI behavior:
  - invitation not in "expired" state anymore (race: someone already resent/it was revoked) → best-effort code `INVITATION_INVALID_STATE` (inferred) → error toast "Không thể gửi lại — lời mời đã thay đổi trạng thái", trigger list refetch to reconcile | not retryable as-is, refetch resolves
  - network/5xx → error toast, row unchanged (FR-007) | retryable
Empty / loading expectation: row-level inline spinner/disabled action button while in flight (no full-table skeleton).
```

## 3. Auth & Security

- All 4 endpoints are **protected**, role = `admin` (route-gated at
  `/admin/invitations` per decision `0022`/`0024`; do not additionally gate on
  `principal` — Ba-Lead's OQ-1 resolution makes `admin` the real actor role).
- `tenantId` is ALWAYS derived from the admin's current session/route context
  server-side — never a client-editable field in any request (NFR-006).
- PII: `email` (invitee), and indirectly `invitedBy` (admin's own
  name/email if resolved) — both Internal-sensitivity, not Restricted/Confidential
  (contrast with US-E21.2's token/account-creation payloads, which ARE
  Restricted). No token values are ever exposed on this admin-side screen
  except the copy-link action, which is **client-only** — it constructs the
  accept URL from data already in the row response (no additional BE call);
  the raw invite token itself must already be present in the list response for
  copy-link to work — `[OPEN QUESTION]` whether `InvitationResponseDto` needs a
  `token`/`inviteUrl` field added (not on the current DTO) for FR-006 to
  function without a further BE call.
- Bearer token handling: server-side httpOnly cookie per decision `0018`
  (`createServerHttpClient()` in the DI factory) — no client-side auth header
  construction, same as every other IAM-backed screen in this repo.

## 4. Mock-first plan

Not required — `iam` is a REAL/shipped service and 3 of 4 endpoints already
have working endpoint constants + repository methods from US-E06.4. Only
gaps are additive (list-GET method, batch-send shape, resend method) rather
than a from-scratch mock. If BE availability blocks `/fe` before the OPEN
QUESTIONS below are resolved, a `bootstrap/lib/mock.ts` entry keyed on
`IAM_MEMBER_EP.invitations`/`.invitation` can stand in temporarily per decision
`0014`, returning the Invitation[] shape in §2 INT-001.

## 5. Open Questions

- `[OPEN QUESTION]` **Batch-send shape (INT-002)** — does BE accept
  `{ emails: string[], role, expiryDays }` in one call, or must FE loop N
  single-email calls? Blocks the send-dialog submit handler design and the
  partial-failure UX. Escalate to `ba-lead`/iam team before `/fe` starts FR-004.
- `[OPEN QUESTION]` **Resend endpoint (INT-004, OQ-2)** — `POST
  .../invitations/{invitationId}/resend` is this analyst's best-effort
  resolution (same-row, in-place status/expiry update), NOT confirmed against
  `iam/openapi.yaml`. Confirm before `/fe` implements `resendInvitation()`.
- `[OPEN QUESTION]` **Missing list columns** — `invitedBy`/`createdAt`
  (sentAt) are not on the current `InvitationResponseDto` (US-E06.4 modeled a
  narrower need). Confirm iam's actual list response already carries these;
  extend the DTO if so.
- `[OPEN QUESTION]` **Copy-link data source** — FR-006 needs the raw invite
  token or a ready-made accept URL in the list response for client-only
  copy-link to work with zero extra BE calls; confirm `InvitationResponseDto`
  carries a `token` or `inviteUrl` field (Restricted-sensitivity if so — token
  exposure in the admin table would need care, e.g. never logged, only
  copied to clipboard on explicit user action).
- `[OPEN QUESTION]` **Server-side status/search filtering** — confirm whether
  `GET .../invitations` supports `?status=`/`?q=` query params (server-side
  filter, paginated correctly) or whether FE must filter client-side over
  fetched pages (simpler, but breaks pagination combined with filters at
  scale — acceptable for a per-tenant invitation list which is unlikely to be
  huge, but flag the assumption).
