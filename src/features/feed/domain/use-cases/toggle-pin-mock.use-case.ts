import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * Toggle pin (UC-1909/FR-011, MOCK-FIRST). Delegates to `repo.togglePinMock`
 * only — the repo implementation decides mock vs. future-real (DIP), so BE
 * US-101 swaps in behind this seam with ZERO use-case change. This use-case is
 * agnostic to whether an HTTP call happens (the mock guarantees it does not).
 */
export class TogglePinMockUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    return this.repo.togglePinMock(postId, pinned);
  }
}
