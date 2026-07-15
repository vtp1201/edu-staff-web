import type {
  FeedPage,
  FeedScopeSelection,
} from "../entities/feed-post.entity";
import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * List one cursor page of the feed for a scope (UC-1901). Single use-case with
 * a scope discriminator (school | class) over two near-identical classes
 * (plan.md Phase 0, YAGNI/DRY). Pure delegate — no side effects.
 */
export class ListFeedUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>> {
    return this.repo.getFeed(selection, cursor);
  }
}
