# US-E19.1 — Social Feed — Integration Map

Service map per `.claude/rules/api-integration.md` (decision `0017`): all feed
endpoints belong to **`social`**. `social` has NO shipped `openapi.yaml` in
edu-api yet (only `iam` + `noti` are live) — status below is per-endpoint since
DR-012 states US-097→100 are implemented on `social` while US-101 (pinning) is
`in_progress`. Treat "REAL" here as "contract stable, BE endpoint exists per
DR-012 confirmation" — there is still no `openapi.yaml` to cite; confirm the
exact response shape with the `social` BE team before wiring
(`[OPEN QUESTION]`, see §5). Until that confirmation, FE should build against
this logical contract behind the repository interface so the shape can be
adjusted without touching use-cases/presentation.

## 1. Integration Overview

- **Endpoints consumed:** 7 (2 list/create per scope collapse to 4 feed-fetch
  variants + reaction + comments + shared moderate-delete entry point).
- **Service touched:** `social` only (comment/reaction/post), with FR-011's
  pin/unpin explicitly **MOCK-FIRST** (no BE endpoint yet — US-101
  `in_progress`).
- **Real vs mock-first:** posts/comments/reactions/moderate-delete = REAL
  (per DR-012, US-097→100 implemented) but **unconfirmed against an actual
  `openapi.yaml`** (none published) — flagged open question. Pin/unpin = MOCK
  (local state only, `NEXT_PUBLIC_USE_MOCK`-style local toggle, no HTTP call).
- **Risk notes:**
  - Moderate-delete (`DELETE .../moderate-delete`) is the SAME endpoint the
    moderation screen (US-E19.2) uses for the authorized Remove action — this
    story only renders the menu entry point; the actual authorized call +
    confirm dialog + audit trail live in US-E19.2. Do not implement a second
    delete call here.
  - Pin/unpin must not be silently wired as if persisted — FR-011 requires an
    explicit non-blocking UI signal (open question raised to
    `ba-use-case-modeler` already in requirements.md; integration layer just
    confirms there is no endpoint to call).

## 2. Endpoint Catalogue

```
INT-190-01  Get School Feed
Service: social    Method+Path: GET /api/v1/feeds/school
Status: REAL (DR-012, social US-097→100 — no openapi.yaml published yet, contract inferred)
Protected: yes   Role required: any authenticated role (teacher/principal/student/parent), tenant-scoped
Request (outbound, camelCase): cursor — pagination cursor from previous page's meta.pagination.nextCursor | sensitivity: none
Response payload (inbound, after envelope unwrap): posts[] — list of:
  postId — unique post id | Internal
  authorId, authorName, authorRole, authorAvatarUrl — post author identity | Internal (name/avatar = PII-lite)
  scope — "school" | content — post text body | Internal
  attachmentUrl — optional single image attachment | Internal
  createdAt — ISO timestamp | none
  pinned — boolean, current pin state | Internal
  reactions — { counts: Record<reactionType, number>, myReaction: reactionType | null } | Internal
  commentCount — number | none
Pagination: cursor (meta.pagination.nextCursor / hasMore)
Errors → UI behavior:
  - 401 (unauthenticated / TOKEN_EXPIRED) → handled by http interceptor refresh; if still failing → redirect to login, not surfaced as feed error
  - 500 / network / retryable=true → FeedFailure "fetch-failed" → EduError with retry (FR-010)
  - 403 FORBIDDEN (tenant mismatch) → FeedFailure "forbidden" → EduError, no retry, distinct message
Empty / loading expectation: EduSkeleton (3 rows) while pending; EduEmpty (role-gated compose CTA only when canPost) when posts=[] and no filters; end-of-feed marker when hasMore=false

INT-190-02  Get Class Feed
Service: social    Method+Path: GET /api/v1/feeds/classes/{classId}
Status: REAL (DR-012, social US-097→100 — same caveat as INT-190-01)
Protected: yes   Role required: any role that belongs to/can view classId (teacher/principal/student/parent scoped to their child's/own class)
Request (outbound, camelCase): classId — path param, resolved from active class-scope tab | Internal
  cursor — pagination cursor | none
Response payload (inbound): same shape as INT-190-01 posts[] entry, scope="class", plus classId — echo of requested class | Internal
Pagination: cursor (meta.pagination.nextCursor / hasMore)
Errors → UI behavior:
  - 404 CLASS_NOT_FOUND → FeedFailure "scope-not-found" → EduError (distinct copy: scope unavailable), no retry
  - 403 FORBIDDEN (user not member of classId) → FeedFailure "forbidden" → EduError, no retry — should not normally occur if scope tabs are built from the user's own class list, but must still be handled (defense in depth per NFR-005)
  - retryable transient (429/502/503/504) → EduError with retry
Empty / loading expectation: same 4-state pattern as INT-190-01, scoped per class tab

INT-190-03  Create Post
Service: social    Method+Path: POST /api/v1/feeds/school | POST /api/v1/feeds/classes/{classId}
Status: REAL (DR-012 US-097→100) — image attach is MOCK-FIRST per FR-003 ("mock-first for image upload"); text field submission itself hits the real endpoint
Protected: yes   Role required: composer-visibility-gated — school scope: teacher/principal; class scope: teacher/principal/student (per FR-002)
Request (outbound, camelCase): content — post text body (required, non-empty) | Internal
  attachmentUrl — optional, mock-only placeholder URL until real upload pipeline ships (out of scope, per requirements.md) | Internal
Response payload (inbound): the created post object, same shape as a posts[] entry (postId/authorId/createdAt/pinned=false/reactions empty/commentCount=0) | Internal
Pagination: none (single-item create)
Errors → UI behavior:
  - 422 VALIDATION_ERROR (empty content / oversized) → error.fields[] → inline field error, content preserved for retry (FR-003)
  - 403 FORBIDDEN (role/scope not entitled — server-side re-check of FR-002) → PostFailure "forbidden" → inline error, content preserved, distinct from validation
  - retryable transient → inline error with retry, content preserved
Empty / loading expectation: optimistic prepend to feed on submit; rollback + inline error on failure (mirrors FR-004 reaction pattern per requirements)

INT-190-04  React to Post
Service: social    Method+Path: PUT /api/v1/feeds/posts/{postId}/reaction (add/change) · DELETE /api/v1/feeds/posts/{postId}/reaction (remove)
Status: REAL (DR-012 US-097→100)
Protected: yes   Role required: any authenticated role
Request (outbound, camelCase): postId — path param | none
  reactionType — one of "like"|"love"|"celebrate"|"clap" (👍/❤️/🎉/👏), body for PUT only | none
Response payload (inbound): updated reactions object — { counts: Record<reactionType, number>, myReaction: reactionType | null } | Internal
Pagination: none
Errors → UI behavior:
  - any failure (transient or otherwise) → rollback optimistic chip toggle to prior state (FR-004), no toast — silent rollback per requirements
  - 404 POST_NOT_FOUND (post removed concurrently by moderator) → rollback + remove post from local feed list, no blocking error dialog
Empty / loading expectation: optimistic update on click; no separate loading skeleton (instant local toggle)

INT-190-05  List/Add Comments
Service: social    Method+Path: GET /api/v1/feeds/posts/{postId}/comments (list) · POST /api/v1/feeds/posts/{postId}/comments (add)
Status: REAL (DR-012 US-097→100)
Protected: yes   Role required: any authenticated role
Request (outbound, camelCase): postId — path param | none
  cursor — pagination cursor for comment list | none (GET only)
  content — comment text body (POST only, required non-empty) | Internal
Response payload (inbound): GET → comments[] — { commentId, authorId, authorName, authorRole, content, createdAt } | Internal
  POST → the created comment object, same shape | Internal
Pagination: cursor (meta.pagination.nextCursor / hasMore) — for comment list only; may also be small enough for a single page — confirm with BE (open question)
Errors → UI behavior:
  - 422 VALIDATION_ERROR (empty comment) → inline field error, retry (FR-005)
  - retryable transient → inline error, retry, thread state preserved
  - 404 POST_NOT_FOUND → inline error "post no longer available", thread collapses
Empty / loading expectation: thread expand triggers GET; skeleton row(s) while loading; no comments → simple "chưa có bình luận" inline text (not full-screen EduEmpty — this is a sub-section, not the primary screen state)

INT-190-06  Moderate-Delete Post/Comment (entry point only — shared with US-E19.2)
Service: social    Method+Path: DELETE /api/v1/feeds/posts/{postId}/moderate-delete | DELETE /api/v1/feeds/posts/{postId}/comments/{commentId}/moderate-delete
Status: REAL (DR-012 US-097→100) — contract OWNED by US-E19.2 (authorization, confirm dialog, audit trail); this story only renders the "…" menu item that triggers it
Protected: yes   Role required: principal (per Ba-Lead Decision in US-E19.2, FR-108) OR teacher acting on own-class content per this story's ASSUMPTION (final gate confirmed in US-E19.2)
Request (outbound, camelCase): postId or commentId — path param | none
  reason — optional moderation reason string (owned by US-E19.2 confirm-dialog contract) | Internal
Response payload (inbound): 204/empty on success, or updated post/comment with removed=true flag (confirm exact shape with US-E19.2 integration.md) | Internal
Pagination: none
Errors → UI behavior:
  - 403 FORBIDDEN / NOT_MODERATOR → PostFailure "forbidden" → distinct "không có quyền" message, no retry — this must be visually/semantically distinguishable from a transient failure per NFR-005 (see US-E19.2 FR-108 for the canonical mapping this story reuses)
  - retryable transient → inline error, retry
Empty / loading expectation: N/A (menu action, not a screen state) — full contract detail in US-E19.2 integration.md

INT-190-07  Pin/Unpin Post (MOCK-FIRST — FR-011)
Service: social (target, once US-101 ships)    Method+Path: NOT YET DEFINED — no stable endpoint exists (BE `social` US-101 status = in_progress)
Status: MOCK-FIRST — pin/unpin is a client-only optimistic toggle stored in local component/query-cache state; NO HTTP call is made
Protected: n/a (mocked)   Role required: same moderator gate as INT-190-06 for menu-item visibility (UI-only enforcement, per NFR-005 explicitly not a security boundary)
Request (outbound, camelCase): n/a — no real request; mock accepts { postId, pinned: boolean } locally
Response payload (inbound): n/a — mock returns the same shape optimistically; FeedPostEntity.pinned flips locally, ordering recalculates (FR-008)
Pagination: none
Errors → UI behavior: n/a — mock cannot fail; however FE MUST NOT let users believe this is durable. A non-blocking, non-toast indicator (exact wording open — flagged to ba-use-case-modeler already in requirements.md) should communicate "chỉ hiển thị tạm thời" until US-101 ships and this endpoint is swapped in behind the same repository interface
Empty / loading expectation: instant local toggle, no skeleton
```

## 3. Auth & Security

- All 6 real endpoints (INT-190-01 through 06) require `Authorization: Bearer
  <accessToken>` via the httpOnly-cookie hybrid flow (decision `0018`) — the
  UI never reads/handles the token directly; `bootstrap/lib/http.server.ts` /
  `http.ts` interceptor manages proactive refresh + reactive 401 retry.
- Tenant scoping: every call is implicitly scoped to the caller's tenant via
  the token; `classId`/`postId` path params are additionally checked
  server-side for membership (403 FORBIDDEN if the user doesn't belong to
  that class/tenant) — this is defense-in-depth, the composer/menu visibility
  in FR-002/FR-006 is a UX affordance only (NFR-005), not the authorization
  boundary.
- PII fields: `authorName`, `authorAvatarUrl` on posts/comments are
  PII-lite (display name + avatar) — treat as Internal, not Confidential;
  no email/phone expected in this payload. Report content (owned by
  US-E19.2) is Confidential — not this story's concern beyond opening the
  shared dialog.
- Role required per endpoint: see catalogue above; composer/menu-item
  visibility gates (FR-002/FR-006) are the UI expression of these rules but
  the server is the enforcement point.

## 4. Mock-first plan

Only ONE integration needs a mock: **pin/unpin (INT-190-07)**. Everything
else (feed fetch, post/comment/reaction, moderate-delete entry point) is
REAL per DR-012 and should call the actual `social` endpoints — do NOT add
these to `bootstrap/lib/mock.ts` unless the `social` BE team confirms the
endpoints are not actually reachable in the target environment (see open
question below).

Mock shape for pin/unpin, to live behind the same `IFeedRepository`
interface so swap-in of US-101 requires no use-case/presentation changes:

```ts
// Local-only, no HTTP — implemented as a mock method on the feed repository
// or a pure client-side reducer in the TanStack Query cache.
togglePinMock(postId: string, pinned: boolean): FeedPostEntity
// returns the same post entity shape with `pinned` flipped; feed re-sorts
// pinned-first per FR-008. No network call, no persistence across reload
// (acceptable per FR-011 — explicitly a scope constraint, not a bug).
```

If `NEXT_PUBLIC_USE_MOCK`-style env gating is used elsewhere in the codebase
for other mock-first services (see `social-service-status` memory — messaging
already has `MockMessagingRepository`), pin/unpin should follow the SAME
pattern: a `MockFeedPinRepository` (or a single method mocked inside a
partially-real `FeedRepository`) so the DI factory can swap it out cleanly
once US-101 ships.

## 5. Open Questions

- `[OPEN QUESTION]` No `openapi.yaml`/`INTEGRATION.md` for `social` exists yet
  in edu-api (unlike `iam`/`noti`). All REAL-status endpoints above are
  inferred from DR-012 prose + design-spec field names, not a published
  contract. Confirm exact field names (especially `reactionType` enum values,
  `scope` discriminator, and comment pagination page size) with the `social`
  BE team before `fe-nextjs-engineer` implements the repository.
- `[OPEN QUESTION]` Confirm whether comment list pagination
  (`GET .../comments`) actually returns `meta.pagination` or is a single
  unpaginated page for the initial thread expand (small N assumption) —
  affects whether `useInfiniteQuery` or a single `useQuery` is used.
- `[OPEN QUESTION]` INT-190-06's exact response shape on successful delete —
  204 no-content vs. an updated resource with `removed: true` — needs to be
  confirmed jointly with US-E19.2's integration map (same endpoint, single
  source of truth should live in US-E19.2's contract; this story references
  it, does not redefine it).
- `[OPEN QUESTION]` (carried from requirements.md) Whether FE should surface a
  non-blocking "not yet persisted" indicator for pin/unpin — affects whether
  INT-190-07's mock needs an extra UI-state field (e.g. `pinnedMock: true`)
  passed through to presentation, or whether this is purely a presentation
  concern with no data-contract implication. Flagging here since it borders
  the data contract (does the mock need to expose that flag at all).
- `[OPEN QUESTION]` Teacher's pin/remove scope — "classes they teach" vs "any
  class they can view" (also raised in requirements.md) — affects whether
  the 403 FORBIDDEN case on INT-190-06/07 is expected to fire for teachers at
  all, or is purely a principal-vs-non-principal check.
