# US-E18.25 Notification-center wiring (BE US-146) — un-mock list/read/unread-count

## Status

implemented

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

- **Scope delivered** exactly per the Product Contract + ADR `0066`:
  `HybridNotificationRepository` deleted; `notification.di.ts` reverted to
  the plain `USE_MOCK ? Mock : Real` gate (`ensureFreshSession()` preserved
  in the real branch). `getUnreadCount()` calls the real SINGULAR
  `unread-count` endpoint directly (no sum) — `MessagingRepository`'s
  own per-room PLURAL `unread-counts` usage (US-E18.18) untouched, confirmed
  by an empty diff under `src/features/messaging/` and `src/bootstrap/realtime/`.
  `markAllRead()` loops `PATCH read-batch` while `hasMore` is true, with a
  bounded `MAX_BATCHES` guard that `console.error`s then throws (never
  silently caught into a generic failure). `listNotifications({filter:
  "unread"})` performs the bounded client-side drain (`DRAIN_PAGE_SIZE=100`,
  `MAX_PAGES=20`), returning EVERY unread row found on the last page fetched
  uncapped (not truncated to the caller's page-size `limit`) — this was the
  one MUST-FIX defect caught by review (see below), fixed same-branch.
  `NotificationEntity` reshaped to `titleKey`/`titleParams`/`bodyKey`/
  `bodyParams` (BE's ADR-0074 i18n-key+params contract); both the real
  mapper (`mapNotification`, locale-free passthrough) and a new
  `mapMockNotification` for the mock DTO emit this same shape.
  `notifications-center.tsx`'s `NotificationRow` translates via
  `useTranslations("notifications")` against a known-keys allow-list with
  `titles.unknown`/`bodies.unknown` fallback (renamed out of `domain/entities/`
  into a dedicated non-entity module per review); ICU params whitelisted to
  `{severity, occurredAt}` only — no raw UUID (`classId`/`studentMemberId`/
  `recordId`) can structurally reach `t()`. New `notifications.titles.*`/
  `notifications.bodies.*` keys added to both `vi.json` and `en.json`
  (4 known producer key-pairs + `unknown` fallback pair, key-set parity
  confirmed). `docs/product/screens.md` line 46 synced.
- **Tests**: full suite `bun vitest run` → **436 files / 3041 tests pass**
  (baseline before this US: 437 files/3026 tests; one file fewer from the
  deleted `hybrid-notification.repository.test.ts`, net +16 tests across the
  remaining files). Storybook interaction suite 151 files/1094 tests pass
  (incl. new `UnknownKeyFallback` story case). `bunx tsc --noEmit` clean.
  `env -u NEXT_PUBLIC_USE_MOCK bun run build` clean. `bun lint` clean (2
  pre-existing unrelated findings in `messaging/message-context-menu`, not
  touched by this US).
- **fe-tech-lead-reviewer**: initial verdict **Revision Required** — one
  MUST-FIX (the unread-drain silently dropped unread rows beyond the
  caller's page-size `limit` on a single 100-row page — a real data-loss
  path on the shipped "Unread" tab, not the "may re-surface" imprecision the
  original code comment/ADR claimed) and one SHOULD-FIX (the `MAX_BATCHES`
  guard trip was swallowed to a generic `errorKey:"unknown"` at the Server
  Action boundary with no server-side log). Both fixed same-branch: the
  drain now returns every unread row found on the page uncapped (bounded
  overshoot = one page, page-aligned cursor rules out duplicates on the next
  call), with a new test (`limit+5` unread rows in one page → all returned,
  none dropped); the guard now `console.error`s before throwing. Three
  CONSIDER items also applied: ICU params whitelisted to
  `{severity,occurredAt}` (structural UUID guarantee, not just copy
  discipline); the shared key-table module renamed out of `domain/entities/`
  (naming-convention fix); a pre-existing factually-wrong SSE-dedupe comment
  in `use-notification-new-event.ts` corrected. Re-verified: **Approved**.
  Everything else (hybrid deletion, singular endpoint, bounded loops, entity
  reshape, mock-mapper wiring, layering, security, untouched
  realtime/messaging modules) confirmed correct on the reviewer's own
  independent runs, not from self-report.
- **fe-accessibility-auditor**: **PASS**, no blocking/critical/major
  findings. Confirmed the design-review-gate-N/A claim via `git diff` (JSX
  structure identical beyond the two `t()` call sites + `aria-label` source
  swap); new real copy fits the existing `line-clamp-1`/`line-clamp-2`
  treatment at 320px; `rowAriaLabel` composes the translated title correctly;
  unknown-key fallback renders meaningful non-empty text in both locales
  (never a raw key, confirmed via the Storybook story's negative assertion).
  One informational, pre-existing, out-of-scope note logged (A11Y-001:
  `relativeTime(item.ts, "vi")` hardcodes the "vi" locale — unchanged by
  this US's diff, flagged for a future story).
- **fe-qa-playwright**: **Go**. Independently re-verified the drain fix by
  reading the actual diff/commit (not the changelog prose) and confirming
  the exact test locking the original failure mode impossible
  (`limit+5` unread rows → all `limit+5` returned). Confirmed i18n key-set
  parity between `vi.json`/`en.json` and the code's known-keys allow-list;
  confirmed `src/bootstrap/realtime/*` and `src/features/messaging/` are
  genuinely untouched (not just claimed); confirmed mock fixtures falling
  back to the `unknown` string render sane, non-blank Storybook rows (an
  intentional ADR-0066 content change, not a regression). No new test gaps
  found — zero production defects, zero new test code needed this round.
- **Commits** (in order): `dd2cf5f` docs (packet + ADR 0066) · `1879d0d`
  docs (fe-planner implementation plan) · `b81dff1` feat (entity/DTO
  reshape) · `1b3af8d` feat (real endpoints wiring) · `5b6de31` feat
  (presentation i18n translation) · `0bf9a94` chore (engineer agent-memory)
  · `2a80430` fix (unread-drain data-loss fix) · `7140f9d` chore (engineer
  agent-memory) · `d8fcc06` chore (reviewer agent-memory) · `5e40e66` chore
  (QA agent-memory).
- **Cross-repo/product findings** appended to `EPIC-OVERVIEW.md`: ask **#34
  marked RESOLVED** (generic notification-bell concept now real, BE US-146
  closes the gap ask #34 originally raised at US-E18.18); new ask **#42**
  (`GET /notifications` has no `?read=false`/`?unread=true` server-side
  filter despite the underlying materialized view already backing an exact
  per-status count — the web's "Unread" tab must drain-and-filter
  client-side; cheap potential BE addition, not a blocker).
- **Deferred**: none — this US had no Kong-routing or auth-trust-model
  blocker (unlike US-E18.18's SSE proxy); all four endpoints are plain
  repository HTTP calls through the already-Kong-routed `/noti/api/v1/*`
  prefix (confirmed live-routable per US-E18.22/ADR `0065`), so nothing is
  deferred on the transport side. No live-gateway smoke test was run in
  this US specifically (no `make stack-up` session), consistent with every
  other epic US that relies on the repository/mapper/DI test layer + prior
  US-E18.22 live-verification of the shared Kong prefix rather than
  re-verifying transport per-US.

## Implementation Plan

Engineer-only (no architect/state-engineer needed — no new component, no new
query key). Sequenced strict TDD red→green→refactor, innermost layer first.
All file paths relative to repo root. Run `bun vitest related <file>` after
each red→green pair; full `bun vitest run` + `bunx tsc --noEmit` + `bun build`
before merge (per AC).

### Phase 0 — pre-flight (no code)

- Re-confirm claim check is still valid (`git fetch --prune`; no
  `feat/*`/`fix/*` in flight for this module) before branching
  `feat/us-e18.25-notification-center-wiring`.
- Grep confirm no other in-repo consumer of `NotificationEntity.title`/`.body`
  or `NotificationResponseDto.titleVi/titleEn/bodyVi/bodyEn` outside the files
  listed below (`grep -rn "titleVi\|titleEn\|bodyVi\|bodyEn\|\.title\b\|\.body\b" src/features/notification`)
  — the plan below assumes the blast radius is exactly these files; if grep
  finds a surprise consumer, widen scope before coding.

### Phase 1 — domain entity + DTO reshape (red→green)

1. **`src/features/notification/domain/entities/notification.entity.ts`**
   — reshape `NotificationEntity`: remove `title: string; body: string`, add
   `titleKey: string; titleParams: Record<string, string>; bodyKey: string;
   bodyParams: Record<string, string>`. Leave `NotificationType`,
   `NotificationPage`, `UnreadCount`, `NotificationFilter` untouched. This is
   a pure type change — no test file of its own, but it makes every mapper/
   use-case/component reference to `.title`/`.body` a compile error, which is
   the mechanism that finds every call site (Phase 0 grep is the belt, this
   is the suspenders).
2. **`src/features/notification/infrastructure/dtos/notification-response.dto.ts`**
   — split into two DTOs (no shape trying to serve both, per story's Design
   Notes call):
   - `NotificationResponseDto` (REAL wire shape): `{ id: string; type: string;
     titleKey: string; titleParams: Record<string, string>; bodyKey: string;
     bodyParams: Record<string, string>; ts: string; read: boolean }`.
   - `MockNotificationResponseDto`: keep the OLD shape (`titleVi/titleEn/
     bodyVi/bodyEn`) verbatim — this is what `mocks/fixtures.ts` keeps
     emitting unchanged (no fixture data edits needed structurally, only the
     mock mapper below changes how it consumes them).
   - `UnreadCountResponseDto` unchanged.
3. **RED**: rewrite `src/features/notification/infrastructure/mappers/notification.mapper.test.ts`
   for the new real-DTO→entity contract. Replace every existing test (they
   assert `.title`/`.body` vi/en locale branching, which no longer exists).
   New test names/cases:
   - `describe("mapNotification (real)")`
     - `"maps id, type, ts, read straight through"`
     - `"maps titleKey/titleParams/bodyKey/bodyParams straight through (no locale branching)"`
     - `"coerces unknown type to 'system'"` (keep — `toType` logic unchanged)
   - `describe("mapMockNotification (mock)")` — new function, see Phase 1.4
     - `"emits one of the 4 known producer key-pairs with plausible params for each fixture type"`
     - `"body params include severity/occurredAt style plausible scalars, never the vi/en free-text fields"`
   Drop the old `locale` parameter from `mapNotification`'s signature entirely
   (no more vi/en branching at the mapper) — this is a deliberate breaking
   change to the function signature, not additive.
4. **GREEN**: `src/features/notification/infrastructure/mappers/notification.mapper.ts`
   — `mapNotification(dto: NotificationResponseDto): NotificationEntity`
   (drop `locale` param) becomes a straight passthrough (id/type/ts/read +
   titleKey/titleParams/bodyKey/bodyParams, `toType()` unchanged). Add a
   second exported function `mapMockNotification(dto: MockNotificationResponseDto):
   NotificationEntity` that maps each mock fixture's `type` to one of the 4
   known producer key-pairs (round-robin or type-keyed — e.g. `grade` →
   `notification_grade_conduct_approved_title/_body`, `attendance` →
   alternate between `notification_attendance_absence_*` and
   `notification_attendance_leave_approved_*` by index/id parity,
   `discipline` → `notification_discipline_violation_*`, `announcement`/
   `system` → no real producer exists, so pick the closest thematically
   (document this as a mock-only convenience, e.g. reuse
   `notification_attendance_absence_*` is wrong — instead fall back to the
   `unknown` key-pair for `announcement`/`system` mock rows, since no real
   producer targets those types today anyway) with plausible
   `titleParams`/`bodyParams` (`severity: "MINOR"|"MODERATE"|"SEVERE"`,
   `occurredAt: dto.ts`) — never invent a UUID param.

### Phase 2 — mock repository + fixtures consume the reshaped mapper (red→green)

5. **`src/features/notification/infrastructure/repositories/mocks/fixtures.ts`**
   — retype the array to `MockNotificationResponseDto[]` (rename import),
   keep all 10 rows' `titleVi/titleEn/bodyVi/bodyEn/ts/type/id/read` values
   unchanged (this file is data, not transport — no behavior change to
   Storybook/demo per AC).
6. **`src/features/notification/infrastructure/repositories/mocks/notification.mock.repository.ts`**
   — swap `mapNotification(dto, "vi")` → `mapMockNotification(dto)` in both
   call sites (module-level `_items` init + constructor reset). No test file
   exists for this repo directly today (covered via use-case tests) — add
   inline coverage if `fe-nextjs-engineer` finds a gap when `_items` reshape
   surfaces in `notification.use-cases.test.ts`'s `makeNotification()` helper
   (Phase 5 below).

### Phase 3 — real repository: `getUnreadCount`, `markAllRead` loop, `unread` drain (red→green)

7. **RED**: extend `src/features/notification/infrastructure/repositories/notification.repository.test.ts`.
   Replace/add:
   - Replace `describe("NotificationRepository.getUnreadCount (US-E18.18 real unread-counts)")`
     entirely with `describe("NotificationRepository.getUnreadCount (US-E18.25 real singular)")`:
     - `"calls the real singular unread-count endpoint and returns count directly (no sum)"`
       — assert `get` called with `NOTIFICATION_EP.unreadCount` exactly (not
       `unreadCounts(...)`), given `{ count: 7 }` response → `result.count === 7`.
     - `"degrades to 0 when count is 0"`.
     - `"throws a mapped failure on error"` (keep, same pattern).
   - New `describe("NotificationRepository.markAllRead (US-E18.25 batch loop)")`:
     - `"stops after one batch when hasMore is false immediately"` — mock
       `patch` resolves `{ markedCount: 120, hasMore: false }` once; assert
       `patch` called exactly once with `NOTIFICATION_EP.markAllRead`.
     - `"loops while hasMore is true, stops on false (2-batch scenario)"` —
       mock `patch` resolves `{ markedCount: 500, hasMore: true }` then
       `{ markedCount: 30, hasMore: false }`; assert called exactly twice.
     - `"trips the MAX_BATCHES guard on a pathological always-hasMore:true response"`
       — mock `patch` always resolves `{ markedCount: 500, hasMore: true }`;
       assert the call rejects/throws (not silently returns) and `patch` was
       called exactly `MAX_BATCHES` times (assert the exact bound, e.g. 40,
       so the guard value is locked by the test, not just "some finite
       number").
   - New `describe("NotificationRepository.listNotifications (US-E18.25 unread drain)")`:
     - `"drains multiple pages to accumulate unread items when early pages are all-read"`
       — mock `get` to return page 1 = 3 read items (`hasMore:true`,
       `nextCursor:"c1"`), page 2 = 2 unread items (`hasMore:false`,
       `nextCursor:null`); call `listNotifications({filter:"unread", limit: 8})`;
       assert final `result.items` has exactly the 2 unread items, `result.hasMore === false`,
       and `get` was called twice with `cursor` advancing `undefined → "c1"`
       and NO `type` param on either call.
     - `"stops draining once MAX_PAGES is hit even if hasMore stays true"` —
       mock `get` to always return 0 unread items with `hasMore:true`
       forever; assert `get` called exactly `MAX_PAGES` times (20) and the
       method returns (does not hang) with `items: []`.
     - `"reports the real hasMore from the last page fetched, not a locally computed one"`
       — page 1 returns enough unread items to satisfy the requested limit
       AND `hasMore:true`; assert `result.hasMore === true` is preserved
       (not overridden to `false` just because enough items were collected).
   - Keep existing `describe("NotificationRepository.listNotifications")` /
     `"real interceptor pipeline"` / `"markRead"` suites as-is (non-unread
     filter path + raw-flag regression + single markRead are unaffected by
     this US) — only add the `type` field to `makeDto()`'s return shape to
     match the new real `NotificationResponseDto` (drop `titleVi/titleEn/
     bodyVi/bodyEn`, add `titleKey/titleParams/bodyKey/bodyParams`) so these
     existing tests keep compiling; adjust `expect(result.items[0].title)`
     assertions in the 2 tests that check title (`"returns mapped entities
     from envelope"`, `"survives the real unwrap..."`) to check
     `titleKey`/`titleParams` instead.
8. **GREEN**: `src/features/notification/infrastructure/repositories/notification.repository.ts`
   - `getUnreadCount()`: replace the `unreadCounts()` sum call with a direct
     `GET NOTIFICATION_EP.unreadCount` call returning `{ count }` (cast to
     `UnreadCountResponseDto`), no reduce/sum, no `RoomUnreadCountDto` import
     needed here anymore (keep the import only if `unreadCounts` is used
     elsewhere in this file — it is not, after this change, so drop it).
   - `markAllRead()`: rewrite as a bounded loop:
     ```ts
     const MAX_BATCHES = 40;
     async markAllRead(): Promise<void> {
       try {
         let hasMore = true;
         let iterations = 0;
         while (hasMore) {
           if (iterations >= MAX_BATCHES) {
             throw new Error("markAllRead exceeded MAX_BATCHES guard");
           }
           const res = (await this.http.patch(
             NOTIFICATION_EP.markAllRead,
           )) as unknown as { markedCount: number; hasMore: boolean };
           hasMore = res.hasMore;
           iterations += 1;
         }
       } catch (err) {
         throw toFailure(err);
       }
     }
     ```
     (guard error is a genuine `throw`, not a `NotificationFailure` shape —
     document in code comment that this is an invariant violation, not a
     domain failure, so it should NOT be caught by `toFailure`/silently
     mapped to `unknown`; wrap the `while` body's own try/catch separately
     from the guard-trip throw if `fe-nextjs-engineer` finds the single
     try/catch swallows the guard's intent — verify against the test in
     step 7 asserting "rejects", either behavior satisfies the test as long
     as it rejects).
   - `listNotifications()`: keep the non-`unread` branch exactly as-is (type
     filter, single call, existing behavior). Add an early branch for
     `filter === "unread"`:
     ```ts
     const MAX_PAGES = 20;
     if (filter === "unread") {
       const collected: NotificationEntity[] = [];
       let nextCursor: string | undefined = cursor;
       let realHasMore = false;
       for (let page = 0; page < MAX_PAGES; page += 1) {
         const envelope = (await this.http.get(NOTIFICATION_EP.list, {
           params: { limit: 100, cursor: nextCursor },
           ...({ raw: true } as Record<string, unknown>),
         })) as unknown as ApiEnvelope<NotificationResponseDto[]>;
         const { data, pagination } = parseEnvelope(envelope);
         const unread = (data ?? [])
           .filter((dto) => !dto.read)
           .map(mapNotification);
         collected.push(...unread);
         nextCursor = pagination?.nextCursor ?? undefined;
         realHasMore = pagination?.hasMore ?? false;
         if (collected.length >= limit || !realHasMore) break;
       }
       return {
         items: collected.slice(0, limit),
         nextCursor: nextCursor ?? null,
         hasMore: realHasMore,
       };
     }
     ```
     Note: `collected.slice(0, limit)` truncation vs `hasMore` reporting —
     since the test in step 7 asserts `hasMore` reflects the LAST page
     fetched's real value, keep returning the raw `realHasMore` even when
     truncating `items` to `limit` (documented, minor known imprecision:
     "Load more" may occasionally re-fetch an already-seen unread item if
     truncation cut mid-page — acceptable per the ADR's "less efficient,
     not incorrect" framing; do not over-engineer a second cursor to avoid
     this, out of scope for a wiring US).

### Phase 4 — DI + delete hybrid facade (green, no new test — deletion)

9. Delete `src/features/notification/infrastructure/repositories/hybrid-notification.repository.ts`
   and `hybrid-notification.repository.test.ts`.
10. **`src/bootstrap/di/notification.di.ts`** — `makeRepo()` reverts to:
    ```ts
    async function makeRepo(): Promise<INotificationRepository> {
      if (USE_MOCK) return new MockNotificationRepository();
      await ensureFreshSession();
      return new NotificationRepository(await createServerHttpClient());
    }
    ```
    Drop the `cookies()`/`NEXT_LOCALE` read and the `locale` constructor arg
    entirely (mapper no longer takes a locale — Phase 1). Drop the
    `HybridNotificationRepository` import. Remove now-unused `cookies` import
    from `next/headers` if nothing else in this file uses it.
11. **`src/features/notification/infrastructure/repositories/notification.repository.ts`**
    constructor: drop the `locale: string = "vi"` second param (no longer
    used by the mapper) — becomes `constructor(private readonly http:
    AxiosInstance) {}`. Update all `new NotificationRepository(http, "vi")`
    call sites in `notification.repository.test.ts` to drop the second arg
    (mechanical, ~15 call sites per the read above).

### Phase 5 — endpoint constants + doc comments (green)

12. **`src/bootstrap/endpoint/notification.endpoint.ts`** — update doc
    comments only (paths for `list`/`markRead`/`markAllRead`/`unreadCount`
    are already correct per the story's ground-truth — verify byte-for-byte
    against Product Contract table: `list` = `/noti/api/v1/notifications` ✓,
    `unreadCount` = `/noti/api/v1/notifications/unread-count` ✓, `markRead` =
    `/noti/api/v1/notifications/${id}/read` ✓, `markAllRead` =
    `/noti/api/v1/notifications/read-batch` ✓ — all four already match, no
    path edits needed, ONLY the "MOCK-ONLY: no real endpoint" comments on
    `list`/`unreadCount`/`markRead`/`markAllRead` are now stale and must be
    rewritten to reflect real US-146 backing; the module-level doc comment
    at the top must also drop the "have NO real backing... stay
    force-mocked" sentence). `unreadCounts` (plural) entry and its doc
    comment stay untouched verbatim.

### Phase 6 — use-case tests: fixture shape only (green, mechanical)

13. **`src/features/notification/domain/use-cases/notification.use-cases.test.ts`**
    — `makeNotification()` helper's `title`/`body` fields → `titleKey`/
    `titleParams`/`bodyKey`/`bodyParams` (e.g. `titleKey:
    "notification_grade_conduct_approved_title", titleParams: {}, bodyKey:
    "notification_grade_conduct_approved_body", bodyParams: {}`). No
    assertions in this file reference `.title`/`.body` directly (checked
    above — only `.type`/`.hasMore`/`.nextCursor`/`.count` are asserted), so
    this is a type-fix-only edit, no new test cases needed here.

### Phase 7 — presentation reshape (red→green, Storybook + a11y touch)

14. **`src/features/notification/presentation/notifications-center/notifications-center.tsx`**
    — `NotificationRow`:
    - Add a `titleKeys`/`bodyKeys` closed-union cast mirroring the existing
      `typeLabelKey` pattern one line above. Since the key space isn't a
      small fixed literal union like `type_${NotificationType}` (it's driven
      by BE-emitted string keys), cast via a helper that falls back to
      `"unknown"` for anything not in a known-keys `Set`:
      ```ts
      const KNOWN_TITLE_KEYS = new Set([
        "notification_discipline_violation_title",
        "notification_attendance_absence_title",
        "notification_grade_conduct_approved_title",
        "notification_attendance_leave_approved_title",
      ]);
      const KNOWN_BODY_KEYS = new Set([
        "notification_discipline_violation_body",
        "notification_attendance_absence_body",
        "notification_grade_conduct_approved_body",
        "notification_attendance_leave_approved_body",
      ]);
      const titleMsgKey = KNOWN_TITLE_KEYS.has(item.titleKey)
        ? (`titles.${item.titleKey}` as const)
        : ("titles.unknown" as const);
      const bodyMsgKey = KNOWN_BODY_KEYS.has(item.bodyKey)
        ? (`bodies.${item.bodyKey}` as const)
        : ("bodies.unknown" as const);
      ```
      (`as const` template-literal cast pattern must satisfy the typed `t()`
      — if the typed messages augmentation rejects the dynamic template
      literal, fall back to the exact cast style already used for
      `typeLabelKey` just above, i.e. cast to the full literal union of the
      4+1 known `"titles.<key>"` strings — engineer's call on which compiles
      cleanly, document the choice actually used).
    - Replace `{item.title}` → `{t(titleMsgKey, item.titleParams)}`.
    - Replace `{item.body}` → `{t(bodyMsgKey, item.bodyParams)}`.
    - `rowAriaLabel` call (`t("rowAriaLabel", { title: item.title, read: ... })`)
      → `title: t(titleMsgKey, item.titleParams)`.
    - `item.titleParams`/`item.bodyParams` are `Record<string, string>` —
      confirm this satisfies `next-intl`'s `t()` second-arg ICU values type
      (string values only, matches `severity`/`occurredAt` scope — no number/
      Date params needed per story scope).
15. Storybook: `notifications-center.stories.tsx` — update any fixture data
    passed as `NotificationEntity[]` (`title`/`body` → `titleKey`/
    `titleParams`/`bodyKey`/`bodyParams`, reuse the 4 known key-pairs) and
    add ONE story case using an unknown key-pair (e.g.
    `titleKey: "notification_future_unseen_title"`) to prove the
    `unknown` fallback renders instead of throwing/raw-key — this is the
    `fe-qa-playwright` interaction-test seed the AC's "unknown-key fallback
    render" line requires.

### Phase 8 — i18n keys (green, same-commit per i18n.md)

16. **`src/bootstrap/i18n/messages/vi.json`** and **`en.json`** — add under
    `notifications`:
    ```jsonc
    "titles": {
      "notification_discipline_violation_title": "Vi phạm kỷ luật ({severity})",
      "notification_attendance_absence_title": "Vắng mặt chưa phép",
      "notification_grade_conduct_approved_title": "Hạnh kiểm đã được duyệt",
      "notification_attendance_leave_approved_title": "Đơn xin nghỉ đã được duyệt",
      "unknown": "Thông báo mới"
    },
    "bodies": {
      "notification_discipline_violation_body": "Một vi phạm kỷ luật mức {severity} đã được ghi nhận vào {occurredAt}.",
      "notification_attendance_absence_body": "Một buổi vắng mặt chưa phép đã được ghi nhận vào {occurredAt}.",
      "notification_grade_conduct_approved_body": "Kết quả hạnh kiểm đã được duyệt vào {occurredAt}.",
      "notification_attendance_leave_approved_body": "Đơn xin nghỉ đã được duyệt vào {occurredAt}.",
      "unknown": "Xem chi tiết trong ứng dụng."
    }
    ```
    (exact vi/en copy is `fe-nextjs-engineer`'s call within the ICU/param
    constraints — `severity`/`occurredAt` only, terse tone matching existing
    `type_*` labels; en.json mirrors the same key structure with English
    text). `occurredAt` renders as the raw ISO string unless a `dateTime`/
    formatted-value ICU argument is used — acceptable for this US's scope
    (no new date-formatting utility introduced; if `fe-nextjs-engineer`
    already has a shared relative-time/date formatter handy, reuse it,
    don't build one).
17. Run `bunx tsc --noEmit` immediately after — this is the mechanism that
    confirms every `t("titles.<key>")` call site type-checks against the new
    `messages.d.ts` augmentation (per i18n.md's typed-key guarantee).

### Phase 9 — docs sync (green, no test)

18. **`docs/product/screens.md`** line 46 — change the Notifications Center
    row's status cell from `✅ US-E10.2 (list mock-first — BE chưa có
    list/read endpoint, US-E18.18; unread-count real)` to reflect list/read/
    unread-count now real, e.g. `✅ US-E10.2 + US-E18.25 (list/read/mark-all/
    unread-count real, BE US-146; unread tab client-side drain — see ADR
    0066)`.

### Phase 10 — full gate + Harness proof

19. `bun vitest run` (zero regression across the whole suite, not just
    notification), `bunx tsc --noEmit`, `bun run build`.
20. `fe-tech-lead-reviewer` + `fe-accessibility-auditor` in parallel (per
    pipeline) — reviewer checks: hybrid facade fully gone, `getUnreadCount`
    calls singular endpoint, `markAllRead`/`unread`-drain guards are bounded
    and tested, no raw UUID interpolated into rendered copy, i18n dynamic-key
    fallback never throws; auditor checks: new real-data string lengths
    don't break `line-clamp-1`/`line-clamp-2`, `rowAriaLabel`/`aria-live`
    still read correctly with interpolated ICU params.
21. Design-review gate: **N/A** per story's Design Notes (content-source
    swap only, empty JSX-structure diff beyond the two `t()` call sites) —
    `fe-lead` documents this explicitly rather than skipping silently.
22. `fe-qa-playwright`: Storybook interaction tests for mark-read row,
    mark-all-read (assert multi-batch drain via a mocked repo with 2+
    batches), unread-tab drain-and-filter (page-1-all-read → page-2-has-
    unread scenario), unknown-key fallback render (Phase 7's new story
    case) — Go/No-Go.
23. `scripts/bin/harness-cli story update --id US-E18.25 --status implemented
    --unit 1 --integration 1 --e2e <0|1> --platform 1`; update
    `docs/TEST_MATRIX.md` row; mark ask #34 RESOLVED + append ask #42 in
    `EPIC-OVERVIEW.md` (per Harness Delta section above).
24. Auto-merge to `main` per `.claude/rules/parallel-workflow.md` once gate
    is green; delete the branch.

### File-touch summary (for quick reviewer cross-check)

| File | Change |
| --- | --- |
| `domain/entities/notification.entity.ts` | reshape `NotificationEntity` |
| `infrastructure/dtos/notification-response.dto.ts` | split real vs mock DTO |
| `infrastructure/mappers/notification.mapper.ts` | drop locale param; add `mapMockNotification` |
| `infrastructure/mappers/notification.mapper.test.ts` | rewritten tests (Phase 1) |
| `infrastructure/repositories/mocks/fixtures.ts` | retype only |
| `infrastructure/repositories/mocks/notification.mock.repository.ts` | use `mapMockNotification` |
| `infrastructure/repositories/notification.repository.ts` | `getUnreadCount` singular, `markAllRead` loop, `unread` drain, drop `locale` ctor param |
| `infrastructure/repositories/notification.repository.test.ts` | new/replaced suites (Phase 3) |
| `infrastructure/repositories/hybrid-notification.repository.ts` | DELETE |
| `infrastructure/repositories/hybrid-notification.repository.test.ts` | DELETE |
| `bootstrap/di/notification.di.ts` | plain `USE_MOCK ? Mock : Real` gate |
| `bootstrap/endpoint/notification.endpoint.ts` | doc comments only, paths already correct |
| `domain/use-cases/notification.use-cases.test.ts` | fixture shape fix only |
| `presentation/notifications-center/notifications-center.tsx` | `NotificationRow` key+params rendering |
| `presentation/notifications-center/notifications-center.stories.tsx` | fixture shape + unknown-key story |
| `bootstrap/i18n/messages/vi.json` + `en.json` | new `notifications.titles.*`/`bodies.*` keys |
| `docs/product/screens.md` | line 46 sync |
