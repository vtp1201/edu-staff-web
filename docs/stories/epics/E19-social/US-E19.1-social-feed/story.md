# US-E19.1 Social Feed

## Status

planned

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: US-E19.2 (Content Moderation) — owns the shared `ReportContentDialog`
  component + `moderation.reportDialog.*` i18n namespace + `screens.moderation.reportDialog`
  design-spec entry. This story's "…" menu → "Báo cáo" entry point (FR-007) invokes
  that contract and MUST NOT redefine it. Per both stories' requirements.md
  Dependencies sections, `/fe` should land US-E19.2 first; if both run in parallel
  sessions, `fe-lead` must sequence US-E19.1 behind US-E19.2 or have it stub the
  trigger without redefining the dialog, reconciling once US-E19.2 merges
  (`.claude/rules/parallel-workflow.md` §1 dependency check).
- Blocks: none directly, but the same `ReportContentDialog` will later be consumed
  by out-of-scope US-E10.6 (messaging) — noted for `fe-lead` scheduling awareness,
  not a dependency of this story.
- Feature module(s) chạm: `src/features/feed/` (new — domain/infrastructure/presentation
  for post/comment/reaction), `(app)/(shared)/feed/` route.
- Shared contract/file: `ReportContentDialog` (component + `moderation.reportDialog.*`
  i18n, owned/placed by US-E19.2 — this story only imports it) · `EduSkeleton`/`EduEmpty`/
  `EduError` shared state primitives (pre-existing, no coordination needed).

## Product Contract

The Social Feed (`(app)/(shared)/feed`, all roles) gives every role a school-wide
+ per-class post feed. Teacher/principal can post to school scope; teacher/principal/
student can post to class scope; parent is view-only (no composer, ever). Any role
can react (single active reaction, toggle) and comment. Every post/comment exposes
a role-gated "…" menu with up to three entry points: **Pin/Unpin** and **Remove**
(moderator only — visibility-gating in this story, authorization + confirm + audit
owned by US-E19.2) and **Report** (any role except the content's own author, opens
the SHARED dialog owned by US-E19.2). Pinned posts float to the top with an icon+
label marker (never color-only). Feed paginates via cursor with an explicit
end-of-feed marker. Pin/unpin is **mock-first** — a local-only optimistic toggle,
not durably persisted (BE US-101 on `social` is `in_progress`); this story ships
the UI and must surface a non-blocking signal that the toggle is not yet durable.

## Relevant Product Docs

- `docs/design-requests/DR-012-social-feed.md`
- `docs/product/design-spec.jsonc` → `screens.feed` (~line 3521)
- `design_src/edu/feed.jsx` (`FeedScreen`)
- `docs/product/screens.md` (Social Feed row)
- `docs/product/roles-permissions.md` (`(app)/(shared)/feed` — all roles, composer role/scope-gated)
- This packet: `requirements.md` (TR-190), `integration.md` (INT-190-01…07),
  `use-cases.md` (UC-1901…1910), `spec.md` (consolidated spec + traceability)
- Shared dialog contract (read, do not redefine): `docs/stories/epics/E19-social/US-E19.2-content-moderation/{requirements,integration,use-cases}.md`,
  `docs/product/design-spec.jsonc` → `screens.moderation.reportDialog`

## Acceptance Criteria

Full Given/When/Then AC live in `use-cases.md` (AC-1901.x…AC-1910.x, 44 total). This
is the practical build checklist:

- Scope tabs (`role=tablist`) render "Toàn trường" + "Lớp <tên>" (listbox if >1 class);
  switching scope re-triggers its own independent loading→(empty|error|success) cycle.
- Composer renders ONLY when `canPost` for active role+scope (school: teacher/principal;
  class: teacher/principal/student) — absent from the DOM otherwise, never just disabled.
  Submit is optimistic-prepend with a confirmation toast; 422/403/transient failures each
  get distinct handling per UC-1902.
- Reaction chips: single active reaction per user, optimistic toggle, silent rollback on
  any failure (no toast), and remove-from-list on a concurrent 404 (post deleted).
- Comment thread: expand-on-demand fetch, sub-section skeleton/empty (not full-screen
  `EduEmpty`), 422/transient/404 handling per UC-1904.
- "…" menu is role/author-relationship gated per the matrix in UC-1905 (AC-1905.1–.5);
  the trigger itself is absent when zero items are entitled — not an empty menu.
- Report entry point opens the SHARED `ReportContentDialog` (US-E19.2 contract) with
  `{ kind, contentId, authorName, content preview }` — do not re-implement or duplicate
  its internal behavior/i18n here (AC-1906.3).
- Pinned posts always sort before non-pinned (createdAt desc among themselves), icon+
  text "Đã ghim" marker, re-sorts immediately on toggle.
- Cursor pagination: additive-append only, `aria-busy` load-more button, explicit
  end-of-feed marker when `hasMore=false`, inline retry on load-more failure.
- All 4 required UI states present and mutually exclusive: loading (`EduSkeleton`,
  3 rows), empty (`EduEmpty`, CTA only when `canPost`), error (`EduError` + retry for
  retryable; no-retry variant for forbidden/scope-not-found), end-of-feed.
- Remove entry point (menu item) delegates entirely to US-E19.2's confirm/authorization/
  audit flow — no second delete call, no second confirm dialog implemented here.
- Pin/unpin entry point is a **local-only** toggle (INT-190-07): no HTTP call, must not
  survive a full reload, and must show a non-blocking, non-toast, non-color-only "not
  yet persisted" indicator (exact copy — see Open Questions, needs `ba-lead`/`uiux-ux-writer`
  confirmation before adding the i18n key).
- WCAG 2.1 AA: `aria-pressed` + Vietnamese `aria-label` on reaction chips; proper
  menu/menuitem ARIA + Escape/outside-click dismiss on "…"; meaningful `alt` on images;
  no layout break at 320px.

## Design Notes

- Commands: `createPost`, `reactToPost` (PUT add/change, DELETE remove), `addComment`,
  `togglePinMock` (local-only, no HTTP).
- Queries: `getSchoolFeed(cursor)`, `getClassFeed(classId, cursor)`, `listComments(postId, cursor)`.
- API: `social` service — `GET/POST /api/v1/feeds/school`, `GET/POST /api/v1/feeds/classes/{classId}`,
  `PUT|DELETE /api/v1/feeds/posts/{postId}/reaction`, `GET/POST /api/v1/feeds/posts/{postId}/comments`,
  `DELETE .../moderate-delete` (entry point only, contract owned by US-E19.2). Pin/unpin
  (INT-190-07) has **no endpoint yet** — mock-first behind `IFeedRepository` so US-101's
  future endpoint swaps in without touching use-cases/presentation. Full endpoint
  catalogue: `integration.md` INT-190-01…07.
- Tables: none (no local persistence — all state is `social`-service or mock-cache).
- Domain rules: composer visibility = `canPost(role, scope)`; menu-item visibility =
  role/author-relationship matrix (UC-1905); pinned-first ordering recalculates on
  every toggle; single active reaction per user; author cannot report own content.
- UI surfaces: `src/features/feed/presentation/feed-screen/` (scope tabs, composer,
  post card, reaction bar, comment thread, "…" menu, pagination, 4 states) —
  net-new feature folder. Imports `ReportContentDialog` from wherever US-E19.2 places
  it (do not create a second copy).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E19.1 --unit 1 --integration 1 --e2e 1 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | planned — domain use-cases (create/react/comment/pin-mock) + failure mapping, mock repository |
| Integration | planned — repository↔HTTP contract tests for INT-190-01…06 (envelope/error mapping per `.claude/rules/api-integration.md`); INT-190-07 tested as pure local-reducer, no HTTP |
| E2E | planned — Storybook interaction stories per UC (scope switch, composer gating, reaction toggle/rollback, comment thread, "…" menu matrix, report entry point invokes shared dialog, pinned ordering, pagination/end-of-feed, pin/unpin mock non-persistence) |
| Platform | planned — manual keyboard-only pass (tablist arrow-keys, menu Escape/outside-click, comment input) |
| Release | planned |

## Harness Delta

- New i18n namespace `feed.*` (vi source + en mirror) for all static copy in this
  story — reason list/i18n for the Report dialog itself is `moderation.reportDialog.*`
  (US-E19.2), NOT duplicated under `feed.*`.
- Net-new i18n key still open: the pin/unpin "not yet persisted" indicator copy
  (see spec.md §8 Open Questions) — must be confirmed by `ba-lead`/`uiux-ux-writer`
  before `fe-nextjs-engineer` adds it to `messages/{vi,en}.json`.
- No new design tokens expected (reuses `Badge`, `StatCard`-adjacent patterns, existing
  `--edu-*` tokens per `screens.feed`).
- No ADR needed for this story (lane: normal, no authz/data-loss change of its own).

## Evidence

(none yet — story is `planned`)
