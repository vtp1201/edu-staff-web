# US-E18.31 Feed wiring (Post/Comment author denormalization)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/feed/` (US-E19.1's mock feature)
- Shared contract/file: `PostResponseDto`/`CommentResponseDto` (social service)

## Product Contract

**CORRECTED before implementation (fe-lead ground-truth, 2026-08-02) — this
is NOT a full un-mock.** BE US-165 denormalizes `authorName`/`authorRole`
directly onto `Post`/`Comment` (`social`, `avatarUrl` reserved-but-always-null)
— this closes EXACTLY ONE of the THREE gaps `bootstrap/di/feed.di.ts`'s
existing, detailed doc comment (US-E18.20) documents as blocking a full
un-mock:

1. **No author identity** — RESOLVED by US-165. This is what this story wires.
2. **Different reaction taxonomy** — STILL BLOCKED, unaffected by US-165. Real
   `emoji ∈ {like,love,haha,wow,sad,angry}` with a single `reactionCount` +
   `callerReaction`; web's `ReactionType ∈ {like,love,celebrate,clap}` with
   per-type counts. No lossless mapping exists — this is a product/design
   decision, out of this story's scope.
3. **Different attachment capability** — STILL BLOCKED, unaffected by US-165.
   Real `Post.media` is ONE optional image via `multipart/form-data` at create
   time; web models multiple placeholder `FeedAttachment[]`, no upload
   pipeline. Also out of this story's scope.

**Revised scope**: wire the READ path (list-feed, list-comments) for real,
now that author identity resolves — this is the majority of the screen's
value (browsing a real, correctly-attributed feed). Reaction/comment/
create-post MUTATIONS stay routed to mock (or are force-degraded per-call if
partially reachable) until gaps #2/#3 get a product decision, mirroring this
epic's established "hybrid/partial repository with a documented blocked
remainder counts as Done" precedent (see EPIC-OVERVIEW.md's US-E18.16 finding
for the exact same shape of decision). Do NOT attempt to lossy-map the
reaction/attachment shapes without a product-owner sign-off — that is a
design call, not an engineering judgment call.

## Relevant Product Docs

- `docs/product/screens.md` — Feed screen row (US-E19.1)

## Acceptance Criteria

- Feed screen shows real author name + role badge per post/comment in real
  mode, sourced from the denormalized wire fields (no client-side batch-lookup
  needed for this — ground-truth whether US-E18.23's `iam-directory` batch
  resolver is still needed for anything else on this screen before removing
  it wholesale).
- Avatar renders via the existing initials-fallback pattern (since
  `avatarUrl` is reserved-but-always-null — do not treat a null avatarUrl as
  an error/loading state).
- `bootstrap/di/feed.di.ts` (or equivalent) flips from force-mock to
  `USE_MOCK ? Mock : Real`.
- Zero regression to existing feed screen tests/stories.

## Design Notes

- Commands: whatever mutation actions already exist (create post/comment) —
  unaffected by this wiring, out of scope unless they also need the
  author-field shape update.
- Queries: `GET /posts`/`GET /posts/{id}/comments` (or equivalent — ground-truth
  exact paths against `services/social/docs/openapi.yaml`).
- API: `social` service.
- Domain rules: `authorRole` drives the existing role-badge rendering
  convention (reuse `ROLE_LABEL_KEY`/role-color mapping already established
  elsewhere, do not invent a new one).
- UI surfaces: `src/features/feed/presentation/` (existing).

## Validation

| Layer | Expected proof | Result |
| --- | --- | --- |
| Unit | mapper test (author fields, null-avatarUrl handling) | ✅ `feed.mapper.test.ts` rewritten against the REAL `Post`/`Comment`/`FeedPage` shapes — 19 cases incl. null identity, IAM-role vocabulary, avatarUrl never read, zeroed reactions, dropped media, pinnedPost dedupe |
| Integration | repository test against the real DTO shape | ✅ `feed.repository.test.ts` — `FeedPage` object unwrap, `limit`/`cursor` params, pinnedPost surfacing, null identity, `listComments` bare-array unwrap + 404, `addComment` real `{text}` body |
| Integration | hybrid split provable | ✅ `hybrid-feed.repository.test.ts` — reads hit real (mock never called), all 5 mutations hit mock (real never called), args pass through |
| Integration | DI env matrix | ✅ `feed.di.test.ts` — `"true"`→Mock; `"false"`/unset→Hybrid for all 6 factories; no http client in mock mode; `ensureFreshSession` before `createServerHttpClient` |
| E2E | Storybook: real-author-name story, null-avatar-fallback story | ✅ `RealAuthorIdentity` + `UnknownAuthorIdentity` in `feed-screen.stories.tsx` |
| Platform | `bun build` clean both modes | ✅ `NEXT_PUBLIC_USE_MOCK=true` and `=false` both "Compiled successfully" |
| Release | design-review gate + a11y (role badge contrast, avatar fallback a11y) | ⏳ fe-lead gate — no new tokens/markup; badge/avatar reuse the existing `StatusBadge` tone + initials `AvatarFallback` |

## Harness Delta

Registered via `harness-cli story add --id US-E18.31`.

## Evidence

**Scope delivered: a HYBRID wiring — real reads, force-mocked writes.**

- Real (`FeedRepository` via `HybridFeedRepository`): `getFeed`, `listComments`.
- Force-mocked regardless of `USE_MOCK`: `createPost`, `setReaction`,
  `removeReaction`, `addComment`, `togglePinMock` (per-method WHY documented in
  `hybrid-feed.repository.ts`).
- `bootstrap/di/feed.di.ts` flipped from unconditional force-mock to
  `USE_MOCK ? MockFeedRepository : HybridFeedRepository(real, mock)`; doc
  comment rewritten (gap #1 resolved by BE US-165; gaps #2/#3 restated as still
  blocking).

**Ground-truth re-verified against `edu-api/services/social/docs/openapi.yaml`:**

- Gap #1 CLOSED: `Post.authorName`/`authorRole` (~L5120-5138) and
  `Comment.authorName`/`authorRole` (~L5264-5278), denormalized at write time;
  `avatarUrl` reserved but ALWAYS null (OQ-165-01) → mapper never reads it,
  initials fallback stands.
- Gap #2 STILL BLOCKING: `SetReactionRequest.emoji ∈
  {like,love,haha,wow,sad,angry}` + single `reactionCount`/`callerReaction`
  (~L5019-5039, L5191-5220) vs web's 4 per-type counts. Real posts map to
  ZEROED reaction state — no lossy remap.
- Gap #3 STILL BLOCKING: `Post.media` = ONE presigned image via
  `multipart/form-data` (`Media`, ~L4724-4749) vs web's caption-only
  `FeedAttachment[]`. Real media is NOT surfaced (no `<img>` render path).

**Four contract findings beyond the brief (flagged to fe-lead):**

1. The pre-existing DTOs were INVENTED (INT-190), not real: the wire says
   `id`/`textBody`/`isPinned`/`authorUserId`/`text`, and feed-read `data` is a
   `FeedPage` OBJECT (`{posts, pinnedPost}`, ADR 0083) — NOT a bare `Post[]`.
   The old repo would have returned an empty feed. DTOs + mapper rewritten.
2. `authorRole` is IAM's member-role vocabulary (`ADMIN|MANAGER|TEACHER|STAFF|
   STUDENT|PARENT`, UPPERCASE) which does NOT match the feed's 4-value badge
   vocabulary. No `PRINCIPAL` member role exists; ADMIN (author of every SCHOOL
   post) has no badge. Unmappable → `null` = no badge (the old mapper defaulted
   unknown roles to `teacher`, which would have mislabelled admins). Needs a
   design decision on an ADMIN badge label + tone.
3. `authorName`/`authorRole` are NULLABLE and not `required` (pre-migration-035
   rows, no backfill) → entities widened to `string | null` / `FeedRole | null`;
   presentation renders `feed.unknownAuthor` + `?` initials + no badge.
4. `addComment` has NO blocking gap (real `{text}` → `Comment`, wired and
   tested) and pin/unpin is real and now reachable — both stay mocked only for
   write-side coherence; promoting either is a one-line hybrid change.

**Accepted consequence, needs a decision before `USE_MOCK` flips:** in real mode
a mutation succeeds against the in-memory mock and vanishes on the next real
refetch (a fake-published announcement). Harmless today (app ships
`USE_MOCK=true` → pure mock repo, no hybrid). Recommend an honest degrade or a
hidden composer for the real branch.

**Proof commands (all run on `feat/us-e18.31-feed-wiring`):**

| Command | Result |
| --- | --- |
| `bun vitest run` (baseline before) | 462 files / 3325 tests passed |
| `bun vitest run` (after) | **464 files / 3351 tests passed** (+2 files, +26 tests, 0 regressions) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1187 tests passed** |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning in an unrelated file) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | ✓ Compiled successfully |
| `NEXT_PUBLIC_USE_MOCK=false bun run build` | ✓ Compiled successfully |

i18n: `feed.unknownAuthor` added to BOTH `vi.json` ("Người dùng không xác định")
and `en.json` ("Unknown user").
