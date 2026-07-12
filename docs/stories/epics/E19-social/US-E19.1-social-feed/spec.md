# Feature Spec — Social Feed (US-E19.1)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-190) · `integration.md` (INT-190-01…07) ·
`use-cases.md` (UC-1901…1910, AC-1901.1…AC-1910.3) + `docs/product/design-spec.jsonc`
→ `screens.feed` (~line 3521) + `design_src/edu/feed.jsx` (`FeedScreen`) ·
DR-012-social-feed.md

## 1. Scope & Objectives

**Purpose:** Give every authenticated role a school-wide + per-class social feed
to post (role/scope-gated), react, comment, and report/moderate content, matching
DR-012's approved design.

**In scope:**
- Feed screen: scope tabs (school/class), composer, post card, reaction bar,
  comment thread, "…" menu entry points (pin/unpin, remove, report), pinned-post
  ordering, cursor pagination, all 4 required UI states.
- Report entry points that open the SHARED `ReportContentDialog` contract owned by
  US-E19.2.
- Pin/unpin and remove menu items as UI entry points (visibility gating only).

**Out of scope:**
- Any BE Go implementation of `social` service endpoints.
- The Report dialog's own internal contract (reason list, quote preview, submit/
  cancel semantics, i18n) — defined ONCE in US-E19.2 (`UC-1921`/`UC-1922`), referenced
  here.
- Moderation queue, detail sheet, resolve/dismiss/remove authorization logic, audit
  trail — all owned by US-E19.2.
- Real persistence of pin/unpin (mock-first until BE US-101 ships).
- Real image upload pipeline (mock attach only, per DR-012).

**Definitions:**
- *Scope* — "school" (all classes/tenant-wide) or "class" (a single class the user
  belongs to/teaches).
- *canPost* — derived boolean: school scope → teacher/principal; class scope →
  teacher/principal/student. Parent is never `canPost` in any scope.
- *Moderator (menu visibility)* — principal (any post, any scope) or teacher acting
  on their own-class posts (`[ASSUMPTION]`, final gate confirmed by US-E19.2's
  server-side role check).
- *Mock-first* — a client-only state mutation with no HTTP call, per decision `0014`.

## 2. Actors & Roles

| Role | Feed capability | Composer | Pin/Remove menu-item visibility |
| --- | --- | --- | --- |
| Teacher | school post, own-class post, react, comment, report others | school + class | own-class posts only |
| Principal | school post, any-class post, react, comment, report others | school + class | any post, any scope |
| Student | own-class post only (no school post), react, comment, report others | class only | never |
| Parent | view-only, react, comment, report others | none (never rendered) | never |

Role-gated visibility: composer visibility (`FR-002`) and menu-item visibility
(`FR-006`) are UX affordances only — the server is the authorization boundary
(`NFR-005`); see §6 error mapping for the 403 defense-in-depth path.

## 3. Functional Requirements

### FR-001 — Scope tabs
Priority: Must · Source: TR-190/FR-001, UC-1901
The system SHALL render a `role=tablist` with "Toàn trường" (school) and "Lớp <tên>"
(class; `role=listbox` when the user belongs to >1 class).
AC:
- Given the Feed screen loads, When rendering completes, Then the tablist shows
  both scopes with the active one selected by default (school).
- Given the user activates a different scope tab, When the switch completes, Then
  the previous scope's posts unmount and the new scope independently cycles
  loading→(empty|error|success) (AC-1901.6).
Dependencies: INT-190-01/02.

### FR-002 — Role/scope-gated composer visibility
Priority: Must · Source: TR-190/FR-002, UC-1902
The system SHALL show the composer only when `canPost` is true for the active
role+scope, and SHALL NOT render it (absent from DOM) otherwise.
AC:
- Given active scope = school and role = teacher or principal, Then the composer
  renders; given role = student or parent, Then it is absent (AC-1902.1).
- Given active scope = class and role = teacher/principal/student (member), Then
  the composer renders; given role = parent, Then it is absent (AC-1902.2).
Dependencies: FR-001.

### FR-003 — Post submission
Priority: Must · Source: TR-190/FR-003, UC-1902
The system SHALL let an eligible user submit a post (text + optional single mock
image) to the active scope.
AC:
- Given non-empty text submitted by an eligible user, When the POST succeeds, Then
  the post is optimistically prepended and a toast "Đã đăng bài viết" appears
  (AC-1902.3).
- Given the server returns 422 (empty/oversized), When the response returns, Then
  an inline field error appears, content is preserved, no prepend occurs (AC-1902.5).
Dependencies: INT-190-03.

### FR-004 — Reactions
Priority: Must · Source: TR-190/FR-004, UC-1903
The system SHALL let any role toggle a single active reaction (👍/❤️/🎉/👏) per post,
optimistically.
AC:
- Given no prior reaction, When the user clicks a chip, Then it becomes the user's
  own reaction (visually distinct, `aria-pressed="true"`), count increments
  optimistically (AC-1903.1).
- Given the reaction call fails for any reason, When it resolves, Then the chip and
  count silently revert with no toast (AC-1903.4).
Dependencies: INT-190-04.

### FR-005 — Comment thread
Priority: Must · Source: TR-190/FR-005, UC-1904
The system SHALL let any role expand a post's comments and add an inline comment.
AC:
- Given the thread is expanded, When the fetch is pending, Then sub-section
  skeleton rows render (not a full-screen skeleton) (AC-1904.1).
- Given non-empty text submitted, When the POST succeeds, Then the comment appends
  immediately to the visible thread (AC-1904.4).
Dependencies: INT-190-05.

### FR-006 — "…" menu role-gating
Priority: Must · Source: TR-190/FR-006, UC-1905
The system SHALL expose a "…" menu per post/comment with role-gated items:
Pin/Unpin (moderator only), Remove (moderator only), Report (any role except the
content's own author).
AC:
- Given a teacher views another user's post in a class they teach, When "…" opens,
  Then Pin/Unpin, Remove, and Report all render (AC-1905.1).
- Given a student/parent views their OWN post, When they attempt to open "…", Then
  the trigger itself is not rendered (zero entitled items) (AC-1905.5).
Dependencies: FR-007 (report), US-E19.2 (pin/remove authorization).

### FR-007 — Report entry point (shared dialog)
Priority: Must · Source: TR-190/FR-007, UC-1906 [CROSS-STORY]
The system SHALL open the SHARED `ReportContentDialog` (contract owned by
US-E19.2, `moderation.reportDialog.*`) when "Báo cáo" is selected, passing
`{ kind: "post"|"comment", contentId, authorName, content preview }`.
AC:
- Given a user selects "Báo cáo", When the action fires, Then the SAME shared
  component/contract opens with correct props — this AC asserts invocation only;
  the dialog's own AC live exclusively in US-E19.2 UC-1921/UC-1922, not duplicated
  here (AC-1906.3).
- Given a report is successfully submitted, Then the reported content remains
  visible in the reporter's feed (AC-1906.4).
Dependencies: US-E19.2's `ReportContentDialog` component + `moderation.reportDialog.*` i18n.

### FR-008 — Pinned-post ordering
Priority: Must · Source: TR-190/FR-008, UC-1907
The system SHALL float pinned posts to the top with an accent border and an icon+
text "Đã ghim" label (never color-only).
AC:
- Given ≥1 pinned post, Then it/they render before all non-pinned posts regardless
  of `createdAt`; multiple pinned posts order among themselves by `createdAt` desc
  (AC-1907.1/.2).
- Given a pin/unpin mock toggle completes, Then the feed re-sorts immediately, no
  reload required (AC-1907.4).
Dependencies: FR-009 (pin/unpin mock).

### FR-009 — Pagination + end-of-feed
Priority: Must · Source: TR-190/FR-009, UC-1908
The system SHALL paginate via cursor with a "Tải thêm bài viết" button and an
end-of-feed marker when no next cursor remains.
AC:
- Given `hasMore=true` and load-more clicked, When resolved, Then the next page
  appends below existing posts, untouched (AC-1908.1).
- Given the loaded page's `hasMore=false`, Then the button is replaced by "Bạn đã
  xem hết bảng tin" (AC-1908.2).
Dependencies: INT-190-01/02.

### FR-010 — 4 required UI states
Priority: Must · Source: TR-190/FR-010, UC-1901
The system SHALL render loading (`EduSkeleton`, 3 rows), empty (`EduEmpty`,
role-gated CTA), error (`EduError` + retry for retryable; no-retry variant for
forbidden/scope-not-found), and end-of-feed — exactly one primary state visible
at a time.
AC:
- Given the fetch is pending, Then `EduSkeleton` renders exactly 3 rows and no
  other primary state is visible (AC-1901.1).
- Given the fetch fails with `forbidden`/`scope-not-found`, Then `EduError` renders
  WITHOUT retry and with distinct copy from the generic transient-error state
  (AC-1901.4).
Dependencies: INT-190-01/02.

### FR-011 — Pin/unpin mock-first constraint
Priority: Should · Source: TR-190/FR-011, UC-1909
The system SHALL NOT persist pin/unpin against a real backend — UI/optimistic
local state ships now; real persistence is blocked on BE US-101 (`social`,
`in_progress`).
AC:
- Given an eligible moderator toggles pin, When the action fires, Then `pinned`
  flips locally with NO network request (INT-190-07 confirms no HTTP call), and
  the feed re-sorts per FR-008 (AC-1909.1).
- Given a pin toggle was performed, When the page is fully reloaded, Then the
  pinned state reverts to whatever the fetch response returns — QA verifies
  non-persistence as proof this is mock, not a failure (AC-1909.4).
- Given the toggle completes, Then a non-blocking, non-toast, non-color-only
  indicator communicates the state is not yet durably persisted (AC-1909.3 —
  exact copy is `[OPEN QUESTION]`, see §8).
Dependencies: none (client-only; swappable behind `IFeedRepository` once US-101 ships).

### FR-012 — Remove entry point (delegates, does not reimplement)
Priority: Must · Source: TR-190/FR-006 (menu), UC-1910
The system SHALL render "Gỡ nội dung" as a menu item for moderator-eligible roles
and delegate its entire behavior (confirm dialog, authorization, audit trail) to
US-E19.2 — no second delete call, no second confirm dialog implemented here.
AC:
- Given "Gỡ nội dung" is clicked, When the action fires, Then it triggers the SAME
  shared moderate-delete confirm flow described in US-E19.2 (AC-1910.2).
- Given a post/comment was removed via US-E19.2's flow, When the feed next
  fetches/refetches, Then it no longer appears in this list, without a crash
  (AC-1910.3).
Dependencies: US-E19.2 UC-1928 (Remove) — INT-191-05/INT-190-06 shared endpoint.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 Accessibility | `aria-pressed` + Vietnamese `aria-label` on reaction chips; proper menu/menuitem ARIA + Escape/outside-click dismiss; meaningful image `alt`; pinned state icon+label | WCAG 2.1 AA; axe/impeccable zero critical violations | `fe-accessibility-auditor` audit + Storybook a11y addon |
| NFR-002 Responsive | No layout break at 320px; scope tabs scroll horizontally on mobile | Verified at 320/375/768/1280 | Storybook viewport addon + manual check |
| NFR-003 Performance | Skeleton appears promptly | Skeleton visible ≤320ms after navigation | Manual/Perf trace on story load |
| NFR-004 i18n | All static copy from `feed.*` namespace (vi source + en mirror); dynamic values (relative time, per-post content) NOT i18n keys | 0 hardcoded user-facing strings outside `messages/{vi,en}.json`; both locales render without missing-key errors | `bunx tsc --noEmit` (typed messages) + grep sweep |
| NFR-005 Security | Composer/menu visibility is UX affordance only; server is the authorization boundary; any pin/remove call surfaces a defined error path if BE rejects | 100% of forbidden responses map to a distinct, non-generic UI error (no client-only trust) | Integration test: 403 response → distinct failure branch, verified by `error.code` not `error.message` |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Feed list (per scope) | `EduSkeleton` 3 rows | `EduEmpty`, CTA shown only if `canPost` for that role+scope | `EduError` + retry (transient) / no-retry distinct copy (forbidden, scope-not-found) | Posts pinned-first then `createdAt` desc; end-of-feed marker when exhausted |
| Composer submit | submit button `aria-busy`, disabled | n/a (composer absent when `!canPost`, not an empty state) | inline field error (422) / distinct forbidden error (403) / retry affordance (transient) — content preserved in all three | optimistic prepend + toast |
| Reaction chip | none (instant local toggle) | n/a | silent rollback (no toast); 404 also removes post from list | chip/aggregate count reflect new state |
| Comment thread | sub-section skeleton row(s) | inline "Chưa có bình luận" (not full `EduEmpty`) | inline error + retry (transient) / "Bài viết không còn tồn tại" + thread collapse (404) | comments render with author/content/createdAt |
| "…" menu | n/a | n/a (trigger absent when zero items) | n/a | role/author-gated item set (FR-006) |
| Pagination | load-more `aria-busy` | n/a (immediately-exhausted variant shows end marker with no button ever rendered) | inline retry affordance, existing posts untouched | additive append |

**Role variants:** composer presence (parent: never; student: class-scope only;
teacher/principal: both scopes) and menu item set (moderator vs non-moderator,
author vs non-author) are the two role-dependent surfaces — see §3 FR-002/FR-006
AC tables for the full matrix (also `use-cases.md` §2 Actor Catalogue).

## 6. Data & Integration

Full endpoint catalogue: `integration.md` INT-190-01…07 (this section summarizes).
Service: `social` (all real endpoints except pin/unpin). Auth: Bearer token via
httpOnly-cookie hybrid flow (decision `0018`) — UI never handles tokens directly.

| INT ID | Endpoint | Pagination | Error → UI mapping |
| --- | --- | --- | --- |
| INT-190-01 | `GET /api/v1/feeds/school` | cursor | 401→interceptor refresh/redirect; 500/retryable→`EduError`+retry; 403 forbidden→`EduError` no retry |
| INT-190-02 | `GET /api/v1/feeds/classes/{classId}` | cursor | 404 scope-not-found→`EduError` no retry; 403 forbidden→`EduError` no retry; transient→retry |
| INT-190-03 | `POST /api/v1/feeds/school`\|`/classes/{classId}` | none | 422→inline field error; 403→distinct inline error; transient→inline retry |
| INT-190-04 | `PUT`/`DELETE /api/v1/feeds/posts/{postId}/reaction` | none | any failure→silent rollback, no toast; 404 (post gone)→rollback + remove from list |
| INT-190-05 | `GET`/`POST /api/v1/feeds/posts/{postId}/comments` | cursor (unconfirmed size, `[OPEN QUESTION]`) | 422→inline field error; transient→inline retry; 404→"post no longer available" + collapse |
| INT-190-06 | `DELETE .../moderate-delete` (shared, entry point only) | none | canonical mapping owned by US-E19.2; this story does not implement a second call |
| INT-190-07 | Pin/Unpin — **MOCK-FIRST**, no endpoint yet | none | n/a — client-only, cannot fail; swap-in point for future US-101 |

Request/response payload shapes (camelCase), `reactionType` enum, `scope`
discriminator: see `integration.md` §2. PII: `authorName`/`authorAvatarUrl` =
Internal (PII-lite), not Confidential.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-1901 | View feed (scope tabs + 4 UI states) | FR-001, FR-010 | 7 |
| UC-1902 | Compose a post | FR-002, FR-003 | 7 |
| UC-1903 | React to a post | FR-004 | 6 |
| UC-1904 | Comment on a post | FR-005 | 7 |
| UC-1905 | Open the "…" menu | FR-006 | 7 |
| UC-1906 | Report entry point [cross-story] | FR-007 | 4 |
| UC-1907 | Pinned-post ordering | FR-008 | 4 |
| UC-1908 | Pagination and end-of-feed | FR-009 | 5 |
| UC-1909 | Pin/Unpin entry point (mock) | FR-011 | 4 |
| UC-1910 | Remove entry point (delegates) | FR-012 | 3 |

## 8. Constraints & Assumptions

**Technical constraints:**
- No published `openapi.yaml` for `social` — all REAL-status endpoints inferred
  from DR-012 + design-spec field names; confirm exact field names/enums with BE
  before `fe-nextjs-engineer` implements the repository.
- Comment-list pagination shape (paged vs single-page) unconfirmed.

**Confirmed assumptions:**
- [ASSUMPTION] Moderator (pin/remove menu visibility) = principal (any scope) or
  teacher acting on their own class's posts; final authorization rule is
  US-E19.2's server-side gate.
- [ASSUMPTION] Relative-time strings and per-post dynamic content are NOT i18n
  keys (computed client-side from real timestamps).
- [ASSUMPTION] Student post permission is class-scope only (no school-scope post).

**[GAP]/[CONFLICT]/[OPEN QUESTION] (carried forward, not resolved here):**
- `[OPEN QUESTION]` Exact copy/placement for the pin/unpin "not yet persisted"
  indicator (AC-1909.3) — needs `ba-lead`/`uiux-ux-writer` confirmation before the
  string is added to `messages/{vi,en}.json`. Recommend a small inline caption
  (e.g. "Chỉ hiển thị tạm thời trên thiết bị này"), non-blocking, icon+text — not
  finalized.
- `[OPEN QUESTION]` Teacher's pin/remove scope — "classes they teach" vs "any
  class they can view" — affects FR-006/FR-011/FR-012's exact gating boundary for
  teachers; principal's any-scope gate is unambiguous. Resolved authoritatively in
  US-E19.2 (server-side); this story's client-side menu visibility should match
  whatever US-E19.2 confirms.
- `[OPEN QUESTION]` Stale-response guard strategy on rapid scope-tab switching —
  implementation detail for `fe-state-engineer` (TanStack Query key-change vs
  explicit cancellation); does not change the observable AC (last-selected tab
  wins).
- `[OPEN QUESTION]` Whether "single active reaction per user" (AC-1903.2) is
  confirmed by the `social` BE contract or a UI-only convention — escalate if BE
  allows multi-reaction-per-user.
- `[OPEN QUESTION]` INT-190-06's exact success response shape (204 vs updated
  resource) — single source of truth is US-E19.2's integration map; this story
  references, does not redefine.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Scope tabs | TR-190/FR-001 | UC-1901 | INT-190-01, INT-190-02 | Must |
| FR-002 Composer visibility | TR-190/FR-002 | UC-1902 | none (client-only rule) | Must |
| FR-003 Post submission | TR-190/FR-003 | UC-1902 | INT-190-03 | Must |
| FR-004 Reactions | TR-190/FR-004 | UC-1903 | INT-190-04 | Must |
| FR-005 Comment thread | TR-190/FR-005 | UC-1904 | INT-190-05 | Must |
| FR-006 "…" menu gating | TR-190/FR-006 | UC-1905 | none (client-only rule; server enforces per US-E19.2) | Must |
| FR-007 Report entry point | TR-190/FR-007 | UC-1906 [cross-story] | US-E19.2 `ReportContentDialog` contract | Must |
| FR-008 Pinned ordering | TR-190/FR-008 | UC-1907 | INT-190-07 (state source) | Must |
| FR-009 Pagination/end-of-feed | TR-190/FR-009 | UC-1908 | INT-190-01, INT-190-02 | Must |
| FR-010 4 UI states | TR-190/FR-010 | UC-1901 | INT-190-01, INT-190-02 | Must |
| FR-011 Pin/unpin mock-first | TR-190/FR-011 | UC-1909 | INT-190-07 (mock) | Should |
| FR-012 Remove entry point | TR-190/FR-006 | UC-1910 | INT-190-06 (shared, owned by US-E19.2) | Must |
| NFR-001 Accessibility | TR-190/NFR-001 | all UCs | none | Must |
| NFR-002 Responsive | TR-190/NFR-002 | UC-1901 | none | Must |
| NFR-003 Performance | TR-190/NFR-003 | UC-1901 | INT-190-01/02 | Should |
| NFR-004 i18n | TR-190/NFR-004 | all UCs | none | Must |
| NFR-005 Security | TR-190/NFR-005 | UC-1902, UC-1905, UC-1909, UC-1910 | INT-190-03, INT-190-06, INT-190-07 | Must |

## 10. Handoff to FE

**What `fe-lead` should build:** a net-new `src/features/feed/` module (Clean
Architecture: domain use-cases for create-post/react/add-comment/toggle-pin-mock;
infrastructure repository against `social` endpoints INT-190-01…06 + a mock
implementation for INT-190-07; presentation `FeedScreen` per `design_src/edu/feed.jsx`)
wired at `(app)/(shared)/feed`. The Report entry point imports the `ReportContentDialog`
component from wherever US-E19.2 places it — do not scaffold a second copy. Sequence
this story behind US-E19.2 per the Dependencies section in `story.md`, or stub the
trigger and reconcile once US-E19.2 merges.

**Suggested lane:** normal (already assigned; no authz/data-loss change of its own —
the only destructive/high-risk surface, Remove, is entirely delegated to US-E19.2).

**Build from:** `design_src/edu/feed.jsx` (`FeedScreen`), `docs/product/design-spec.jsonc`
→ `screens.feed`, this spec (`spec.md`), and the shared dialog contract in
`docs/stories/epics/E19-social/US-E19.2-content-moderation/` (`ReportContentDialog`
component + `moderation.reportDialog.*` i18n + `screens.moderation.reportDialog`).

**Proof owed (maps to TEST_MATRIX rows):**

| Layer | Expected proof |
| --- | --- |
| Unit | Domain use-cases (create-post, react, add-comment, toggle-pin-mock) + failure-union mapping; mock feed repository for pin/unpin |
| Integration | Repository↔HTTP contract tests for INT-190-01…06 (envelope/error mapping, 403 vs transient branching on `error.code`); INT-190-07 tested as a pure local reducer (no HTTP) |
| E2E | Storybook interaction stories per UC: scope switch, composer role×scope matrix, reaction toggle/rollback, comment thread states, "…" menu role×author matrix, report entry point invokes the shared dialog (props assertion only), pinned ordering, pagination/end-of-feed, pin/unpin non-persistence across reload |
| Platform | Manual keyboard-only pass: tablist arrow-keys, "…" menu Escape/outside-click, comment input Enter/Space |
