# Requirements — US-E17.6 Empty States — Notifications Center (All tab + Unread tab)

## Requirements Summary

The Notifications Center (`src/features/notification/presentation/notifications-center/`) has a local `EmptyState` component that renders title + body text for the All-tab and Unread-tab variants, but it does not follow the canonical `emptyStatePattern` (no icon, no `role="status"` on the container, incorrect sizing). This story upgrades both variants to the canonical pattern using the four existing i18n keys. The body text color SHALL be `var(--edu-text-secondary)` (not `var(--edu-text-muted)`) to satisfy WCAG 1.4.3 at 13 px — this is the only empty-state story in E17 with body text. No new tokens, no new i18n keys, no BE changes.

## Actors & Roles

| Role | Screen | Primary device |
|---|---|---|
| Teacher | `/teacher/notifications` | Desktop + mobile |
| Principal | `/principal/notifications` | Desktop |
| Student | `/student/notifications` | Mobile-first |
| Parent | `/parent/notifications` | Mobile-first |

All roles can see notifications. Student and Parent are primary mobile users.

## Functional Requirements

**TR-001** — All-tab empty state (canonical pattern)
When the "All" tab is active and the notification list is empty, the system SHALL render:
- Container: `role="status"`, centered column, padding 40px 20px
- Icon: `BellOff` 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `notifications.emptyAllTitle` ("Chưa có thông báo"), 16px/700, `var(--edu-text-primary)`
- Body: i18n key `notifications.emptyAllBody` ("Thông báo sẽ xuất hiện ở đây khi có hoạt động mới."), 13px, color advisory (see TR-NFR-001), max-width 320px
- CTA: none

**TR-002** — Unread-tab empty state (canonical pattern)
When the "Unread" tab is active and the unread notification list is empty, the system SHALL render:
- Container: `role="status"`, centered column, padding 40px 20px
- Icon: `CheckCircle` (or `CheckCircle2`) 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `notifications.emptyUnreadTitle` ("Tất cả đã đọc"), 16px/700, `var(--edu-text-primary)`
- Body: i18n key `notifications.emptyUnreadBody` ("Bạn đã đọc hết tất cả thông báo."), 13px, color advisory (see TR-NFR-001), max-width 320px
- CTA: none

**TR-003** — Tab switching preserves empty state variant
When the user switches between "All" and "Unread" tabs while both are empty, the icon and copy MUST switch to match the active tab (existing tab-switch logic is unchanged; empty state render is driven by the same `variant` prop).

**TR-004** — Loading and error states unchanged
Loading skeleton and error states SHALL remain exactly as implemented.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA) — contrast advisory**
- Title `var(--edu-text-primary)` = 9.4:1. PASS.
- Body at `var(--edu-text-muted)` = 3.08:1 on white at 13px. This FAILS WCAG 1.4.3 (4.5:1 required for 13px regular text).
- The FE team MUST use `var(--edu-text-secondary)` (5.1:1) for the body text, not `var(--edu-text-muted)`.
- `role="status"` on the container for screen reader announcement.
- Icon `aria-hidden="true"`.

**TR-NFR-002 — i18n**
No new keys. Uses existing `notifications.emptyAllTitle`, `notifications.emptyAllBody`, `notifications.emptyUnreadTitle`, `notifications.emptyUnreadBody`.

**TR-NFR-003 — No token additions**
Colors: `--edu-text-primary`, `--edu-text-muted` (icon), `--edu-text-secondary` (body). All exist in `tokens.css`.

## Scope Boundary

**IN scope:**
- `src/features/notification/presentation/notifications-center/notifications-center.tsx` — upgrade local `EmptyState` component

**OUT of scope:**
- Notification delivery logic, SSE, mark-as-read
- Any stat-card responsive fix

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001, TR-002 | Both empty state variants required |
| Must | TR-NFR-001 | WCAG AA — body contrast fix is mandatory (uses text-secondary, not text-muted) |
| Should | TR-003 | Tab switching correctness; already driven by existing `variant` prop |
| Should | TR-NFR-002, TR-NFR-003 | Zero-drift on i18n + tokens |

## Design Spec Reference

`docs/product/design-spec.jsonc` keys:
- `emptyStatePattern` — canonical layout
- `emptyStates.notifications.list.allTab` — bell-off icon, titleKey + bodyKey
- `emptyStates.notifications.list.unreadTab` — check-circle icon, titleKey + bodyKey
