import type { ReactionState } from "./reaction.entity";

export type { ReactionState, ReactionType } from "./reaction.entity";

/**
 * The four feed-relevant roles (spec.md §2). Kept feed-local rather than
 * importing auth's `UserRole` so the domain stays self-contained and the feed
 * matrix (which has no `admin`) is explicit; the presentation boundary maps a
 * viewer's `UserRole` onto this before calling any feed policy.
 */
export type FeedRole = "teacher" | "principal" | "student" | "parent";

export type FeedScope = "school" | "class";

/** Mock-only image attachment (real upload pipeline out of scope, FR-003). */
export interface FeedAttachment {
  /** Placeholder caption shown in the image tile. */
  label: string;
  /** Meaningful alt text (a11y — never decorative here). */
  alt: string;
}

/**
 * A feed post (INT-190-01/02 payload row). Wire fields camelCase. `authorRole`
 * may be any BE role; presentation maps it to a tone. `pinned` is authoritative
 * from the server on fetch but flipped locally by the mock pin toggle
 * (FR-011). `classId` present only when `scope === "class"`.
 */
export interface FeedPostEntity {
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: FeedRole;
  authorAvatarInitials: string;
  scope: FeedScope;
  classId?: string;
  content: string;
  attachments: FeedAttachment[];
  createdAt: string;
  pinned: boolean;
  reactions: ReactionState;
  commentCount: number;
}

/** One cursor page of the feed list (INT-190-01/02 + meta.pagination). */
export interface FeedPage {
  posts: FeedPostEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** A scope selection — school-wide or a single class the viewer belongs to. */
export type FeedScopeSelection =
  | { scope: "school" }
  | { scope: "class"; classId: string };

export const FEED_PAGE_SIZE = 5;
