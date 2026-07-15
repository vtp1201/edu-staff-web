"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type { FeedCommentEntity } from "../../../domain/entities/feed-comment.entity";
import { feedKeys } from "../feed-keys";
import type { AddCommentResult, ListCommentsResult } from "../feed-screen.i-vm";
import { FeedCommentItem } from "./feed-comment-item";

interface ThreadData {
  comments: FeedCommentEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedCommentsProps {
  postId: string;
  meId: string;
  listCommentsAction: (input: {
    postId: string;
    cursor?: string | null;
  }) => Promise<ListCommentsResult>;
  addCommentAction: (input: {
    postId: string;
    content: string;
  }) => Promise<AddCommentResult>;
  /** Bubbles to the container's single shared ReportContentDialog. */
  onReportComment: (comment: FeedCommentEntity) => void;
  /** 404 on list/add → post gone: container collapses thread + refetches list. */
  onPostGone: () => void;
  now?: number;
}

interface ThrownFeedFailure {
  type: string;
  retryable: boolean;
}

/**
 * Comment thread — a LEAF CONTAINER owning its OWN `useQuery`/`useMutation`
 * (component-architecture §4: N independently-mounted threads can't hoist into
 * one container). Sub-section states are INLINE (skeleton rows + "Chưa có bình
 * luận" text) — NEVER the shared EmptyState (AC-1904.2).
 */
export function FeedComments({
  postId,
  meId,
  listCommentsAction,
  addCommentAction,
  onReportComment,
  onPostGone,
  now,
}: FeedCommentsProps) {
  const t = useTranslations("feed");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const query = useQuery({
    queryKey: feedKeys.commentThread(postId),
    queryFn: async () => {
      const res = await listCommentsAction({ postId });
      if (!res.ok) {
        if (res.errorKey === "post-not-found") onPostGone();
        throw { type: res.errorKey, retryable: res.retryable };
      }
      return res.data as ThreadData;
    },
    staleTime: 0,
    retry: (count, err) =>
      Boolean((err as unknown as ThrownFeedFailure | undefined)?.retryable) &&
      count < 2,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await addCommentAction({ postId, content });
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable };
      }
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData(
        feedKeys.commentThread(postId),
        (old: ThreadData | undefined) =>
          old ? { ...old, comments: [...old.comments, created] } : old,
      );
      setDraft("");
    },
    onError: (err) => {
      if ((err as unknown as ThrownFeedFailure).type === "post-not-found")
        onPostGone();
    },
  });

  const submit = () => {
    const v = draft.trim();
    if (!v || addMutation.isPending) return;
    addMutation.mutate(v);
  };

  const comments = query.data?.comments ?? [];

  return (
    <div className="mt-3.5 flex flex-col gap-3 border-border border-t pt-3.5">
      {query.isLoading && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-[10px]" />
            </div>
          ))}
        </div>
      )}

      {query.isError && (
        <p role="alert" className="text-edu-error-text text-sm">
          {(query.error as unknown as ThrownFeedFailure).type ===
          "post-not-found"
            ? t("comments.postGone")
            : t("errors.network-error")}
        </p>
      )}

      {query.isSuccess && comments.length === 0 && (
        <p className="text-edu-text-secondary text-sm">{t("comments.empty")}</p>
      )}

      {comments.map((c) => (
        <FeedCommentItem
          key={c.commentId}
          comment={c}
          canReport={c.authorId !== meId}
          onReport={() => onReportComment(c)}
          now={now}
        />
      ))}

      {addMutation.isError &&
        (addMutation.error as unknown as ThrownFeedFailure).type ===
          "validation" && (
          <p role="alert" className="text-edu-error-text text-sm">
            {t("errors.validation")}
          </p>
        )}

      {/* Composer row */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted py-1 pr-1 pl-3.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          aria-label={t("comments.writeLabel")}
          placeholder={t("comments.writePlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || addMutation.isPending}
          aria-label={t("comments.send")}
          aria-busy={addMutation.isPending}
          className={cn(
            "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground transition-colors",
            draft.trim() ? "bg-primary" : "bg-border",
          )}
        >
          <Send aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
