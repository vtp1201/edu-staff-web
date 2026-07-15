import type { ReactionState, ReactionType } from "../entities/reaction.entity";
import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * React to a post (UC-1903/FR-004). `reactionType === null` removes the current
 * reaction (DELETE); any type sets/replaces it (PUT). Single active reaction
 * per user — the container computes the null-vs-type decision from the current
 * state before calling this.
 */
export class ReactToPostUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    postId: string,
    reactionType: ReactionType | null,
  ): Promise<FeedResult<ReactionState>> {
    return reactionType === null
      ? this.repo.removeReaction(postId)
      : this.repo.setReaction(postId, reactionType);
  }
}
