# US-E18.20 Feed + moderation BE wiring (contract-first ground-truth)

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/feed/**`, `src/features/moderation/**`
- Shared contract/file: `src/bootstrap/endpoint/feed.endpoint.ts`,
  `src/bootstrap/endpoint/moderation.endpoint.ts`,
  `src/bootstrap/di/feed.di.ts`, `src/bootstrap/di/moderation.di.ts`

## Product Contract

Both `feed` (US-E19.1) and `moderation` (US-E19.2) shipped mock-first because at
build time `social` had no published `openapi.yaml` (decision 0014). That
premise no longer holds — `edu-api/services/social/docs/openapi.yaml` (222KB)
+ `INTEGRATION.md` + `ERROR_CODES.md` are fully published, service is
528-Go-file implemented (feeds, posts w/ reaction/comment/pin/poll/event/
achievement, reports w/ resolve, directory/profile). Per the epic's playbook
(`EPIC-OVERVIEW.md` §Playbook), this US ground-truths BOTH features against the
real contract (openapi + Go source, not just doc prose) and either wires real
or documents a justified permanent-mock hold per operation.

## Ground-Truth Findings (2026-07-26)

### Error-code wire format (resolves earlier ambiguity)

`services/social` uses the SAME shared `pkg/kit/response` middleware as `core`:
`apperror.Forbidden("feed_not_school_admin")` (lowercase i18n key) is uppercased
at the HTTP boundary by `codeFromKey()` (`strings.ToUpper`) — confirmed by
reading `pkg/kit/response/error.go` directly. So `error.code` on the wire IS
UPPER_SNAKE (`FEED_NOT_SCHOOL_ADMIN`), matching `ERROR_CODES.md`'s documented
column — unlike IAM (US-E18.6 finding: IAM's error.code is the raw lowercase
key). Existing `toFeedFailure`/`toFailure` UPPER_SNAKE assumption is directionally
right but branches on the WRONG specific codes (generic `FORBIDDEN`/
`NOT_FOUND`/`VALIDATION_ERROR` instead of the real specific codes below).

### Feed — permanently blocked (identity + domain-model gap, not a path/DTO fix)

- `Post`/`Comment` (real schema) carry ONLY `authorUserId` (uuid) — zero
  `authorName`/`authorRole`/`authorAvatarInitials`/`avatarUrl` on the wire, on
  EITHER schema. No batch/by-id display-name join exists anywhere in social's
  public API. This is the SAME recurring gap class as EPIC-OVERVIEW asks
  #6/#7/#9/#13/#18/#20/#21/#22/#23 (IAM has no member-listing/lookup), but
  *worse* here: those asks affected one field on an oversight screen; feed is
  a public wall where EVERY row's author is shown prominently (avatar+name+
  role tone). Per the epic's own established bar (ask #9: "rendering raw UUIDs
  for every row... is not a shippable approximation"), feed reads cannot ship
  with a raw-id fallback.
  - The one candidate resolver, `GET /api/v1/social/members/{targetUserId}/profile`
    (US-127), is visibility-gated: works for `targetUserId === self` trivially,
    and for others ONLY if the caller shares an active `RoomMember` row with
    the target OR holds an ADMIN/TEACHER staff fact for the target's tenant.
    For a SCHOOL-scope post (author = tenant ADMIN, by definition — see the
    `FEED_NOT_SCHOOL_ADMIN` create-gate) read by a STUDENT/PARENT who shares no
    room with that ADMIN, this 404s (`PROFILE_NOT_FOUND`) unpredictably. Not a
    reliable per-post author-name source — a per-post fan-out against it would
    silently degrade to "Member"/raw-id for an unpredictable subset of rows,
    which is worse UX than staying mock. Flagged as a real architecture
    question for a future `/uiux`+`/ba` pass (needs either a proper IAM batch
    lookup, ask #6/#7 finally shipping, or the profile endpoint's visibility
    rule relaxed for feed contexts specifically), NOT solved speculatively here.
- Reaction taxonomy is a genuinely different domain model: real
  `SetReactionRequest.emoji` ∈ `{like, love, haha, wow, sad, angry}` with a
  SINGLE `reactionCount`+`callerReaction` per post (Facebook-style, incl.
  negative emotions); web's `ReactionType` ∈ `{like, love, celebrate, clap}`
  with PER-TYPE counts (positive/celebratory, school-context). No lossless
  1:1 mapping — remapping is a product/design decision (which real emoji ↔
  which web icon, and what happens to the per-type breakdown UI), not a wiring
  swap.
- Attachments differ: real `Post.media` is a single optional image, uploaded
  via `multipart/form-data` at create time (10MB cap, JPEG/PNG/GIF/WebP,
  US-128); web's `FeedAttachment[]` models multiple placeholder
  label/alt entries with no real upload pipeline (FR-003, mock-only by design
  even before this US). Different shape AND different capability (real upload
  vs. mock placeholder) — not reconcilable without new upload-flow work.
- `scope` enum differs (`SCHOOL`/`CLASS`/`CLUB` vs `school`/`class`) — trivial
  case-fold, not itself blocking, but moot given the above.
- **Positive finding**: pin/unpin IS real (`PUT`/`DELETE
  /api/v1/feeds/posts/{postId}/pin`, US-101) — INT-190-07's "no endpoint"
  premise is stale. But since `getFeed` must stay mock (author-identity gap
  above), no real `postId` is ever available client-side to call it against —
  wiring `togglePin` "real" in isolation would only work against a genuine BE
  postId, which the mock feed never produces. Per the epic's precedent for
  this exact shape of problem (e.g. US-E18.9's `UpdateEntries()` — real HTTP
  surface exists but is unreachable because its sibling read stays mock), the
  whole `feed` repository force-mocks, including pin — the "real" class is
  updated to the correct endpoint/error-taxonomy anyway (kept correct + tested
  for the day the identity gap resolves), but is not selected by DI.

**Decision: `feed.di.ts` force-mocks regardless of `USE_MOCK`** — joining
US-E18.8/US-E18.9/US-E18.14's fully-blocked-DI-factory class.

### Moderation — permanently blocked (list/detail/audit shape gap)

- `GET /api/v1/reports` (real) has NO `status`/`contentType`/`search` query
  params (cursor+limit only) and is hardcoded to the caller's tenant's
  `PENDING` reports — the web queue screen's resolved/all tabs + content-type
  filter + free-text search have nothing to bind to.
- No `stats` in the real list response at all (`ReportInboxItem` has no
  pending/resolved/removed counts) — the web's stat-row (`ModerationStatsEntity`)
  has zero backing.
- **No `GET /api/v1/reports/{reportId}` endpoint exists at all** — the detail
  sheet (`getReportDetail`, full content + context + duplicate-report list)
  is completely unbacked.
- `SubmitReportRequest.targetType` ∈ `{MESSAGE, POST}` only — no `COMMENT`
  target type. The web's comment-report flow (`ReportKind === "comment"`) has
  no real endpoint to call at all.
- `removeContent` for `kind: "comment"` has no real endpoint either (only
  `POST /feeds/posts/{postId}/moderate-delete`, no comment variant) —
  confirms the existing repo's own comment code note ("unconfirmed contract").
- `dismissReport`/resolve requires the inbox row's echoed-back `filedAt` as
  part of the CAS key (`ResolveReportRequest.{action,filedAt}`) — the current
  `dismissReport(reportId)` signature has no `filedAt` parameter; would need a
  domain/use-case signature change even for the reachable subset.
- `getModerationAuditLog(scopeId)` maps to `GET /rooms/{roomId}/moderation-audit`
  (US-086) — a ROOM's role/mute/capability change audit (`manage_room`
  capability), NOT the feature's own dismiss/remove content-moderation trail
  concept. Different domain entirely; no real endpoint backs the feature's
  `AuditEntryEntity` (removed/dismissed action + content ref).
- `removeContent` for `kind: "post"` (direct, no report) IS real
  (`POST /feeds/posts/{postId}/moderate-delete`, no request body — current
  repo incorrectly sends `DELETE` with a body) but is only reachable via
  either (a) the moderation queue, which is itself unbacked, or (b) the feed's
  own direct-removal path (ADR 0052), which requires a real `postId` — and
  feed stays mock (see above). Unreachable in practice today.

**Decision: `moderation.di.ts` force-mocks regardless of `USE_MOCK`** — joining
the same permanently-blocked class, for the same "isolated real endpoint,
zero reachable real id" reason as feed's pin.

## Acceptance Criteria

- AC-1: `feed.di.ts` and `moderation.di.ts` force-mock (ignore `USE_MOCK`),
  mirroring `staff-leave.di.ts`'s force-mock precedent, with a doc-comment
  explaining why (identity/shape gap, not a transport issue).
- AC-2: `toFeedFailure`/`toFailure` (in `feed.repository.ts` /
  `moderation.repository.ts`) branch on the REAL ground-truthed UPPER_SNAKE
  codes (`FEED_POST_NOT_FOUND`, `FEED_CLASS_NOT_FOUND`, `FEED_NOT_SCHOOL_ADMIN`,
  `FEED_NOT_HOMEROOM_TEACHER`, `FEED_INVALID_REACTION_EMOJI`,
  `FEED_RATE_LIMIT_EXCEEDED`, `VALIDATION_FAILED`; `REPORT_NOT_TENANT_MEMBER`,
  `REPORT_TARGET_NOT_FOUND`, `REPORT_RATE_LIMITED`, `REPORT_NOT_ADMIN`,
  `REPORT_NOT_FOUND`, `REPORT_ALREADY_RESOLVED`, `UNAUTHORIZED_MODERATION_ACTION`,
  `MODERATION_TARGET_NOT_FOUND`, `MODERATION_TARGET_ALREADY_DELETED`) instead of
  the current guessed generic ones, kept correct-but-dead per epic precedent
  (US-E18.8/9/13/14). Drop `ALREADY_REPORTED`/`already-reported` — no such
  concept exists on the real contract (reports are never deduped, only
  rate-limited); either remove the failure type or repurpose the bare-409
  fallback since no code produces it.
- AC-3: `FEED_EP`/`MODERATION_EP` corrected: add `pin(postId)` (`PUT`/`DELETE
  .../pin`); `moderateDeletePost` becomes a bare `POST` (no body) matching the
  real contract; comment-target moderate-delete removed from the real class
  (no endpoint exists — keep the mock's comment support since that's the
  shipped UX, just make the REAL class explicitly refuse `kind: "comment"`
  the same way US-E18.17 refuses `contactIds.length !== 1` — an explicit
  fail-fast Result, never an HTTP call).
- AC-4: Zero-regression on the full existing test suite (mocks are UNCHANGED —
  they continue to serve the shipped UX; only the real/dead classes + DI
  selection change).
- AC-5: `bun run build` green.
- AC-6: EPIC-OVERVIEW.md gets a new numbered cross-repo/product ask entry
  (after #39) covering: (a) no author/reporter/actor display-name join
  anywhere in `social` (10th+ confirmation of the recurring IAM-lookup gap,
  worse here since it blocks a public feed, not one oversight field); (b) no
  moderation-queue filter/stats/detail/comment-target endpoints; (c) BE
  doc-drift check needed on whether `resolve action=DELETE` for POST targets
  is truly wired (endpoint prose says yes, `ERROR_CODES.md`'s
  `REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED` row says it's a "phase 4 follow-up"
  — contradiction, needs a Go source check this US did not have budget for).

## Design Notes

- Commands: none new (DI selection + error-taxonomy fix only).
- Queries: none new.
- API: `feed.endpoint.ts`, `moderation.endpoint.ts` (see AC-3).
- Tables: n/a (client-side only).
- Domain rules: no domain/use-case/presentation change — this is a repository
  + DI + endpoint layer fix only, per AC-1..AC-3. Zero UI change → design-review
  gate + a11y audit NOT required (matches EPIC-OVERVIEW's own "Design Source"
  note: "mọi US giữ nguyên UI hiện có").
- UI surfaces: unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `feed.repository.test.ts` / `moderation.repository.test.ts` updated for the new real error-code branches (unit-tested even though currently dead, per epic precedent) |
| Integration | DI factory test/assertion that `USE_MOCK=false` still resolves the Mock* class for both features |
| E2E | none new (zero behavior/UI change) |
| Platform | `bun run build` |
| Release | full suite zero-regression |

## Harness Delta

- New story `US-E18.20` (this file), registered via `harness-cli story add`.
- `EPIC-OVERVIEW.md`: new Wave-4-adjacent row (feed/moderation force-mocked,
  same class as US-E18.8/9/14) + numbered cross-repo ask (AC-6).
- `docs/TEST_MATRIX.md`: row for US-E18.20 at `planned` before code, updated to
  `implemented` with proof after gate-green.

## Evidence

(added after implementation)
