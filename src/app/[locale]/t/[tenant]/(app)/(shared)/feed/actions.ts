"use server";

import {
  makeAddCommentUseCase,
  makeCreatePostUseCase,
  makeListCommentsUseCase,
  makeListFeedUseCase,
  makeReactToPostUseCase,
  makeTogglePinMockUseCase,
} from "@/bootstrap/di/feed.di";
import {
  makeRemoveContentUseCase,
  makeSubmitReportUseCase,
} from "@/bootstrap/di/moderation.di";
import type { ReportReasonId } from "@/components/shared/report-content-dialog";
import type { FeedScopeSelection } from "@/features/feed/domain/entities/feed-post.entity";
import type { ReactionType } from "@/features/feed/domain/entities/reaction.entity";
import {
  type FeedFailure,
  isRetryableFailure,
} from "@/features/feed/domain/failures/feed.failure";
import type { FeedResult } from "@/features/feed/domain/repositories/i-feed.repository";
import { isRetryableFailure as isModerationRetryable } from "@/features/moderation/domain/failures/moderation.failure";

/** FeedResult → the action shape the client container consumes. */
function toResult<T>(
  r: FeedResult<T>,
):
  | { ok: true; data: T }
  | { ok: false; errorKey: FeedFailure["type"]; retryable: boolean } {
  return r.ok
    ? { ok: true, data: r.value }
    : {
        ok: false,
        errorKey: r.error.type,
        retryable: isRetryableFailure(r.error),
      };
}

export async function fetchFeedPageAction(input: {
  selection: FeedScopeSelection;
  cursor?: string | null;
}) {
  const uc = await makeListFeedUseCase();
  return toResult(await uc.execute(input.selection, input.cursor ?? null));
}

export async function createPostAction(input: {
  selection: FeedScopeSelection;
  content: string;
  hasAttachment: boolean;
}) {
  const uc = await makeCreatePostUseCase();
  return toResult(
    await uc.execute({
      scope: input.selection,
      content: input.content,
      hasAttachment: input.hasAttachment,
    }),
  );
}

export async function reactToPostAction(input: {
  postId: string;
  reactionType: ReactionType | null;
}) {
  const uc = await makeReactToPostUseCase();
  return toResult(await uc.execute(input.postId, input.reactionType));
}

export async function listCommentsAction(input: {
  postId: string;
  cursor?: string | null;
}) {
  const uc = await makeListCommentsUseCase();
  return toResult(await uc.execute(input.postId, input.cursor ?? null));
}

export async function addCommentAction(input: {
  postId: string;
  content: string;
}) {
  const uc = await makeAddCommentUseCase();
  return toResult(await uc.execute(input.postId, input.content));
}

export async function togglePinMockAction(input: {
  postId: string;
  pinned: boolean;
}) {
  const uc = await makeTogglePinMockUseCase();
  return toResult(await uc.execute(input.postId, input.pinned));
}

/**
 * Thin wrapper over the SHARED submit-report use-case (US-E19.2, reuse ledger
 * #2). Feed does NOT define a second submit-report use-case.
 */
export async function reportContentAction(input: {
  kind: "post" | "comment";
  contentId: string;
  reason: ReportReasonId;
  note?: string;
}): Promise<
  { ok: true } | { ok: false; errorKey: string; retryable: boolean }
> {
  const uc = await makeSubmitReportUseCase();
  const res = await uc.execute({
    kind: input.kind,
    contentId: input.contentId,
    reason: input.reason,
    note: input.note,
  });
  return res.ok
    ? { ok: true }
    : {
        ok: false,
        errorKey: res.error.type,
        retryable: isModerationRetryable(res.error),
      };
}

/**
 * Thin wrapper over the SHARED remove-content use-case (US-E19.2, reuse ledger
 * #3). `reportId` omitted — feed's direct-removal path has no report in scope
 * (ADR 0052).
 */
export async function removeContentAction(input: {
  kind: "post" | "comment";
  contentId: string;
  parentId?: string;
}): Promise<
  { ok: true } | { ok: false; errorKey: string; retryable: boolean }
> {
  const uc = await makeRemoveContentUseCase();
  const res = await uc.execute({
    kind: input.kind,
    contentId: input.contentId,
    parentId: input.parentId,
  });
  return res.ok
    ? { ok: true }
    : {
        ok: false,
        errorKey: res.error.type,
        retryable: isModerationRetryable(res.error),
      };
}
