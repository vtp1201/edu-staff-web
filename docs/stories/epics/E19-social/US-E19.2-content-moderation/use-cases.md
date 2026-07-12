# US-E19.2 — Content Moderation — Use Cases & Acceptance Criteria

Source: `requirements.md` (TR-191), `integration.md` (INT-191-01…07), and the
Ba-Lead Decision (2026-07-12) resolving FR-108's role-gate to **`principal`
only** (applies existing decision `0022`, no new ADR). This document owns and
fully specifies the SHARED `ReportContentDialog` contract's own AC (UC-1921/
UC-1922) — US-E19.1's use-cases.md (`docs/stories/epics/E19-social/US-E19.1-social-feed/use-cases.md`,
UC-1906) references this contract by name only and does not duplicate any of
its internal AC. Any future consumer (e.g. US-E10.6 messaging) must likewise
reference, not redefine, UC-1921/UC-1922.

## 1. Use Case Scope Summary

- **Total use cases:** 10 (UC-1921…UC-1930).
- **Actors:** principal (sole actor for the Moderation screen: queue, detail
  sheet, dismiss, remove, audit log); teacher/student/parent as consumer-only
  actors of the shared Report dialog (UC-1921/UC-1922), triggered from the
  feed ("…" menu, US-E19.1) or messaging (out of scope, dependency-only).
- **Boundaries:** covers the shared Report dialog's full contract, the
  Moderation screen's stat row, filterable queue, detail sheet, dismiss,
  the destructive Remove-content action (role-gated `principal` only,
  confirm-dialog-gated, audit-logged), the audit log tab, and duplicate-report
  visibility. All 5 required UI states (loading / empty-positive /
  empty-filtered / error / success) are modeled.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities (this story) |
| --- | --- | --- |
| Principal | Human, authenticated | View Moderation screen; filter/search queue; open detail sheet; dismiss a pending report; remove reported content (destructive, confirm-gated); view read-only audit log |
| Teacher | Human, authenticated | Trigger the shared Report dialog only (consumer, from feed's "…" menu — owned by US-E19.1) |
| Student | Human, authenticated | Trigger the shared Report dialog only (consumer, from feed) |
| Parent | Human, authenticated | Trigger the shared Report dialog only (consumer, from feed) |
| (Not modeled here) admin | N/A | Per Ba-Lead Decision, `admin` is explicitly NOT an actor for this route (`(app)/principal/moderation` only) — do not model admin AC |

## 3. Use Case Catalogue

### UC-1921: Open the shared Report dialog (component contract)
- **Primary actor:** any authenticated role except the content's own author (teacher/principal/student/parent as consumers via feed; messaging is a dependency-only consumer, out of scope).
- **Preconditions:** caller invokes the dialog with `{ kind: "post"|"comment"|"message", contentId, authorName, content preview }`; current user is not the content's author.
- **Main success scenario:**
  1. Dialog opens, focus-trapped, showing: reason radiogroup (Spam / Ngôn từ không phù hợp / Bắt nạt / Thông tin sai / Khác), a quoted preview of the reported content clamped to 3 lines, and a Submit button.
  2. Submit is disabled until a reason is selected.
  3. If reason = "Khác", an additional note field becomes required; Submit stays disabled until the note is non-empty.
- **Alternative flows:**
  - A1 — User cancels/closes the dialog (Escape, outside click, or Cancel button) → dialog closes, no report created, focus returns to the invoking trigger.
  - A2 — Caller passes `kind="message"` (messaging consumer, out of scope for build here but contract must support it) → dialog renders identically, only the quoted-preview framing differs per kind.
- **Exception flows:**
  - E1 — Dialog invoked without a required prop (`kind`/`content`/`authorName` missing) → this is a caller-side integration error (a defensive/dev-time assertion), NOT a runtime user-facing error state.
- **Business rules:** ONE dialog implementation for all callers — no per-consumer forked copy; i18n keys live ONLY under `moderation.reportDialog.*` (no duplicate keys under `feed.*`/`messaging.*`, per NFR-104).
- **Non-functional constraints:** focus-trapped (Tab loop, Escape, return-focus-on-close per NFR-102); radiogroup has proper ARIA roles + labels; quoted preview has sufficient contrast (`text-edu-text-muted` NOT used for this — meaningful content uses `text-muted-foreground` at minimum per design-system contrast rule).

### UC-1922: Submit a report
- **Primary actor:** same as UC-1921.
- **Preconditions:** dialog open, a reason selected (and note present if reason="Khác").
- **Main success scenario:**
  1. User clicks Submit.
  2. POST fires (INT-191-01) with `{ kind, contentId, reason, note? }`.
  3. On success: report created (`status: "pending"`), dialog closes, toast "Đã gửi báo cáo. BGH sẽ xem xét." appears.
  4. Reported content remains visible to the reporter (not auto-hidden anywhere it's rendered).
- **Alternative flows:**
  - A1 — Duplicate self-report (409 CONFLICT, same user/same content) → see Exception E3; product decision on exact UX still open (see Open Questions).
- **Exception flows:**
  - E1 — 422 VALIDATION_ERROR (missing reason, or missing note when reason="Khác") → inline field error inside the dialog, dialog stays open, no toast.
  - E2 — Retryable transient failure (429/502/503/504) → inline error inside the dialog, dialog stays open, NO toast (explicit — toast only on true success).
  - E3 — 409 CONFLICT (ALREADY_REPORTED) → inline info-toned message (not a blocking error) inside the dialog; whether the dialog then auto-closes or requires explicit dismissal is an [OPEN QUESTION] — see §6.
- **Business rules:** submit button disabled while pending (`aria-busy`); exactly one submit per open dialog instance (no double-submit).
- **Non-functional constraints:** submit button shows a pending/spinner state; inline errors are announced to assistive tech (e.g. `aria-live="polite"` region or `aria-describedby` on the field).

### UC-1923: View moderation stat row
- **Primary actor:** principal.
- **Preconditions:** principal navigates to `(app)/principal/moderation`.
- **Main success scenario:**
  1. Three StatCards render: "Chờ xử lý" (pending count), "Đã xử lý tuần này" (resolved-this-week count), "Đã gỡ nội dung" (removed count).
  2. Values reflect current queue state on load and after any resolve/remove action.
- **Alternative flows:** none beyond re-fetch/refresh after a dismiss/remove action changes the underlying counts.
- **Exception flows:**
  - E1 — Stat fetch fails → the WHOLE screen falls back to the error state (FR-103/FR-108 shared error path, see UC-1927 AC-1927.4), not just the stat row in isolation.
- **Business rules:** "resolved this week" boundary (rolling 7 days vs calendar week) is BE-determined (see integration.md assumption).
- **Non-functional constraints:** StatCard pattern reused per design-system component patterns (icon box 52×52, value 26px/800).

### UC-1924: Filter/search the report queue
- **Primary actor:** principal.
- **Preconditions:** principal on the Moderation screen, queue view (not audit tab).
- **Main success scenario:**
  1. Principal selects a status tab (Chờ xử lý / Đã xử lý / Tất cả), a content-type filter (Mọi loại / Bài viết / Bình luận / Tin nhắn), and/or types a free-text search.
  2. Queue re-filters (client- or server-side) per applied criteria.
- **Alternative flows:**
  - A1 — Multiple filters combined (status + type + search) → all apply as an AND condition.
  - A2 — Filters cleared → queue returns to the unfiltered status-tab view.
- **Exception flows:**
  - E1 — Filtered result set is empty while the underlying (unfiltered) queue is non-empty → empty-filtered variant (UC-1927 AC-1927.3), NOT the positive-tone empty-pending variant.
- **Business rules:** the pending-tab "true empty" (zero pending reports total) is distinguished from "filtered to zero" by comparing the filtered result count against the unfiltered `stats.pendingCount` (integration.md INT-191-02).
- **Non-functional constraints:** search input has a `<label>`/`aria-label`; filter re-render feels immediate (≤150ms perceived, NFR-105) for client-side filtering.

### UC-1925: Open report detail sheet
- **Primary actor:** principal.
- **Preconditions:** principal viewing the queue (table or mobile card list).
- **Main success scenario:**
  1. Principal clicks a report row (or activates "Mở chi tiết báo cáo {id}").
  2. Focus-trapped detail sheet opens: skeleton/spinner while INT-191-03 loads.
  3. On success: full reported content, author, context (original post for comment reports; nearby messages with reported one highlighted for message reports), reporter, reason, optional note, duplicate-report list (if any), and — when `status !== "pending"` — resolvedBy/resolvedAt/resolveNote.
- **Alternative flows:**
  - A1 — Report is already resolved/removed → resolve-info section renders instead of the action footer (Dismiss/Remove buttons hidden for non-pending reports).
  - A2 — Report has 0 duplicates → duplicate section omitted or shows "0" without a list (per UC-1930).
- **Exception flows:**
  - E1 — 404 REPORT_NOT_FOUND → sheet shows inline error, does NOT silently render stale/cached data.
  - E2 — Retryable transient failure → inline error with retry inside the sheet.
- **Business rules:** section visibility (footer actions, resolve-info) is strictly a function of `report.status`.
- **Non-functional constraints:** focus-trapped (Tab loop, Escape, return-focus-on-close, NFR-102); sheet usable at 375px (NFR-103).

### UC-1926: Dismiss a report (non-destructive)
- **Primary actor:** principal.
- **Preconditions:** report detail sheet open, `report.status === "pending"`.
- **Main success scenario:**
  1. Principal clicks "Bỏ qua" in the sheet footer.
  2. POST fires (INT-191-04, `action: "dismiss"`).
  3. On success: `status → "dismissed"`, toast "Đã bỏ qua báo cáo", audit log entry recorded server-side, queue/stat row refetches.
- **Alternative flows:** none beyond the happy path (dismiss has no destructive-confirm step, unlike Remove).
- **Exception flows:**
  - E1 — 409 CONFLICT (status no longer pending, race with another principal) → inline error, sheet refetches the report to show its actual current state, no silent overwrite.
  - E2 — 403 FORBIDDEN → distinct message, no retry.
  - E3 — Retryable transient failure → inline error, retry, status unchanged.
- **Business rules:** Dismiss button only rendered/enabled when `status === "pending"`.
- **Non-functional constraints:** button shows pending state (`aria-busy`) on click.

### UC-1927: Queue UI states (loading / empty-positive / empty-filtered / error / success)
- **Primary actor:** principal.
- **Preconditions:** principal on the Moderation screen.
- **Main success scenario:** exactly one of the 5 states is visible at a time, consistent with fetch/filter status (see AC below for each).
- **Alternative flows:** transition between states as filters/fetch status change (e.g. success → empty-filtered when a filter narrows to zero, without a full page reload).
- **Exception flows:** covered by AC-1927.4/1927.5.
- **Business rules:** the true-empty vs filtered-empty distinction (FR-107) is mandatory — a generic empty state is not acceptable when a filter is the actual cause.
- **Non-functional constraints:** skeleton visible ≤320ms (NFR-105).

### UC-1928: Remove reported content (destructive, confirm-gated, HIGH-RISK)
- **Primary actor:** principal ONLY (Ba-Lead Decision, FR-108 — not "principal-or-admin").
- **Preconditions:** detail sheet open, `report.status === "pending"`, current user is `principal`.
- **Main success scenario:**
  1. Principal clicks "Gỡ nội dung" in the detail sheet.
  2. A confirm dialog (`role="alertdialog"`, focus-trapped) opens stating the action is irreversible and that the content author will be notified.
  3. Principal clicks "Gỡ nội dung" again inside the confirm dialog.
  4. DELETE fires (INT-191-05) with `{ postId|commentId, reportId, reason? }`.
  5. On success: confirm dialog closes; toast "Đã gỡ nội dung và thông báo cho người đăng"; report `status → "removed"`; queue row updates; audit log entry appended server-side with actor + timestamp + reason.
- **Alternative flows:**
  - A1 — Principal cancels the confirm dialog → no call made, detail sheet returns to its pre-confirm state, `report.status` unchanged.
- **Exception flows:**
  - E1 — 403 FORBIDDEN / NOT_PRINCIPAL (server-side authorization rejection) → confirm dialog shows a DISTINCT inline error with explicit permissions-problem copy (e.g. "Bạn không có quyền thực hiện hành động này"); content is NOT marked removed client-side (no optimistic remove); dialog stays open; NO retry button shown (this is not a transient condition).
  - E2 — 409 CONFLICT (report already resolved concurrently by another principal) → distinct message; confirm dialog closes; queue refetches to reflect the actual current state.
  - E3 — Retryable transient failure (429/502/503/504) → confirm dialog shows inline error WITH a retry button; content still not marked removed until a subsequent success.
- **Business rules:** NEVER optimistic — the UI must not show content as removed until the server call actually succeeds (NFR-101). The 403-vs-transient distinction MUST branch on `error.code`, never on `error.message` (standing convention, integration.md §2 INT-191-05).
- **Non-functional constraints:** confirm dialog is `role="alertdialog"`, focus-trapped (NFR-102); destructive button uses the danger/destructive visual variant, semantically distinct (not color-only — icon/label too); Remove entry point itself is rendered ONLY for `principal` (server remains the true enforcement boundary per NFR-005/NFR-101 — client hiding is a UX affordance only).

### UC-1929: View moderation audit log (read-only)
- **Primary actor:** principal.
- **Preconditions:** principal on the Moderation screen, switches to the "Nhật ký kiểm duyệt" tab.
- **Main success scenario:**
  1. GET fires (INT-191-07).
  2. Timeline renders reverse-chronological: each entry shows actor, action badge (removed/dismissed), content reference, timestamp, reason.
- **Alternative flows:**
  - A1 — Load more entries via cursor pagination (if the timeline is long).
- **Exception flows:**
  - E1 — Fetch fails (retryable) → error state consistent with UC-1927's error pattern.
  - E2 — 403 FORBIDDEN (defense-in-depth, non-principal somehow reaching this tab) → distinct "không có quyền" message, no retry.
- **Business rules:** audit log is strictly read-only — no actions available from this tab.
- **Non-functional constraints:** action badges carry icon + text, not color-only (NFR-102).

### UC-1930: View duplicate-report list
- **Primary actor:** principal.
- **Preconditions:** detail sheet open, reported content has >1 report.
- **Main success scenario:** duplicate-report section renders with a count in its header and a list of other reporterName/createdAt entries for the same content.
- **Alternative flows:**
  - A1 — Content has exactly 1 report (no duplicates) → section omitted or shows a "0 báo cáo trùng lặp" state without a list.
- **Exception flows:** none beyond the parent detail-fetch's own error handling (UC-1925 E1/E2) — no separate fetch for duplicates (bundled in INT-191-03 response).
- **Business rules:** duplicate count reflects reports on the SAME `contentId`, not the same reporter.
- **Non-functional constraints:** none beyond general detail-sheet a11y (UC-1925).

## 4. Acceptance Criteria

```
UC-1921: Open the shared Report dialog (component contract)
  AC-1921.1 Opens with correct content — Given a caller invokes ReportContentDialog with kind="post", contentId, authorName, and a content preview, When it opens, Then the dialog renders the reason radiogroup, a quoted preview clamped to 3 lines matching the passed content, and a disabled Submit button.
  AC-1921.2 Reason enables submit — Given the dialog is open with Submit disabled, When the user selects any reason other than "Khác", Then Submit becomes enabled.
  AC-1921.3 "Khác" requires a note — Given the user selects reason="Khác", When no note has been entered, Then Submit remains disabled; When a non-empty note is entered, Then Submit becomes enabled.
  AC-1921.4 Cancel — Given the dialog is open, When the user presses Escape or clicks Cancel/outside, Then the dialog closes without creating a report and focus returns to the original trigger element.
  AC-1921.5 Focus trap — Given the dialog is open, When the user presses Tab repeatedly, Then focus cycles only within the dialog's focusable elements (never escapes to background content).
  AC-1921.6 Single source of truth — Given this dialog is invoked from the feed (US-E19.1) or from messaging (US-E10.6, dependency-only), Then in both cases the SAME component instance/contract renders (verified by props-in/behavior-out — no forked per-consumer copy exists in the codebase).

UC-1922: Submit a report
  AC-1922.1 Happy path — Given a valid reason (and note if "Khác") is selected, When the user clicks Submit, Then the dialog shows a pending/aria-busy state, the POST fires, and on success the dialog closes with toast "Đã gửi báo cáo. BGH sẽ xem xét." (vi/en).
  AC-1922.2 Loading — Given Submit has been clicked and the request is in flight, Then the Submit button shows aria-busy + spinner and is disabled against double-submit.
  AC-1922.3 Validation error — Given the server returns 422 VALIDATION_ERROR (e.g. race where reason became invalid), When the response returns, Then an inline field error appears inside the dialog, the dialog stays open, and no toast is shown.
  AC-1922.4 Transient error — Given the server returns a retryable error (429/502/503/504), When the response returns, Then an inline error with a retry affordance appears inside the dialog, the dialog stays open, and no toast is shown.
  AC-1922.5 Duplicate report (409) — Given the server returns 409 CONFLICT (ALREADY_REPORTED), When the response returns, Then an inline informational (non-error-toned) message appears inside the dialog communicating the content was already reported by this user; exact close-vs-stay-open behavior is [OPEN QUESTION — see §6], but in no case does this path show a success toast.
  AC-1922.6 Content stays visible — Given a report was successfully submitted, When the reporter returns to the feed/thread that contained the reported content, Then that content is still visible there (not auto-hidden).
  AC-1922.7 i18n — Given the dialog renders in either locale, Then all static copy (reason labels, toast, error messages) is sourced from the `moderation.reportDialog.*` namespace with no duplicate keys existing under `feed.*` or `messaging.*` (grep-verifiable per NFR-104).

UC-1923: View moderation stat row
  AC-1923.1 Success — Given the queue fetch succeeds, Then three StatCards render with correct pendingCount/resolvedThisWeekCount/removedCount values.
  AC-1923.2 Error — Given the stat/queue fetch fails, Then the WHOLE Moderation screen (not just the stat row) falls back to the error state (see UC-1927 AC-1927.4) — stats never render partially against a failed base fetch.
  AC-1923.3 Refresh after action — Given a Dismiss (UC-1926) or Remove (UC-1928) action succeeds, When the action completes, Then the stat row values refetch/update to reflect the new counts.

UC-1924: Filter/search the report queue
  AC-1924.1 Status tab filter — Given the principal selects "Đã xử lý", When applied, Then only resolved (dismissed/removed) reports show.
  AC-1924.2 Content-type filter — Given the principal selects "Bình luận", When applied, Then only comment-kind reports show.
  AC-1924.3 Free-text search — Given the principal types a query matching an author's name, When applied (debounced), Then only matching reports show.
  AC-1924.4 Combined filters — Given status="Chờ xử lý" + type="Bài viết" + a search term are all applied, Then results satisfy all three conditions (AND).
  AC-1924.5 Filtered-empty — Given the applied filters yield zero results while stats.pendingCount (or the relevant unfiltered baseline) is > 0, Then the empty-filtered variant renders: "Không tìm thấy báo cáo nào" (see UC-1927 AC-1927.3), never the positive-tone empty-pending copy.

UC-1925: Open report detail sheet
  AC-1925.1 Loading — Given a report row is clicked, When the detail fetch is pending, Then the sheet opens with a skeleton/spinner state.
  AC-1925.2 Success (pending report) — Given the fetch succeeds for a status="pending" report, Then the sheet shows full content, author, context, reporter/reason/note, duplicate list (if any), and BOTH Dismiss and Gỡ nội dung action buttons in the footer.
  AC-1925.3 Success (resolved report) — Given the fetch succeeds for a status!=="pending" report, Then the sheet shows resolvedBy/resolvedAt/resolveNote instead of the action footer (no Dismiss/Remove buttons).
  AC-1925.4 Not found — Given the fetch returns 404 REPORT_NOT_FOUND, Then the sheet shows an inline error and does NOT render any stale/previously-cached report data.
  AC-1925.5 Transient error — Given a retryable fetch failure, Then the sheet shows an inline error with retry.
  AC-1925.6 Focus trap — Given the sheet is open, Then Tab cycles only within it, Escape closes it, and focus returns to the triggering row on close.
  AC-1925.7 Responsive — Given the viewport is 375px wide, Then the sheet remains fully usable (no clipped/unreachable content or controls).

UC-1926: Dismiss a report (non-destructive)
  AC-1926.1 Happy path — Given a pending report's detail sheet is open, When the principal clicks "Bỏ qua", Then on success status becomes "dismissed", toast "Đã bỏ qua báo cáo" shows, and an audit log entry exists (verifiable via UC-1929) recorded server-side.
  AC-1926.2 Loading — Given the dismiss call is in flight, Then the "Bỏ qua" button shows aria-busy and is disabled against double-click.
  AC-1926.3 Precondition gate — Given report.status !== "pending", Then the "Bỏ qua" button is not rendered at all in the footer.
  AC-1926.4 Conflict — Given the dismiss call returns 409 CONFLICT, When the response returns, Then an inline error shows and the sheet refetches to display the report's actual current (already-resolved) state, with no silent overwrite of that state.
  AC-1926.5 Forbidden — Given the dismiss call returns 403 FORBIDDEN, Then a distinct message shows with no retry affordance.
  AC-1926.6 Transient error — Given a retryable dismiss failure, Then an inline error with retry shows and status remains unchanged.

UC-1927: Queue UI states (loading / empty-positive / empty-filtered / error / success)
  AC-1927.1 Loading — Given the Moderation screen is navigated to, When the queue fetch is pending, Then EduSkeleton renders exactly 5 rows.
  AC-1927.2 Empty-positive — Given the pending tab is active AND the unfiltered pending queue truly has zero reports, Then EduEmpty renders with the positive-tone copy "Không có báo cáo nào chờ xử lý" (no negative/alarming tone — this is a good outcome).
  AC-1927.3 Empty-filtered — Given a filter or search is applied AND it yields zero results while the underlying (unfiltered) queue is non-empty, Then a DISTINCT neutral-tone EduEmpty variant renders: "Không tìm thấy báo cáo nào" — never conflated with AC-1927.2's copy.
  AC-1927.4 Error — Given the queue/stat fetch fails with a retryable error, Then EduError renders with a retry button.
  AC-1927.5 Success — Given the fetch succeeds with reports.length > 0, Then the table (or stacked-card list at ≤760px, NFR-103) renders with working filters and exactly one primary state is visible.
  AC-1927.6 State exclusivity — Given any of the above states is showing, Then no other primary state (loading/empty-positive/empty-filtered/error/success) is simultaneously visible.

UC-1928: Remove reported content (destructive, confirm-gated, HIGH-RISK)
  AC-1928.1 Entry point role-gate — Given the current user is `principal`, When viewing a pending report's detail sheet, Then "Gỡ nội dung" renders; Given the current user is any other role reaching this screen by any means, Then the entry point is not rendered (defense-in-depth; the route itself is principal-gated at the layout level).
  AC-1928.2 Confirm dialog copy — Given "Gỡ nội dung" is clicked, When the confirm dialog opens, Then it is role="alertdialog", focus-trapped, and states BOTH that the action is irreversible AND that the content author will be notified.
  AC-1928.3 Happy path — Given the confirm dialog is open, When the principal confirms, Then on success: dialog closes, toast "Đã gỡ nội dung và thông báo cho người đăng" shows, report.status becomes "removed", the queue row reflects "removed", and an audit entry (actor+timestamp+reason) is retrievable via UC-1929.
  AC-1928.4 Loading — Given the confirm click has fired the DELETE call, Then the confirm dialog's confirm button shows aria-busy + spinner and content is NOT marked removed anywhere in the UI until the call resolves successfully (no optimistic update).
  AC-1928.5 Cancel — Given the confirm dialog is open, When the principal clicks Cancel/Escape, Then no DELETE call is made and report.status remains unchanged.
  AC-1928.6 Forbidden (403) — Given the DELETE call returns 403 FORBIDDEN/NOT_PRINCIPAL, When the response returns, Then the confirm dialog shows a DISTINCT inline error with explicit permissions-problem copy (e.g. "Bạn không có quyền thực hiện hành động này"), content remains NOT removed in the UI, the dialog stays open, and NO retry button is shown — this error path MUST be visibly and semantically different from AC-1928.7's transient-error path (different copy, no retry vs retry), verifying NFR-101's "zero client-only trust" / 403-vs-transient distinction.
  AC-1928.7 Transient error (retryable) — Given the DELETE call returns a retryable error (429/502/503/504), When the response returns, Then the confirm dialog shows an inline error WITH a retry button, and content remains not-removed until a subsequent successful call.
  AC-1928.8 Conflict (409) — Given the DELETE call returns 409 CONFLICT (already resolved by another principal), When the response returns, Then a distinct message shows, the confirm dialog closes, and the queue refetches to show the report's actual current state.
  AC-1928.9 Error-branch discipline — Given any failure response, Then the failure-union mapping (`ModerationFailure "forbidden"` vs `"already-resolved"` vs a retryable/transient type) branches strictly on `error.code`, never on `error.message` — this is a code-review-verifiable AC, not just a runtime-observable one.

UC-1929: View moderation audit log (read-only)
  AC-1929.1 Loading — Given the "Nhật ký kiểm duyệt" tab is opened, When the fetch is pending, Then EduSkeleton renders.
  AC-1929.2 Success — Given the fetch succeeds, Then entries render reverse-chronological, each with actor, action badge (icon+text, not color-only), content reference, timestamp, and reason.
  AC-1929.3 Empty — Given the fetch succeeds with zero entries, Then a simple empty state renders (no positive/filtered distinction required for this tab, unlike the queue).
  AC-1929.4 Error — Given a retryable fetch failure, Then an error state consistent with UC-1927's pattern (EduError + retry) renders.
  AC-1929.5 Forbidden — Given a 403 FORBIDDEN response (defense-in-depth), Then a distinct "không có quyền" message renders with no retry.
  AC-1929.6 Read-only — Given any entry in the timeline, Then no action control (edit/delete/undo) is rendered anywhere in this tab.

UC-1930: View duplicate-report list
  AC-1930.1 Has duplicates — Given a report's contentId has been reported by ≥2 distinct reporters, When the detail sheet opens, Then a duplicate section renders with a header count (e.g. "3 báo cáo trùng lặp") and a list of the other reporterName/createdAt entries.
  AC-1930.2 No duplicates — Given a report's contentId has exactly 1 report, When the detail sheet opens, Then the duplicate section is omitted OR shows a "0" state without an empty list placeholder taking excess vertical space.
```

## 5. Edge Case Matrix

| Use case / feature | Empty | Max-length | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-1921/1922 Report dialog | N/A (dialog always has content passed in) | AC-1922.3 oversized note → 422 inline field error | AC-1922.5 duplicate self-report (409) | Same interceptor pattern as all authenticated calls (decision 0018) | AC-1922.4 inline error + retry, no toast | N/A — any non-author role may report (author-exclusion is the only "role" rule, AC-1921 precondition) |
| UC-1923 Stat row | N/A (always shows 3 cards; zero counts are valid values, not an empty state) | N/A | AC-1923.3 refresh after concurrent dismiss/remove by another principal session | Same interceptor pattern | AC-1923.2 whole-screen error fallback | Non-principal blocked at route/layout level (out of this story's per-component AC) |
| UC-1924 Filter/search | AC-1924.5 filtered-empty distinct from true-empty | Search term max-length — [OPEN QUESTION: not specified, assume standard text-input max, flag if BE enforces a limit] | Filters applied while a dismiss/remove is in flight elsewhere → next fetch reflects new state, no stale overwrite | Same interceptor pattern | Falls back to AC-1927.4 error state | Route-level gate (principal only) |
| UC-1925 Detail sheet | N/A | N/A | AC-1926.4/AC-1928.8 — 409 conflict when another principal resolves concurrently | Same interceptor pattern | AC-1925.5 inline error + retry | Route-level gate |
| UC-1926 Dismiss | N/A (only reachable when status=pending) | N/A | AC-1926.4 409 conflict → refetch, no overwrite | Same interceptor pattern | AC-1926.6 inline error + retry | AC-1926.5 403 → distinct message, no retry |
| UC-1927 Queue states | AC-1927.2 (true) vs AC-1927.3 (filtered) — both modeled distinctly | N/A | N/A | Same interceptor pattern | AC-1927.4 EduError + retry | Route-level gate |
| UC-1928 Remove (destructive) | N/A | Reason/resolveNote max-length — [OPEN QUESTION: required vs optional, and any max-length, per integration.md open question] | AC-1928.8 409 conflict → distinct message, dialog closes, refetch | Same interceptor pattern | AC-1928.7 inline error WITH retry (the one case retry applies here) | AC-1928.1/1928.6 — THE central wrong-role case: entry point hidden for non-principal AND server-side 403 produces a semantically distinct, non-retryable error (AC-1928.6) — this is the story's highest-risk AC pairing |
| UC-1929 Audit log | AC-1929.3 simple empty (no positive/filtered split needed) | N/A | N/A (append-only, read-only) | Same interceptor pattern | AC-1929.4 EduError + retry | AC-1929.5 403 → distinct message, no retry |
| UC-1930 Duplicates | AC-1930.2 zero-duplicates state | N/A | N/A (bundled in detail fetch, no separate race) | N/A (bundled) | N/A (bundled — inherits UC-1925's error handling) | Route-level gate |

## 6. Open Questions

- `[OPEN QUESTION]` (carried from requirements.md, escalate to `ba-lead`) Does the Remove-content action need a moderator resolution note distinct from the original report's reason, and is that note required or optional? Affects AC-1928.2's confirm-dialog fields and the edge-case matrix's "max-length" column for UC-1928. `resolveNote` currently appears mock/seed-only in design-spec.
- `[OPEN QUESTION]` (carried from integration.md) Duplicate self-report handling (AC-1922.5, 409 CONFLICT) — whether the dialog auto-closes with the informational message or requires the user to explicitly dismiss it; recommend requiring explicit dismissal (consistent with "no toast" on non-success paths) but this is a product-UX call, not this document's to make unilaterally.
- `[OPEN QUESTION]` (carried from integration.md) INT-191-03 (report detail) endpoint path/existence is unconfirmed against a published `openapi.yaml` — if BE confirms detail is instead derivable client-side from the list response, UC-1925's "loading" AC (AC-1925.1) may collapse to instant-render; flag to `fe-state-engineer` before query design.
- `[OPEN QUESTION]` (carried from integration.md) `INT-191-07`'s `roomId` param naming suggests a messaging-originated contract — confirm what value FE passes for feed/moderation audit scope (classId/schoolId/tenant) before `fe-state-engineer` designs the audit-log query key; may affect whether UC-1929 is a single fetch or needs aggregation across scopes.
- `[OPEN QUESTION]` (carried from requirements.md, needs an ADR per lane rules if it changes anything) Whether "resolved this week" is a rolling 7-day window or calendar week — affects AC-1923.1's expected `resolvedThisWeekCount` value at week boundaries; currently assumed BE-determined and opaque to FE.
- `[OPEN QUESTION]` Search input max-length for UC-1924's free-text search (AC-1924.3) is not specified anywhere in requirements/integration — flag to `ba-lead`/BE if a hard limit exists (affects only an edge-case AC, not a Must-priority gap).
