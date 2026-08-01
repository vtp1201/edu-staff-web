# US-E18.25 Notification-center wiring (BE US-146) — un-mock list/read/unread-count

## Status

planned

## Lane

normal. No auth/RBAC surface change (consumes existing gateway-claims auth,
already routed through Kong per ADR `0065`/US-E18.22), no tenant-isolation
logic on the web side (ownership scoping is entirely server-derived from
signed claims — BE partitions `(tenantId, userId)`, web never sends/reads a
scope param), no PII newly exposed (titles/bodies are i18n keys + scalar
params only, per BE's ADR 0074 no-free-text policy), no weakened validation,
no new design-system token. Correctness risk is real but not a hard-gate
trip: (a) the two similarly-named `unread-counts` (plural, messaging,
already wired US-E18.18) vs `unread-count` (singular, this US, generic) must
not be confused; (b) `markAllRead`'s 500-row cap requires a bounded
repeat-until-`hasMore-false` loop; (c) the real wire has no `unread`-only
list filter, forcing a documented client-side narrowing for the existing
"Unread" tab; (d) title/body move from mock pre-rendered strings to real
i18n key+params, a genuine entity/mapper reshape requiring new message
catalog entries.

## Dependencies

- Depends on: US-E18.18 (notification wiring — `HybridNotificationRepository`,
  `NOTIFICATION_EP`, `notification.di.ts`, real per-room `unread-counts`
  wiring this US must NOT disturb) + ADR `0061`. US-E18.22 (Kong routing +
  SSE-proxy re-architecture, ADR `0065` — confirms `/noti/api/v1/*` IS routed
  through Kong with `edu-edge-auth`, so THIS US's endpoints are NOT subject to
  ADR-0047's direct-bypass incompatibility the way the SSE stream proxy is —
  these are plain `createServerHttpClient()` repository calls through
  `NEXT_PUBLIC_API_URL`, same as every other wired repository, not a raw
  proxy route).
- Blocks: none.
- Feature module(s) chạm: `src/features/notification/` only (domain entity,
  failure union, repository interface, DTO, mapper, hybrid facade, DI
  factory, presentation title/body rendering). `src/bootstrap/endpoint/
  notification.endpoint.ts`. `src/bootstrap/i18n/messages/{vi,en}.json`
  (`notifications` namespace — NEW `titles`/`bodies` sub-keys).
- Shared contract/file: NONE outside the notification feature. Does **not**
  touch `src/bootstrap/realtime/*` (SSE contract, US-E18.18's remit) —
  `unread.updated`'s existing messaging-only invalidation
  (`["messaging","conversations"]`) stays untouched; this US's generic
  `["notifications","unread-count"]` query key is invalidated ONLY by the
  mock-only `notification.new` SSE frame (unchanged) and by this US's own
  mutations (`markRead`/`markAllRead` optimistic + refetch), never by
  `unread.updated` — confirmed no double-count path exists between the two
  concepts.
- Claim check (2026-08-01): `git fetch --prune` → no `feat/*`/`fix/*` remote
  branches in flight. Solo — main checkout, no worktree needed.

## Product Contract

Ground-truthed against `../edu-api/services/notification/docs/{INTEGRATION.md
§"Notification center (US-146)", ERROR_CODES.md}` + `../edu-api/gateway/kong/
kong.yml` (`notification-protected` route already covers `/noti/api/v1/*`,
confirmed live-verified for this prefix by US-E18.22) on `origin/main`,
2026-08-01.

### New real endpoints (BE US-146, ScyllaDB-backed inbox, 90-day TTL)

| Method | Path (Kong-prefixed) | Real shape |
| --- | --- | --- |
| `GET` | `/noti/api/v1/notifications?type=&cursor=&limit=` | `data: NotificationDto[]`, enveloped, `meta.pagination.{nextCursor,hasMore}`. `type` is one of `grade\|attendance\|discipline\|announcement\|system` (no `unread`/`read` param exists — see correction #2). `limit` 1–100 (default 20). |
| `GET` | `/noti/api/v1/notifications/unread-count` | `{ count: <int> }` — GENERIC, exact `COUNT(*)`, distinct from the already-wired PLURAL per-room `unread-counts` (US-E18.18/ADR `0061`, messaging concept, untouched by this US). |
| `PATCH` | `/noti/api/v1/notifications/{id}/read` | `204`, no body, idempotent. 404 `NOTIFICATION_NOT_FOUND` if the id isn't in the caller's own partition (covers both "never existed" and "someone else's" — deliberately indistinguishable) or isn't a v1 UUID. |
| `PATCH` | `/noti/api/v1/notifications/read-batch` | No request body. Returns `{ markedCount: <int>, hasMore: <bool> }`. **Capped at 500 rows per call** — caller MUST repeat while `hasMore === true` (also `true` if the call was cancelled mid-batch). Idempotent (returns `0`/`false` once nothing is left unread). |

`NotificationDto` real shape:

```jsonc
{
  "id": "1e9f2a80-...",              // v1 (time-based) UUID
  "type": "discipline",               // grade|attendance|discipline|announcement|system
  "titleKey": "notification_discipline_violation_title",
  "titleParams": { "severity": "MINOR" },
  "bodyKey": "notification_discipline_violation_body",
  "bodyParams": {
    "classId": "...", "studentMemberId": "...", "recordId": "...",
    "severity": "MINOR", "occurredAt": "2026-07-20T08:15:00Z"
  },
  "ts": "2026-07-20T08:15:01Z",
  "read": false
}
```

**No `titleVi`/`titleEn`/`bodyVi`/`bodyEn` on the real wire at all** — those
are the mock's synthetic pre-rendered fields (US-E10.2). Real notifications
are i18n key + scalar params, rendered client-side, per ADR 0074 (BE never
ships free text — the producing consumer runs with no request locale).
`bodyParams` carries UUIDs (`classId`/`studentMemberId`/`recordId`) that have
NO human-readable resolution available to this US in scope (batch member-name
resolution exists — `iam-directory`'s `BatchResolveMembersUseCase`,
US-E18.23 — but composing it here is unscoped extra surface for a "wiring"
US, not requested); the copy MUST render only truly displayable params
(`severity`, `occurredAt`) and MUST NOT display a raw UUID to the user.

Current producer keys (only these exist server-side — `announcement`/`system`
have no producer yet, valid `type` values but always empty pages):

| `titleKey` / `bodyKey` pair | inbox `type` |
| --- | --- |
| `notification_discipline_violation_title` / `_body` | `discipline` |
| `notification_attendance_absence_title` / `_body` | `attendance` |
| `notification_grade_conduct_approved_title` / `_body` | `grade` |
| `notification_attendance_leave_approved_title` / `_body` | `attendance` |

Error taxonomy (all UPPER_SNAKE, confirmed same casing convention as `core`/
`social`, NOT IAM's raw-lowercase exception — US-E18.6 caveat noted, verified
per-service not assumed):

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 | Unknown `?type=`, or `limit` outside 1–100 (`fields[]`) |
| `NOTIFICATION_INVALID_CURSOR` | 400 | `cursor` not decodable / not a v1 UUID (top-level, no `fields[]`) |
| `NOTIFICATION_NOT_FOUND` | 404 | `PATCH /{id}/read`: id not in caller's own inbox, or not a v1 UUID |
| `UNAUTHORIZED_ACCESS` | 401 | Missing/invalid gateway claims |

### Ground-truth correction #1 — retire `HybridNotificationRepository`, not extend it

US-E18.18/ADR `0061` force-mocked `listNotifications`/`markRead`/`markAllRead`
permanently because "zero real backing exists". BE US-146 now ships all
three (plus the generic `unread-count`). **All four methods now have real
backing** — the hybrid partial-real facade (real `getUnreadCount` only, mock
everything else) has no reason to keep existing. Decision: retire the
`HybridNotificationRepository` facade entirely; `notification.di.ts` reverts
to the plain `USE_MOCK ? Mock : Real` gate used by every fully-real feature
(decision `0014`), matching the precedent US-E18.23 set when it deleted
`class-management`'s permanent mock-delegation wrapper once IAM shipped the
real endpoint. Delete `hybrid-notification.repository.ts` +
`hybrid-notification.repository.test.ts`.

### Ground-truth correction #2 — `getUnreadCount()` switches from the per-room SUM back to the real generic endpoint

US-E18.18 repurposed `getUnreadCount()` to call the per-room PLURAL
`unread-counts` endpoint (no real generic concept existed at the time) and
SUM across rooms — a documented, deliberately narrower stand-in. BE US-146
now ships the actual generic SINGULAR `unread-count` endpoint this bell badge
was always meant to represent. Decision: switch `getUnreadCount()` to call
`GET /notifications/unread-count` (no sum, no room concept at all) and return
its `count` directly. This is an **observable behavior change** to the bell
badge (was: sum of unread chat-room messages; now: count of unread
grade/attendance/discipline/announcement/system inbox rows) — this is the
CORRECT, intended meaning restored, not a regression; document clearly.
`MessagingRepository.getConversations()`'s own per-room enrichment (US-E18.18)
is UNTOUCHED — it already calls `unread-counts` (plural) directly, not via
`notification.getUnreadCount()`, so no shared-code risk exists between the
two call sites.

### Ground-truth correction #3 — no server-side "unread only" filter exists; the existing "Unread" tab needs a documented client-side narrowing

`GET /notifications` only accepts `type`/`cursor`/`limit` — there is no
`unread`/`read` query parameter on the real wire at all (mock invented one).
The existing UI's "Unread" filter tab (`NotificationFilter = "unread"`,
already shipped, US-E10.2) has no direct real-mode equivalent. Decision:
`NotificationRepository.listNotifications({filter:"unread"})` degrades to a
**bounded client-side drain-and-filter**: request pages at `limit=100`
(server `type` omitted — unread items can be any type), filter each page to
`read === false` client-side, and continue advancing `cursor` (using the
real `nextCursor`, never a synthetic one) until either (a) the accumulated
unread items reach the caller's requested page size, or (b) `hasMore` is
`false`, or (c) a defensive `MAX_PAGES` cap (20, mirroring the
`iam-directory` drain pattern's proportionate scale for a per-user inbox
capped at 90-day TTL) is hit. Report the REAL `hasMore` from the underlying
BE pagination (not a locally-computed one) so "Load more" continues to drain
correctly on the next call. Document this as a real, if less efficient (worst
case: many mostly-read pages fetched to find a few unread rows), narrowing —
flagged as a cross-repo/product ask (BE could add `?read=false` cheaply given
the ScyllaDB materialized-view-per-status design already backing
`unread-count`'s exact COUNT) rather than silently invented.

### Ground-truth correction #4 — `markAllRead()` must implement the repeat-until-`hasMore`-false loop

Current `markAllRead()` fires one `PATCH read-batch` and returns void — this
silently truncates at 500 unread rows (a plausible count after a long absence
from the app, given 90-day TTL). Decision: loop calling `read-batch` while
the response's `hasMore` is `true`, with a defensive bounded-iterations guard
(`MAX_BATCHES`, e.g. 40 → 20 000 rows, an absurd inbox size — hitting it means
BE is misbehaving, not that the guard is too low) so a stuck server can never
hang the client forever. Deterministic test: injectable/mockable repeated
calls (no real timer/backoff needed — the endpoint has no documented
rate-limit for this path), assert exact call count for a 2-batch and a
1-batch (`hasMore:false` immediately) scenario, and assert the guard trips
(throws/logs, does not silently stop) on a pathological always-`hasMore:true`
mock.

### Entity/mapper reshape (mock-only fields removed, no silent keep)

- `NotificationResponseDto` (real): `{ id, type, titleKey, titleParams,
  bodyKey, bodyParams, ts, read }` — replaces the mock-only
  `titleVi/titleEn/bodyVi/bodyEn` shape. The MOCK dto/fixtures/mapper keep
  their own pre-rendered-text shape (mock stays internally consistent, no
  behavior change to `NEXT_PUBLIC_USE_MOCK=true` demo/Storybook) — do **not**
  force the mock to emit keys+params it has no need for; the mapper simply
  becomes two mappers (`mapNotification` real vs mock, or one mapper with a
  discriminated real/mock DTO union — engineer's call, document in Design
  Notes) rather than one shape trying to serve both.
- `NotificationEntity` (domain, used by BOTH real and mock repos): reshape
  `title: string` / `body: string` → `titleKey: string; titleParams:
  Record<string, string>; bodyKey: string; bodyParams: Record<string,
  string>` (stable keys, i18n.md §"Nơi dịch" — domain/repo never translates).
  The MOCK repository's mapper must ALSO emit real key/param shapes (reusing
  the same 4 producer key-pairs above with plausible params) so a single
  entity shape serves both modes — this is the correct fix, not "keep mock's
  richer fields": the mock's pre-rendered title/body strings were themselves
  the thing to retire, per this US's explicit instruction to not keep
  mock-only fields without flagging.
- Presentation (`notifications-center.tsx`'s `NotificationRow`) currently
  renders `item.title`/`item.body` as opaque strings — reshape to translate
  at presentation via `useTranslations("notifications")`, following the
  EXACT existing dynamic-key-from-closed-union convention already used one
  line above for `type_${item.type}` (cast to the literal union, `t()` stays
  type-checked): `t(\`titles.${item.titleKey}\` as ..., item.titleParams)` /
  `t(\`bodies.${item.bodyKey}\` as ..., item.bodyParams)`. An UNKNOWN
  `titleKey`/`bodyKey` (BE ships a 5th producer key this repo doesn't know
  about yet) must degrade to a safe generic fallback string (`t("titles.
  unknown")` / `t("bodies.unknown")`), never throw, never render a raw
  untranslated key to the user.
- New i18n keys (`vi.json` source + `en.json` mirror, `notifications.titles.*`
  / `notifications.bodies.*`, ICU params for `severity`/`occurredAt` only —
  never a raw UUID param): the 4 known producer keys + 1 `unknown` fallback
  pair each. Copy is minimal/functional (matches existing terse tone of
  `notifications.type_*` labels), not a new visual design — no design-review
  gate implication (see Design Notes).

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/US-E18.18-notification-sse-wiring/story.md`
  + ADR `0061` (prior force-mock this US un-mocks; per-room `unread-counts`
  wiring this US must not disturb).
- `docs/stories/epics/E18-be-wiring/US-E18.22-use-mock-flip-sse-kong/story.md`
  + ADR `0065` (confirms `/noti/api/v1/*` Kong routing + `NOTI_EP` convention
  this US's plain repository calls already follow, no proxy re-architecture
  needed here).
- `docs/stories/epics/E18-be-wiring/US-E18.23-member-directory-wiring/story.md`
  (precedent: delete a permanent-mock-delegation wrapper once BE ships the
  real endpoint; drain-until-`hasMore`-false loop pattern this US's `markAllRead`
  and the "unread" tab narrowing both mirror).
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — ask #34 (closed by
  this US), row to add for `US-E18.25`.
- `docs/reports/2026-08-01-fe-to-be-asks.md` Phần 1.
- `docs/product/screens.md` line 46 (Notifications Center row — update
  "mock-first" note).

## Acceptance Criteria

- `NOTIFICATION_EP.list`/`markRead`/`markAllRead`/`unreadCount` (singular)
  point at the real US-146 paths; `NOTIFICATION_EP.unreadCounts` (plural,
  US-E18.18) is UNCHANGED and untouched by this US.
- `NEXT_PUBLIC_USE_MOCK=false`: `listNotifications({filter:"grade"|
  "attendance"|"discipline"|"announcement"})` calls `GET /notifications?type=
  <filter>&cursor=&limit=` and maps the real `NotificationDto[]` (key+params,
  not pre-rendered text) into `NotificationEntity[]`.
- `NEXT_PUBLIC_USE_MOCK=false`: `listNotifications({filter:"unread"})`
  performs the bounded client-side drain-and-filter (correction #3):
  proven by a test where page 1 returns 0 unread items (all read) but
  `hasMore:true`, and the use-case/repo continues to page 2 to find unread
  items rather than stopping on the first short/empty-after-filter page.
- `NEXT_PUBLIC_USE_MOCK=false`: `getUnreadCount()` calls
  `GET /notifications/unread-count` (singular, no room concept) and returns
  its `count` directly — no summing, no `unread-counts` (plural) call from
  this method.
- `NEXT_PUBLIC_USE_MOCK=false`: `markRead(id)` calls
  `PATCH /notifications/{id}/read`; a 404 maps to `NotificationFailure`
  `not-found`.
- `NEXT_PUBLIC_USE_MOCK=false`: `markAllRead()` loops `PATCH
  /notifications/read-batch` while the response's `hasMore` is `true`, stops
  on `false`, and trips a bounded-iterations guard (never infinite-loops) on
  a pathological always-`hasMore:true` server — all three cases covered by
  deterministic tests (no real timers).
- `HybridNotificationRepository` is deleted; `notification.di.ts`'s
  `makeRepo()` is the plain `USE_MOCK ? Mock : Real` gate with
  `ensureFreshSession()` still called before `createServerHttpClient()` in
  the real branch (decision `0018`, unchanged from US-E18.18).
- `NotificationEntity` carries `titleKey`/`titleParams`/`bodyKey`/
  `bodyParams` (no more pre-rendered `title`/`body` strings); BOTH the real
  and mock repositories/mappers emit this shape (mock demo data unchanged in
  substance, reshaped in transport).
- `NotificationRow` renders `t(\`titles.${item.titleKey}\`, item.titleParams)`
  / `t(\`bodies.${item.bodyKey}\`, item.bodyParams)`; an unrecognized key
  renders the `unknown` fallback string, never a raw key or a thrown error.
- No raw UUID (`classId`/`studentMemberId`/`recordId`) is ever interpolated
  into rendered title/body copy.
- `unread.updated`/`message.new`/etc. SSE-driven invalidation
  (`bootstrap/realtime/event-invalidation.ts`) is UNCHANGED — confirmed by
  diff, this US does not touch that file.
- Full existing test suite passes with zero regression; mock-mode behavior
  (Storybook, `NEXT_PUBLIC_USE_MOCK=true`) is unchanged in visual/behavioral
  terms (same 4 category types, same list/mark-read/mark-all-read UX) even
  though the DTO/entity transport shape changed underneath it.
- `bunx tsc --noEmit` and `bun run build` clean.
- `docs/product/screens.md` line 46 updated (drop "mock-first" note for
  list/read/unread-count — now real; `unread-counts` plural note, if any,
  stays as-is under messaging).

## Design Notes

- Commands: `markRead`, `markAllRead` (both now real mutations).
- Queries: `listNotifications` (real, `type`/`cursor`/`limit`; client-side
  drain for `unread`), `getUnreadCount` (real, generic singular).
- API: see Product Contract table above (`/noti/api/v1/notifications`,
  `.../unread-count`, `.../{id}/read`, `.../read-batch` — all Kong-routed,
  `edu-edge-auth`, confirmed live-verifiable per US-E18.22's `/noti/api/v1/*`
  ground-truth, no ADR-0047 direct-bypass concern since this is a plain
  repository HTTP call through `NEXT_PUBLIC_API_URL`, not the raw SSE proxy
  route).
- Tables: N/A (ScyllaDB is BE-internal).
- Domain rules: own-partition scoping is 100% server-derived from gateway
  claims — the web sends no scope/tenant/user param to any of these 4
  endpoints, nothing to get wrong client-side on that front.
- UI surfaces: `notifications-center.tsx`/`.-container.tsx` (existing
  screen, reused as-is) — **no new component, no new visual state, no
  layout/token change**. The only user-visible difference is which literal
  strings render (previously mock pre-rendered vi/en text; now real
  data-driven i18n key + param lookups against the SAME 4 category
  types/icons/colors already shipped) — same precedent as US-E18.18's
  "text/behavior becomes real-data-driven, zero component diff" pattern.
  **Design-review gate: N/A** (no new/changed layout, tokens, or component —
  content-source swap only, proven by an empty diff on `notifications-
  center.tsx`'s JSX structure beyond the two `t()` call sites).
  `fe-accessibility-auditor` still runs a lighter-touch pass (as
  US-E18.18 did) to confirm the new real title/body string lengths don't
  break the existing `line-clamp-1`/`line-clamp-2` treatment and that the
  `rowAriaLabel`/`aria-live="polite"` wiring still reads correctly with
  interpolated params.

## Validation

`scripts/bin/harness-cli story update --id US-E18.25 --status implemented --unit 1 --integration 1 --e2e 0 --platform 1`
(adjust `e2e` to 1 only if `fe-qa-playwright` actually exercises a live or
Storybook-interaction-proven mark-read/mark-all-read/drain-loop flow, not
just unit/integration).

| Layer | Expected proof |
| --- | --- |
| Unit | `notification.mapper.test.ts` (real DTO→entity key/param shape, both real+mock mappers), `notification.use-cases.test.ts` (unread-count no-sum, markAllRead loop + guard, unread-filter drain), `notification.failure` mapping. |
| Integration | `notification.repository.test.ts` (real endpoint paths, `raw:true`+`parseEnvelope` pagination, error-code branching), DI factory test/verification (`HybridNotificationRepository` gone, plain gate). |
| E2E / Story | Storybook interaction: mark-read row, mark-all-read (multi-batch drain visible via mocked repo), unread-tab drain-and-filter, unknown-key fallback render. |
| Platform | `bunx tsc --noEmit`, `bun run build` clean. |
| Release | Full `bun vitest run` zero-regression; merge to `main` on gate-green. |

## Harness Delta

- Story `US-E18.25` registered `normal`.
- ADR `0066` — notification-center contract remap (US-146): retire
  `HybridNotificationRepository`, `getUnreadCount` singular-endpoint switch
  (bell badge meaning restored), entity reshape to key+params (i18n.md
  compliance), client-side `unread`-filter drain (documented narrowing +
  cross-repo ask), `markAllRead` bounded repeat-until-`hasMore` loop.
- `docs/TEST_MATRIX.md` — add `US-E18.25` row once proof lands.
- `docs/product/screens.md` — sync line 46 (drop stale "mock-first" note).
- `EPIC-OVERVIEW.md` — add table row `US-E18.25`; mark ask #34 **RESOLVED**
  (2026-08-01); append cross-repo ask #42 (no `?read=false`/`?unread=true`
  server-side filter exists on `GET /notifications` despite the underlying
  unread-count materialized view already supporting an exact per-status
  count — client must drain-and-filter, flagged as a cheap potential BE
  addition, not a blocker).

## Evidence

(filled in by `fe-lead` after implementation + review + QA)
