# DR-013 — Content Reporting & Moderation

- **US**: US-E19.2 (epic E19 — Social)
- **Route(s)**: `(app)/principal/moderation` (principal/admin)
- **Mockup**: `design_src/edu/moderation.jsx` — `ModerationScreen`; **shared
  Report dialog** added to `design_src/edu/feed.jsx` (DR-012) and
  `design_src/edu/messaging.jsx` (report a message).
- **Type**: **RECONCILE** — mockup generated + audited (P2 in
  `PROMPTS-group-b-ui-gen.md`, P8 confirms "P2 moderation+report dialog ...
  đạt spec"). No redesign in this DR.
- **Already-implemented check**: no `moderation`/`social` feature folder or
  route in `src/`; no `moderation`/`reports` i18n namespace → net-new.

## Scope

Two parts, one DR (they share the report entity/model):

1. **Report dialog** (reused component, triggered from feed post/comment "…"
   and messaging message "…"): reason radio group (Spam / Ngôn từ không phù
   hợp / Bắt nạt / Thông tin sai / Khác + textarea), quoted preview of
   reported content, submit → toast confirmation. Content stays visible to
   the reporter (not hidden).
2. **ModerationScreen** (principal/admin): 3 `StatCard`s (Chờ xử lý / Đã xử
   lý tuần này / Đã gỡ nội dung), filter bar (status tabs + content-type
   select + search), report table (content preview, reporter, reason badge
   warning/error by severity, reported user, time, status badge, actions),
   detail sheet (full content + context + duplicate-report history + Dismiss
   / Remove-with-confirm), secondary tab "Nhật ký kiểm duyệt" (audit timeline,
   read-only, same pattern as `audit-log.jsx`).

## States (4 required — confirmed present)

- Loading: table skeleton (now shared `EduSkeleton`, per P8 item 6 — old
  bespoke `ModSkeleton` retired).
- Empty: "Không có báo cáo nào chờ xử lý" (positive tone) via shared
  `EduEmpty`.
- Error: banner + retry via shared `EduError`.
- Success: table populated + working filters.

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.moderation` (StatCard row, filter
bar, table columns, detail sheet, audit-log tab) + a **shared** `reportDialog`
sub-entry reused by feed/messaging (added by `uiux-designer`).

## UX copy (i18n keys)

Namespace: `moderation` (report dialog copy lives under `moderation.reportDialog.*`
so `feed.jsx`/`messaging.jsx` can reference the same keys instead of
duplicating them — avoids the i18n-drift mistake from DR-001).

```jsonc
// vi.json → "moderation"
{
  "moderation": {
    "reportDialog": {
      "title": "Báo cáo nội dung",
      "subtitle": "Báo cáo {kind} của {authorName}",
      "kindPost": "bài viết",
      "kindComment": "bình luận",
      "kindMessage": "tin nhắn",
      "kindContent": "nội dung",
      "close": "Đóng",
      "reasonGroupLabel": "Lý do báo cáo",
      "reasonSpam": "Spam",
      "reasonLanguage": "Ngôn từ không phù hợp",
      "reasonBully": "Bắt nạt",
      "reasonMisinfo": "Thông tin sai",
      "reasonOther": "Khác",
      "otherDescribeAriaLabel": "Mô tả lý do báo cáo",
      "otherPlaceholder": "Mô tả cụ thể vấn đề…",
      "cancel": "Hủy",
      "submit": "Gửi báo cáo",
      "toastSent": "Đã gửi báo cáo. BGH sẽ xem xét."
    },
    "stats": {
      "pending": "Chờ xử lý",
      "resolvedThisWeek": "Đã xử lý tuần này",
      "removed": "Đã gỡ nội dung"
    },
    "views": {
      "ariaLabel": "Chế độ xem kiểm duyệt",
      "queue": "Hàng chờ báo cáo",
      "audit": "Nhật ký kiểm duyệt"
    },
    "statusTabs": {
      "ariaLabel": "Lọc theo trạng thái",
      "pending": "Chờ xử lý",
      "resolved": "Đã xử lý",
      "all": "Tất cả"
    },
    "typeFilter": {
      "ariaLabel": "Lọc theo loại nội dung",
      "all": "Mọi loại nội dung",
      "post": "Bài viết",
      "comment": "Bình luận",
      "message": "Tin nhắn"
    },
    "search": {
      "ariaLabel": "Tìm trong báo cáo",
      "placeholder": "Tìm nội dung, người đăng, người báo cáo…"
    },
    "refresh": "Tải lại danh sách",
    "table": {
      "content": "Nội dung",
      "reporter": "Người báo cáo",
      "reason": "Lý do",
      "reportedUser": "Người bị báo cáo",
      "time": "Thời gian",
      "status": "Trạng thái",
      "action": "Hành động",
      "openDetail": "Mở chi tiết báo cáo {id}"
    },
    "status": {
      "pending": "Chờ xử lý",
      "removed": "Đã gỡ",
      "dismissed": "Đã bỏ qua"
    },
    "reason": {
      "spam": "Spam",
      "language": "Ngôn từ không phù hợp",
      "bully": "Bắt nạt",
      "misinfo": "Thông tin sai",
      "other": "Khác"
    },
    "type": {
      "post": "Bài viết",
      "comment": "Bình luận",
      "message": "Tin nhắn"
    },
    "detail": {
      "closeAriaLabel": "Đóng chi tiết",
      "reportedTitle": "{type} · {id}",
      "reportedContent": "Nội dung bị báo cáo",
      "originalPost": "Bài viết gốc",
      "conversationContext": "Ngữ cảnh hội thoại",
      "reported": "Bị báo cáo",
      "report": "Báo cáo",
      "duplicates": "Báo cáo trùng ({count})",
      "resolution": "Kết quả xử lý",
      "resolvedBy": "bởi {actor} · {time}",
      "dismiss": "Bỏ qua",
      "remove": "Gỡ nội dung"
    },
    "confirmRemove": {
      "title": "Gỡ {type} này?",
      "body": "Hành động này không thể hoàn tác. Nội dung sẽ bị gỡ khỏi hệ thống và {authorName} sẽ nhận được thông báo về quyết định kiểm duyệt.",
      "cancel": "Hủy",
      "confirm": "Gỡ nội dung"
    },
    "empty": {
      "pendingTitle": "Không có báo cáo nào chờ xử lý",
      "pendingDescription": "Tuyệt vời — cộng đồng trường đang lành mạnh. Báo cáo mới sẽ xuất hiện tại đây.",
      "filteredTitle": "Không tìm thấy báo cáo nào",
      "filteredDescription": "Thử đổi bộ lọc hoặc từ khoá tìm kiếm."
    },
    "error": {
      "title": "Không tải được danh sách báo cáo",
      "description": "Đã xảy ra lỗi khi kết nối. Vui lòng thử lại."
    },
    "audit": {
      "empty": "Chưa có hành động kiểm duyệt nào.",
      "removedBy": "{actor}",
      "removedAction": "Đã gỡ",
      "dismissedAction": "Đã bỏ qua",
      "byLine": "{typeLower} của {author}"
    },
    "toast": {
      "dismissed": "Đã bỏ qua báo cáo",
      "removed": "Đã gỡ nội dung và thông báo cho người đăng"
    }
  }
}
```

```jsonc
// en.json → "moderation" (mirror)
{
  "moderation": {
    "reportDialog": {
      "title": "Report content",
      "subtitle": "Report a {kind} by {authorName}",
      "kindPost": "post",
      "kindComment": "comment",
      "kindMessage": "message",
      "kindContent": "content",
      "close": "Close",
      "reasonGroupLabel": "Report reason",
      "reasonSpam": "Spam",
      "reasonLanguage": "Inappropriate language",
      "reasonBully": "Bullying",
      "reasonMisinfo": "Misinformation",
      "reasonOther": "Other",
      "otherDescribeAriaLabel": "Describe the reason",
      "otherPlaceholder": "Describe the issue…",
      "cancel": "Cancel",
      "submit": "Send report",
      "toastSent": "Report sent. School leadership will review it."
    },
    "stats": {
      "pending": "Pending",
      "resolvedThisWeek": "Resolved this week",
      "removed": "Content removed"
    },
    "views": {
      "ariaLabel": "Moderation view",
      "queue": "Report queue",
      "audit": "Moderation log"
    },
    "statusTabs": {
      "ariaLabel": "Filter by status",
      "pending": "Pending",
      "resolved": "Resolved",
      "all": "All"
    },
    "typeFilter": {
      "ariaLabel": "Filter by content type",
      "all": "All content types",
      "post": "Posts",
      "comment": "Comments",
      "message": "Messages"
    },
    "search": {
      "ariaLabel": "Search reports",
      "placeholder": "Search content, author, reporter…"
    },
    "refresh": "Refresh list",
    "table": {
      "content": "Content",
      "reporter": "Reporter",
      "reason": "Reason",
      "reportedUser": "Reported user",
      "time": "Time",
      "status": "Status",
      "action": "Action",
      "openDetail": "Open report {id}"
    },
    "status": {
      "pending": "Pending",
      "removed": "Removed",
      "dismissed": "Dismissed"
    },
    "reason": {
      "spam": "Spam",
      "language": "Inappropriate language",
      "bully": "Bullying",
      "misinfo": "Misinformation",
      "other": "Other"
    },
    "type": {
      "post": "Post",
      "comment": "Comment",
      "message": "Message"
    },
    "detail": {
      "closeAriaLabel": "Close details",
      "reportedTitle": "{type} · {id}",
      "reportedContent": "Reported content",
      "originalPost": "Original post",
      "conversationContext": "Conversation context",
      "reported": "Reported",
      "report": "Report",
      "duplicates": "Duplicate reports ({count})",
      "resolution": "Resolution",
      "resolvedBy": "by {actor} · {time}",
      "dismiss": "Dismiss",
      "remove": "Remove content"
    },
    "confirmRemove": {
      "title": "Remove this {type}?",
      "body": "This cannot be undone. The content will be removed and {authorName} will be notified of the moderation decision.",
      "cancel": "Cancel",
      "confirm": "Remove content"
    },
    "empty": {
      "pendingTitle": "No reports waiting",
      "pendingDescription": "Great — the school community is healthy. New reports will appear here.",
      "filteredTitle": "No reports found",
      "filteredDescription": "Try changing the filters or search keywords."
    },
    "error": {
      "title": "Could not load reports",
      "description": "Something went wrong. Please try again."
    },
    "audit": {
      "empty": "No moderation actions yet.",
      "removedBy": "{actor}",
      "removedAction": "Removed",
      "dismissedAction": "Dismissed",
      "byLine": "{typeLower} by {author}"
    },
    "toast": {
      "dismissed": "Report dismissed",
      "removed": "Content removed — author notified"
    }
  }
}
```

Notes:
- `moderation.reportDialog.*` is the single source for the shared dialog used
  by `feed.jsx` (DR-012) and `messaging.jsx` (DR-017) — do not re-key it under
  `feed.*` or `messaging.*`.
- Free-text moderator notes seeded in mock data (`resolveNote`, duplicate
  report timestamps) are per-report dynamic content, not static UI copy — `/fe`
  composes them from real data + the static fragments above
  (`moderation.audit.byLine`, `moderation.detail.resolvedBy`), not literal
  mock strings.

## A11y (WCAG 2.1 AA)

- Destructive "Gỡ nội dung" action: role-gated (principal/admin only) +
  confirm dialog stating the action is irreversible + notifies the author.
- Status badges: icon + text, not color-only.
- Sheet: correct focus-trap semantics (Radix Sheet).
- Mobile: table → card list.

## BE contract

Service `social` (US-098). `POST /api/v1/reports`, `GET /api/v1/reports`,
`POST /api/v1/reports/{reportId}/resolve`, `GET
/api/v1/rooms/{roomId}/moderation-audit`, `DELETE .../moderate-delete`.

## Dependencies

- Shares the Report dialog spec/copy with DR-012 (feed) and DR-017
  (messaging presence touches the same `messaging.jsx` file — sequence
  already resolved in the mockup: P2 before P6, avoiding a double-diff).
- `uiux-designer`/`uiux-ux-writer`: write the `reportDialog` design-spec
  entry and i18n keys ONCE here; DR-012 references them, does not duplicate.

## Design-review (gate)

Carried over from the P2 audit in `PROMPTS-group-b-ui-gen.md` (P8 confirms
"P2 moderation+report dialog ... đạt spec"). Verdict: **Pass**. States 4/4
present via shared `EduSkeleton`/`EduEmpty`/`EduError`. Destructive
"Gỡ nội dung" is role-gated + confirm-dialog per a11y notes above; report
dialog copy centralized under `moderation.reportDialog.*` to avoid the DR-001
i18n-duplication mistake.

## Status

- [x] delivered (2026-07-12)
