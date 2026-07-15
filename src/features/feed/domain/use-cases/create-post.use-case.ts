import type { FeedPostEntity } from "../entities/feed-post.entity";
import type {
  CreatePostInput,
  FeedResult,
  IFeedRepository,
} from "../repositories/i-feed.repository";

/**
 * Create a post (UC-1902/FR-003). Client-side non-empty guard (defense-in-depth
 * mirror of the server 422) so an empty submit never hits the network; the
 * server stays authoritative for oversize/other validation. Returns the created
 * entity — list prepend is the query layer's job, not this use-case's.
 */
export class CreatePostUseCase {
  constructor(private readonly repo: IFeedRepository) {}

  execute(input: CreatePostInput): Promise<FeedResult<FeedPostEntity>> {
    const content = input.content.trim();
    if (content.length === 0) {
      return Promise.resolve({ ok: false, error: { type: "validation" } });
    }
    return this.repo.createPost({ ...input, content });
  }
}
