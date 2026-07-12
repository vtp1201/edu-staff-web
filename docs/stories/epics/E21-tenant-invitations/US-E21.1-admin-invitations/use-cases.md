# Use Cases + Acceptance Criteria — US-E21.1 Admin Tenant Invitation Management

Source: `requirements.md` (TR-021.1), `integration.md` (INT-001..004).
Role vocabulary resolved by ba-lead (2026-07-12): invite role-select
`teacher|student|parent|manager|admin` maps to system roles
`teacher|student|parent|principal|admin` (`manager` → `principal` display alias).
Route actor = real system role `admin` (decision 0022/0024).

## 1. Use Case Scope Summary

7 use cases, 1 primary actor (`admin`), 1 screen (`/admin/invitations`).
Boundaries: this screen only sends/manages invitations for the admin's own
tenant; it never renders the public accept flow (US-E21.2) and never lets the
admin set tenantId (server-derived). Async UCs (list load, send, resend,
revoke, copy-link) each modeled with loading/empty/error/success.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `admin` | Authenticated, route-gated (`/admin/invitations`, decision 0022/0024) | View tenant-scoped invitation table; filter/search; send invite batch; resend expired; revoke pending; copy pending link |
| System (iam service) | External/server | Token/duplicate/expiry validation, tenant scoping, audit fields (`invitedBy`, `createdAt`) |

## 3. Use Case Catalogue

### UC-001: View invitation table (initial load)

- **Primary actor**: admin. **Preconditions**: authenticated, role=admin, on `/admin/invitations`.
- **Main success scenario**:
  1. Screen mounts, requests `GET /tenants/{tenantId}/invitations` (INT-001).
  2. While pending, 5-row skeleton renders (FR-010).
  3. Response resolves with ≥1 invitation → table renders with columns Email, Role, Invited by, Sent date, Expiry (countdown), Status, Actions.
- **Alternative flows**:
  - A1 — Zero invitations, no filter/search active → empty state "chưa có lời mời nào" + "Gửi lời mời" CTA (FR-012).
- **Exception flows**:
  - E1 — Fetch fails (network/5xx) → error state "Không tải được danh sách lời mời" + retry button (FR-011); retry re-issues the same GET.
  - E2 — Retry also fails → error state persists, no infinite spinner.
- **Business rules**: list is always scoped to the admin's own `tenantId` (server-derived, never client param beyond route context).
- **Non-functional**: skeleton visible ≤320ms (NFR-004); AA contrast on all badges (NFR-002).

### UC-002: Filter and search invitations

- **Primary actor**: admin. **Preconditions**: table has loaded at least once (post UC-001).
- **Main success scenario**: admin selects a status tab (All/Pending/Accepted/Expired/Revoked, each with count badge) and/or types in the search box → table re-renders matching rows without full page reload (FR-009).
- **Alternative flows**:
  - A1 — Combine tab + search simultaneously → both criteria AND-combined.
  - A2 — Clear filters via CTA in the no-match empty state → table returns to unfiltered view.
- **Exception flows**:
  - E1 — Filter/search yields zero rows from a non-empty base set → distinct empty state "Không có lời mời nào khớp bộ lọc" + Clear filters CTA (distinct from UC-001's A1 zero-invitations empty state).
- **Business rules**: filtering source-of-truth is server-side if `?status=`/`?q=` supported ([OPEN QUESTION] per integration.md — else client-side over fetched page); FE must track raw vs filtered count to distinguish UC-001-A1 from UC-002-E1.

### UC-003: Send invitation batch

- **Primary actor**: admin. **Preconditions**: send-invite dialog opened.
- **Main success scenario**:
  1. Admin types/pastes emails into chip input (Enter/comma/space commits a chip; paste-multiple splits into N chips).
  2. Each chip validated: well-formed email → valid style; malformed → invalid style + inline error (role=alert).
  3. Admin selects exactly one role (radiogroup) + one expiry (7/14/30d, default 14).
  4. Submit label reflects count ("Gửi lời mời" for 1 / "Gửi {count} lời mời" for N); enabled only when ≥1 valid chip + role selected.
  5. Admin submits → `POST /tenants/{tenantId}/invitations` (INT-002).
  6. On success: dialog closes, toast ("Đã gửi lời mời tới {email}" | "Đã gửi {count} lời mời ({role})"), table refreshes/prepends new Pending row(s).
- **Alternative flows**:
  - A1 — Paste multiple comma/newline-separated emails at once → each parsed into its own chip, validated independently.
  - A2 — Duplicate email typed twice within the same batch (client-side) → second occurrence rejected/merged into one chip, inline notice (no duplicate chip in submit payload). *(FR-002 doesn't explicitly confirm this — flagged as [OPEN QUESTION] OQ-A below.)*
  - A3 — Admin removes a chip via keyboard (Backspace on empty input focuses/removes last chip, or a focusable remove button per chip) — NFR-001.
- **Exception flows**:
  - E1 — Malformed email chip present → chip invalid style + inline error, submit stays disabled until fixed/removed.
  - E2 — Server-side duplicate-in-tenant (email already has a pending invite) → per-email inline error on that chip (server-authoritative), other emails in the batch still submitted/succeed if BE processes independently (partial-success handling pending [OPEN QUESTION] batch-shape resolution, integration.md §5).
  - E3 — 422 validation (role missing, other field errors) → inline field errors, submit stays disabled.
  - E4 — Network/5xx → dialog stays open, error toast, no optimistic row added.
- **Business rules**: role + expiry apply to the WHOLE batch, not per-email; `tenantId` never client-supplied (NFR-006).
- **Non-functional**: keyboard-only completion possible end to end (NFR-001); submit button shows spinner/aria-busy while in flight.

### UC-004: Copy invite link (pending row)

- **Primary actor**: admin. **Preconditions**: row status = pending.
- **Main success scenario**: admin clicks copy-link action → accept URL (containing invite token) copied to clipboard → toast "Đã sao chép link mời".
- **Exception flows**:
  - E1 — Clipboard API unavailable/denied → error toast, no silent failure.
- **Business rules**: action only rendered/enabled on pending rows; action absent on accepted/expired/revoked rows.

### UC-005: Resend invitation (expired row)

- **Primary actor**: admin. **Preconditions**: row status = expired.
- **Main success scenario**: admin clicks resend → `POST .../invitations/{invitationId}/resend` (INT-004) → row-level spinner while in flight → on success, SAME row updates in place: status → pending, expiry refreshed, toast "Đã gửi lại lời mời tới {email}".
- **Exception flows**:
  - E1 — Race: invitation no longer expired (already resent/revoked elsewhere) → error toast "Không thể gửi lại — lời mời đã thay đổi trạng thái", triggers list refetch to reconcile.
  - E2 — Network/5xx → error toast, row unchanged.
- **Business rules**: action only rendered/enabled on expired rows.

### UC-006: Revoke invitation (pending row)

- **Primary actor**: admin. **Preconditions**: row status = pending.
- **Main success scenario**:
  1. Admin clicks revoke → destructive confirm dialog "Thu hồi lời mời?" / "Link mời gửi tới {email} sẽ vô hiệu ngay lập tức...".
  2. Admin confirms → confirm button shows loading/disabled state → `DELETE /tenants/{tenantId}/invitations/{invitationId}` (INT-003).
  3. On success: dialog closes, toast "Đã thu hồi lời mời của {email}", row status → Revoked (dimmed 0.65 opacity, actions removed).
- **Alternative flows**:
  - A1 — Admin cancels the confirm dialog → no request sent, row unchanged.
- **Exception flows**:
  - E1 — Not-found race (invitation already consumed/gone) → error toast "Không thể thu hồi lời mời (có thể đã được xử lý)", list refetched to show server truth.
  - E2 — Network/5xx → error toast, confirm dialog stays open or reopens, row unchanged.
- **Business rules**: action only rendered/enabled on pending rows.

### UC-007: Expiry countdown display

- **Primary actor**: admin (passive/observational). **Preconditions**: row status pending or expired.
- **Main success scenario**: row renders "Còn {N} ngày" in default text color when N≥3 days remaining.
- **Alternative flows**:
  - A1 — N<3 days remaining → bold text + `alertTriangle` icon in `--edu-warning-text` (not color-only, decision 0046).
  - A2 — Already expired → "Hết hạn {date}" muted with `calendarX` icon.
  - A3 — Status accepted or revoked → em-dash placeholder (countdown not applicable).
- **Business rules**: urgency is NEVER conveyed by color alone — always icon + text change together.

## 4. Acceptance Criteria

```
UC-001: View invitation table
  AC-001.1 Loading — Given navigation to /admin/invitations, When the initial GET is in flight, Then a 5-row skeleton renders within 320ms.
  AC-001.2 Success — Given the GET resolves with N>0 invitations, Then the table renders all listed columns (Email, Role badge, Invited by, Sent date, Expiry, Status badge, Actions) for each row.
  AC-001.3 Empty (no invitations) — Given the GET resolves with 0 invitations and no filter/search active, Then the empty state "Chưa có lời mời nào" + "Gửi lời mời" CTA renders (opens send dialog on click), and the table/skeleton do not render.
  AC-001.4 Error — Given the GET fails (network/5xx), Then the error state "Không tải được danh sách lời mời" + description + retry button renders; When admin clicks retry, Then the GET re-fires and shows loading again.
  AC-001.5 Error persists — Given retry also fails, Then the error state remains visible (no silent fallback to empty/blank).
  AC-001.6 Tenant scoping — Given the response, Then no invitation with a tenantId different from the admin's current tenant is ever rendered (NFR-006).

UC-002: Filter and search
  AC-002.1 Tab filter — Given the table has loaded, When admin selects the "Pending" tab, Then only pending-status rows render and the tab shows its count badge.
  AC-002.2 Search — Given the table has loaded, When admin types an email substring, Then only matching rows render, debounced, without full page reload.
  AC-002.3 Combined — Given a status tab AND a search term are both active, Then only rows matching BOTH render.
  AC-002.4 No-match empty state — Given filter/search criteria match zero rows from a non-empty base list, Then empty state "Không có lời mời nào khớp bộ lọc" + "Xóa bộ lọc" CTA renders (distinct copy from AC-001.3's zero-invitations empty state).
  AC-002.5 Clear filters — Given the no-match empty state is shown, When admin clicks "Xóa bộ lọc", Then all filters/search reset and the full unfiltered table renders.

UC-003: Send invitation batch
  AC-003.1 Valid chip — Given the send dialog is open, When admin types a well-formed email and presses Enter, Then a valid-style chip appears and the input clears.
  AC-003.2 Invalid chip — Given admin types a malformed email and commits it, Then the chip renders in invalid style with an inline error (role=alert, aria-invalid, aria-describedby) and submit stays disabled while any invalid chip remains.
  AC-003.3 Paste-multiple — Given admin pastes "a@x.com, b@x.com c@x.com" into the chip input, Then 3 separate chips are created and each validated independently.
  AC-003.4 Duplicate-in-batch — Given admin adds "a@x.com" twice in the same batch, Then the second entry is rejected/merged (only one chip for "a@x.com") with an inline notice. [OPEN QUESTION — behavior not explicit in FR-002; flagged OQ-A below, block final AC wording until confirmed]
  AC-003.5 Keyboard removal — Given a chip has focus, When admin presses its remove control (or Backspace when input is empty and a chip is last), Then the chip is removed and submit re-evaluates enabled state.
  AC-003.6 Role + expiry required — Given ≥1 valid chip exists but no role is selected, Then submit stays disabled; When a role and expiry (default 14d) are selected, Then submit enables.
  AC-003.7 Submit label reflects count — Given exactly 1 valid chip, Then submit button reads "Gửi lời mời"; Given N>1 valid chips, Then it reads "Gửi {N} lời mời".
  AC-003.8 Loading — Given submit is pending, Then the submit button shows aria-busy + spinner and is disabled to prevent double-submit.
  AC-003.9 Success — Given the batch send succeeds, Then the dialog closes, a toast renders ("Đã gửi lời mời tới {email}" for N=1 / "Đã gửi {count} lời mời ({role})" for N>1), and the table shows the new row(s) with status Pending.
  AC-003.10 Server-side duplicate — Given one email in the batch already has a pending invite in this tenant, Then that email's chip/row shows an inline server-returned error while other emails in the batch proceed (pending final batch-shape confirmation, integration.md §5 OPEN QUESTION).
  AC-003.11 Validation error — Given the server returns a 422 with field errors, Then the corresponding field(s) show inline errors and the dialog remains open, submit re-enabled.
  AC-003.12 Network error — Given the POST fails on network/5xx, Then the dialog stays open, an error toast renders, and no optimistic row is added to the table.

UC-004: Copy invite link
  AC-004.1 Success — Given a pending row, When admin clicks the copy-link action, Then the accept URL is written to the clipboard and a toast "Đã sao chép link mời" renders.
  AC-004.2 Clipboard denied — Given the Clipboard API throws/denies, Then an error toast renders and no success toast is shown.
  AC-004.3 Action gating — Given a row with status accepted/expired/revoked, Then the copy-link action is not rendered/enabled for that row.

UC-005: Resend invitation
  AC-005.1 Action gating — Given a row with status pending/accepted/revoked, Then the resend action is not rendered/enabled; Given status = expired, Then it is enabled.
  AC-005.2 Loading — Given resend is clicked, Then that row's action shows an inline spinner/disabled state (no full-table skeleton).
  AC-005.3 Success — Given resend succeeds, Then the SAME row updates in place to status Pending with a refreshed expiry countdown, and a toast "Đã gửi lại lời mời tới {email}" renders.
  AC-005.4 Race error — Given the invitation is no longer in "expired" state server-side by the time resend is processed, Then an error toast "Không thể gửi lại — lời mời đã thay đổi trạng thái" renders and the list is refetched to reconcile.
  AC-005.5 Network error — Given resend fails on network/5xx, Then an error toast renders and the row is unchanged.

UC-006: Revoke invitation
  AC-006.1 Action gating — Given a row with status pending, Then the revoke action is enabled; for any other status, it is not rendered/enabled.
  AC-006.2 Confirm required — Given admin clicks revoke, Then a destructive confirm dialog "Thu hồi lời mời?" renders with body text naming the invitee email; no DELETE call fires before confirmation.
  AC-006.3 Cancel — Given the confirm dialog is open, When admin cancels, Then no request is sent and the row is unchanged.
  AC-006.4 Loading — Given admin confirms, Then the confirm button shows aria-busy + spinner while the DELETE is in flight.
  AC-006.5 Success — Given the DELETE succeeds, Then the dialog closes, a toast "Đã thu hồi lời mời của {email}" renders, and the row status becomes Revoked with 0.65 opacity dimming and all row actions removed.
  AC-006.6 Not-found race — Given the invitation was already consumed/removed server-side, Then an error toast "Không thể thu hồi lời mời (có thể đã được xử lý)" renders and the list is refetched.
  AC-006.7 Network error — Given the DELETE fails on network/5xx, Then an error toast renders, the confirm dialog stays open (or reopens), and the row is unchanged.

UC-007: Expiry countdown
  AC-007.1 Normal — Given a pending row with expiresAt ≥3 days away, Then the cell shows "Còn {N} ngày" in default text color, no icon.
  AC-007.2 Urgent — Given a pending row with expiresAt <3 days away, Then the cell shows bold text + alertTriangle icon in `--edu-warning-text` (never conveyed by background/text color alone).
  AC-007.3 Expired — Given an expired row, Then the cell shows "Hết hạn {date}" in muted text with a calendarX icon.
  AC-007.4 Not-applicable — Given a row with status accepted or revoked, Then the expiry cell renders an em-dash placeholder.
```

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length input | Concurrent action | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 List load | AC-001.3 zero invitations | N/A | Two tabs open, one revokes → other's list stale until refetch (not modeled — [OPEN QUESTION] OQ-B) | 401 mid-session → reactive refresh (existing interceptor, decision 0018), not story-specific | AC-001.4/.005 | Non-admin hitting route → route-gate redirect (out of this screen's scope, decision 0022/0024) |
| UC-002 Filter/search | AC-002.4 no-match | Very long search string → still debounced substring match, no crash (implied, not separately AC'd) | N/A | Same as UC-001 | Filter is client-state only; underlying list error still AC-001.4 | Same as UC-001 |
| UC-003 Send batch | Submit disabled with 0 chips (implied by AC-003.6) | Very large paste (e.g. 50 emails) → all parsed into chips, no client-side cap specified — [OPEN QUESTION] OQ-C | Two admins invite same email simultaneously → server-side duplicate guard, second submitter sees AC-003.10 | Session expires mid-dialog-fill → submit triggers reactive refresh or auth error surfaced generically | AC-003.12 | N/A (route already role-gated) |
| UC-004 Copy-link | N/A | N/A | Row revoked by another session right as copy-link clicked → link copied still points to now-invalid token (server rejects on visit) — not separately handled, flagged [OPEN QUESTION] OQ-D | Same as above | AC-004.2 | Action gated to pending only regardless of role |
| UC-005 Resend | N/A | N/A | AC-005.4 (race: already resent/revoked elsewhere) | Same | AC-005.5 | Action gated to expired only |
| UC-006 Revoke | N/A | N/A | AC-006.6 (race: already consumed) | Same | AC-006.7 | Action gated to pending only |
| UC-007 Countdown | N/A (always some state rendered) | N/A | N/A | N/A | N/A | N/A |

## 6. Open Questions

- `[OPEN QUESTION]` OQ-A: Is duplicate-email-within-the-same-batch rejected client-side (merge to one chip) or does FE simply submit the duplicate and let the server reject the second occurrence per-email (same as cross-batch duplicates)? AC-003.4 assumes client-side merge — confirm with `ba-lead`/design intent before `/fe` builds it.
- `[OPEN QUESTION]` OQ-B: If two admin sessions have the invitation table open concurrently and one revokes/resends a row, does the other session's table auto-refresh (polling/websocket) or only reconcile on next manual action/refetch? No FR covers this — assume "stale until next fetch" (standard REST list, no realtime requirement) unless `ba-lead` says otherwise.
- `[OPEN QUESTION]` OQ-C: Is there a maximum batch size for one send-invite submission (e.g. cap pasted emails at 20)? Not specified in requirements.md; flag to `ba-lead`/BE team before `/fe` implements chip-input parsing, to avoid an unbounded-request footgun.
- `[OPEN QUESTION]` OQ-D: If a pending invite is revoked in one tab immediately after its link was copied in another tab, is there any client-side signal, or does the copied link simply fail server-side when visited (acceptable, matches "server-authoritative" pattern)? Recommend no FE-side handling needed — confirm with `ba-lead`.
- Carried over from `integration.md` (needs resolution before `/fe` implementation, not blocking this AC pass): batch-send request shape (`INT-002`), resend endpoint shape (`INT-004`), missing `invitedBy`/`createdAt` DTO fields, copy-link token/inviteUrl DTO field, server-side vs client-side filter/search support.
