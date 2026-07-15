"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import {
  ReportContentDialog,
  type ReportReasonId,
} from "@/components/shared/report-content-dialog";
import type {
  FeedPage,
  FeedPostEntity,
  FeedScopeSelection,
} from "../../domain/entities/feed-post.entity";
import type {
  ReactionState,
  ReactionType,
} from "../../domain/entities/reaction.entity";
import { canPost } from "../../domain/policies/can-post";
import { menuVisibility } from "../../domain/policies/menu-visibility";
import { sortPosts } from "../../domain/policies/sort-posts";
import { FeedComposer } from "./components/feed-composer";
import { FeedErrorState } from "./components/feed-error-state";
import { FeedPostCard } from "./components/feed-post-card";
import { FeedSkeletonRows } from "./components/feed-skeleton-rows";
import { ScopeTabs } from "./components/scope-tabs";
import { feedKeys } from "./feed-keys";
import type { FeedScreenVM } from "./feed-screen.i-vm";

type FeedInfinite = InfiniteData<FeedPage, string | null>;

interface ThrownFeedFailure {
  type: string;
  retryable: boolean;
}
function isRetryable(err: unknown): boolean {
  return Boolean((err as ThrownFeedFailure | undefined)?.retryable);
}
function failureType(err: unknown): string {
  return (err as ThrownFeedFailure | undefined)?.type ?? "network-error";
}

/** Map a reaction change onto a post's ReactionState (pure). */
function applyReaction(
  reactions: ReactionState,
  next: ReactionType | null,
): ReactionState {
  const counts = { ...reactions.counts };
  const prev = reactions.myReaction;
  if (prev) counts[prev] = Math.max(0, counts[prev] - 1);
  if (next) counts[next] = counts[next] + 1;
  return { counts, myReaction: next };
}

function mapPost(
  data: FeedInfinite | undefined,
  postId: string,
  fn: (p: FeedPostEntity) => FeedPostEntity,
): FeedInfinite | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => (p.postId === postId ? fn(p) : p)),
    })),
  };
}

function dropPost(
  data: FeedInfinite | undefined,
  postId: string,
): FeedInfinite | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.filter((p) => p.postId !== postId),
    })),
  };
}

type ReportTarget = {
  kind: "post" | "comment";
  contentId: string;
  parentId?: string;
  authorName: string;
  preview: string;
};
type RemoveTarget = {
  kind: "post" | "comment";
  contentId: string;
  parentId?: string;
};

/**
 * Feed screen (US-E19.1). The ONLY component touching TanStack Query / the
 * Server Action refs (container + presentational shell merged, per
 * component-architecture §2 note). Owns the per-scope infinite query, all
 * mutations, and the single root-mounted Report/Remove dialogs. Active scope is
 * LOCAL state (state-design §10 recommended URL, but local keeps this
 * Storybook-testable with no router; flagged as a deliberate, contract-neutral
 * choice — ScopeTabs is agnostic to where the state lives).
 */
export function FeedScreen(vm: FeedScreenVM) {
  const t = useTranslations("feed");
  const tError = useTranslations("feed.errors");
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const [activeScope, setActiveScope] = useState("school");
  const [resetSignal, setResetSignal] = useState(0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const selection: FeedScopeSelection =
    activeScope === "school"
      ? { scope: "school" }
      : { scope: "class", classId: activeScope };

  const reactionLabels = useMemo(
    () => ({
      like: t("reactions.like"),
      love: t("reactions.love"),
      celebrate: t("reactions.celebrate"),
      clap: t("reactions.clap"),
    }),
    [t],
  );

  // ── Feed list (infinite, per scope) ──────────────────────────────────────
  const seedSchool = useMemo(() => {
    if (activeScope !== "school") return undefined;
    if (vm.initialErrorKey || !vm.initialSchoolPage) return undefined;
    return {
      pages: [vm.initialSchoolPage],
      pageParams: [null as string | null],
    };
  }, [activeScope, vm.initialErrorKey, vm.initialSchoolPage]);

  const query = useInfiniteQuery({
    queryKey: feedKeys.list(selection),
    queryFn: async ({ pageParam }) => {
      const res = await vm.fetchFeedPageAction({
        selection,
        cursor: pageParam,
      });
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable };
      }
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    initialData: seedSchool,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  const posts = useMemo(
    () => sortPosts(query.data?.pages.flatMap((p) => p.posts) ?? []),
    [query.data],
  );

  const firstPageError = query.isError && posts.length === 0;
  const canPostHere = canPost(vm.role, selection.scope);

  // ── Reaction mutation (optimistic, silent rollback, 404 removes) ─────────
  const [pendingReactionPost, setPendingReactionPost] = useState<string | null>(
    null,
  );
  const reactionMutation = useMutation({
    mutationFn: async (vars: {
      postId: string;
      nextReaction: ReactionType | null;
    }) => {
      const res = await vm.reactToPostAction({
        postId: vars.postId,
        reactionType: vars.nextReaction,
      });
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
      return res.data;
    },
    onMutate: async (vars) => {
      setPendingReactionPost(vars.postId);
      await queryClient.cancelQueries({ queryKey: feedKeys.list(selection) });
      const previous = queryClient.getQueryData(feedKeys.list(selection));
      queryClient.setQueryData(feedKeys.list(selection), (old: FeedInfinite) =>
        mapPost(old, vars.postId, (p) => ({
          ...p,
          reactions: applyReaction(p.reactions, vars.nextReaction),
        })),
      );
      return { previous };
    },
    onError: (err, vars, ctx) => {
      if (failureType(err) === "post-not-found") {
        // AC-1903.5 — drop the concurrently-removed post (silent, no toast).
        queryClient.setQueryData(
          feedKeys.list(selection),
          (current: FeedInfinite) => dropPost(current, vars.postId),
        );
        return;
      }
      // AC-1903.4 — silent rollback for any other failure.
      if (ctx?.previous) {
        queryClient.setQueryData(feedKeys.list(selection), ctx.previous);
      }
    },
    onSuccess: (serverReactions, vars) => {
      queryClient.setQueryData(feedKeys.list(selection), (old: FeedInfinite) =>
        mapPost(old, vars.postId, (p) => ({
          ...p,
          reactions: serverReactions,
        })),
      );
    },
    onSettled: () => setPendingReactionPost(null),
  });

  const handleReact = useCallback(
    (postId: string, rawType: ReactionType) => {
      const post = posts.find((p) => p.postId === postId);
      const next = post?.reactions.myReaction === rawType ? null : rawType;
      reactionMutation.mutate({ postId, nextReaction: next });
    },
    [posts, reactionMutation],
  );

  // ── Create post mutation (optimistic prepend) ────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (vars: { content: string; hasAttachment: boolean }) => {
      const res = await vm.createPostAction({
        selection,
        content: vars.content,
        hasAttachment: vars.hasAttachment,
      });
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
      return res.data;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.list(selection) });
      const previous = queryClient.getQueryData(feedKeys.list(selection));
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: FeedPostEntity = {
        postId: tempId,
        authorId: vm.meId,
        authorName: vm.meDisplayName,
        authorRole: vm.role,
        authorAvatarInitials: vm.meAvatarInitials,
        scope: selection.scope,
        classId: selection.scope === "class" ? selection.classId : undefined,
        content: vars.content,
        attachments: vars.hasAttachment
          ? [{ label: "…", alt: vars.content.slice(0, 60) }]
          : [],
        createdAt: new Date().toISOString(),
        pinned: false,
        reactions: {
          counts: { like: 0, love: 0, celebrate: 0, clap: 0 },
          myReaction: null,
        },
        commentCount: 0,
      };
      queryClient.setQueryData(
        feedKeys.list(selection),
        (old: FeedInfinite) => {
          if (!old) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...first, posts: [optimistic, ...first.posts] }, ...rest],
          };
        },
      );
      return { previous, tempId };
    },
    onSuccess: (created, _vars, ctx) => {
      queryClient.setQueryData(feedKeys.list(selection), (old: FeedInfinite) =>
        mapPost(old, ctx?.tempId ?? "", () => created),
      );
      setResetSignal((n) => n + 1);
      toast.success(t("toasts.postCreated"));
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(feedKeys.list(selection), ctx.previous);
      }
    },
  });

  const composerError = (() => {
    if (!createMutation.isError) return {};
    const type = failureType(createMutation.error);
    if (type === "validation")
      return { fieldError: { message: tError("validation") } };
    if (type === "forbidden")
      return { forbiddenError: { message: tError("forbidden") } };
    return { transientError: { message: tError("network-error") } };
  })();

  // ── Pin toggle (local-only setQueryData + fire-and-forget action) ─────────
  const handleTogglePin = useCallback(
    (postId: string, nextPinned: boolean) => {
      queryClient.setQueryData(feedKeys.list(selection), (old: FeedInfinite) =>
        mapPost(old, postId, (p) => ({ ...p, pinned: nextPinned })),
      );
      // Non-authoritative — keeps the "every write goes through an action"
      // convention; result is NOT awaited (INT-190-07, no HTTP).
      void vm.togglePinMockAction({ postId, pinned: nextPinned });
    },
    [queryClient, selection, vm],
  );

  // ── Report mutation (delegates to US-E19.2; no feed-list interaction) ─────
  const reportMutation = useMutation({
    mutationFn: async (vars: {
      kind: "post" | "comment";
      contentId: string;
      reason: ReportReasonId;
      note?: string;
    }) => {
      const res = await vm.reportContentAction(vars);
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
    },
    onSuccess: () => setReportTarget(null),
  });

  const reportError = (() => {
    if (!reportMutation.isError) return {};
    const type = failureType(reportMutation.error);
    if (type === "validation")
      return { fieldError: { message: tError("validation") } };
    if (type === "already-reported")
      return { infoMessage: tError("network-error") };
    return {
      transientError: {
        message: tError("network-error"),
        onRetry: () => {
          if (reportTarget) {
            reportMutation.mutate({
              kind: reportTarget.kind,
              contentId: reportTarget.contentId,
              reason: "spam",
            });
          }
        },
      },
    };
  })();

  // ── Remove mutation (NEVER optimistic; invalidate on success) ────────────
  const removeMutation = useMutation({
    mutationFn: async (vars: RemoveTarget) => {
      const res = await vm.removeContentAction(vars);
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(selection) });
      setRemoveTarget(null);
      toast.success(t("toasts.removed"));
    },
  });

  const removeErrorSlot = (() => {
    if (!removeMutation.isError) return undefined;
    const type = failureType(removeMutation.error);
    if (type === "forbidden") {
      return { tone: "forbidden" as const, message: tError("forbidden") };
    }
    return {
      tone: "transient" as const,
      message: tError("network-error"),
      onRetry: () => removeTarget && removeMutation.mutate(removeTarget),
    };
  })();

  const handlePostGone = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: feedKeys.list(selection) });
  }, [queryClient, selection]);

  const handleScopeChange = useCallback((scope: string) => {
    setActiveScope(scope);
  }, []);

  return (
    <div className="min-h-full overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-3 py-6 md:px-8 md:py-7">
        <ScopeTabs
          myClasses={vm.myClasses}
          activeScope={activeScope}
          onSelectScope={handleScopeChange}
        />

        {canPostHere && !firstPageError && (
          <FeedComposer
            ref={composerRef}
            meAvatarInitials={vm.meAvatarInitials}
            activeScopeLabel={
              selection.scope === "school"
                ? { kind: "school" }
                : {
                    kind: "class",
                    className:
                      vm.myClasses.find((c) => c.classId === selection.classId)
                        ?.className ?? "",
                  }
            }
            isSubmitting={createMutation.isPending}
            resetSignal={resetSignal}
            onSubmit={(input) => createMutation.mutate(input)}
            {...composerError}
          />
        )}

        {query.isLoading ? (
          <FeedSkeletonRows count={3} />
        ) : firstPageError ? (
          <FeedErrorState
            title={tError("errorTitle")}
            message={tError(
              failureType(query.error) as
                | "fetch-failed"
                | "forbidden"
                | "scope-not-found"
                | "network-error",
            )}
            showRetry={isRetryable(query.error)}
            retryLabel={tError("retry")}
            onRetry={() => query.refetch()}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={t("empty.title")}
            body={t("empty.body")}
            cta={
              canPostHere
                ? {
                    label: t("empty.cta"),
                    onClick: () => composerRef.current?.focus(),
                  }
                : undefined
            }
          />
        ) : (
          <>
            {posts.map((post) => (
              <FeedPostCard
                key={post.postId}
                post={post}
                menuVisibility={menuVisibility({
                  viewerRole: vm.role,
                  viewerId: vm.meId,
                  authorId: post.authorId,
                  scope: post.scope,
                  classId: post.classId,
                  teacherClassIds: vm.teacherClassIds,
                })}
                reactionLabels={reactionLabels}
                reactionDisabled={pendingReactionPost === post.postId}
                onReact={(type) => handleReact(post.postId, type)}
                onTogglePin={() => handleTogglePin(post.postId, !post.pinned)}
                onReport={() =>
                  setReportTarget({
                    kind: "post",
                    contentId: post.postId,
                    authorName: post.authorName,
                    preview: post.content,
                  })
                }
                onRemove={() =>
                  setRemoveTarget({ kind: "post", contentId: post.postId })
                }
                commentsProps={{
                  meId: vm.meId,
                  listCommentsAction: vm.listCommentsAction,
                  addCommentAction: vm.addCommentAction,
                  onReportComment: (comment) =>
                    setReportTarget({
                      kind: "comment",
                      contentId: comment.commentId,
                      parentId: post.postId,
                      authorName: comment.authorName,
                      preview: comment.content,
                    }),
                  onPostGone: handlePostGone,
                }}
              />
            ))}

            {query.hasNextPage ? (
              <LoadMoreButton
                hasMore={query.hasNextPage}
                isLoadingMore={query.isFetchingNextPage}
                onLoadMore={() => query.fetchNextPage()}
                hasError={query.isError && posts.length > 0}
                label={t("pagination.loadMore")}
                errorLabel={t("pagination.loadMoreError")}
              />
            ) : (
              <div className="flex items-center gap-3 py-1 pb-3">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <span className="whitespace-nowrap font-semibold text-[11.5px] text-edu-text-secondary">
                  {t("pagination.endOfFeed")}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
            )}
          </>
        )}
      </div>

      <ReportContentDialog
        open={reportTarget !== null}
        kind={reportTarget?.kind ?? "post"}
        authorName={reportTarget?.authorName ?? ""}
        contentPreview={reportTarget?.preview ?? ""}
        isSubmitting={reportMutation.isPending}
        onSubmit={({ reason, note }) => {
          if (!reportTarget) return;
          reportMutation.mutate({
            kind: reportTarget.kind,
            contentId: reportTarget.contentId,
            reason,
            note,
          });
        }}
        onCancel={() => {
          reportMutation.reset();
          setReportTarget(null);
        }}
        {...reportError}
      />

      <DestructiveConfirmDialog
        open={removeTarget !== null}
        title={t("removeDialog.title")}
        body={t("removeDialog.body")}
        confirmLabel={t("removeDialog.confirm")}
        isLoading={removeMutation.isPending}
        errorSlot={removeErrorSlot}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget)}
        onCancel={() => {
          removeMutation.reset();
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
