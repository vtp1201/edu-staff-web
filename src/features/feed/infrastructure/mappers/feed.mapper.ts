import type { FeedCommentEntity } from "../../domain/entities/feed-comment.entity";
import type {
  FeedPostEntity,
  FeedScope,
} from "../../domain/entities/feed-post.entity";
import {
  emptyReactionCounts,
  type ReactionState,
} from "../../domain/entities/reaction.entity";
import { feedRoleOfMemberRole } from "../../domain/policies/feed-role";
import type { FeedCommentResponseDto } from "../dtos/feed-comment-response.dto";
import type {
  FeedPageResponseDto,
  FeedPostResponseDto,
} from "../dtos/feed-post-response.dto";
import type { ReactionResponseDto } from "../dtos/reaction-response.dto";

/** Wire scope is UPPERCASE `SCHOOL|CLASS|CLUB`; the screen has no club surface. */
function toScope(raw: string): FeedScope {
  return raw.toUpperCase() === "CLASS" ? "class" : "school";
}

/** Two-initial avatar from a display name; "?" when the wire has no name. */
function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (parts.length === 1 ? first : `${first}${last}`).toUpperCase() || "?";
}

/**
 * Reaction state — mock/dead path only.
 *
 * The REAL read gives a single `reactionCount` + `callerReaction` over
 * `like|love|haha|wow|sad|angry`, which has no lossless mapping onto web's
 * per-type `like|love|celebrate|clap` model (blocking gap #2). Real posts
 * therefore map to ZEROED counts rather than a fabricated per-type breakdown;
 * this helper still serves the (unrouted) reaction endpoints.
 */
function toReactionState(dto: ReactionResponseDto | undefined): ReactionState {
  const counts = emptyReactionCounts();
  if (dto?.counts) {
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
      counts[key] = dto.counts[key] ?? 0;
    }
  }
  return { counts, myReaction: dto?.myReaction ?? null };
}

/**
 * `textBody` + optional `linkUrl` → the entity's single `content` string. The
 * link is appended on its own line rather than dropped: the post body is plain
 * text in `FeedPostCard`, and silently discarding wire content would lose the
 * whole point of a link post.
 */
function toContent(dto: FeedPostResponseDto): string {
  return dto.linkUrl ? `${dto.textBody}\n${dto.linkUrl}` : dto.textBody;
}

export const FeedMapper = {
  toReactionState,

  toPostEntity(dto: FeedPostResponseDto): FeedPostEntity {
    const scope = toScope(dto.scope);
    return {
      postId: dto.id,
      authorId: dto.authorUserId,
      // A11Y-002 — a blank wire value ("" on a pre-migration row) is absence,
      // not a name: keep it aligned with the "?" initials fallback so the
      // presentation's `?? t("unknownAuthor")` covers both.
      authorName: dto.authorName?.trim() || null,
      authorRole: feedRoleOfMemberRole(dto.authorRole),
      authorAvatarInitials: initialsOf(dto.authorName),
      scope,
      classId: scope === "class" ? (dto.classId ?? undefined) : undefined,
      content: toContent(dto),
      // Gap #3 — `media` is one presigned image; `FeedAttachment` is a
      // caption-only placeholder with no url and no <img> render path, so a
      // real image is NOT surfaced (documented in feed.di.ts, flagged).
      attachments: [],
      createdAt: dto.createdAt,
      pinned: dto.isPinned ?? false,
      // Gap #2 — never remap the emoji taxonomy (see toReactionState).
      reactions: { counts: emptyReactionCounts(), myReaction: null },
      commentCount: dto.commentCount ?? 0,
    };
  },

  /**
   * `FeedPage` (`{ posts, pinnedPost }`, ADR 0083) → the entity list. The
   * pinned post is fetched independently of the chronological page, so it is
   * prepended when the page does not already contain it and deduped when it
   * does. `sortPosts` still owns final ordering.
   */
  toPosts(page: FeedPageResponseDto | null | undefined): FeedPostEntity[] {
    const posts = (page?.posts ?? []).map(FeedMapper.toPostEntity);
    const pinned = page?.pinnedPost;
    if (!pinned) return posts;
    if (posts.some((p) => p.postId === pinned.id)) return posts;
    return [FeedMapper.toPostEntity(pinned), ...posts];
  },

  toCommentEntity(dto: FeedCommentResponseDto): FeedCommentEntity {
    return {
      commentId: dto.id,
      postId: dto.postId,
      authorId: dto.authorUserId,
      // A11Y-002 — a blank wire value ("" on a pre-migration row) is absence,
      // not a name: keep it aligned with the "?" initials fallback so the
      // presentation's `?? t("unknownAuthor")` covers both.
      authorName: dto.authorName?.trim() || null,
      authorRole: feedRoleOfMemberRole(dto.authorRole),
      authorAvatarInitials: initialsOf(dto.authorName),
      content: dto.text,
      createdAt: dto.createdAt,
    };
  },
};
