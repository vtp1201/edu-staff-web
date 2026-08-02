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
import {
  type CreatePostInput,
  FEED_LIST_PAGE_SIZE,
  type FeedResult,
  type IFeedRepository,
} from "../../domain/repositories/i-feed.repository";
import type { FeedCommentResponseDto } from "../dtos/feed-comment-response.dto";
import type {
  FeedPageResponseDto,
  FeedPostResponseDto,
} from "../dtos/feed-post-response.dto";
import type { ReactionResponseDto } from "../dtos/reaction-response.dto";
import { FeedMapper } from "../mappers/feed.mapper";

/**
 * ApiError → FeedFailure. Branches STRICTLY on error.code (UPPER_SNAKE) / HTTP
 * status — NEVER on error.message (api-integration.md). `conflictKind`
 * disambiguates a class-scope 404 (scope-not-found) from a post 404
 * (post-not-found) by the CALL, not by message text.
 *
 * US-E18.20 ground-truth: the codes are read verbatim from
 * `edu-api/services/social/docs/ERROR_CODES.md` (§Feed/Post errors US-097,
 * §Post reaction errors US-099, §Post comment errors US-100, §Post pinning
 * errors US-101) and are UPPER_SNAKE on the wire — `pkg/kit/response/error.go`'s
 * `codeFromKey()` uppercases the lowercase i18n key at the HTTP boundary, same
 * as `core` (unlike `iam`, which ships the raw lowercase key — US-E18.6).
 * The previously-guessed generic codes (`FORBIDDEN`, `NOT_FOUND`,
 * `CLASS_NOT_FOUND`, `POST_NOT_FOUND`, `VALIDATION_ERROR`) do not exist on this
 * service at all; the status fallbacks are retained as a defensive net.
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
  // 403 — every real feed authorization reject. `FEED_NOT_SCHOOL_ADMIN` /
  // `FEED_NOT_HOMEROOM_TEACHER` are the CREATE gate (also reused by pin/unpin,
  // ADR 0082); `FEED_NO_TENANT_MEMBERSHIP` is the READ gate (ADR 0079).
  if (
    code === "FEED_NOT_SCHOOL_ADMIN" ||
    code === "FEED_NOT_HOMEROOM_TEACHER" ||
    code === "FEED_NO_TENANT_MEMBERSHIP" ||
    status === 403
  ) {
    return { type: "forbidden" };
  }
  // 409 `FEED_CLASS_ARCHIVED` — a state conflict (BE deliberately deviates from
  // 403 here), terminal and NOT retryable. The union has no `scope-archived`
  // member and adding one would ripple into i18n + presentation (out of this
  // story's scope), so it maps to the nearest terminal failure. Flagged to
  // fe-lead as a copy-accuracy follow-up.
  if (code === "FEED_CLASS_ARCHIVED") {
    return { type: "forbidden" };
  }
  // 422 — shared `VALIDATION_FAILED` (field-level: textBody/linkUrl/comment
  // text) plus the reaction-emoji domain guard.
  if (
    code === "VALIDATION_FAILED" ||
    code === "FEED_INVALID_REACTION_EMOJI" ||
    status === 422
  ) {
    const fields =
      isApiError(err) && err.fields
        ? (err.fields as FeedValidationField[])
        : undefined;
    return fields ? { type: "validation", fields } : { type: "validation" };
  }
  // 404 — existence-masked class read (`FEED_CLASS_NOT_FOUND` covers both
  // "no such class" AND "class exists but caller may not read it", US-107) vs.
  // a post 404 (absent or soft-deleted).
  if (code === "FEED_CLASS_NOT_FOUND") {
    return { type: "scope-not-found" };
  }
  if (code === "FEED_POST_NOT_FOUND") {
    return { type: "post-not-found" };
  }
  if (status === 404) {
    return conflictKind === "scope"
      ? { type: "scope-not-found" }
      : { type: "post-not-found" };
  }
  // 429 `FEED_RATE_LIMIT_EXCEEDED` is documented retryable; 5xx/unknown too.
  return { type: "fetch-failed" };
}

/**
 * Real `social` feed repository (US-E19.1 → US-E18.20 → **LIVE for reads since
 * US-E18.31**).
 *
 * `feed.di.ts` now routes {@link getFeed} and {@link listComments} here through
 * {@link HybridFeedRepository} whenever `NEXT_PUBLIC_USE_MOCK !== "true"`: BE
 * US-165 denormalized `authorName`/`authorRole` onto `Post`/`Comment`, which
 * removed the identity gap that had made a real feed read unshippable. Reads
 * follow the standard list contract — cursor pagination via `{ raw: true }` +
 * `parseEnvelope`, camelCase params, `ApiError.code` → `FeedFailure`.
 *
 * The MUTATIONS below are still NOT routed (the hybrid sends them to the mock)
 * and remain dead-but-correct-where-cheap, because two contract gaps are
 * unresolved product decisions — see `feed.di.ts` for the full statement:
 * - `setReaction`/`removeReaction` — real `PUT .../reaction` takes `{ emoji }`
 *   over `like|love|haha|wow|sad|angry` and answers with a single
 *   `reactionCount` + `callerReaction`, not web's per-type counts (gap #2).
 *   The request body below is deliberately left on web's shape; changing it
 *   would imply a taxonomy mapping nobody has decided.
 * - `createPost` sends `{ content }`; real `POST /feeds/{scope}` takes
 *   `textBody` (+ optional `linkUrl`, + an optional multipart `image` the web
 *   composer cannot produce) (gap #3).
 * - `togglePinMock` IS a real endpoint and, now that reads yield real post ids,
 *   is technically reachable — but the presentation treats pinning as a
 *   fire-and-forget local flip, so routing it real would swallow authorization
 *   failures silently. Promoting it needs a small UX decision (flagged).
 * - `addComment` has NO blocking gap: its request/response are wired to the
 *   real `{ text }` / `Comment` shape and unit-tested, so promoting it is a
 *   one-line change in {@link HybridFeedRepository} (flagged to fe-lead).
 *
 * `FeedScopeSelection.scope` stays lowercase (`school`/`class`) vs the wire's
 * `SCHOOL`/`CLASS`; it only ever selects a path constant, so it is harmless.
 */
export class FeedRepository implements IFeedRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getFeed(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>> {
    try {
      const params: Record<string, unknown> = { limit: FEED_LIST_PAGE_SIZE };
      if (cursor) params.cursor = cursor;
      const url =
        selection.scope === "school"
          ? FEED_EP.schoolFeed
          : FEED_EP.classFeed(selection.classId);
      // `data` is a FeedPage OBJECT (`{ posts, pinnedPost }`, US-101/ADR 0083),
      // NOT a bare Post[] — `raw: true` is a config-level sibling of `params`.
      const envelope = (await this.http.get(url, {
        params,
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<FeedPageResponseDto>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          posts: FeedMapper.toPosts(data),
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
      const params: Record<string, unknown> = { limit: FEED_LIST_PAGE_SIZE };
      if (cursor) params.cursor = cursor;
      // `data` here IS a bare Comment[] (oldest-first, ADR 0081).
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
      // Real body is `{ text }` (CreateCommentRequest, ≤500 chars).
      const dto = (await this.http.post(FEED_EP.comments(postId), {
        text: content,
      })) as unknown as FeedCommentResponseDto;
      return { ok: true, value: FeedMapper.toCommentEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }

  /**
   * Pin / unpin (US-101). US-E18.20 ground-truth: this IS a real endpoint —
   * `PUT /feeds/posts/{postId}/pin` pins (no request body, at most one pinned
   * post per feed so the write overwrites), `DELETE` unpins (204, idempotent
   * no-op even when nothing was pinned). INT-190-07's "no endpoint at all"
   * premise was stale, so the previously local-only passthrough is replaced by
   * the real call. Authorization is the CREATE gate (ADR 0082), so 403 →
   * `forbidden`, 404 → `post-not-found`, 409 archived → terminal.
   *
   * The method name is kept as `togglePinMock` because it is the
   * {@link IFeedRepository} contract the presentation layer already binds to
   * (renaming it is a domain-signature change outside US-E18.20's scope) — the
   * mock implementation is unchanged and still serves the shipped UX.
   */
  async togglePinMock(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    try {
      if (pinned) await this.http.put(FEED_EP.pin(postId));
      else await this.http.delete(FEED_EP.pin(postId));
      return { ok: true, value: { postId, pinned } };
    } catch (err) {
      return { ok: false, error: toFeedFailure(err, "post") };
    }
  }
}
