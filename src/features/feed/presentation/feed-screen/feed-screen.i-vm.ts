import type { ReportReasonId } from "@/components/shared/report-content-dialog";
import type {
  FeedCommentEntity,
  FeedCommentPage,
} from "../../domain/entities/feed-comment.entity";
import type {
  FeedPage,
  FeedPostEntity,
  FeedRole,
  FeedScopeSelection,
} from "../../domain/entities/feed-post.entity";
import type {
  ReactionState,
  ReactionType,
} from "../../domain/entities/reaction.entity";
import type { FeedFailure } from "../../domain/failures/feed.failure";

export interface FeedClassOption {
  classId: string;
  className: string;
}

/** Stable failure key + retryable flag — no i18n at this boundary (i18n.md). */
export type FeedFail = {
  ok: false;
  errorKey: FeedFailure["type"];
  retryable: boolean;
};

/** Moderation-owned failure key (report/remove delegate to US-E19.2). */
export type ModerationFail = {
  ok: false;
  errorKey: string;
  retryable: boolean;
};

export type FetchFeedPageResult = { ok: true; data: FeedPage } | FeedFail;
export type CreatePostResult = { ok: true; data: FeedPostEntity } | FeedFail;
export type ReactToPostResult = { ok: true; data: ReactionState } | FeedFail;
export type ListCommentsResult = { ok: true; data: FeedCommentPage } | FeedFail;
export type AddCommentResult = { ok: true; data: FeedCommentEntity } | FeedFail;
export type TogglePinResult =
  | { ok: true; data: { postId: string; pinned: boolean } }
  | FeedFail;
export type ReportContentResult = { ok: true } | ModerationFail;
export type RemoveContentResult = { ok: true } | ModerationFail;

export interface FeedScreenVM {
  role: FeedRole;
  /** Current user's id — menu-visibility author check. */
  meId: string;
  meDisplayName: string;
  meAvatarInitials: string;
  myClasses: FeedClassOption[];
  /** Class ids the viewer teaches — teacher moderator boundary. */
  teacherClassIds: string[];

  /** RSC-seeded page 1 for the default (school) scope, or null on failure. */
  initialSchoolPage: FeedPage | null;
  /** Present when the RSC seed fetch failed (client shows the error state). */
  initialErrorKey: FeedFailure["type"] | null;

  fetchFeedPageAction: (input: {
    selection: FeedScopeSelection;
    cursor?: string | null;
  }) => Promise<FetchFeedPageResult>;
  createPostAction: (input: {
    selection: FeedScopeSelection;
    content: string;
    hasAttachment: boolean;
  }) => Promise<CreatePostResult>;
  reactToPostAction: (input: {
    postId: string;
    reactionType: ReactionType | null;
  }) => Promise<ReactToPostResult>;
  listCommentsAction: (input: {
    postId: string;
    cursor?: string | null;
  }) => Promise<ListCommentsResult>;
  addCommentAction: (input: {
    postId: string;
    content: string;
  }) => Promise<AddCommentResult>;
  togglePinMockAction: (input: {
    postId: string;
    pinned: boolean;
  }) => Promise<TogglePinResult>;
  reportContentAction: (input: {
    kind: "post" | "comment";
    contentId: string;
    reason: ReportReasonId;
    note?: string;
  }) => Promise<ReportContentResult>;
  removeContentAction: (input: {
    kind: "post" | "comment";
    contentId: string;
    parentId?: string;
  }) => Promise<RemoveContentResult>;
}
