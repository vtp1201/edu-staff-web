import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IFeedRepository } from "@/features/feed/domain/repositories/i-feed.repository";
import { AddCommentUseCase } from "@/features/feed/domain/use-cases/add-comment.use-case";
import { CreatePostUseCase } from "@/features/feed/domain/use-cases/create-post.use-case";
import { ListCommentsUseCase } from "@/features/feed/domain/use-cases/list-comments.use-case";
import { ListFeedUseCase } from "@/features/feed/domain/use-cases/list-feed.use-case";
import { ReactToPostUseCase } from "@/features/feed/domain/use-cases/react-to-post.use-case";
import { TogglePinMockUseCase } from "@/features/feed/domain/use-cases/toggle-pin-mock.use-case";
import { FeedRepository } from "@/features/feed/infrastructure/repositories/feed.repository";
import { HybridFeedRepository } from "@/features/feed/infrastructure/repositories/hybrid-feed.repository";
import { MockFeedRepository } from "@/features/feed/infrastructure/repositories/mocks/feed.mock.repository";

/**
 * Per-request feed repo factory (US-E19.1 → US-E18.20 → US-E18.31).
 *
 * `USE_MOCK ? Mock : Hybrid`. This factory was PERMANENTLY force-mocked by
 * US-E18.20 over THREE blocking gaps in `social`'s real contract; BE **US-165**
 * closed exactly one of them, so US-E18.31 wires the READ path for real and
 * keeps the write path on the mock. `HybridFeedRepository` makes that split
 * unconditional: reads real, mutations mock, regardless of the flag.
 *
 * 1. **No author identity — RESOLVED (BE US-165).** `Post`/`Comment` now carry
 *    `authorName` + `authorRole`, denormalized onto the row at write time from
 *    the author's verified claims (`fullName`, `memberRoles[0]`), so a feed
 *    read needs NO per-author profile lookup — the visibility-gated
 *    `GET /social/members/{id}/profile` fan-out that made this unshippable is
 *    no longer needed at all. Caveats, all handled in `feed.mapper.ts`:
 *    both fields are NULLABLE and NOT `required` (rows written before
 *    migration 035 read back `null`; there is no backfill), the value is
 *    captured once and never re-synced (a later rename does not propagate),
 *    and `avatarUrl` is reserved but **always `null`** (OQ-165-01) so the
 *    avatar stays initials-only. Separately, `authorRole` is IAM's member-role
 *    vocabulary (`ADMIN|MANAGER|TEACHER|STAFF|STUDENT|PARENT`), which does NOT
 *    match the feed's 4-value badge vocabulary — there is no `PRINCIPAL`
 *    member role, and ADMIN/MANAGER/STAFF have no badge. Unmappable roles map
 *    to `null` = no badge (never a guessed one). Flagged to fe-lead: giving
 *    the tenant ADMIN — the author of every SCHOOL post — a proper badge needs
 *    a design decision on the label + tone.
 * 2. **Different reaction taxonomy — STILL BLOCKING.** Real `emoji` ∈
 *    `{like,love,haha,wow,sad,angry}` with a single `reactionCount` +
 *    `callerReaction`; web's `ReactionType` ∈ `{like,love,celebrate,clap}` with
 *    per-type counts. No lossless mapping — remapping is a product/design call,
 *    so real posts read back with ZEROED reaction state and the reaction
 *    mutations stay on the mock.
 * 3. **Different attachment capability — STILL BLOCKING.** Real `Post.media` is
 *    ONE optional image uploaded as `multipart/form-data` at create time,
 *    returned as a presigned URL; web models multiple caption-only placeholder
 *    `FeedAttachment[]` with no upload and no `<img>` render path. A real
 *    image is therefore not surfaced, and `createPost` stays on the mock.
 *
 * Pin/unpin is real (`PUT`/`DELETE /feeds/posts/{postId}/pin`, US-101) and
 * `FeedRepository` issues the real call; real reads finally give it valid post
 * ids, but the presentation fires it and ignores the result, so it stays mocked
 * pending a small UX decision. See `HybridFeedRepository` for the per-method
 * rationale and the accepted consequence of mock writes over a real read.
 */
async function makeRepo(): Promise<IFeedRepository> {
  if (USE_MOCK) return new MockFeedRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new HybridFeedRepository(
    new FeedRepository(http),
    new MockFeedRepository(),
  );
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
