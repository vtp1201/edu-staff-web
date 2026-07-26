import "server-only";
import type { IFeedRepository } from "@/features/feed/domain/repositories/i-feed.repository";
import { AddCommentUseCase } from "@/features/feed/domain/use-cases/add-comment.use-case";
import { CreatePostUseCase } from "@/features/feed/domain/use-cases/create-post.use-case";
import { ListCommentsUseCase } from "@/features/feed/domain/use-cases/list-comments.use-case";
import { ListFeedUseCase } from "@/features/feed/domain/use-cases/list-feed.use-case";
import { ReactToPostUseCase } from "@/features/feed/domain/use-cases/react-to-post.use-case";
import { TogglePinMockUseCase } from "@/features/feed/domain/use-cases/toggle-pin-mock.use-case";
import { MockFeedRepository } from "@/features/feed/infrastructure/repositories/mocks/feed.mock.repository";

/**
 * Per-request feed repo factory (US-E19.1).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.20) — joining
 * `staff-leave.di.ts` / `teaching-plan.di.ts` / `discipline.di.ts`'s
 * fully-blocked class. This is deliberately NOT a `USE_MOCK`-conditional
 * choice: `social`'s `openapi.yaml` IS published now, every path in `FEED_EP`
 * is real and correct, and the transport works. The hold is a **domain-model /
 * identity gap** that no wiring fix can close:
 *
 * 1. **No author identity.** Real `Post`/`Comment` carry ONLY `authorUserId`
 *    (a bare uuid) — no `authorName`/`authorRole`/`avatarUrl` on either schema,
 *    and no batch/by-id display-name join exists anywhere in `social`'s public
 *    API (the 10th+ confirmation of the recurring IAM-lookup gap, cross-repo
 *    asks #6/#7/#9/#13/#18/#20…). The one candidate resolver,
 *    `GET /api/v1/social/members/{targetUserId}/profile` (US-127), is
 *    visibility-gated on a shared `RoomMember` row OR an ADMIN/TEACHER staff
 *    fact, so it 404s (`PROFILE_NOT_FOUND`) unpredictably for a SCHOOL-scope
 *    post (author = tenant ADMIN) read by a STUDENT/PARENT. A per-post fan-out
 *    would silently degrade to raw ids for an unpredictable subset of rows —
 *    the feed is a public wall where EVERY row shows avatar+name+role tone, so
 *    per the epic's own bar (ask #9) that is not a shippable approximation.
 * 2. **Different reaction taxonomy.** Real `emoji` ∈
 *    `{like,love,haha,wow,sad,angry}` with a single `reactionCount` +
 *    `callerReaction`; web's `ReactionType` ∈ `{like,love,celebrate,clap}` with
 *    per-type counts. No lossless mapping — remapping is a product/design call.
 * 3. **Different attachment capability.** Real `Post.media` is ONE optional
 *    image uploaded as `multipart/form-data` at create time; web models
 *    multiple placeholder `FeedAttachment[]` with no upload pipeline.
 *
 * Pin/unpin IS real (`PUT`/`DELETE /feeds/posts/{postId}/pin`, US-101 —
 * INT-190-07's "no endpoint" note was stale) and `FeedRepository` now issues
 * the real call, but it is unreachable in practice: its only source of a valid
 * `postId` is the feed read, which is mock-sourced. Same shape as US-E18.9's
 * `UpdateEntries()`. Forcing the mock here guards the screen against the day
 * the app-wide `USE_MOCK` flag flips to `false`.
 */
async function makeRepo(): Promise<IFeedRepository> {
  return new MockFeedRepository();
}

export async function makeListFeedUseCase() {
  return new ListFeedUseCase(await makeRepo());
}

export async function makeCreatePostUseCase() {
  return new CreatePostUseCase(await makeRepo());
}

export async function makeReactToPostUseCase() {
  return new ReactToPostUseCase(await makeRepo());
}

export async function makeListCommentsUseCase() {
  return new ListCommentsUseCase(await makeRepo());
}

export async function makeAddCommentUseCase() {
  return new AddCommentUseCase(await makeRepo());
}

export async function makeTogglePinMockUseCase() {
  return new TogglePinMockUseCase(await makeRepo());
}
