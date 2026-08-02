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
 * A feed post. Wire fields camelCase. `pinned` is authoritative from the server
 * on fetch but flipped locally by the mock pin toggle (FR-011). `classId`
 * present only when `scope === "class"`.
 *
 * US-E18.31: `authorName`/`authorRole` are NULLABLE because the real wire's
 * denormalized identity (BE US-165) is nullable — a post written before
 * migration 035 has no stored name/role and there is no backfill, and an author
 * whose IAM member role is outside the feed's display vocabulary
 * (ADMIN/MANAGER/STAFF) has no badge. Presentation renders an i18n
 * unknown-author label and omits the badge; nothing is ever invented in the
 * mapper. `authorAvatarInitials` is always a string ("?" when unknown) — the
 * avatar is initials-only by design, `avatarUrl` is never read.
 */
export interface FeedPostEntity {
  postId: string;
  authorId: string;
  authorName: string | null;
  authorRole: FeedRole | null;
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
