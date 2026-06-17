"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  NotificationEntity,
  NotificationFilter,
  NotificationPage,
} from "../../domain/entities/notification.entity";
import type { NotificationFailure } from "../../domain/failures/notification.failure";
import { PAGE_SIZE } from "../../domain/repositories/i-notification.repository";
import type { NotificationsCenterScreenProps } from "./notifications-center";
import { NotificationsCenterScreen } from "./notifications-center";
import { useNotificationNewEvent } from "./use-notification-new-event";

// ─── Server-action prop types ────────────────────────────────────────────────

export interface NotificationsCenterContainerProps {
  /** Tenant id — needed by the SSE hook for tenant-scoping (decision 0009). */
  tenantId: string;
  /** Server Action: mark a single notification read. Returns { errorKey? }. */
  markReadAction: (id: string) => Promise<{ errorKey?: string }>;
  /** Server Action: mark all notifications read. Returns { errorKey? }. */
  markAllReadAction: () => Promise<{ errorKey?: string }>;
  /** Server Action: fetch a page of notifications. Returns NotificationPage or { errorKey }. */
  fetchPageAction: (params: {
    filter: NotificationFilter;
    cursor?: string;
  }) => Promise<NotificationPage | { errorKey: string }>;
  /** Server Action: fetch current unread count. Returns count or { errorKey }. */
  fetchUnreadCountAction: () => Promise<
    { count: number } | { errorKey: string }
  >;
}

// ─── Query key factory ───────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filter: NotificationFilter) =>
    ["notifications", "list", filter] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isErrorResult(r: unknown): r is { errorKey: string } {
  return typeof r === "object" && r !== null && "errorKey" in r;
}

// ─── Container ───────────────────────────────────────────────────────────────

export function NotificationsCenterContainer({
  tenantId,
  markReadAction,
  markAllReadAction,
  fetchPageAction,
  fetchUnreadCountAction,
}: NotificationsCenterContainerProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  // ── SSE: prepend new items without waiting for refetch (AC-7) ────────────
  // Query invalidation from useRealtimeEvents (global, in AppShell) will
  // eventually trigger a refetch; this local hook prepends immediately and
  // shows the Sonner toast for a snappier UX.
  const handleNewNotification = useCallback(
    (item: NotificationEntity) => {
      // Optimistically prepend into the "all" and "unread" list caches
      for (const filter of ["all", "unread"] as const) {
        queryClient.setQueryData(
          notificationKeys.list(filter),
          (
            old:
              | {
                  pages: NotificationPage[];
                  pageParams: unknown[];
                }
              | undefined,
          ) => {
            if (!old) return old;
            const [firstPage, ...rest] = old.pages;
            if (!firstPage) return old;
            return {
              ...old,
              pages: [
                { ...firstPage, items: [item, ...firstPage.items] },
                ...rest,
              ],
            };
          },
        );
      }
      // Increment the unread count optimistically
      queryClient.setQueryData(
        notificationKeys.unreadCount(),
        (old: { count: number } | undefined) =>
          old ? { count: old.count + 1 } : { count: 1 },
      );
    },
    [queryClient],
  );

  useNotificationNewEvent({
    tenantId,
    locale,
    onNew: handleNewNotification,
    toastCloseLabel: t("toastClose"),
    enabled: true,
  });

  // ── Infinite query for the notification list ──────────────────────────────
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: notificationKeys.list(activeFilter),
    queryFn: async ({ pageParam }) => {
      const result = await fetchPageAction({
        filter: activeFilter,
        cursor: pageParam as string | undefined,
      });
      if (isErrorResult(result)) {
        throw { type: result.errorKey } as NotificationFailure;
      }
      return result as NotificationPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
  });

  // ── Unread count query ────────────────────────────────────────────────────
  const { data: unreadData } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await fetchUnreadCountAction();
      if (isErrorResult(result)) return { count: 0 };
      return result;
    },
    staleTime: 30_000,
  });

  // ── Mark single read mutation ─────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await markReadAction(id);
      if (result.errorKey) throw { type: result.errorKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: () => {
      toast.error(t("errors.network-error"));
    },
  });

  // ── Mark all read mutation ────────────────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const result = await markAllReadAction();
      if (result.errorKey) throw { type: result.errorKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success(t("markAllReadToast"));
    },
    onError: () => {
      toast.error(t("errors.network-error"));
    },
  });

  // ── Flatten pages ─────────────────────────────────────────────────────────
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  // Rough estimate for remaining — last page's hasMore drives the CTA label
  const lastPage = data?.pages[data.pages.length - 1];
  const remainingCount = lastPage?.hasMore ? PAGE_SIZE : 0;

  // ── Error key ─────────────────────────────────────────────────────────────
  const errorKey: string | null = isError ? "errors.network-error" : null;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((filter: NotificationFilter) => {
    setActiveFilter(filter);
  }, []);

  const handleMarkRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
      // Navigate to the relevant section after marking read
      const item = items.find((n) => n.id === id);
      if (item) {
        const navMap: Partial<Record<typeof item.type, string>> = {
          grade: "../grades",
          attendance: "../attendance",
          discipline: "../discipline",
        };
        const dest = navMap[item.type];
        if (dest) router.push(dest);
      }
    },
    [markReadMutation, items, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const screenProps: NotificationsCenterScreenProps = {
    items,
    unreadCount: unreadData?.count ?? 0,
    activeFilter,
    isLoading,
    error: errorKey,
    hasMore: hasNextPage ?? false,
    isFetchingMore: isFetchingNextPage,
    isMutating: markReadMutation.isPending || markAllReadMutation.isPending,
    remainingCount,
    onFilterChange: handleFilterChange,
    onMarkRead: handleMarkRead,
    onMarkAllRead: handleMarkAllRead,
    onLoadMore: handleLoadMore,
  };

  return <NotificationsCenterScreen {...screenProps} />;
}
