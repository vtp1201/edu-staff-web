# US-E18.31 Feed wiring (Post/Comment author denormalization)

## Status

implemented

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
| Unit | mapper test (author fields, null-avatarUrl handling) | ✅ `feed.mapper.test.ts` rewritten against the REAL `Post`/`Comment`/`FeedPage` shapes — 21 cases incl. null identity, blank-name (`""`/`"   "`) → null + `?` initials (A11Y-002), the canonical IAM-role matrix (ADMIN/MANAGER→principal, STAFF→teacher, unknown→null), avatarUrl never read, zeroed reactions, dropped media, pinnedPost dedupe |
| Unit | role narrowing shared by author badge + viewer | ✅ `feed-domain.test.ts` — `feedRoleOfMemberRole` (6 IAM enums, lowercase tolerance, unknown/absent→null) + `feedRoleOfAppRole` (4 badge roles pass through, `admin`/null→null) |
| Integration | repository test against the real DTO shape | ✅ `feed.repository.test.ts` — `FeedPage` object unwrap, `limit`/`cursor` params, pinnedPost surfacing, null identity, `listComments` bare-array unwrap + 404, `addComment` real `{text}` body |
| Integration | hybrid split provable | ✅ `hybrid-feed.repository.test.ts` — reads hit real with args intact; all 5 mutations return `{ok:false,error:{type:"forbidden"}}` and issue NO real write (honest degrade, no mock fallback) |
| Integration | route wires the gate | ✅ `(shared)/feed/page.test.ts` (new) — `writesEnabled === USE_MOCK` (false real / true mock) + viewer role via the shared narrowing (teacher/principal/student/parent, `admin`→principal, guard-reject→student) |
| Integration | DI env matrix | ✅ `feed.di.test.ts` — `"true"`→Mock; `"false"`/unset→Hybrid for all 6 factories; no http client in mock mode; `ensureFreshSession` before `createServerHttpClient` |
| E2E | Storybook: real-author-name story, null-avatar-fallback story | ✅ `RealAuthorIdentity` + `UnknownAuthorIdentity` in `feed-screen.stories.tsx` |
| E2E | Storybook: real-mode write gating | ✅ `WritesDisabledInRealMode` — `role="status"` explanatory notice, no composer, no "…" menu for a principal, reaction picker disabled, comment thread reads but the box is replaced by `feed.comments.disabled`. Mutation-checked (flipping `writesEnabled` to true fails the play) |
| Platform | `bun build` clean both modes | ✅ `NEXT_PUBLIC_USE_MOCK=true` and `=false` both "Compiled successfully" |
| Release | design-review gate + a11y (role badge contrast, avatar fallback a11y) | ⏳ fe-lead gate — no new tokens/markup; badge/avatar reuse the existing `StatusBadge` tone + initials `AvatarFallback` |

## Harness Delta

Registered via `harness-cli story add --id US-E18.31`.

## Evidence

**Scope delivered: a HYBRID wiring — real reads, HONESTLY-DEGRADED writes.**

- Real (`FeedRepository` via `HybridFeedRepository`): `getFeed`, `listComments`.
- Degraded (no HTTP, no mock fallback, typed `{ type: "forbidden" }`):
  `createPost`, `setReaction`, `removeReaction`, `addComment`, `togglePin`
  (per-method WHY documented in `hybrid-feed.repository.ts`).
- `bootstrap/di/feed.di.ts` flipped from unconditional force-mock to
  `USE_MOCK ? MockFeedRepository : HybridFeedRepository(real)`; doc comment
  rewritten (gap #1 resolved by BE US-165; gaps #2/#3 restated as still
  blocking, degrade posture explained).
- Presentation gates the write affordances off in real mode via
  `writesEnabled = USE_MOCK` threaded from the RSC route into `FeedScreenVM`
  (exam-bank's `authoringEnabled` precedent).

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

**Contract findings beyond the brief (flagged to fe-lead):**

1. The pre-existing DTOs were INVENTED (INT-190), not real: the wire says
   `id`/`textBody`/`isPinned`/`authorUserId`/`text`, and feed-read `data` is a
   `FeedPage` OBJECT (`{posts, pinnedPost}`, ADR 0083) — NOT a bare `Post[]`.
   The old repo would have returned an empty feed. DTOs + mapper rewritten.
2. `authorRole` is IAM's member-role vocabulary (`ADMIN|MANAGER|TEACHER|STAFF|
   STUDENT|PARENT`, UPPERCASE). It is now resolved through the CANONICAL
   `ROLE_ENUM_TO_APP`/`appRoleOf` map (`features/auth/domain/entities/
   role-meta.ts`) — the same map `decodeRoleClaim` uses for the viewer — so
   ADMIN/MANAGER badge as **principal** and STAFF as **teacher**; only a
   genuinely unrecognised value yields "no badge". No feed-local role table
   survives, and the route's viewer-role switch was folded onto the same
   narrowing so author and viewer can never disagree.
3. `authorName`/`authorRole` are NULLABLE and not `required` (pre-migration-035
   rows, no backfill) → entities widened to `string | null` / `FeedRole | null`;
   presentation renders `feed.unknownAuthor` + `?` initials + no badge. A blank
   (`""`) name is treated as absent so the name and the initials agree
   (A11Y-002).
4. `addComment` has NO blocking gap (real `{text}` → `Comment`, wired and
   tested) and pin/unpin is real (`togglePin`, renamed from `togglePinMock`
   since the endpoint exists — the old name misled). Both still degrade, only
   for write-side coherence; promoting either is a one-line hybrid change.

**Review fix (2026-08-02) — the hybrid IS the production configuration.** The
first pass delegated the 5 mutations to `MockFeedRepository` and called the
consequence dormant "because the app ships `USE_MOCK=true`". That premise was
false: `USE_MOCK` is `false` when the env var is unset, `next.config.ts` throws
on a deploy build with it on, and this checkout's `.env.local` already sets
`false`. A user would have seen an optimistic success toast for a post /
reaction / comment / pin that silently vanished on the next refetch — and,
because real post ids now flow into the still-force-mocked `moderation`
feature, a fake-successful "report" or "remove" on a school-communications
product. Both halves are now honest:

- **Server:** `HybridFeedRepository` no longer holds a mock at all; every
  mutation returns the typed `forbidden` failure with no HTTP attempted
  (`Unavailable*Repository` posture, US-E20.5).
- **Client:** `writesEnabled = USE_MOCK` hides the composer, withholds the
  whole "…" menu (pin/report/remove all mutate), disables the reaction chips +
  picker, replaces the comment box with an explanation, and drops the empty-
  state "post the first one" CTA — with a `role="status"` notice explaining
  that reading works and writing does not.

Moderation's own mock behaviour is out of scope here (US-E18.32); this story
only stops the FEED screen from feeding it fake successes.

**Proof commands (all run on `feat/us-e18.31-feed-wiring`):**

| Command | Result |
| --- | --- |
| `bun vitest run` (baseline before the story) | 462 files / 3325 tests passed |
| `bun vitest run` (after the first pass) | 464 files / 3351 tests passed |
| `bun vitest run` (after the review fix) | **465 files / 3360 tests passed** (+1 file, +9 tests, 0 regressions) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1188 tests passed** (+1 interaction story) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean for this story (1 pre-existing warning + 1 info in `features/messaging/…/message-context-menu.tsx`, untouched here) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | ✓ Compiled successfully |
| `bun run build` with `.env.local` (`NEXT_PUBLIC_USE_MOCK=false`) | ✓ Compiled successfully — real branch renders the gated (disabled/withheld) mutation affordances |

i18n: `feed.unknownAuthor`, `feed.writesDisabled.notice` and
`feed.comments.disabled` added to BOTH `vi.json` and `en.json`.
