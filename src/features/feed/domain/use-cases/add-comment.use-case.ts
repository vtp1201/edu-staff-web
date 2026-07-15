import type { FeedCommentEntity } from "../entities/feed-comment.entity";
import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * Add a comment (UC-1904/FR-005). Same client-side non-empty guard as
 * create-post; server stays authoritative for the rest.
 */
export class AddCommentUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    postId: string,
    content: string,
  ): Promise<FeedResult<FeedCommentEntity>> {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return Promise.resolve({ ok: false, error: { type: "validation" } });
    }
    return this.repo.addComment(postId, trimmed);
  }
}
