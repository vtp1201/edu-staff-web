# US-E17.6 Empty States — Notifications Center (All tab + Unread tab)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/notification/presentation/notifications-center/`
- Shared contract/file: none (localized change to `notifications-center.tsx` only)

## Product Contract

After this story, the Notifications Center's local `EmptyState` component conforms to the canonical `emptyStatePattern`:

1. **All-tab empty state** — `role="status"` container, `BellOff` icon (64px, `text-edu-text-muted`, `aria-hidden`), title from `notifications.emptyAllTitle`, body from `notifications.emptyAllBody` in `text-edu-text-secondary` (contrast 5.1:1 — WCAG PASS), no CTA.
2. **Unread-tab empty state** — `role="status"` container, `CheckCircle2` icon (64px, `text-edu-text-muted`, `aria-hidden`), title from `notifications.emptyUnreadTitle`, body from `notifications.emptyUnreadBody` in `text-edu-text-secondary`, no CTA.
3. **Tab switch** — existing `variant` prop logic is retained; switching tabs correctly changes the icon and copy.
4. **Contrast fix** — body text color is changed from `text-muted-foreground` / `text-edu-text-muted` (3.08:1 at 13px, WCAG FAIL) to `text-edu-text-secondary` (5.1:1, WCAG PASS). This is a mandatory a11y correction.

No new tokens, no new i18n keys, no BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — `emptyStatePattern`, `emptyStates.notifications.list.allTab`, `emptyStates.notifications.list.unreadTab`
- `docs/stories/epics/E17-ux-polish/US-E17.6-empty-states-notifications/spec.md` — full engineering spec
- `docs/stories/epics/E17-ux-polish/US-E17.6-empty-states-notifications/requirements.md`
- `docs/stories/epics/E17-ux-polish/US-E17.6-empty-states-notifications/use-cases.md`

## Acceptance Criteria

- All-tab empty state: `role="status"` container, `BellOff` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`), `<p>` title "Chưa có thông báo" from `notifications.emptyAllTitle`, body "Thông báo sẽ xuất hiện ở đây khi có hoạt động mới." from `notifications.emptyAllBody` in `text-edu-text-secondary`, `max-w-xs` on body, no `<button>`.
- Unread-tab empty state: `role="status"` container, `CheckCircle2` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`), `<p>` title "Tất cả đã đọc" from `notifications.emptyUnreadTitle`, body "Bạn đã đọc hết tất cả thông báo." from `notifications.emptyUnreadBody` in `text-edu-text-secondary`, `max-w-xs`, no `<button>`.
- Body `<p>` in both variants does NOT have class `text-muted-foreground` or `text-edu-text-muted`.
- No `<h2>` or `<h3>` inside either empty state container.
- Switching from "All" to "Unread" tab (and back) correctly swaps icon and copy; no stale content from the previous tab remains.
- Loading skeleton renders when fetch is pending; `role="status"` container is NOT present.
- Error state renders on fetch failure; `role="status"` container is NOT present.
- When either tab has notifications, the list renders and `role="status"` container is NOT present.
- `src/app/tokens.css` is unchanged. `vi.json` / `en.json` are unchanged.
- Storybook `EmptyStateAll` and `EmptyStateUnread` stories each have `play()` asserting `role="status"`, `aria-hidden="true"` on icon, `text-edu-text-secondary` on body (and absence of `text-muted-foreground`).

## Design Notes

- Commands: none
- Queries: existing notification fetch (noti service, SSE proxy decision `0009`) — no changes
- API: none
- Tables: none
- Domain rules: empty state rendered when `list.length === 0` after successful fetch; variant (`all` vs `unread`) driven by active tab via existing `variant` prop
- UI surfaces: `notifications-center.tsx` local `EmptyState` component (~lines 106–128):
  - Add `role="status"` to container
  - Add icon: `BellOff` for `variant === "all"`, `CheckCircle2` for `variant === "unread"` — `size-16 text-edu-text-muted aria-hidden="true"`
  - Title: `<p className="text-base font-bold text-foreground mt-4">`
  - Body: change color from `text-muted-foreground` (or `text-edu-text-muted`) to `text-edu-text-secondary`; add `max-w-xs` if not present
  - Retain existing `variant`-driven key switching for title and body text
- i18n: all four keys already wired — no changes to `vi.json` / `en.json`
- [OPEN QUESTION] `CheckCircle2` (outline stroke) vs `CheckCircle` (filled): design-spec says `check-circle`; FE team confirms Lucide variant with design team before committing
- [OPEN QUESTION] Upgrade strategy: edit `EmptyState` internals vs. wrap with a new container — confirm whether `role="status"` goes on the existing root element or a new wrapper

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.6 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest + Testing Library: both variants render correct icon and title; body has `text-edu-text-secondary` and NOT `text-muted-foreground`; `role="status"` on container; `aria-hidden` on icon; variant prop change swaps icon and copy; loading suppresses `role="status"`; error suppresses `role="status"` |
| Integration | none |
| E2E | Storybook interaction stories `EmptyStateAll` and `EmptyStateUnread` with `play()` assertions for `role="status"`, `aria-hidden`, `text-edu-text-secondary` on body, no `text-muted-foreground` on body |
| Platform | none |
| Release | Verify on `/teacher/notifications` and `/student/notifications` that empty tabs show icon + correct body color; visually confirm body text is not too light at 13px |

## Harness Delta

No harness changes required. No new ADR, no new tokens, no new i18n keys.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
