import "server-only";
import type { AxiosInstance } from "axios";
import { FEED_EP } from "@/bootstrap/endpoint/feed.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  isApiError,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  FeedCommentEntity,
  FeedCommentPage,
} from "../../domain/entities/feed-comment.entity";
import type {
  FeedPage,
  FeedPostEntity,
  FeedScopeSelection,
} from "../../domain/entities/feed-post.entity";
import type {
  ReactionState,
  ReactionType,
} from "../../domain/entities/reaction.entity";
import type {
  FeedFailure,
  FeedValidationField,
} from "../../domain/failures/feed.failure";
import type {
  CreatePostInput,
  FeedResult,
  IFeedRepository,
} from "../../domain/repositories/i-feed.repository";
import type { FeedCommentResponseDto } from "../dtos/feed-comment-response.dto";
import type { FeedPostResponseDto } from "../dtos/feed-post-response.dto";
import type { ReactionResponseDto } from "../dtos/reaction-response.dto";
import { FeedMapper } from "../mappers/feed.mapper";

/**
 * ApiError → FeedFailure. Branches STRICTLY on error.code (UPPER_SNAKE) / HTTP
 * status — NEVER on error.message (api-integration.md). `conflictKind`
 * disambiguates a class-scope 404 (scope-not-found) from a post 404
 * (post-not-found) by the CALL, not by message text.
 */
export function toFeedFailure(
  err: unknown,
  conflictKind: "scope" | "post" = "post",
): FeedFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (status === 403 || code === "FORBIDDEN") {
    return { type: "forbidden" };
  }
  if (status === 422 || code === "VALIDATION_ERROR") {
    const fields =
      isApiError(err) && err.fields
        ? (err.fields as FeedValidationField[])
        : undefined;
    return fields ? { type: "validation", fields } : { type: "validation" };
  }
  if (status === 404 || code === "NOT_FOUND") {
    if (code === "CLASS_NOT_FOUND" || conflictKind === "scope") {
      return { type: "scope-not-found" };
    }
    if (code === "POST_NOT_FOUND" || conflictKind === "post") {
      return { type: "post-not-found" };
    }
    return { type: "fetch-failed" };
  }
  // 429/5xx transient, unknown → retryable.
  return { type: "fetch-failed" };
}

/**
 * Real `social` feed repository (US-E19.1). `social` has no published
 * openapi.yaml (mock-first, decision 0014) — DI selects MockFeedRepository
 * while NEXT_PUBLIC_USE_MOCK=true, so this class is unused until BE confirms
 * the contract. Fully wired regardless: cursor pagination via `{ raw: true }` +
 * parseEnvelope, camelCase params, ApiError.code → FeedFailure. `togglePinMock`
 * is INTENTIONALLY local (INT-190-07 has no endpoint) even here.
 */
export class FeedRepository implements IFeedRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getFeed(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>> {
    try {
      const params: Record<string, unknown> = {};
      if (cursor) params.cursor = cursor;
      const url =
        selection.scope === "school"
          ? FEED_EP.schoolFeed
          : FEED_EP.classFeed(selection.classId);
      const envelope = (await this.http.get(url, {
        params,
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<FeedPostResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          posts: (data ?? []).map(FeedMapper.toPostEntity),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: toFeedFailure(
          err,
          selection.scope === "class" ? "scope" : "post",
        ),
      };
    }
  }

  async createPost(
    input: CreatePostInput,
  ): Promise<FeedResult<FeedPostEntity>> {
    try {
      const url =
        input.scope.scope === "school"
          ? FEED_EP.schoolFeed
          : FEED_EP.classFeed(input.scope.classId);
      const dto = (await this.http.post(url, {
        content: input.content,
        ...(input.hasAttachment ? { attachmentUrl: "mock://attachment" } : {}),
      })) as unknown as FeedPostResponseDto;
      return { ok: true, value: FeedMapper.toPostEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  async setReaction(
    postId: string,
    reactionType: ReactionType,
  ): Promise<FeedResult<ReactionState>> {
    try {
      const dto = (await this.http.put(FEED_EP.reaction(postId), {
        reactionType,
      })) as unknown as ReactionResponseDto;
      return { ok: true, value: FeedMapper.toReactionState(dto) };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  async removeReaction(postId: string): Promise<FeedResult<ReactionState>> {
    try {
      const dto = (await this.http.delete(
        FEED_EP.reaction(postId),
      )) as unknown as ReactionResponseDto;
      return { ok: true, value: FeedMapper.toReactionState(dto) };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  async listComments(
    postId: string,
    cursor: string | null,
  ): Promise<FeedResult<FeedCommentPage>> {
    try {
      const params: Record<string, unknown> = {};
      if (cursor) params.cursor = cursor;
      const envelope = (await this.http.get(FEED_EP.comments(postId), {
        params,
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<FeedCommentResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          comments: (data ?? []).map(FeedMapper.toCommentEntity),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  async addComment(
    postId: string,
    content: string,
  ): Promise<FeedResult<FeedCommentEntity>> {
    try {
      const dto = (await this.http.post(FEED_EP.comments(postId), {
        content,
      })) as unknown as FeedCommentResponseDto;
      return { ok: true, value: FeedMapper.toCommentEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  /**
   * Local-only pin flip (INT-190-07). NO HTTP call — there is no `social`
   * endpoint yet (BE US-101 in_progress). Returns synchronously-resolved so the
   * mutation chain is uniform; the client cache is the source of truth.
   */
  togglePinMock(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    return Promise.resolve({ ok: true, value: { postId, pinned } });
  }
}
