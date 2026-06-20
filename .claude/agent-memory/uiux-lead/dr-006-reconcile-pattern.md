---
name: dr-006-reconcile-pattern
description: DR-006 Notifications Center reconcile — 5th confirmation: notifications.jsx + i18n fully built; only design-spec.jsonc entry was missing
metadata:
  type: project
---

DR-006 Notifications Center (US-E10.2) — 5th reconcile-only DR.

**Fact:** All three artifacts fully existed before DR-006 ran:
- `design_src/edu/notifications.jsx` — 661 lines, NotificationsCenterScreen, complete with SSE simulation (decision 0009), filter pills, skeleton, empty states, sonner toast.
- `src/features/notification/` — full Clean-Arch stack (domain/infra/presentation).
- Route `src/app/.../notifications/` — implemented.
- `src/bootstrap/i18n/messages/{vi,en}.json` — `notifications` namespace with 30 keys (all states: title, subtitle, filters, markAllRead, loadMore, empty, error, toast, aria labels).
- `docs/product/screens.md` — row exists, status 🎨 design-ready.

**Gap:** `docs/product/design-spec.jsonc` had NO `screens.notifications` entry — only sidebar nav arrays + a `notificationsCard` (dashboard widget, not the full-page screen).

**Action:** Added full normative `screens.notifications` entry (~170 lines) covering: page layout, breadcrumb, header (icon box + unread badge + mark-all-read button), filter pills (6 tabs with count badges), notification type taxonomy (5 types), list container, notification row spec (unread/read states with left-border accent + bg tint), load-more, all states (loading skeleton, emptyAll, emptyUnread, allLoaded, error), SSE toast spec, a11y annotations, i18n namespace reference.

**Zero new i18n keys** — all 30 existing keys reused.

**Why:** The `screens.notifications` entry was the only missing piece linking the implemented feature to its normative design contract for `/ba` and `/fe`.

**How to apply:** This is the 5th confirmation of the reconcile pattern (DR-002 through DR-006). For any remaining pending DRs: always check design-spec.jsonc for a `screens.<slug>` entry FIRST — if missing, the spec entry is the only deliverable. Don't regenerate i18n or JSX that already exists.

[[dr-005-reconcile-pattern]]
[[dr-004-reconcile-pattern]]
