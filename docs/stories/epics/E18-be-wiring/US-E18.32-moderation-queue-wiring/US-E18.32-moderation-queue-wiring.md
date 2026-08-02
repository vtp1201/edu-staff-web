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

| Layer | Expected proof | Actual (US-E18.32) |
| --- | --- | --- |
| Unit | mapper tests (new filters, targetType COMMENT, stats shape) | ✅ `moderation.mapper.test.ts` 14 tests — full targetType/reasonCategory matrices, `status × resolutionOutcome` flattening incl. ESCALATE, the "never invents reporter/author/preview/duplicates" guard, request-mapper round-trip, `all → omit the param`. Plus `format-report-row.test.ts` (escalated tone + null pass-through), `filter-search-params.test.ts` (legacy `?status=all` fallback), `moderation-use-cases.test.ts` (ref forwarded whole). |
| Integration | repository tests (filter params sent correctly, stats never client-derived, detail requires filedAt+status) | ✅ `moderation.repository.test.ts` 39 tests — exact `params` object per filter combination (incl. trimmed search, omitted `contentType`/`cursor`), `raw:true` as a config-level sibling, **call-count proof that `listReports` issues exactly ONE GET and never touches `/reports/stats`**, `getReportStats` sends no params at all, detail sends `filedAt`+`status` (PENDING and RESOLVED legs), dismiss/remove `resolve` bodies with the CAS `filedAt`, COMMENT-via-resolve, direct-comment-without-parentId = zero HTTP, `createReport` COMMENT + OTHER/reasonFreeText, and the audit-log **zero-HTTP honest degrade**. `moderation.mock.repository.test.ts` 13 tests (stats independent of the active filter; mismatched `filedAt` = not-found). `moderation.di.test.ts` 5-case env matrix (`true`/`false`/unset + no-http-in-mock + refresh-before-http). `page.test.ts` 5 tests (`auditLogEnabled === USE_MOCK` both ways; stats from their own read; null-not-zeros on stats failure). |
| E2E | Storybook: filter interaction, stats display, detail-from-list-row navigation carrying filedAt/status, COMMENT target render | ✅ `moderation-screen.stories.tsx` 27 interaction tests (was 22): added `StatsIndependentOfFilteredList`, `EmptyFilteredStillOffersLoadMore`, `RealWireShapeQueue`, `RealWireShapeCommentDetail`, `AuditTabHiddenWithoutBacking`; retuned `CombinedFilterViaUI` to the 2-tab reality. **Review round:** +2 → **29** stories (`StatsForbiddenShowsUnavailable`, `DetailSheetRestoresFocusOnClose`; `WholeScreenError` retuned to assert the `UnavailableValue` marker on both counter cards). Primitive-level: `sheet.stories.tsx` 4 → **6** (`ControlledSheetRestoresFocusOnClose`, `TriggerSheetStillRestoresFocus`). |
| Platform | `bun build` clean both modes | ✅ **Review round (2026-08-02):** `bun run build` green with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`) **and** with `NEXT_PUBLIC_USE_MOCK=true`. `bunx tsc --noEmit` clean. `bun lint` exit 0 (same 2 pre-existing findings in untouched `messaging` files). Full suite **467 files / 3412 tests pass** (+1 file, +9 tests vs. 466/3403; zero regressions). Storybook interaction suite **157 files / 1197 tests pass**. |
| Release | design-review gate + a11y | Pending `fe-tech-lead-reviewer` / `fe-accessibility-auditor` / design-review gate. Notes for the audit: `UnavailableValue` pairs the visual em-dash with sr-only text; the escalated badge is icon+text (never colour-only) on the `purple` tone; the search input is capped at 200 chars to match the server's 400. |

## Harness Delta

Registered via `harness-cli story add --id US-E18.32`.

## Evidence

### Gap re-ground-truth (vs. `edu-api@61fc50ce services/social/docs/openapi.yaml`)

| # | Gap (from `moderation.di.ts`, US-E18.20) | Final state | Citation |
| --- | --- | --- | --- |
| 1 | No queue filters, no stats | **CLOSED** | `GET /api/v1/reports` now takes `status` (PENDING\|RESOLVED), `contentType` (MESSAGE\|POST\|COMMENT) and `search` (≤200 chars, `reasonFreeText` only), all applied server-side (yaml ~3477–3545). `GET /api/v1/reports/stats` → `ReportStatsResponse {pending, resolved}` (yaml 3589–3612, schema ~5720–5750). ⚠️ Two constraints shaped the code: `status=all` is **deliberately unsupported** ("two partition walks plus a merge… page size would stop being deterministic", yaml ~3487) → the third tab was REMOVED, not faked; `contentType`/`search` run over a **bounded in-app scan** (10×100 rows) so "a short or even empty page with `hasMore=true` is NORMAL" (yaml ~3510) → load-more stays available on an empty filtered page. |
| 2 | No detail endpoint | **CLOSED, but not standalone-shareable** | `GET /api/v1/reports/{reportId}` (yaml 3628–3704) returns the SAME `ReportInboxItem`; `reportId` is "a clustering column, not a partition key" so `filedAt` is **required** and `status` optional-default-PENDING, echoed verbatim from the list. "This URL is not standalone-shareable — a bare deep link cannot work; do not build one." Honoured: the detail is a **Sheet** opened from a row, keyed by a `ReportRef {reportId, filedAt, status}`. No `[reportId]` route segment exists anywhere. |
| 3 | No COMMENT report target | **CLOSED (both halves)** | `SubmitReportRequest.targetType ∈ {MESSAGE, POST, COMMENT}` (yaml ~5600). Comment moderate-delete is real: `POST /feeds/posts/{postId}/comments/{commentId}/moderate-delete` (yaml 2248) **and** `resolve`'s DELETE outcome is wired for all three target types (yaml ~3721). From the QUEUE removal goes through `resolve(action: DELETE)` — the direct comment route needs a parent `postId` a report row does not carry (it holds only the `commentId`). Comment delete is IRREVERSIBLE (no soft-delete column → 404, never a 409). |
| 4 | Audit trail is a different concept | **STILL OPEN** | US-172 does not touch it. `GET /rooms/{roomId}/moderation-audit` (yaml 781) is still the room role/mute/capability audit gated on `manage_room`; no tenant-wide dismiss/remove trail exists. → `ModerationRepository.getModerationAuditLog` **honestly degrades**: typed `forbidden`, **zero HTTP**, no mock fallback; the tab is hidden unless `auditLogEnabled` (= `USE_MOCK`), and a deep-linked `?tab=audit` falls back to the queue. |
| 5 | `resolve`/`dismiss` CAS key | **CONFIRMED still required** | `ResolveReportRequest.required = [action, filedAt]` (yaml ~5688). `dismissReport`/`removeContent` now take the same `ReportRef`, so the key cannot be missing at a call site. |

### Contract deltas the brief did NOT anticipate (found by re-reading the whole schema)

- `ReportInboxItem` carries **no reporter identity** (`reporterUserId` is omitted at DTO shape, NFR-098-01 — a permanent posture, not a missing field), **no content preview**, **no content author**, **no duplicate-report count**, and **no resolve note**. The pre-existing web DTO declared all of them; they were invented pre-contract. Those entity fields are now `string | null` / `number | null`, `null` on every real read, and presentation OMITS the affordance (`UnavailableValue` = em-dash + sr-only "Không có dữ liệu") rather than inventing a value.
- Detail returns the same row shape → `fullContent` / `context` / `duplicateReports` are `null` = "not available" (distinct from `[]` = "none exist"); the sheet shows the target reference + an explicit `detail.contentUnavailable` line and omits the duplicate section entirely.
- Lifecycle is TWO wire fields (`status` × `resolutionOutcome`) → flattened to `ReportStatus`, gaining a read-only **`escalated`** member: this app never issues `ESCALATE`, but another ADMIN can, and mapping it to `dismissed` would misreport a severity decision as a no-op.
- `reasonCategory` is a different vocabulary (`HARASSMENT|INAPPROPRIATE_CONTENT|SPAM|MISINFORMATION|OTHER`) — mapped 1:1 both directions, round-trip-tested.
- Stats are FLAT `{pending, resolved}` → the old `resolvedThisWeekCount` (7-day window) and `removedCount` (DELETE subset) have no backing and were dropped, not approximated. Stat row is now 2 cards.
- `resolvedBy` is a **user id**, never a display name.

### Honest-degrade posture (US-E18.31's review lesson applied)

`NEXT_PUBLIC_USE_MOCK` is false when unset and `.env.local` sets it to `false`, so the **real branch is production**. Nothing falls back to the in-memory mock behind a real read: the only unbacked method (`getModerationAuditLog`) returns a typed failure with zero HTTP AND has its UI affordance removed in real mode (`page.test.ts` asserts `auditLogEnabled === USE_MOCK` in both directions). Every other method — list, stats, detail, dismiss, remove, submit-report — is genuinely real, so no mutation is faked.

### Files

- Domain: `report.entity.ts` (+`ReportRef`/`reportRefOf`, nullable identity fields, `escalated`), `moderation-stats.entity.ts`, `report-detail.entity.ts`, `report-queue-filter.entity.ts` (no `all`), `i-moderation.repository.ts` (+`getReportStats`, ref-taking reads/writes, `RemoveContentRepoInput.ref`), `dismiss-report.use-case.ts`.
- Infrastructure: `report-response.dto.ts` (rewritten to `ReportInboxItemDto` + request DTOs), `moderation-stats-response.dto.ts`, `moderation.mapper.ts` (+4 wire-request mappers), `moderation.repository.ts` (live), `mocks/moderation.mock.repository.ts`; deleted `report-detail-response.dto.ts`, `audit-entry-response.dto.ts`.
- Bootstrap: `endpoint/moderation.endpoint.ts` (+`reportStats`, +`moderateDeleteComment`, −`moderationAuditLog`), `di/moderation.di.ts` (`USE_MOCK ? Mock : Real`), `di/moderation.di.test.ts` (renamed from `moderation-force-mock.di.test.ts`).
- App: `principal/moderation/{page.tsx,actions.ts}` (+`getReportStatsAction`, `auditLogEnabled`, parallel stats seed), new `page.test.ts`.
- Presentation: `moderation-screen.{tsx,i-vm.ts,stories.tsx}`, `components/{format-report-row.ts,report-status-badge.tsx,stat-row.tsx,queue-filter-bar.tsx,filter-search-params.ts,report-table.tsx,report-card.tsx,report-queue-results.tsx,report-detail-sheet.tsx}`, new `components/unavailable-value.tsx`.
- i18n: `messages/{vi,en}.json` — added `moderation.unavailable`, `moderation.statusLabels.escalated`, `moderation.detail.contentUnavailable`; replaced `stats.resolvedThisWeek`+`stats.removed` with `stats.resolved`; removed `filter.status.all`; retuned `filter.searchPlaceholder` (search now matches the reporter's free text only) and `empty.filteredBody`.

### Review-round fixes (tech-lead Revision Required + a11y audit, 2026-08-02)

**MUST-FIX — a failed stats read no longer renders an endless skeleton.**
`StatRow`'s old guard was `isLoading || !stats → <StatCardSkeleton/> ×2`. Once the
stats query settles in error (`forbidden` is non-retryable and reachable in
production — MANAGER is missing from the social RBAC allow-list — and a transient
error eventually exhausts its retry budget) `isLoading` is false while `data`
stays `undefined` forever, so the skeleton rendered permanently and read as
"still loading" when the truth was "this failed" — the exact lie
`UnavailableValue` / `initialStats: null` (never zeros) exist to prevent.
`statsQuery.isError` is now threaded to `StatRow` as `hasError`, and a pure
`statRowMode({hasStats,isLoading,hasError})` decides: real (even stale) numbers →
`ready`; error → `unavailable`; only a genuine in-flight first read → `loading`.
The two cards then render `<UnavailableValue/>` (em-dash + sr-only
"Không có dữ liệu") in the value slot. `StatCardDefaultProps.value` widened
`string → React.ReactNode` for that (backwards-compatible; every existing caller
passes a string). Proof: `stat-row.test.ts` (4 cases, written red-first) +
`StatsForbiddenShowsUnavailable` + the retuned `WholeScreenError` story.

**A11Y-001 — Sheet focus restore, fixed in the `SheetContent` PRIMITIVE.**
Every detail/drawer sheet here is opened programmatically (no `<SheetTrigger>`),
so Radix's `triggerRef` is null and focus fell to `<body>` on close.
Measured while fixing it: the `useDialogReturnFocus(open)` idiom cannot be reused
verbatim in a primitive, because a `Content` renders unconditionally inside its
`Root` (only `Presence` decides mounting) — snapshotting at first render captures
`<body>`, and "restoring" to `<body>` also *suppresses* Radix's own trigger
restore, i.e. it regresses trigger-based sheets. New sibling hook
`useAutoFocusReturn()` (`src/shared/use-dialog-return-focus.ts`) therefore
snapshots the invoker on Radix's `onOpenAutoFocus` (dispatched BEFORE focus moves
into the content) and restores it on `onCloseAutoFocus`, preventing Radix's
default only when a still-connected invoker exists. Proof: two new primitive
stories (controlled + trigger regression guard) and
`DetailSheetRestoresFocusOnClose` on the real screen. Verified red→green: with the
two handlers removed, both controlled stories fail with focus on `<body>`; the
trigger story passes either way (Radix's default), so no consumer is regressed.

> ⚠️ Flagged to `fe-lead`, NOT fixed here (out of this story's scope):
> `components/ui/dialog/dialog.tsx`'s `DialogContent` has the identical latent
> bug (`useDialogReturnFocus(true)` at first render captures `<body>`). Reproduced
> with a throwaway story: a **trigger-based** `Dialog` closed with Escape leaves
> focus on `<body>` instead of the trigger. Fix is a one-line swap to
> `useAutoFocusReturn()`, but it touches every Dialog consumer and deserves its
> own review.

**A11Y-002 — StatCard icon contrast, fixed in the PRIMITIVE's `TONE` map.**
The icon was drawn in the raw hue on its own `/15` tint: `--edu-warning` #FFAE1F
on #FFF3DD = **1.69:1**, `--edu-success` #13DEB9 on #DCFAF4 = **1.56:1** (WCAG
1.4.11 needs 3:1). Now `warning.icon = text-edu-warning-foreground` (#2A3547 =
**11.25:1**) and `success.icon = text-edu-success-text` (#007A6E = **4.75:1**) —
existing tokens, no new token, no ADR needed. Locked by 3 assertions on the newly
exported `STAT_TONE`. Remaining self-hue-on-own-tint tones were measured and left
alone (outside the finding's scope): `error` 2.09:1, `info` 2.43:1, `teal`
2.16:1, `primary` 2.82:1 — reported to `fe-lead` as a follow-up.

**[CONSIDER] items, all applied.** (a) The orphaned point-read JSDoc above
`getReportStats` moved onto `getReportDetail` where it belongs. (b) The mock now
really honours the whole tuple on the point READ — new private `findByRef()`
matches `(reportId, filedAt)` **and** the status *partition* (`pending` →
PENDING, else RESOLVED), so a wrong-partition read is `not-found` like the real
404. Deliberately NOT applied to the resolve WRITES: `POST /reports/{id}/resolve`
sends `filedAt` as the CAS key and no `status`, so a stale ref must stay a 409
`already-resolved`, not a 404 — both behaviours are now pinned by tests. (c)
Dead keys `moderation.detail.close` / `moderation.detail.reason` deleted from
`vi.json` + `en.json` (grep-confirmed no reader: the sheet's X uses
`Common.close`, and the reason chip uses `moderation.reportDialog.reasons.*`);
vi/en key sets verified identical afterwards.

### Files touched in the review round

- `src/components/shared/stat-card/stat-card.tsx` (+`.test.tsx`) — `TONE` → exported `STAT_TONE`, two icon tokens, `value: React.ReactNode`.
- `src/components/ui/sheet/sheet.tsx` (+`.stories.tsx`) — `onOpenAutoFocus`/`onCloseAutoFocus` via `useAutoFocusReturn`.
- `src/shared/use-dialog-return-focus.ts` — new `useAutoFocusReturn()` (the `open`-based hook is unchanged).
- `src/features/moderation/presentation/moderation-screen/components/stat-row.tsx` (+ new `stat-row.test.ts`), `moderation-screen.tsx` (threads `hasError`), `moderation-screen.stories.tsx`.
- `src/features/moderation/infrastructure/repositories/mocks/moderation.mock.repository.ts` (+`.test.ts`).
- `src/bootstrap/i18n/messages/{vi,en}.json` — two dead keys removed.

