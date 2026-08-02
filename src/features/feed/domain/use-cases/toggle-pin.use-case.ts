import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * Toggle pin (UC-1909/FR-011). Delegates to `repo.togglePin` only — the repo
 * implementation decides mock vs. real vs. degraded (DIP), so this use-case is
 * agnostic to whether an HTTP call happens at all.
 */
export class TogglePinUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    return this.repo.togglePin(postId, pinned);
  }
}
