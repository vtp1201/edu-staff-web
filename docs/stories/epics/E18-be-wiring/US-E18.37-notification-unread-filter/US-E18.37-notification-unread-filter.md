# US-E18.37 Notification inbox: server-side unread filter (closes ask #42)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/notification/`
- Shared contract/file: `GET /notifications` (noti service), ADR 0066

## Product Contract

BE US-171 adds `?read=false` to `GET /notifications` (inbox list). This
replaces US-E18.25's client-side bounded-drain workaround for the "Chưa đọc"
(unread) tab — the client no longer needs to page-and-filter client-side;
the server does it natively, real cursor/`hasMore` apply directly to the
filtered result now.

**Ground-truthed exact constraint (fe-lead, 2026-08-03) — read this before
touching `drainUnread`:** `services/notification/docs/openapi.yaml`'s
`GET /notifications` `read` param (~line 216-230):
- Only `read=false` is supported — `read=true` is REJECTED with 400
  `NOTIFICATION_READ_FILTER_UNSUPPORTED` (no materialized view serves
  read-only). Never send `read=true`.
- `read` CANNOT be combined with `type` — 400 `NOTIFICATION_FILTER_CONFLICT`
  (no MV projects both dimensions). When the caller wants the unread tab,
  send ONLY `read=false`, no `type` param — check `src/features/notification/infrastructure/repositories/notification.repository.ts`'s
  current `listNotifications()` to confirm the "unread" filter value never
  ALSO needs a simultaneous `type` filter in this screen's UX (if the
  screen's tabs are mutually exclusive — "Tất cả"/"Chưa đọc"/per-type — this
  should be a non-issue, but verify).
- Omitted/empty `read` means unfiltered (current default behavior for
  "all"/type-filtered tabs) — unchanged.

The current `drainUnread()` method + its `MAX_PAGES`/`DRAIN_PAGE_SIZE`
constants become entirely dead once replaced with a direct `read=false`
server-side call — confirm they have no OTHER caller before deleting (grep
first).

## Relevant Product Docs

- Ask #42 in `docs/reports/2026-08-01-fe-to-be-asks.md` — mark RESOLVED.
- ADR 0066 (notification center wiring) — needs an amendment noting the
  client-side drain is now superseded by the server filter.

## Acceptance Criteria

- "Chưa đọc" tab passes `read=false` as a server query param instead of
  draining pages client-side and filtering.
- Pagination (`cursor`/`hasMore`) for the unread tab now reflects the
  server's OWN filtered pagination state directly (no more `MAX_PAGES`
  client-side cap needed for this tab — confirm and remove if genuinely
  dead).
- Other tabs (all/read) unaffected.
- Zero regression to existing notification-center screen tests/stories.

## Design Notes

- Commands: none affected (`markRead`/`markAllRead`/`getUnreadCount`
  untouched).
- Queries: `GET /notifications?read=false&cursor=&limit=`.
- API: `noti` service.
- Domain rules: none new — simpler than before (removes the client-side
  drain's `MAX_PAGES` bounded-loop logic for this one query path).
- UI surfaces: none new — existing notification-center screen (US-E18.25).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test asserting `read=false` param sent, no client-side drain loop invoked for this path |
| Integration | repository test against the real paginated shape |
| E2E | Storybook: unread-tab pagination story updated/confirmed |
| Platform | `bun build` clean both modes |
| Release | design-review gate N/A (no visual change); a11y N/A |

## Harness Delta

Registered via `harness-cli story add --id US-E18.37`. Ask #42 → RESOLVED.
ADR 0066 amendment needed (fe-lead registers).

## Evidence

(fill after implementation)
