---
name: project-e18-25-notification-center
description: US-E18.25 notification-center wiring (BE US-146) — closes ask #34, entity reshape to i18n key+params, drain-truncation catch
metadata:
  type: project
---

US-E18.25 (notification-center wiring, BE US-146) implemented and merged
2026-08-01 (`809fa38`). Un-mocked `listNotifications`/`markRead`/
`markAllRead`/`getUnreadCount`; retired `HybridNotificationRepository`
entirely (all 4 methods now real, plain `USE_MOCK ? Mock : Real` gate
restored, decision `0014` convention). ADR `0066` registered. Closes
EPIC-OVERVIEW ask #34; new ask #42 (no server-side `?read=false` filter on
`GET /notifications` despite the same feature's `unread-count` already
backing an exact per-status materialized-view count).

**Two similarly-named endpoints, deliberately distinct**: `unread-counts`
(PLURAL, per-room, messaging concept, wired US-E18.18) vs `unread-count`
(SINGULAR, generic notification total, wired this US) — BE's own doc calls
this out explicitly with a test guarding both coexist. Confirmed zero
overlap in code/invalidation between the two the whole way through.

**Entity reshape for i18n.md compliance**: mock's pre-rendered
`title`/`body` strings retired; real wire ships `titleKey`/`titleParams`/
`bodyKey`/`bodyParams` (BE ADR-0074 no-free-text-at-rest — producer runs
with no request locale). Domain/mapper never translates; presentation
resolves via a known-keys allow-list + `unknown` fallback (mirrors the
existing `type_${item.type}` dynamic-key-from-closed-union pattern already
in this codebase) — a reusable pattern for any future BE-key+params
notification/audit-log style contract. Both real AND mock repositories
must emit the SAME entity shape (new `mapMockNotification` synthesizes
key-pairs for mock fixtures) — don't let mock keep a richer, entity-diverging
shape "for convenience".

**Reviewer caught a real data-loss bug** in a client-side pagination drain
(BE has no server-side "unread" filter, so the repo pages+filters
client-side): an early cut capped the returned items to the caller's
page-size `limit` even though the cursor had already advanced past the
whole fetched page, silently stranding unread rows beyond `limit` forever.
Fix: return every item found on the satisfying page UNCAPPED — `limit` only
decides when to STOP fetching more pages, never what to hand back. General
lesson: any "drain until X, but cap output to caller's page size" loop is a
red flag — check whether the cursor and the returned-items truncation stay
aligned; if the cursor moves past unreturned items, they're lost, not
just deferred.

**Ground-truthing confirmed error-code casing per-service is NOT
transitive** — `notification`'s taxonomy is UPPER_SNAKE (same as
core/social), re-confirmed via its own `ERROR_CODES.md`, not assumed from
a sibling service. This is the 3rd+ time this exact per-service
re-verification habit paid off (see US-E18.6/US-E18.20/US-E18.23 notes).

**No Kong/ADR-0047 transport blocker this time** — unlike US-E18.18's SSE
proxy (direct-bypass, structurally 401 under ADR-0047), this US's 4
endpoints are plain repository HTTP calls through the already-Kong-routed
`/noti/api/v1/*` prefix (US-E18.22/ADR 0065 already live-verified that
prefix) — nothing deferred on the transport side, just no fresh
`make stack-up` session run specifically for this US (relies on the prior
US-E18.22 live-verification of the shared prefix, consistent with how the
rest of the epic treats a once-verified shared transport layer).

Full trail: `docs/stories/epics/E18-be-wiring/US-E18.25-notification-center-wiring/story.md`,
ADR `docs/decisions/0066-notification-center-contract-remap.md`.
