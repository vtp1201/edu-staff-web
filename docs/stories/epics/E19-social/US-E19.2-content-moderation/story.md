# US-E19.2 Content Moderation

## Status

planned

## Lane

high-risk

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: none.
- Blocks: US-E19.1 (Social Feed) — this story OWNS the shared `ReportContentDialog`
  component + `moderation.reportDialog.*` i18n namespace + `screens.moderation.reportDialog`
  design-spec entry. US-E19.1's feed "…" menu Report entry point invokes this
  contract and must not redefine it. Per both stories' requirements.md, this story
  SHOULD land first; if both run in parallel sessions, `fe-lead` must build the
  shared dialog + `moderation` namespace ONLY on this branch
  (`.claude/rules/parallel-workflow.md` §1 dependency check). Out-of-scope sibling
  US-E10.6 (messaging) is a third future consumer of the same dialog — noted for
  `fe-lead` scheduling, not built here.
- Feature module(s) chạm: `src/features/moderation/` (new — domain/infrastructure/
  presentation for report queue/detail/dismiss/remove/audit), `src/components/shared/report-content-dialog/`
  (new — the shared dialog, consumed by ≥2 screens per `component-organization.md`),
  `(app)/principal/moderation/` route.
- Shared contract/file: `ReportContentDialog` (component owned here) ·
  `moderation.reportDialog.*` i18n (owned here) · `EduSkeleton`/`EduEmpty`/`EduError`
  shared state primitives (pre-existing, no coordination needed).

## Product Contract

Two parts ship together because they share one report entity: (1) the SHARED
`ReportContentDialog` — reason radiogroup (Spam/Ngôn từ không phù hợp/Bắt nạt/
Thông tin sai/Khác, note required for "Khác"), quoted 3-line preview, submit — the
SINGLE component/i18n source reused verbatim by US-E19.1's feed and (later,
out-of-scope) messaging; (2) the principal-only Moderation screen
(`(app)/principal/moderation`): stat row (pending/resolved-this-week/removed),
filterable+searchable report queue with a true-empty vs filtered-empty distinction,
a focus-trapped detail sheet (context, reporter/reason, duplicate-report list,
resolve-info), non-destructive Dismiss, and the **destructive, irreversible,
audit-logged Remove-content action** — role-gated to `principal` ONLY (Ba-Lead
Decision, applies existing decision `0022`; `admin` is explicitly NOT an actor for
this route despite a stale `design-spec.jsonc` `roles` array), always confirm-dialog
gated (`role="alertdialog"`), never optimistic, with a read-only audit-log tab.

## Relevant Product Docs

- `docs/design-requests/DR-013-content-moderation.md`
- `docs/product/design-spec.jsonc` → `screens.moderation` (~line 3745) incl. shared
  `reportDialog` sub-entry (~line 3916) — note: its `roles` array literally lists
  `["principal", "admin"]`; per the Ba-Lead Decision below, treat this route as
  `principal`-only in all implementation and AC, not a doc-vs-code conflict to
  re-litigate.
- `design_src/edu/moderation.jsx` (`ModerationScreen`) + `design_src/edu/ui.jsx`
  (`ReportContentDialog`, `REPORT_REASONS`)
- `docs/product/screens.md` (Content Moderation row)
- `docs/product/roles-permissions.md` (`(app)/principal/moderation` — `principal` only)
- This packet: `requirements.md` (TR-191, incl. the Ba-Lead Decision on FR-108),
  `integration.md` (INT-191-01…07), `use-cases.md` (UC-1921…1930), `spec.md`
- Consumed by (reference, do not touch): `docs/stories/epics/E19-social/US-E19.1-social-feed/`

## Acceptance Criteria

Full Given/When/Then AC live in `use-cases.md` (AC-1921.x…AC-1930.x, 51 total). This
is the practical build checklist:

- `ReportContentDialog` is invoked with `{ kind, contentId, authorName, content
  preview }`; Submit disabled until a reason is chosen (and a non-empty note when
  reason="Khác"); Escape/Cancel/outside-click closes without submitting and returns
  focus to the trigger; focus-trapped; ONE component instance backs every caller
  (feed today, messaging later) — no forked per-consumer copy.
- Report submit: success → toast "Đã gửi báo cáo. BGH sẽ xem xét.", dialog closes,
  content stays visible to the reporter; 422 → inline field error, dialog stays
  open, no toast; transient → inline error + retry, dialog stays open, no toast;
  409 (duplicate self-report) → inline informational message (exact close-vs-stay
  behavior open, see spec.md §8).
- Moderation screen: 3 StatCards (Chờ xử lý / Đã xử lý tuần này / Đã gỡ nội dung);
  a stat/queue fetch failure falls back the WHOLE screen to the error state, never
  a partial stat render.
- Queue: status tabs (Chờ xử lý/Đã xử lý/Tất cả), content-type select, free-text
  search, all combine as AND; the true-empty (positive tone, "Không có báo cáo nào
  chờ xử lý") vs filtered-empty ("Không tìm thấy báo cáo nào") distinction is
  mandatory and never conflated.
- Detail sheet: focus-trapped, shows full content/author/context/reporter/reason/
  note/duplicate list, and resolve-info instead of the action footer when
  `status !== "pending"`; 404 shows inline error without rendering stale data.
- Dismiss: only when `status === "pending"`; success → toast "Đã bỏ qua báo cáo" +
  server-recorded audit entry; 409 → refetch to show actual state, no overwrite;
  403 → distinct message, no retry.
- **Remove-content (the high-risk core):** entry point rendered ONLY for
  `principal`; confirm dialog (`role="alertdialog"`, focus-trapped) states BOTH
  irreversibility AND that the author will be notified; NEVER optimistic — content
  is not marked removed anywhere in the UI until the server call succeeds; 403/
  NOT_PRINCIPAL → distinct permissions-problem copy, no retry button, dialog stays
  open; 409 (already resolved) → distinct message, dialog closes, queue refetches;
  retryable transient → inline error WITH retry; the 403-vs-transient distinction
  MUST branch on `error.code`, never `error.message` (code-review-verifiable).
- Audit log tab: read-only, reverse-chronological, actor + action badge (icon+text,
  never color-only) + content ref + timestamp + reason; no action controls anywhere
  in this tab.
- Duplicate-report section: header count + list when >1 report on the same
  `contentId`; omitted or "0" state otherwise.
- WCAG 2.1 AA: both dialogs correctly focus-trapped (Tab loop, Escape, return-focus
  -on-close); status/action badges icon+text not color-only; destructive button
  visually and semantically distinct (danger variant); responsive table→card switch
  at ≤760px, detail sheet usable at 375px.

## Design Notes

- Commands: `submitReport`, `dismissReport`, `removeContent` (destructive, no
  optimistic update).
- Queries: `listReports(status, contentType, search, cursor)`, `getReportDetail(reportId)`,
  `getModerationAuditLog(scopeId, cursor)`.
- API: `social` service — `POST /api/v1/reports`, `GET /api/v1/reports`,
  `GET /api/v1/reports/{reportId}` (inferred, unconfirmed — see Open Questions),
  `POST /api/v1/reports/{reportId}/resolve` (dismiss), `DELETE
  /api/v1/feeds/posts/{postId}/moderate-delete` | `.../comments/{commentId}/moderate-delete`
  (canonical, shared with US-E19.1's menu entry point), `GET
  /api/v1/rooms/{roomId}/moderation-audit` (audit log; `roomId` naming is an open
  question). `noti` service: author notification on removal is a server-side
  side effect of `moderate-delete` — no direct FE call. Full catalogue:
  `integration.md` INT-191-01…07.
- Tables: none (no local persistence — all state is `social`-service).
- Domain rules: Remove-content role-gate = `principal` ONLY (Ba-Lead Decision,
  applies decision `0022`, no new ADR); Dismiss/Remove both require
  `report.status === "pending"`; 403-vs-transient failure branching by `error.code`
  only; NEVER optimistic remove.
- UI surfaces: `src/components/shared/report-content-dialog/` (shared, ≥2 consumers
  per `component-organization.md`) + `src/features/moderation/presentation/moderation-screen/`
  (stat row, view tabs, queue filter bar, table/card list, detail sheet, confirm-remove
  dialog, audit timeline) per `design_src/edu/moderation.jsx` + `design_src/edu/ui.jsx`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E19.2 --unit 1 --integration 1 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | planned — domain use-cases (submit-report, dismiss, remove-content) + failure mapping (forbidden vs transient vs conflict), mock repository |
| Integration | planned — repository↔HTTP contract tests for INT-191-01…07, explicit test asserting 403-vs-transient branches on `error.code` not `error.message` (NFR-101) |
| E2E | planned — Storybook interaction stories per UC: dialog open/reason/submit/cancel/focus-trap, stat row + whole-screen error fallback, filter/search combos + both empty variants, detail sheet states, dismiss happy/conflict/forbidden, remove happy/forbidden/conflict/transient (never-optimistic assertion), audit log read-only, duplicate list |
| Platform | planned — manual keyboard-only pass (dialog focus trap, alertdialog Escape, detail-sheet Tab loop) |
| Release | planned — high-risk lane: confirm audit-log entry is retrievable end-to-end for every remove/dismiss before sign-off |

## Harness Delta

- New i18n namespace `moderation.*` (vi source + en mirror), including
  `moderation.reportDialog.*` as the SINGLE source of truth — grep-verify no
  duplicate keys land under `feed.*`/`messaging.*` (NFR-104).
- No new design tokens expected (reuses `StatCard`, `Badge`, existing `--edu-*`
  tokens per `screens.moderation`).
- No new ADR required to resolve FR-108's role-gate — the Ba-Lead Decision in
  `requirements.md` applies existing decision `0022`, it does not create a new
  authorization rule. `docs/product/roles-permissions.md` was patched with an
  explicit row for this route (already reflected in that file).
- Any FUTURE change to this role-gate (e.g. adding `admin` to this route) is a
  separate story/decision — not assumed here.

## Evidence

(none yet — story is `planned`)
