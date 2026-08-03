# 0066 Notification-center contract remap (BE US-146) — retire hybrid facade, restore generic unread-count, i18n key rendering

Date: 2026-08-01

## Status

Accepted (partially superseded 2026-08-03, US-E18.37 — see note below)

> **Amendment (2026-08-03, US-E18.37):** BE US-171 added a server-side
> `?read=false` filter to `GET /notifications` — exactly the cross-repo
> ask #42 this ADR filed. The "bounded client-side drain-and-filter"
> described below (the `drainUnread()` method, `MAX_PAGES`/`DRAIN_PAGE_SIZE`)
> is **RETIRED** — `listNotifications({filter:"unread"})` now sends
> `read=false` directly and returns the server's own filtered pagination
> verbatim (one HTTP call per page, not up to `MAX_PAGES`). Every other
> decision recorded in this ADR (the singular `unread-count` restoration,
> `markAllRead()`'s repeat-until-`hasMore` loop, the `NotificationEntity`
> i18n-key reshape) is UNCHANGED and still accurate — only the "Unread"
> filter mechanism section below is stale. Read `?read=false`/`?type=`
> are mutually exclusive on the wire (BE 400s on either misuse) — this
> client never combines them, since its own `NotificationFilter` type is a
> single mutually-exclusive union. See
> `US-E18.37-notification-unread-filter/US-E18.37-notification-unread-filter.md`
> for the full evidence.

## Context

US-E18.18 (ADR `0061`) force-mocked `listNotifications`/`markRead`/
`markAllRead` in a `HybridNotificationRepository` because, at the time,
`notification`'s `cmd/server` had zero real backing for a generic
notification inbox — only the per-room (messaging) `unread-counts` endpoint
existed, which `getUnreadCount()` was repurposed to SUM as a real-but-narrower
stand-in.

BE has now shipped US-146: a real per-user notification inbox (ScyllaDB,
`notifications_by_user` + materialized views, 90-day TTL) with
`GET /notifications` (cursor-paginated, `type` filter only), the intended
GENERIC `GET /notifications/unread-count` (singular — deliberately distinct
from the already-wired PLURAL per-room `unread-counts`, US-E18.18), and
`PATCH /notifications/{id}/read` + `PATCH /notifications/read-batch` (capped
500/call, `hasMore` signals repeat). This closes cross-repo ask #34
(EPIC-OVERVIEW.md, "no generic notification-bell concept exists on the real
wire").

Four scope decisions were forced by ground-truthing
`edu-api/services/notification/docs/INTEGRATION.md` §"Notification center
(US-146)":

1. All four `INotificationRepository` methods now have real backing — the
   partial-real hybrid facade has no remaining reason to exist.
2. The real generic `unread-count` restores the bell badge's originally
   intended meaning, superseding US-E18.18's per-room-SUM stand-in — an
   intentional, documented behavior change, not a regression.
3. `GET /notifications` has no `unread`/`read` query parameter at all — the
   existing "Unread" filter tab (shipped, US-E10.2) has no direct real-mode
   equivalent.
4. The real `NotificationDto` carries `titleKey`/`titleParams`/`bodyKey`/
   `bodyParams` (i18n key + scalar params, per BE's ADR-0074 no-free-text-at-
   rest policy — the producing consumer runs with no request locale) —
   **not** the mock's pre-rendered `titleVi`/`titleEn`/`bodyVi`/`bodyEn`
   strings. `bodyParams` includes UUIDs (`classId`/`studentMemberId`/
   `recordId`) with no human-readable resolution in scope for this US.

## Decision

- **Retire `HybridNotificationRepository`** (delete the class + its test).
  `notification.di.ts` reverts to the plain `USE_MOCK ? Mock : Real` gate
  (decision `0014`), same precedent US-E18.23 set deleting
  `class-management`'s permanent mock-delegation wrapper once its blocking
  gap resolved.
- **`getUnreadCount()` switches to `GET /notifications/unread-count`**
  (singular, generic, no room concept, no summing) — restores the bell
  badge's original intended meaning. `MessagingRepository.getConversations()`'s
  own direct use of the PLURAL `unread-counts` endpoint (US-E18.18) is
  untouched; the two concepts remain fully decoupled, including in SSE
  invalidation (`unread.updated` still only invalidates
  `["messaging","conversations"]`/`["messaging","messages",roomId]`, never
  `["notifications","unread-count"]`).
- **[SUPERSEDED 2026-08-03, US-E18.37 — see amendment above; kept for
  historical record]** `listNotifications({filter:"unread"})` becomes a
  bounded client-side drain-and-filter: page at `limit=100` (no `type` filter — unread spans
  all categories), filter `read === false` client-side, keep advancing the
  REAL `cursor` until enough unread items accumulate, `hasMore` goes false,
  or a defensive `MAX_PAGES` cap (20) trips. The caller's page size only
  decides when to STOP fetching further pages — every unread row found on the
  pages already fetched is returned, never truncated to that size (the cursor
  is page-aligned, so capping would strand a page's surplus unread rows
  permanently: "Load more" resumes past them). Overshoot is therefore bounded
  by one page (100 rows) and is intentional and harmless. This is a
  deliberate, documented narrowing (worst case: many mostly-read pages fetched
  to find few unread rows) — not a silent invention. A cross-repo ask (`#42`)
  is filed: BE
  already backs an exact per-status count (`unread-count`'s materialized
  view) so a cheap `?read=false` addition is plausible, just not present
  today.
- **`markAllRead()` implements the mandatory repeat-until-`hasMore`-false
  loop** against the 500-row cap, with a bounded-iterations guard
  (`MAX_BATCHES`, e.g. 40) that trips loudly (never silently stops) on a
  pathological always-`hasMore:true` response.
- **`NotificationEntity` reshaped**: `title: string`/`body: string` →
  `titleKey: string; titleParams: Record<string,string>; bodyKey: string;
  bodyParams: Record<string,string>` — stable keys, translated ONLY at
  presentation (`i18n.md` §"Nơi dịch"), never in the repository/mapper. BOTH
  the real and mock repositories emit this shape (the mock's own mapper
  reshaped to the same 4 known producer key-pairs with plausible params) so
  presentation has one contract to render regardless of `NEXT_PUBLIC_USE_MOCK`.
  New `vi.json`/`en.json` keys under `notifications.titles.*`/`notifications
  .bodies.*` (the 4 known producer keys + an `unknown` fallback pair each);
  ICU params limited to `severity`/`occurredAt` — **never** a raw UUID
  interpolated into rendered copy (no batch member-name resolution composed
  here; that would be new, unscoped surface for a wiring US, not a copy-only
  fix).

## Alternatives Considered

1. Keep `HybridNotificationRepository` and just flip the three previously-
   mocked methods to also call `real`. Rejected: with all four methods real,
   the hybrid indirection is pure unnecessary complexity — the plain
   `USE_MOCK ? Mock : Real` gate is the established convention for a fully-
   real feature (decision `0014`) and every other resolved hybrid in this
   epic has been retired the same way once its gap closed (US-E18.23).
2. Keep `getUnreadCount()` on the per-room SUM (US-E18.18's stand-in) since
   it "already works" and avoid an observable behavior change. Rejected: the
   SUM was explicitly documented as a temporary narrower stand-in for a
   generic concept that didn't exist yet — now that it does, keeping the SUM
   would be knowingly serving the WRONG number to the bell badge forever.
3. Drop the "Unread" filter tab entirely rather than build a client-side
   drain, since BE has no server-side filter. Rejected: it is an existing,
   already-shipped, tested UI affordance (US-E10.2) — removing it is a
   regression the AC ("zero UI regression" epic-wide standard) explicitly
   forbids; the bounded drain is a documented, safe, if less efficient,
   solution that keeps the feature working.
4. Have the repository resolve `studentMemberId`/`classId`/`recordId` via
   `iam-directory`'s `BatchResolveMembersUseCase`/a hypothetical class-name
   lookup so body copy could show real names instead of omitting the IDs.
   Rejected for this US: unscoped surface growth for a contract-remap
   ("wiring") story — composing a second feature's use-case into every
   notification row render is a real design decision (which ids resolve to
   what, batching strategy, failure degradation) that deserves its own
   product/engineering discussion, not a side-effect of fixing endpoint
   paths. Tracked as a follow-up idea, not a blocker.

## Consequences

Positive:

- Closes cross-repo ask #34 — the notification bell is now a real, correctly-
  scoped generic count instead of permanently mocked or a repurposed
  messaging-room proxy.
- Removes a permanent-mock facade from the codebase (one fewer Hybrid* class
  to maintain), consistent with the epic's converging pattern of shrinking
  hybrid surfaces as BE gaps close.
- Domain entity now correctly separates transport concern (BE-owned i18n
  key + scalar params) from rendering concern (client-owned translation),
  matching `i18n.md`'s "translate at presentation only" rule more faithfully
  than the mock's pre-rendered-string shortcut ever did.

Tradeoffs / residual risks:

- **[RESOLVED 2026-08-03, US-E18.37]** The client-side "unread" drain
  described above is retired — BE US-171 shipped the server-side `?read=false`
  filter this ask requested; the tradeoff below is historical.
  ~~The client-side "unread" drain is less efficient than a server-side filter
  would be (bounded by `MAX_PAGES`, not by the true unread count) — acceptable
  given the 90-day TTL bounds inbox size, but flagged as a real cross-repo
  ask (#42), not a permanent design choice we're happy with.~~
- A drain call can return MORE rows than the nominal page size (up to one
  extra fetched page's worth of unread rows). Intentional — the alternative,
  capping to the page size, silently drops the surplus for good because the
  cursor is page-aligned. Callers must treat the page size as a fetch-stop
  hint, not a hard row budget.
- `bodyParams`' UUIDs (`classId`/`studentMemberId`/`recordId`) are
  deliberately NOT rendered — a user reading "a discipline record was created
  (severity MINOR, 2026-07-20)" gets no student/class name. This is a real,
  known content gap versus what a fully-resolved notification could show;
  tracked as a follow-up idea (Alternative #4), not solved here.
- The bell badge's observable count changes for any user currently relying on
  US-E18.18's per-room-SUM behavior — intentional and correct, but a genuine
  behavior change to communicate if anyone built expectations around the old
  number during the US-E18.18→this-US window.

## Follow-Up

- **Cross-repo ask #42 — RESOLVED (US-E18.37, 2026-08-03).** BE US-171 added
  `?read=false` to `GET /notifications`, sourced from the
  `notifications_unread_by_user` materialized view (ADR 0115 on the BE side).
  The client-side drain this ADR originally documented is retired.
- Product/design follow-up idea (not filed as a blocker): should notification
  body copy eventually resolve `studentMemberId`/`classId` to display names
  via `iam-directory`? Needs its own product decision on batching/failure
  UX, not assumed here.
