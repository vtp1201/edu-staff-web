import type { FeedCommentEntity } from "../../domain/entities/feed-comment.entity";
import type {
  FeedAttachment,
  FeedPostEntity,
  FeedRole,
  FeedScope,
} from "../../domain/entities/feed-post.entity";
import {
  emptyReactionCounts,
  type ReactionState,
} from "../../domain/entities/reaction.entity";
import type { FeedCommentResponseDto } from "../dtos/feed-comment-response.dto";
import type { FeedPostResponseDto } from "../dtos/feed-post-response.dto";
import type { ReactionResponseDto } from "../dtos/reaction-response.dto";

/** BE role string → feed role (defaults to teacher for unknown/other). */
function toFeedRole(raw: string): FeedRole {
  switch (raw.toLowerCase()) {
    case "principal":
      return "principal";
    case "student":
      return "student";
    case "parent":
      return "parent";
    default:
      return "teacher";
  }
}

function toScope(raw: string): FeedScope {
  return raw === "class" ? "class" : "school";
}

/** Two-initial avatar from a display name when the wire omits one. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts[0]?.[0] ?? "";
  return (parts.length === 1 ? first : `${first}${last}`).toUpperCase() || "?";
}

function toReactionState(dto: ReactionResponseDto | undefined): ReactionState {
  const counts = emptyReactionCounts();
  if (dto?.counts) {
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
      counts[key] = dto.counts[key] ?? 0;
    }
  }
  return { counts, myReaction: dto?.myReaction ?? null };
}

function toAttachments(dto: FeedPostResponseDto): FeedAttachment[] {
  if (dto.attachments && dto.attachments.length > 0) {
    return dto.attachments.map((a) => ({ label: a.label, alt: a.alt }));
  }
  if (dto.attachmentUrl) {
    return [{ label: dto.attachmentUrl, alt: dto.content.slice(0, 60) }];
  }
  return [];
}

export const FeedMapper = {
  toReactionState,

  toPostEntity(dto: FeedPostResponseDto): FeedPostEntity {
    const scope = toScope(dto.scope);
    return {
      postId: dto.postId,
      authorId: dto.authorId,
      authorName: dto.authorName,
      authorRole: toFeedRole(dto.authorRole),
      authorAvatarInitials:
        dto.authorAvatarInitials ?? initialsOf(dto.authorName),
      scope,
      classId: scope === "class" ? dto.classId : undefined,
      content: dto.content,
      attachments: toAttachments(dto),
      createdAt: dto.createdAt,
      pinned: dto.pinned ?? false,
      reactions: toReactionState(dto.reactions),
      commentCount: dto.commentCount ?? 0,
    };
  },

  toCommentEntity(dto: FeedCommentResponseDto): FeedCommentEntity {
    return {
      commentId: dto.commentId,
      postId: dto.postId,
      authorId: dto.authorId,
      authorName: dto.authorName,
      authorRole: toFeedRole(dto.authorRole),
      authorAvatarInitials:
        dto.authorAvatarInitials ?? initialsOf(dto.authorName),
      content: dto.content,
      createdAt: dto.createdAt,
    };
  },
};
