# US-E18.32 Moderation queue wiring (filters + stats + detail)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/moderation/` (US-E19.2's mock feature)
- Shared contract/file: `ReportInboxItem`, `ReportStatsResponse` (social service)

## Product Contract

BE US-172 adds: `GET /reports` gains `status`/`contentType`/`search` filters;
new `GET /reports/stats` (queue counts, ALWAYS reflect ALL reports per status
regardless of any list filter — do not derive stats from a filtered list
page); new `GET /reports/{reportId}` detail; `targetType` enum gains `COMMENT`
(comments are now reportable, not just posts).

**CRITICAL constraint (ground-truthed, `services/social/docs/openapi.yaml`
~line 3628-3646):** `GET /reports/{reportId}` is **NOT a standalone-shareable
deep link**. `reportId` is a clustering column, not a partition key — the
caller must ALSO supply `status` (optional, default `PENDING`) and `filedAt`
(**required**), echoed verbatim from a prior list response, to actually
address the row. A tuple that doesn't resolve (including cross-tenant) is a
`404 REPORT_NOT_FOUND`. **Do NOT build a bare `/moderation/reports/{id}` route
that a user could bookmark/paste** — the detail view must be reached FROM the
list (row click carrying `status`+`filedAt` in the navigation, e.g. via a
Sheet/Dialog or a route with those as required query params, never a
standalone path param alone).

**IMPORTANT — `src/bootstrap/di/moderation.di.ts` already has a detailed,
numbered enumeration of 5 blocking gaps from a prior investigation
(US-E18.20) — read it FIRST before implementing.** It matches this US almost
exactly: gap #1 (no filters/stats) and gap #2 (no detail endpoint) and gap #3
(no COMMENT target) are what US-172 claims to close. Gap #4 (audit trail is a
DIFFERENT concept — real `GET /rooms/{roomId}/moderation-audit`, US-086, is a
room role/mute/capability-change audit, NOT this feature's dismiss/remove
content-moderation trail) is **NOT addressed by US-172** — re-confirm this
gap is genuinely still open before assuming the audit-log tab can be wired;
if it's still open, that tab stays mocked (partial/hybrid wiring, matching
this epic's established precedent, same shape as US-E18.31's feed decision).
Gap #5 (`dismissReport(reportId)` has no CAS key parameter, but real
`ResolveReportRequest` requires the echoed-back `filedAt`) — ground-truth
whether `resolve`/`dismiss` ALSO now need the same `filedAt`+`status`
partition-locating convention as the new detail endpoint (this packet's own
`## Design Notes` flags this as "likely the same convention" but it needs
re-confirming against the CURRENT openapi, not assumed).

Also ground-truth: is `removeContent` for a COMMENT target now real (US-172
mentions `ResolveReport`'s DELETE outcome on a COMMENT target invoking the
same audit event) — if so, the previous "comment moderate-delete fails fast"
gap may ALSO be closing here, beyond just "COMMENT reportable."

## Relevant Product Docs

- `docs/product/screens.md` — Moderation row (US-E19.2)

## Acceptance Criteria

- List: filter by `status`/`contentType`/`search` (server-side params, not
  client-side filtering of an already-fetched page).
- Stats: queue count chips/tabs sourced from `GET /reports/stats`, NOT derived
  from filtered list pages (this was an explicit prior design decision in
  US-E18.29's invitations-tab precedent for an analogous reason — stats must
  reflect the true tenant-wide count).
- Detail: opening a report's detail from the list carries `status`+`filedAt`
  forward (Sheet/Dialog-in-place preferred over a new route, to make the
  non-shareable-URL constraint structurally impossible to violate — OR a route
  with `filedAt`/`status` as REQUIRED query params if a route is preferred;
  either way, no bare `[reportId]` dynamic segment alone).
- `targetType === "COMMENT"` renders correctly (whatever the existing
  `targetType` UI does for POST, extended, not forked).
- `bootstrap/di/moderation.di.ts` (or equivalent) flips from force-mock to
  `USE_MOCK ? Mock : Real`.
- Zero regression to existing moderation screen tests/stories.

## Design Notes

- Commands: existing resolve/dismiss actions — unaffected unless their
  contract also changed (check `POST /reports/{reportId}/resolve`'s own
  partition-locating requirement, likely the same `filedAt` convention per the
  packet's own note).
- Queries: `GET /reports?status=&contentType=&search=&cursor=`,
  `GET /reports/stats`, `GET /reports/{reportId}?status=&filedAt=`.
- API: `social` service.
- Domain rules: stats never derived client-side from a filtered page.
- UI surfaces: `src/features/moderation/presentation/` (existing).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper tests (new filters, targetType COMMENT, stats shape) |
| Integration | repository tests (filter params sent correctly, stats never client-derived, detail requires filedAt+status) |
| E2E | Storybook: filter interaction, stats display, detail-from-list-row navigation carrying filedAt/status, COMMENT target render |
| Platform | `bun build` clean both modes |
| Release | design-review gate + a11y |

## Harness Delta

Registered via `harness-cli story add --id US-E18.32`.

## Evidence

(fill after implementation)
