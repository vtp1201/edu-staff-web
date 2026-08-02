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

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (author fields, null-avatarUrl handling) |
| Integration | repository test against the real DTO shape |
| E2E | Storybook: real-author-name story, null-avatar-fallback story |
| Platform | `bun build` clean both modes |
| Release | design-review gate + a11y (role badge contrast, avatar fallback a11y) |

## Harness Delta

Registered via `harness-cli story add --id US-E18.31`.

## Evidence

(fill after implementation)
