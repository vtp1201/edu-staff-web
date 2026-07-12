# TR-021.1 — Admin Tenant Invitation Management

Source: `docs/design-requests/DR-015-tenant-invitations.md` (Scope §"Admin
'Mời thành viên'"), `docs/product/design-spec.jsonc` → `screens.invitations`
(line ~4162), `docs/product/screens.md` row "Tenant Invitations", `iam` service
contract (`GET/POST /api/v1/tenants/{id}/invitations`, `DELETE
/api/v1/tenants/{id}/invitations/{invitationId}`).

## 1. Requirements Summary

Admin/principal at `/admin/invitations` sends invitations by email (multi-chip
input, 1..N per submit), each tied to exactly one role (`teacher` | `student` |
`parent` | `manager` | `admin`) and an expiry window (7/14/30 days, default
14). They view a filterable/searchable table of all invitations for their
tenant (status: pending/accepted/expired/revoked) and can copy-link
(pending), resend (expired only), or revoke (pending only, destructive
confirm) a given invite. Actors: `admin`, `principal` (role-gated route per
`design-spec.jsonc` `roles: ["principal","admin"]` — note: `principal` is the
design-spec's admin-capable role synonym here; system role vocabulary per
`roles-permissions.md` is `teacher|principal|student|parent`, so "admin" in
this screen means a `principal`-role user acting in an administrative
capacity, not a 5th system role — see Open Question OQ-1). Key constraints:
tenant-scoped list (no cross-tenant visibility), email format validation,
duplicate-invite guard, non-color-only expiry urgency (AA), i18n vi/en.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-021.1",
  "title": "Admin Tenant Invitation Management",
  "status": "Draft",
  "actors": [
    {
      "role": "principal",
      "capabilities": [
        "view invitation list for own tenant",
        "send invitation(s) by email + role + expiry",
        "resend an expired invitation",
        "revoke a pending invitation",
        "copy a pending invitation's link",
        "filter by status tab, search by email"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render the invitation table scoped to the current tenant, with columns Email, Role (badge), Invited by, Sent date, Expiry (countdown), Status (badge), Actions.",
      "trigger": "Admin navigates to /admin/invitations",
      "preconditions": ["User authenticated with principal/admin role in current tenant"],
      "postconditions": ["Table renders current page of invitations for the tenant"],
      "errorConditions": ["List fetch fails -> error state with retry (FR-008)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL let the admin add one or more invitee emails via a chip input (Enter/comma/space commit, paste-multiple, keyboard-removable chips) before submitting the send-invite dialog.",
      "trigger": "Admin opens 'Gửi lời mời' dialog and types/pastes email(s)",
      "preconditions": ["Send dialog open"],
      "postconditions": ["Valid emails appear as chips; count reflected in submit label ('Gửi lời mời' | 'Gửi {count} lời mời')"],
      "errorConditions": ["Malformed email -> chip rendered in invalid style + inline error text (role=alert), submit disabled until removed/fixed"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL require exactly one role selection (teacher|student|parent|manager|admin) and one expiry duration (7|14|30 days, default 14) per send-invite submission, applied to all emails in that batch.",
      "trigger": "Admin selects role radio + expiry select in send dialog",
      "preconditions": ["Dialog open, >=1 valid email chip present"],
      "postconditions": ["Submit enabled only when role selected and >=1 valid email"],
      "errorConditions": ["No role selected -> submit disabled"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL send the invitation batch (POST /api/v1/tenants/{id}/invitations) and, on success, close the dialog, show a toast ('Đã gửi lời mời tới {email}' | 'Đã gửi {count} lời mời ({role})'), and refresh/prepend the table with the new pending row(s).",
      "trigger": "Admin submits send-invite dialog",
      "preconditions": ["Validated email batch + role + expiry"],
      "postconditions": ["New invitation(s) visible with status Pending"],
      "errorConditions": [
        "Duplicate invite for an email already pending in this tenant -> per-email inline error, do not submit that email (server-authoritative duplicate check; FE surfaces the returned field error, does not pre-block optimistically beyond obvious client-side format checks)",
        "Network/server error -> dialog stays open, error toast, no optimistic row added"
      ]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL display an expiry countdown per row: 'Còn {N} ngày' in default text color when N>=3; text+bold+alertTriangle icon in `--edu-warning-text` when N<3; 'Hết hạn {date}' muted with calendarX icon when expired; em-dash placeholder when status is accepted or revoked.",
      "trigger": "Table row renders for a pending or expired invitation",
      "preconditions": ["Row has status pending|expired"],
      "postconditions": ["Countdown never conveyed by color alone (icon + text)"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL allow copy-link only on pending rows (copies the shareable accept URL containing the invite token to clipboard, toast 'Đã sao chép link mời').",
      "trigger": "Admin clicks copy-link action on a pending row",
      "preconditions": ["Row status = pending"],
      "postconditions": ["Link copied to clipboard, confirmation toast shown"],
      "errorConditions": ["Clipboard API unavailable/denied -> error toast, no silent failure"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL allow resend only on expired rows (issues a new invitation token/expiry server-side via a resend call), toast 'Đã gửi lại lời mời tới {email}', row transitions back to Pending.",
      "trigger": "Admin clicks resend action on an expired row",
      "preconditions": ["Row status = expired"],
      "postconditions": ["Row status -> pending with refreshed expiry"],
      "errorConditions": ["Resend fails -> error toast, row unchanged"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL allow revoke only on pending rows, gated by a destructive confirm dialog ('Thu hồi lời mời?' / 'Link mời gửi tới {email} sẽ vô hiệu ngay lập tức...'); on confirm calls DELETE /api/v1/tenants/{id}/invitations/{invitationId}, toast 'Đã thu hồi lời mời của {email}', row status -> Revoked (dimmed 0.65 opacity, actions removed).",
      "trigger": "Admin clicks revoke action on a pending row and confirms",
      "preconditions": ["Row status = pending"],
      "postconditions": ["Row status = revoked; invite token no longer usable (enforced server-side)"],
      "errorConditions": ["Revoke fails -> error toast, dialog stays open or reopens, row unchanged"]
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL provide status-tab filtering (All/Pending/Accepted/Expired/Revoked with count badges) and email-substring search, combinable, updating the table without full page reload.",
      "trigger": "Admin selects a status tab and/or types in search box",
      "preconditions": ["Table has loaded at least once"],
      "postconditions": ["Table reflects combined filter+search criteria"],
      "errorConditions": ["No matches -> empty state 'Không có lời mời nào khớp bộ lọc' + Clear filters CTA"]
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL show a first-load loading skeleton (5 row placeholders) while the invitation list request is in flight.",
      "trigger": "Screen mount, initial fetch pending",
      "preconditions": [],
      "postconditions": ["Skeleton replaced by table or error/empty state on resolution"],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Must",
      "description": "The system SHALL show an error state with retry ('Không tải được danh sách lời mời' / description + retry button) when the initial or refresh fetch fails, and SHALL allow retry to re-attempt the fetch.",
      "trigger": "GET invitations request fails (network/5xx)",
      "preconditions": [],
      "postconditions": ["Successful retry replaces error state with table"],
      "errorConditions": ["Retry also fails -> error state persists"]
    },
    {
      "id": "FR-012",
      "priority": "Must",
      "description": "The system SHALL show a no-invitations empty state with a 'Gửi lời mời' CTA when the tenant has zero invitations (unfiltered).",
      "trigger": "GET invitations returns empty list with no active filter/search",
      "preconditions": [],
      "postconditions": ["Empty state visible, CTA opens send-invite dialog"],
      "errorConditions": []
    },
    {
      "id": "FR-013",
      "priority": "Should",
      "description": "The system SHALL render a card-list mobile variant of the table below 820px viewport width, preserving all columns' information and row actions.",
      "trigger": "Viewport width < 820px",
      "preconditions": [],
      "postconditions": ["All table data/actions remain accessible in card layout"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Email chips removable via keyboard (each chip has a focusable remove button); form errors use role=alert + aria-invalid + aria-describedby; expiry urgency and status are never color-only.",
      "measurableTarget": "WCAG 2.1 AA; keyboard-only completion of send-invite flow with no mouse"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "Text contrast for all badges/status/countdown text meets AA; warning-tone text uses `--edu-warning-text` (not raw warning bg color) per decision 0046.",
      "measurableTarget": "Contrast ratio >= 4.5:1 for body text, >= 3:1 for large/bold >=14px text and icons"
    },
    {
      "id": "NFR-003",
      "category": "Responsive",
      "requirement": "Layout must not break at 320px width; table collapses to card list below 820px per design-spec.",
      "measurableTarget": "No horizontal scroll/clipping at 320/375/768/1280px breakpoints"
    },
    {
      "id": "NFR-004",
      "category": "Performance",
      "requirement": "Loading skeleton must appear before any perceptible blank state on initial load.",
      "measurableTarget": "Skeleton visible within <=320ms of navigation; replaced by data/error/empty on resolution"
    },
    {
      "id": "NFR-005",
      "category": "i18n",
      "requirement": "All UI copy (labels, toasts, dialogs, empty/error states) sourced from the `invitations` namespace in messages/{vi,en}.json; plural counts (invites, days) use ICU plural blocks, not literal '(s)'.",
      "measurableTarget": "100% of user-facing strings resolved via t('invitations....') in both locales; zero hardcoded literals"
    },
    {
      "id": "NFR-006",
      "category": "Security",
      "requirement": "Invitation list and mutating actions (send/resend/revoke) are scoped to the admin's current tenant; tenantId is never client-supplied for authorization (server derives tenant from session/route).",
      "measurableTarget": "No cross-tenant invitation ever rendered or actionable in this screen"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "iam", "entity": "Invitation (list/create/delete)", "sensitivity": "Internal" },
    { "source": "iam", "entity": "Tenant (current admin tenant context)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Admin invitation list view with status tabs + email search",
      "Send invite dialog (multi-email, role, expiry)",
      "Resend (expired-only), Revoke (pending-only, confirm-gated), Copy-link (pending-only)",
      "Loading/empty/error/success UI states",
      "Role-gated route access (principal/admin-acting-principal)"
    ],
    "outOfScope": [
      "Public accept flow (covered by US-E21.2)",
      "Bulk CSV import of invitees",
      "Editing an already-sent invitation's role/expiry (must revoke + resend new)",
      "Invitation analytics/reporting"
    ],
    "externalDependencies": [
      "iam service invitation endpoints (GET/POST /tenants/{id}/invitations, DELETE /tenants/{id}/invitations/{invitationId})",
      "Email delivery (transactional email send) — assumed handled entirely server-side by iam/noti; FE has no visibility into delivery success/failure beyond the API response"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] 'admin' role option in the role-select radiogroup is a tenant-level administrative capability assignable to an invitee, distinct from the route-gate actor role 'principal' — the design-spec's roles list (teacher/student/parent/manager/admin) is the invitee-assignable role vocabulary, not necessarily identical to the 4 system roles in roles-permissions.md; flagging as open question OQ-1 below since this affects role-badge/permission mapping.",
    "[ASSUMPTION] Duplicate-invite detection (same email + tenant + pending status) is enforced server-side; FE only surfaces the returned validation error, does not maintain its own duplicate cache.",
    "[ASSUMPTION] 'manager' role label maps to 'BGH' (Ban Giam Hieu / school board) per copy keys, a distinct assignable role from 'principal' the system role — kept as-is per DR-015 copy, not renamed."
  ],
  "openQuestions": [
    "OQ-1: Confirm whether 'admin' and 'manager' in the invite role-select are new invitee role values requiring IAM/roles-permissions.md updates, or presentation aliases of existing principal/teacher roles — needed before ba-integration-analyst finalizes the request/response role enum mapping.",
    "OQ-2: What is the exact resend semantics — does resend reuse the same invitationId with a refreshed token/expiry, or does it create a new invitation record (old one marked superseded)? Affects whether FE needs to handle two rows briefly or a single row update."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Tenant-scoped invitation table | Must | Core screen purpose; without it nothing else functions |
| FR-002/003/004 | Send invite (chips, role, expiry, submit) | Must | Primary admin action per DR-015 scope |
| FR-005 | Non-color-only expiry countdown | Must | AA hard requirement (decision 0046) + explicit P8 fix item |
| FR-006 | Copy-link (pending only) | Must | Explicit DR-015 action; needed to distribute invite manually |
| FR-007 | Resend (expired only) | Must | Explicit DR-015 action; recovers lapsed invites |
| FR-008 | Revoke (pending only, confirm) | Must | Destructive action needs safety gate; explicit DR-015 requirement |
| FR-009 | Status tabs + search | Must | Explicit table filter UX in design-spec |
| FR-010/011/012 | Loading/error/empty states | Must | Mandatory 4-state pattern (project convention); P8 explicitly fixed missing states here |
| FR-013 | Mobile card-list variant | Should | Design-spec calls it out but is a layout refinement, not core function |

## 4. Handoff Notes

- **For `ba-integration-analyst`**: confirm request/response shape for
  `POST /tenants/{id}/invitations` (batch of emails in one call vs N calls),
  and whether resend/revoke are dedicated endpoints or `PATCH` on the
  invitation resource (DR-015 only lists `DELETE` explicitly for revoke — resend's
  endpoint is not in the BE contract note and must be confirmed, see OQ-2).
  Also map the `roles` string array on `InvitationResponseDto` (already present
  in `src/features/auth/infrastructure/dtos/iam-member-response.dto.ts`,
  US-E06.4) to this screen's role badge colors — this DTO may already be
  reusable, reducing net-new DTO work.
- **For `ba-use-case-modeler`**: needs Given/When/Then for all 4 UI states,
  each row action's confirm/toast/error path, and the email-chip validation
  loop (add valid / add invalid / remove / paste-multiple / duplicate-in-batch
  handling — not yet specified whether the same email twice in one batch is
  blocked client-side).
- Flag OQ-1 (role vocabulary) to `ba-lead` for potential ADR if it turns out
  "admin"/"manager" are new system-level roles rather than tenant-invite labels
  — this could touch `roles-permissions.md` and warrants a decision record
  before FE implements role-gating logic.

## Ba-Lead Decision — OQ-1 role vocabulary (2026-07-12)

Resolved, no new ADR needed (decision `0022` already governs the extra role):

- `docs/product/roles-permissions.md` was stale (4 roles only). Decision
  `0022` (admin-role-separation) already added a real 5th system role `admin`
  (`nav-config.ts` `Role` union: `teacher|principal|student|parent|admin`).
  So the invite role-select's `admin` option IS the real 5th system role —
  no new role needs to be invented.
- `manager` is **not** a 6th system role. It is a friendly display alias for
  `principal` in this screen's copy ("BGH" = Ban Giám Hiệu). When invited with
  `manager`, the invitee is assigned the system role `principal`.
- **Invite role-select → system role mapping**: `teacher→teacher`,
  `student→student`, `parent→parent`, `manager→principal`, `admin→admin`.
  `ba-integration-analyst` should map the request payload's role field to this
  5-value system enum (not a distinct 5-option invite-only vocabulary), and
  the response/table role badge should render using `shell.roles.*` labels for
  the 5 system roles, substituting the friendlier "BGH" label specifically
  when the underlying role is `principal` (matching the DR-015 copy intent
  without introducing a divergent role model).
- Route-gate actor for `/admin/invitations` is the real `admin` role (decision
  `0022`/`0024` admin route group), not "principal acting administratively" —
  `roles-permissions.md` now has an explicit row for this.
