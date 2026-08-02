# 0067 Feed: hybrid read/write repository with real-mode honest degrade

Date: 2026-08-02

## Status

Accepted

## Context

`features/feed` (US-E19.1) shipped entirely mock-first (`bootstrap/di/feed.di.ts`,
US-E18.20) because three independent gaps blocked a full un-mock against
`social`'s real API:

1. No author identity on `Post`/`Comment` (bare `authorUserId`, no display
   name/role/avatar, and no batch-lookup endpoint any caller could use to
   resolve one for every row of a public feed).
2. A reaction-taxonomy mismatch: real `emoji ∈ {like,love,haha,wow,sad,angry}`
   with a single `reactionCount`/`callerReaction`, vs. web's 4-type
   (`like/love/celebrate/clap`) per-type-count model.
3. An attachment-capability mismatch: real `Post.media` is one optional image
   via `multipart/form-data` at create time, vs. web's multi-`FeedAttachment[]`
   placeholder model with no upload pipeline.

BE US-165 (2026-08 batch) closed gap #1 by denormalizing `authorName`/
`authorRole` directly onto `Post`/`Comment` at write time. Gaps #2 and #3 are
UNCHANGED — no lossless mapping exists for either, and remapping either is a
product/design decision this story has no mandate to make unilaterally.

During implementation (US-E18.31) it was discovered that the DTOs this
feature's "real" repository had been carrying were themselves wrong — the
actual wire shape uses `id`/`textBody`/`isPinned`/`authorUserId`, and the
feed-list response is a `FeedPage` object (`{posts, pinnedPost}`, ADR 0083 on
the BE), not a bare `Post[]` — so the pre-existing "real" repository, had it
ever been un-mocked as written, would have silently returned an empty feed.

It was also found that this app's production configuration is NOT
`NEXT_PUBLIC_USE_MOCK=true` — the env var is unset/`false` in real deployments
(`next.config.ts` actively throws on a deploy build if it's `true`), so a
naive "wire the reads, leave mutations delegating to the in-memory mock"
hybrid would have shipped a feed where composing/reacting/pinning/reporting
appeared to succeed (optimistic toast) and then silently vanished on the next
refetch — including real post ids reaching the STILL force-mocked
`moderation` feature, where a principal's "removal" or a parent's "report" of
real content would report fake success while the underlying report/removal
never happened. On a school-communications product this is safeguarding-
relevant, not merely a UX rough edge.

## Decision

`features/feed` moves from fully-mocked to a **permanent hybrid** repository
(`HybridFeedRepository`), gated the same way as this repo's other
permanently-partial repositories (e.g. `HybridWeeklyTimetableRepository`,
ADR 0060's `HybridMessagingRepository`):

- **Reads are real**: `getFeed`/`listComments` call the actual `social`
  endpoints, corrected to the real `FeedPage`/`Post`/`Comment` wire shapes,
  with `authorName`/`authorRole` mapped through this repo's canonical
  IAM-enum→appRole map (`ROLE_ENUM_TO_APP`/`appRoleOf`, `role-meta.ts`) rather
  than a feed-local, incomplete ad-hoc mapping.
- **Writes honestly degrade in real mode**: `createPost`/`setReaction`/
  `removeReaction`/`addComment`/`togglePin` return a typed `{type:"forbidden"}`
  failure with **zero HTTP attempted** when `USE_MOCK` is false — they are
  NOT routed to the in-memory mock repository in real mode. `USE_MOCK=true`
  (mock/demo environments only) still gets the full mock experience
  (reads + writes) for product demos/dev.
- **Presentation gates the affordance, not just the request**: a
  `writesEnabled = USE_MOCK` flag threads from the RSC route through the VM
  to the client screen. In real mode: the composer is hidden, the reaction
  picker is disabled, the comment box is replaced with explanatory text, and
  the post "…" menu (pin/report/remove — everything that mutates) is withheld
  entirely, with one `role="status"` notice explaining reads work and writes
  don't yet. This is deliberately NOT "controls present but silently 403" —
  a present-but-dead control is worse than an absent one.

## Alternatives Considered

1. **Full un-mock, accept a lossy reaction/attachment remap.** Rejected — no
   lossless mapping exists for either gap; inventing one is a product
   decision (which emoji/attachment behaviors survive, which are dropped)
   this engineering story has no mandate to make.
2. **Full un-mock, keep mutations routed to the in-memory mock in ALL
   modes (including real/production).** Rejected — this is what was almost
   shipped before review caught it. It produces fake-success UX for every
   mutation in the app's actual production configuration, and specifically
   lets real post ids reach `moderation`'s mock `removeContent`/report path
   with a fake-success response — a safeguarding-relevant silent failure on
   a school-communications surface.
3. **Keep the feature fully mocked (no partial un-mock at all).** Rejected —
   throws away the real, working, valuable identity-resolution fix from
   US-165 for no reason; the read-only real feed is a genuine product
   improvement on its own.

## Consequences

Positive:

- The feed is now a real, correctly-attributed read surface in production,
  closing the majority of this feature's user-facing value.
- No user is ever told a write succeeded when it silently did not — the
  honest-degrade posture holds even as the app's default env config changes.
- `togglePin`'s real endpoint (US-101, already implemented and tested against
  the real HTTP boundary) is a one-line promotion once gaps #2/#3 or a
  product decision on write-gating lands — the naming (`togglePinMock` →
  `togglePin`) and the interface-level doc comment now correctly convey "real
  endpoint exists, routed to degrade pending a decision", not "no backend".

Tradeoffs:

- Real-mode users cannot post/react/comment/pin on the feed until gaps #2/#3
  get a product decision — this is a genuine capability gap, not free.
- `addComment` and `togglePin` have NO remaining technical gap (their real
  paths are fully correct and tested) but are still gated off with the other
  three mutations for UX coherence (a feed you can only read, not comment on
  even though comments technically work, was judged less confusing than a
  feed where SOME write affordances work and others don't with no visible
  pattern). Revisit if/when gaps #2/#3 close.

## Follow-Up

- Product decision needed on reaction-taxonomy remap (gap #2) and attachment
  capability (gap #3) before real-mode writes can re-enable.
- Once either or both gaps close, `addComment`/`togglePin` can be promoted to
  real independently of the other three (no technical blocker on those two
  today).
- Cross-repo asks: none new for this story (gaps #2/#3 are BE-and-FE product
  decisions, not missing BE endpoints).
