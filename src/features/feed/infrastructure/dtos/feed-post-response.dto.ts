import type { ReactionType } from "../../domain/entities/reaction.entity";

/** Wire shape of an image attachment (mock-only for now, INT-190-01). */
export interface FeedAttachmentDto {
  label: string;
  alt: string;
}

/**
 * Feed post wire shape (INT-190-01/02, camelCase). No `openapi.yaml` published
 * for `social` — inferred from integration.md §2; flag any mismatch to fe-lead.
 */
export interface FeedPostResponseDto {
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarInitials?: string;
  authorAvatarUrl?: string;
  scope: string;
  classId?: string;
  content: string;
  attachments?: FeedAttachmentDto[];
  attachmentUrl?: string;
  createdAt: string;
  pinned?: boolean;
  reactions?: {
    counts?: Partial<Record<ReactionType, number>>;
    myReaction?: ReactionType | null;
  };
  commentCount?: number;
}
