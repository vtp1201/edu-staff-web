# Feature Spec — Admin Tenant Invitation Management (US-E21.1)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-021.1, FR-001..FR-013, NFR-001..NFR-006) +
`integration.md` (INT-001..INT-004) + `use-cases.md` (UC-001..UC-007,
AC-001.x..AC-007.x) + `docs/product/design-spec.jsonc` → `screens.invitations`
(line ~4162) + `docs/design-requests/DR-015-tenant-invitations.md`.

## 1. Scope & Objectives

**Purpose**: give a tenant `admin` a single screen to invite new members by
email, track invitation lifecycle (pending/accepted/expired/revoked), and
take corrective action (resend, revoke, copy-link) without leaving the admin
shell.

**In scope**:
- Tenant-scoped invitation table with status tabs + email search.
- Send-invite dialog: multi-email chip input, one role, one expiry per batch.
- Row actions: copy-link (pending), resend (expired), revoke (pending, confirm-gated).
- Loading / empty (no invitations) / empty (no filter match) / error (+ retry) / success states.
- Mobile card-list variant below 820px (Should-priority).
- Role-gated route access (`admin` only).

**Out of scope** (per `requirements.md` §scope):
- The public accept flow — covered entirely by sibling story US-E21.2.
- Bulk CSV import of invitees.
- Editing an already-sent invitation's role/expiry (must revoke + resend new).
- Invitation analytics/reporting.

**Definitions**:
- *Invite role vocabulary*: the 5 options shown in the send-dialog's role
  radiogroup (`teacher`, `student`, `parent`, `manager`, `admin`) — see §3
  role-mapping table, this is NOT a 6-value system unique to this screen.
- *Batch*: one send-invite dialog submission, 1..N emails, exactly 1 role + 1 expiry applied to all.
- *Tenant-scoped*: every list/action request is implicitly scoped to the admin's current tenant, resolved server-side — never a client-editable parameter.

## 2. Actors & Roles

| Actor | Access | Role-gated visibility |
| --- | --- | --- |
| `admin` (real system role, decision `0022`/`0024`) | Full — view/send/resend/revoke/copy-link, all scoped to own tenant | Route `(app)/admin/invitations` gated to `admin` only (design-spec's `roles: ["principal","admin"]` array is superseded by ba-lead's resolution below — actor is `admin`, not `principal`) |
| `teacher`/`student`/`parent`/`principal` (non-admin roles) | None | Route not rendered/redirected — out of this screen |
| System (`iam` service) | N/A | Enforces tenant scoping, duplicate detection, single-use tokens, audit fields (`invitedBy`/`createdAt`) server-side |

**Role vocabulary → system role mapping** (ba-lead decision, 2026-07-12 — see
`requirements.md` §"Ba-Lead Decision — OQ-1", binding, non-obvious, spelled
out explicitly per this spec's mandate):

| Invite role-select UI option (design-spec `roleRadioGroup.options`) | Wire/system role sent in request + stored on `Invitation.roles[]` | Notes |
| --- | --- | --- |
| `teacher` | `teacher` | 1:1 |
| `student` | `student` | 1:1 |
| `parent` | `parent` | 1:1 |
| `manager` | `principal` | **Display alias only** — "manager" is copy for "BGH" (Ban Giám Hiệu); the invitee is assigned the real system role `principal`. Table/badge renders the "BGH" label when `role === "principal"`, not a literal "manager" role. |
| `admin` | `admin` | The real 5th system role added by decision `0022` (`nav-config.ts` `Role` union `teacher\|principal\|student\|parent\|admin`) — NOT a tenant-invite-only vocabulary value. |

This is a 5-value system role enum end to end (`teacher\|student\|parent\|principal\|admin`);
the invite dialog's UI presents `manager` as a friendlier synonym for
`principal` but never introduces a 6th value on the wire.

## 3. Functional Requirements

### FR-001 — Render tenant-scoped invitation table
- Priority: Must. Source: TR-021.1 FR-001, UC-001, INT-001.
- The system SHALL render the invitation table scoped to the current tenant, columns: Email, Role (badge), Invited by, Sent date, Expiry (countdown), Status (badge), Actions.
- AC (Given/When/Then, from `use-cases.md`):
  - AC-001.1 Given navigation to `/admin/invitations`, When the initial GET is in flight, Then a 5-row skeleton renders within 320ms.
  - AC-001.2 Given the GET resolves with N>0 invitations, Then all listed columns render for each row.
  - AC-001.6 Given the response, Then no invitation with a `tenantId` different from the admin's current tenant is ever rendered.
- Dependencies: `listInvitations` repo method (gap, §6 INT-001).

### FR-002 — Multi-email chip input
- Priority: Must. Source: TR-021.1 FR-002, UC-003.
- The system SHALL let the admin add 1..N invitee emails via chip input (Enter/comma/space commit, paste-multiple, keyboard-removable chips).
- AC:
  - AC-003.1 Given a well-formed email + Enter, Then a valid-style chip appears and input clears.
  - AC-003.2 Given a malformed email committed, Then invalid-style chip + inline error (role=alert, aria-invalid, aria-describedby), submit disabled until fixed/removed.
  - AC-003.3 Given paste of "a@x.com, b@x.com c@x.com", Then 3 chips created, each validated independently.
  - AC-003.5 Given a chip has focus, When remove control/Backspace pressed, Then chip removed, submit re-evaluated.
- Dependencies: none new.

### FR-003 — Role + expiry required per batch
- Priority: Must. Source: TR-021.1 FR-003, UC-003.
- The system SHALL require exactly one role selection (§2 mapping table) and one expiry (7/14/30 days, default 14) per batch, applied to all emails.
- AC:
  - AC-003.6 Given ≥1 valid chip but no role selected, Then submit stays disabled; given role+expiry selected, Then submit enables.
  - AC-003.7 Given exactly 1 valid chip, Then submit reads "Gửi lời mời"; given N>1, Then "Gửi {N} lời mời".

### FR-004 — Send invitation batch
- Priority: Must. Source: TR-021.1 FR-004, UC-003, INT-002.
- The system SHALL send the batch (`POST .../invitations`) and, on success, close the dialog, toast, and refresh/prepend the table with new Pending row(s).
- AC:
  - AC-003.9 Given the batch send succeeds, Then dialog closes, toast renders, table shows new row(s) status Pending.
  - AC-003.10 Given one email already has a pending invite in this tenant, Then that email's chip/row shows an inline server-returned error while other emails in the batch proceed (pending batch-shape confirmation, see §8 [OPEN QUESTION]).
  - AC-003.12 Given the POST fails on network/5xx, Then dialog stays open, error toast, no optimistic row added.
- Dependencies: `[OPEN QUESTION]` batch request shape (§6 INT-002) — blocks final submit-handler implementation, not this spec.

### FR-005 — Expiry countdown display
- Priority: Must. Source: TR-021.1 FR-005, UC-007, decision `0046`.
- The system SHALL display: "Còn {N} ngày" default color when N≥3; bold + `alertTriangle` icon in `--edu-warning-text` when N<3; "Hết hạn {date}" muted + `calendarX` when expired; em-dash when accepted/revoked.
- AC:
  - AC-007.1 Given pending row, expiresAt ≥3 days away, Then "Còn {N} ngày" default color, no icon.
  - AC-007.2 Given pending row, expiresAt <3 days away, Then bold + `alertTriangle` icon in `--edu-warning-text` — urgency NEVER color-only.
  - AC-007.3 Given expired row, Then "Hết hạn {date}" muted + `calendarX`.
  - AC-007.4 Given status accepted/revoked, Then em-dash placeholder.

### FR-006 — Copy invite link (pending only)
- Priority: Must. Source: TR-021.1 FR-006, UC-004.
- The system SHALL allow copy-link only on pending rows (copies shareable accept URL with invite token), toast on success.
- AC:
  - AC-004.1 Given a pending row, When copy-link clicked, Then accept URL written to clipboard + toast "Đã sao chép link mời".
  - AC-004.2 Given Clipboard API denied/unavailable, Then error toast, no success toast.
  - AC-004.3 Given non-pending row, Then copy-link action not rendered/enabled.
- Dependencies: `[OPEN QUESTION]` whether `InvitationResponseDto` carries `token`/`inviteUrl` (§6 INT-001 gap) — this action cannot function without it.

### FR-007 — Resend invitation (expired only)
- Priority: Must. Source: TR-021.1 FR-007, UC-005, INT-004.
- The system SHALL allow resend only on expired rows, issuing a new token/expiry server-side; SAME row transitions in place to Pending.
- AC:
  - AC-005.1 Given status pending/accepted/revoked, Then resend not rendered/enabled; given status expired, Then enabled.
  - AC-005.3 Given resend succeeds, Then SAME row updates in place to Pending with refreshed expiry, toast renders.
  - AC-005.4 Given a race (no longer expired server-side), Then error toast + list refetch to reconcile.
- Dependencies: `[OPEN QUESTION]` resend endpoint shape (§6 INT-004, best-effort/unconfirmed).

### FR-008 — Revoke invitation (pending only, confirm-gated)
- Priority: Must. Source: TR-021.1 FR-008, UC-006, INT-003.
- The system SHALL allow revoke only on pending rows, gated by a destructive confirm dialog; on confirm, `DELETE .../invitations/{id}`, row → Revoked (0.65 opacity, actions removed).
- AC:
  - AC-006.2 Given revoke clicked, Then confirm dialog renders naming the invitee email; no DELETE fires before confirmation.
  - AC-006.5 Given DELETE succeeds, Then dialog closes, toast renders, row status Revoked (dimmed, actions removed).
  - AC-006.6 Given not-found race, Then error toast + list refetch.
  - AC-006.7 Given network/5xx, Then error toast, confirm dialog stays open/reopens, row unchanged.

### FR-009 — Status-tab filter + search
- Priority: Must. Source: TR-021.1 FR-009, UC-002.
- The system SHALL provide status-tab filtering (All/Pending/Accepted/Expired/Revoked with count badges) + email-substring search, combinable, no full page reload.
- AC:
  - AC-002.1 Given "Pending" tab selected, Then only pending rows render + count badge shown.
  - AC-002.3 Given a tab AND search term both active, Then only rows matching BOTH render.
  - AC-002.4 Given filter/search yields zero rows from a non-empty base, Then distinct empty state "Không có lời mời nào khớp bộ lọc" + "Xóa bộ lọc" CTA (distinct from FR-012's zero-invitations empty state).

### FR-010/FR-011/FR-012 — Loading / error / empty states
- Priority: Must. Source: TR-021.1 FR-010/011/012, UC-001.
- The system SHALL show a 5-row skeleton on first load; an error state with retry on fetch failure; a zero-invitations empty state with "Gửi lời mời" CTA when the tenant has none (unfiltered).
- AC:
  - AC-001.1 Skeleton ≤320ms.
  - AC-001.3 Given 0 invitations + no filter/search, Then empty state + CTA opens send dialog.
  - AC-001.4/AC-001.5 Given fetch fails, Then error state + retry; given retry also fails, Then error persists.

### FR-013 — Mobile card-list variant
- Priority: Should. Source: TR-021.1 FR-013.
- The system SHALL render a card-list variant below 820px, preserving all columns' information and row actions.
- AC: layout does not lose any column data or action affordance at <820px (verified visually/interaction test, no numbered AC in `use-cases.md` — treat as an implicit NFR-003 corollary).

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | Email chips keyboard-removable; form errors role=alert + aria-invalid + aria-describedby; expiry/status never color-only | WCAG 2.1 AA; keyboard-only completion of send-invite flow, zero mouse | Playwright/Storybook keyboard-only interaction test; axe scan |
| NFR-002 (a11y contrast) | Badge/status/countdown text meets AA; warning-tone text uses `--edu-warning-text` per decision `0046` | ≥4.5:1 body text, ≥3:1 large/bold ≥14px text + icons | Contrast check in `fe-accessibility-auditor` audit |
| NFR-003 (responsive) | No breakage at 320px; table→card collapse <820px | No horizontal scroll/clipping at 320/375/768/1280px | Storybook viewport addon / manual resize check |
| NFR-004 (perf) | Skeleton before any blank state on initial load | Skeleton visible ≤320ms of navigation | Storybook interaction timing / manual observation |
| NFR-005 (i18n) | All copy from `invitations` namespace, `messages/{vi,en}.json`; plural counts via ICU, not literal "(s)" | 100% strings via `t('invitations....')` both locales, zero hardcoded literals | `bunx tsc --noEmit` (typed keys) + hardcode grep sweep |
| NFR-006 (security) | List + mutating actions scoped to admin's current tenant; `tenantId` never client-supplied for authorization | Zero cross-tenant invitation ever rendered/actionable | Repository/DI code review — `tenantId` sourced only from server session/route context |

## 5. UI States & Flows

Required states per async surface (loading/empty/error/success), all four
present per UC:

- **Table (UC-001/UC-002)**: loading (5-row skeleton) → success (table) | empty-no-invitations (CTA) | empty-no-match (Clear filters CTA) | error (retry).
- **Send dialog (UC-003)**: idle/editing (chip validation loop) → submitting (spinner, aria-busy) → success (close+toast+row) | error (dialog stays open, inline or toast per error type).
- **Copy-link (UC-004)**: instantaneous action → success toast | error toast (no persistent loading state).
- **Resend (UC-005)**: row-level spinner while in flight → in-place row update (success) | error toast (row unchanged) | race → error toast + list refetch.
- **Revoke (UC-006)**: confirm dialog (idle) → confirming (spinner on confirm button) → success (dialog closes, row dimmed) | error (dialog stays open/reopens) | race → error + refetch.
- **Countdown cell (UC-007)**: pure derived-state render, 4 branches (normal/urgent/expired/n-a) — no loading/error, always one of the 4.

Key flow: admin lands → table loads → (optionally) filters/searches →
sends a batch → new pending row appears → time passes → row nears expiry
(urgent countdown) → expires → admin resends OR revokes a still-pending row.

## 6. Data & Integration

All 4 endpoints: service `iam`, protected, role required `admin`. Full detail
in `integration.md` (this packet) — condensed below.

### INT-001 List tenant invitations
- `GET /iam/api/v1/tenants/{tenantId}/invitations` — Status: endpoint constant REAL, **repository method gap** (`listInvitations` not yet on `IIamMemberRepository`).
- Request: `tenantId` (server-derived path param), optional `cursor`/`status`/`q` query (server- vs client-side filter unconfirmed, §8).
- Response (camelCase, per Invitation): `invitationId`, `tenantId`, `email` (PII), `roles: string[]` (system role vocabulary, §3 table), `status` (`pending\|accepted\|expired\|revoked`), `invitedBy` (**gap**, not on current DTO), `createdAt`/`sentAt` (**gap**), `expiresAt`.
- Pagination: cursor (`meta.pagination.nextCursor`/`hasMore`) per envelope standard.
- Error → UI: network/5xx → generic error state + retry (FR-011, retryable); 403 → error state, no retry (not retryable, shouldn't occur given route-gate).

### INT-002 Send invitation batch
- `POST /iam/api/v1/tenants/{tenantId}/invitations` — Status: endpoint constant REAL; existing repo method (`inviteMember`) is single-email shaped, **batch shape unconfirmed**.
- Request (proposed): `{ emails: string[], role, expiryDays }` — `role` sent as the mapped system value (§3), never the UI's `manager` alias literal.
- Response: created Invitation (single-call shape) OR array of per-item `{ email, invitationId | error }` (batch shape) — depends on `[OPEN QUESTION]` resolution.
- Error → UI: per-email duplicate (`INVITATION_ALREADY_EXISTS`, inferred) → per-email inline error, other emails proceed if BE independent (not retryable per item); 422 → `error.fields[]` inline (not retryable until fixed); network/5xx → dialog stays open, generic toast (retryable).

### INT-003 Revoke invitation
- `DELETE /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}` — Status: REAL, existing `revokeInvitation()` method.
- Request: `tenantId`, `invitationId` path params only.
- Response: 204/empty or updated Invitation (confirm which).
- Error → UI: `INVITATION_NOT_FOUND` (already mapped `iam-member.failure.ts` → `invitation-not-found`) → error toast + list refetch (not retryable, triggers refresh); 403 → error toast, no local mutation (not retryable); network/5xx → error toast, confirm dialog stays open (retryable).

### INT-004 Resend invitation
- `[BEST-EFFORT, NOT CONFIRMED] POST /iam/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend` — mirrors existing `activate`/`deactivate` action-suffix convention on tenants; assumed SAME `invitationId` reused (in-place row update, not a new row).
- Request: `tenantId`, `invitationId` path params only, no body.
- Response (assumed): updated Invitation, `status="pending"`, refreshed `expiresAt`.
- Error → UI: `INVITATION_INVALID_STATE` (inferred, race) → error toast + refetch (not retryable as-is, refetch resolves); network/5xx → error toast, row unchanged (retryable).

### Mock-first plan
Not required as a from-scratch mock — `iam` is real/shipped and 3 of 4
endpoints already have working constants/methods (US-E06.4). If BE
availability blocks `/fe` before the open questions below resolve, a
`bootstrap/lib/mock.ts` entry keyed on `IAM_MEMBER_EP.invitations`/`.invitation`
can stand in temporarily per decision `0014`.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | View invitation table (initial load) | FR-001, FR-010, FR-011, FR-012 | 6 |
| UC-002 | Filter and search invitations | FR-009 | 5 |
| UC-003 | Send invitation batch | FR-002, FR-003, FR-004 | 12 |
| UC-004 | Copy invite link | FR-006 | 3 |
| UC-005 | Resend invitation | FR-007 | 5 |
| UC-006 | Revoke invitation | FR-008 | 7 |
| UC-007 | Expiry countdown display | FR-005 | 4 |

## 8. Constraints & Assumptions

**Technical constraints**:
- No `edu-api/services/iam/docs/openapi.yaml` accessible from this repo — all endpoint shapes below `[OPEN QUESTION]`/best-effort are inferred from already-wired code (US-E06.4), not confirmed against the real BE contract.
- `iam` is the only service involved — no `core`/`lms`/`social` dependency.

**Confirmed [ASSUMPTION]s**:
- [ASSUMPTION] Duplicate-invite detection (same email + tenant + pending) is enforced server-side; FE only surfaces the returned validation error, no client-side duplicate cache.
- [ASSUMPTION] `manager` role label maps to "BGH" per DR-015 copy, kept as-is (not renamed) — confirmed by ba-lead resolution, not merely assumed at this point (see §2 mapping table).

**[GAP]** (fillable by cross-reference, flagged for `/fe`):
- `InvitationResponseDto` currently lacks `invitedBy`/`createdAt` (needed for FR-001's "Invited by"/"Sent date" columns) and `token`/`inviteUrl` (needed for FR-006 copy-link). Likely under-modeled from US-E06.4's narrower need, not a genuine BE absence — confirm and extend the DTO.
- No `listInvitations` method exists yet on `IIamMemberRepository` — new GET method required (URL already resolves correctly for both GET/POST per REST convention).

**[OPEN QUESTION]** (carried verbatim from `integration.md`/`use-cases.md`, NOT resolved here — block `/fe` implementation of the affected FR, not this spec):
- Batch-send request shape (INT-002) — single call with `{emails[], role, expiryDays}` vs N looped single-email calls; determines partial-success UX.
- Resend endpoint shape (INT-004) — best-effort `POST .../resend`, unconfirmed against `iam` contract.
- Missing list columns (`invitedBy`/`createdAt`) — confirm iam's actual response already carries these.
- Copy-link data source — confirm `InvitationResponseDto` carries `token`/`inviteUrl` (Restricted-sensitivity if so).
- Server-side vs client-side status/search filtering support (`?status=`/`?q=` query params).
- OQ-A: is duplicate-email-within-the-same-batch client-side merged, or does FE submit and let BE reject per-email (same as cross-batch)?
- OQ-B: no realtime requirement between concurrent admin sessions — assume "stale until next fetch" unless `ba-lead` says otherwise.
- OQ-C: is there a max batch size for one send submission (e.g. cap pasted emails at 20)?
- OQ-D: revoked-then-copied-link race — recommend no FE-side handling (server-authoritative rejection on visit is acceptable).

**No [CONFLICT]** identified between `requirements.md`/`integration.md`/`use-cases.md`/design-spec for this story.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Tenant-scoped table | TR-021.1 FR-001 | UC-001 | INT-001 | Must |
| FR-002 Email chip input | TR-021.1 FR-002 | UC-003 | INT-002 | Must |
| FR-003 Role + expiry required | TR-021.1 FR-003 | UC-003 | INT-002 | Must |
| FR-004 Send invitation batch | TR-021.1 FR-004 | UC-003 | INT-002 | Must |
| FR-005 Expiry countdown | TR-021.1 FR-005 | UC-007 | INT-001 (data source `expiresAt`) | Must |
| FR-006 Copy invite link | TR-021.1 FR-006 | UC-004 | INT-001 (data source `token`/`inviteUrl`, gap) | Must |
| FR-007 Resend invitation | TR-021.1 FR-007 | UC-005 | INT-004 | Must |
| FR-008 Revoke invitation | TR-021.1 FR-008 | UC-006 | INT-003 | Must |
| FR-009 Filter + search | TR-021.1 FR-009 | UC-002 | INT-001 | Must |
| FR-010 Loading skeleton | TR-021.1 FR-010 | UC-001 | INT-001 | Must |
| FR-011 Error + retry | TR-021.1 FR-011 | UC-001 | INT-001 | Must |
| FR-012 Empty state | TR-021.1 FR-012 | UC-001 | INT-001 | Must |
| FR-013 Mobile card-list | TR-021.1 FR-013 | (implicit, NFR-003) | — | Should |
| NFR-001 Keyboard a11y | TR-021.1 NFR-001 | UC-003 | — | Must |
| NFR-002 Contrast | TR-021.1 NFR-002 | UC-007 | — | Must |
| NFR-003 Responsive | TR-021.1 NFR-003 | UC-001 (mobile variant) | — | Must |
| NFR-004 Perf (skeleton timing) | TR-021.1 NFR-004 | UC-001 | INT-001 | Must |
| NFR-005 i18n | TR-021.1 NFR-005 | all UCs | — | Must |
| NFR-006 Tenant-scoping security | TR-021.1 NFR-006 | UC-001 | INT-001/002/003/004 | Must |

## 10. Handoff to FE

`fe-lead` should build the `(app)/admin/invitations` screen per this spec +
`design_src/edu/invitations.jsx` (`InvitationsScreen`) + `docs/product/design-spec.jsonc`
→ `screens.invitations`. Suggested lane: **normal** (no Auth/Authorization/
public-contract hard-gate flags — route is behind existing admin RBAC).

Before `/fe` starts FR-004 (send-dialog submit) and FR-007 (resend), resolve
the two blocking `[OPEN QUESTION]`s in §8 (batch-send shape, resend endpoint
shape) with the `iam` BE team — everything else in this spec is buildable
mock-first per decision `0014` in the interim.

Proof owed (maps to `docs/TEST_MATRIX.md` rows, see story.md §Validation):
unit tests for list/send-batch/resend/revoke use-cases; integration tests for
the extended `IIamMemberRepository` (list/batch-send/resend methods);
Storybook interaction stories for all loading/empty/error/success states
enumerated in §5; `bun build` + `tsc --noEmit` clean; design-review gate pass.
