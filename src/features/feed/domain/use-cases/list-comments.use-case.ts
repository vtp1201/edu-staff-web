import type { FeedCommentPage } from "../entities/feed-comment.entity";
import type {
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/** List a post's comment thread (UC-1904/FR-005). Pure delegate. */
export class ListCommentsUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(
    postId: string,
    cursor: string | null,
  ): Promise<FeedResult<FeedCommentPage>> {
    return this.repo.listComments(postId, cursor);
  }
}
