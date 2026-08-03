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

Implemented 2026-08-03 on `feat/us-e18.37-notification-unread-filter`.

### Contract re-verification (done before coding)

`edu-api/services/notification/docs/openapi.yaml` `GET /notifications` → `read`
param confirmed exactly as briefed: enum `["true","false"]`, only `"false"`
supported (sources `notifications_unread_by_user` MV, ADR 0115), `read=true` →
400 `NOTIFICATION_READ_FILTER_UNSUPPORTED`, `read` + `type` → 400
`NOTIFICATION_FILTER_CONFLICT`, omitted = unfiltered. No drift from the brief.

`NotificationFilter` is a single union (`"all" | "unread" | grade | attendance |
discipline | announcement`) → the UI tabs are mutually exclusive, so `read` and
`type` can never be requested simultaneously. The repo now maps that union with
an `if (unread) read="false" else if (!all) type=filter` chain — structurally
incapable of emitting both.

### Changes

| Layer | File | Change |
| --- | --- | --- |
| domain | `domain/repositories/i-notification.repository.ts` | doc comment: filter is mutually exclusive (all / unread / type) |
| infrastructure | `infrastructure/repositories/notification.repository.ts` | `filter==="unread"` → direct `read=false` server call; `drainUnread()`, `MAX_PAGES`, `DRAIN_PAGE_SIZE` deleted (grep-confirmed zero other callers; `MAX_BATCHES` for `read-batch` is unrelated and kept) |
| test | `infrastructure/repositories/notification.repository.test.ts` | old drain suite replaced by the US-E18.37 server-side-unread suite |

No change needed in `GetNotificationsUseCase` (it was a pure pass-through — no
drain special-casing), in the mock repository (already filters `!item.read`
in-memory), or in any presentation/story file.

### Proof (all run on this branch)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning + 1 info, unrelated file) |
| `bun vitest run` | 477 files / **3551** passed (baseline before change: 477 / 3549 → +2 net tests, 0 regressions) |
| `bunx vitest run --config vitest.storybook.mts` | 158 files / 1206 passed (one flaky failure on the first run, green on two consecutive re-runs; unrelated to this change — no story touched) |
| `bun run build` (real branch, `.env.local` `NEXT_PUBLIC_USE_MOCK=false`) | ✓ compiled successfully |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | ✓ compiled successfully |

### Red→green

Red: 3 new assertions failed against the old drain (`params.read` undefined,
`get` called 20× instead of 1×, `limit` forced to the drain's 100 instead of the
caller's 8). Green after replacing the branch. Unchanged all/type-filtered tests
passed untouched throughout.

New unread suite asserts: `read="false"` is the ONLY filter param (`type` and
`unread` absent, never `read="true"`); exactly ONE HTTP call per page (the
former all-read + `hasMore:true` fixture that used to loop to `MAX_PAGES`);
server `nextCursor`/`hasMore` surfaced verbatim; caller `cursor`/`limit`
forwarded; cursor omitted on page 1; no client-side row filtering; error →
failure mapping preserved. An added guard on the all/type paths asserts `read`
is never sent there.
