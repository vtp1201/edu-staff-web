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

<!-- UX-WRITER: insert moderation.* key block here -->

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

## Status

- [ ] delivered
