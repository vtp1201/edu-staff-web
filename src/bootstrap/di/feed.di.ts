import "server-only";
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
import { MockFeedRepository } from "@/features/feed/infrastructure/repositories/mocks/feed.mock.repository";

/**
 * Per-request feed repo factory (US-E19.1). `social` has no published
 * openapi.yaml + several open contract questions (integration.md §5) →
 * NEXT_PUBLIC_USE_MOCK=true is this story's working default (MockFeedRepository).
 * Flip to false once the `social` contract is confirmed by BE.
 *
 * NOTE (INT-190-07): pin/unpin has NO real endpoint at all, ever — BE US-101 is
 * still in_progress. `togglePinMock` is a local-only passthrough in BOTH the
 * mock AND the real FeedRepository, so it stays HTTP-free regardless of
 * USE_MOCK. This is intentional, not a stale mock leftover; the swap seam is
 * `IFeedRepository.togglePinMock` when US-101 ships.
 */
async function makeRepo(): Promise<IFeedRepository> {
  if (USE_MOCK) return new MockFeedRepository();
  return new FeedRepository(await createServerHttpClient());
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
