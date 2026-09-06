"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/bootstrap/i18n/routing";
import { tenantUrl } from "@/bootstrap/tenant";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  NotificationFilter,
  NotificationPage,
} from "../../domain/entities/notification.entity";
import { notificationKeys } from "../notification-keys";
import { NotificationRow } from "../shared/notification-row";
import {
  decrementUnreadCount,
  type UnreadCountCache,
} from "../shared/unread-count-cache";
import type { NotificationDropdownProps } from "./notification-dropdown.i-vm";

/** The three tabs of the bell dropdown (design v3 `NotifDropdown`). */
const DROPDOWN_TABS = [
  { id: "all", labelKey: "filterAll" },
  { id: "unread", labelKey: "filterUnread" },
  // Reuses the existing type label — there is deliberately no `filterSystem`
  // key (one string, one key).
  { id: "system", labelKey: "type_system" },
] as const satisfies ReadonlyArray<{
  id: NotificationFilter;
  labelKey: string;
}>;

function isErrorResult(r: unknown): r is { errorKey: string } {
  return typeof r === "object" && r !== null && "errorKey" in r;
}

function PreviewSkeleton() {
  const t = useTranslations("notifications");
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label={t("loading")}
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div key={i} className="flex gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-[var(--edu-radius-card)]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Bell dropdown panel (US-E24.13) — the CONTENT of the header's Popover, not
 * the Popover itself: the trigger + open state live in `header.tsx` so the
 * mobile (<640px) bell can stay a plain Link with no popover at all.
 *
 * ARIA: the panel is a `dialog` (the Popover primitive's own role) containing
 * a REAL tablist — design v3 draws it as a `role="menu"`, but a tablist inside
 * a menu is invalid ARIA, so the Radix `Tabs` primitive owns
 * `role="tab"`/`aria-selected`/arrow-key roving focus here.
 */
export function NotificationDropdown({
  tenantId,
  open,
  unreadCount,
  onFetchPreview,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const previewKey = notificationKeys.preview(filter);

  const { data, isLoading, isError } = useQuery({
    queryKey: previewKey,
    queryFn: async (): Promise<NotificationPage> => {
      const result = await onFetchPreview({ filter });
      if (isErrorResult(result)) throw new Error(result.errorKey);
      return result;
    },
    // Only ever fetches once the user actually opens the bell.
    enabled: open,
    // Short (the centre uses 30s): the dropdown is opened ad hoc and must feel
    // current against the badge it sits under.
    staleTime: 15_000,
  });

  // ── Mark ONE read — optimistic, because the AC requires the bell badge to
  // drop by one IMMEDIATELY (the centre can get away with invalidate-only).
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await onMarkRead(id);
      if (result.errorKey) throw new Error(result.errorKey);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: previewKey });
      await queryClient.cancelQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      const previousPage =
        queryClient.getQueryData<NotificationPage>(previewKey);
      const previousCount = queryClient.getQueryData<UnreadCountCache>(
        notificationKeys.unreadCount(),
      );
      const wasUnread =
        previousPage?.items.find((n) => n.id === id)?.read === false;

      queryClient.setQueryData<NotificationPage>(previewKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((n) =>
                n.id === id ? { ...n, read: true } : n,
              ),
            }
          : old,
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCountCache>(
          notificationKeys.unreadCount(),
          (old) => decrementUnreadCount(old),
        );
      }
      return { previousPage, previousCount };
    },
    onError: (_err, _id, context) => {
      // Roll BOTH caches back — a half-rolled-back state would show a badge
      // that disagrees with the rows.
      if (context?.previousPage !== undefined) {
        queryClient.setQueryData(previewKey, context.previousPage);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.previousCount,
        );
      }
      toast.error(t("errors.network-error"));
    },
    onSettled: () => {
      // `all` prefix covers preview + list + unread-count.
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const result = await onMarkAllRead?.();
      if (result?.errorKey) throw new Error(result.errorKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success(t("markAllReadToast"));
    },
    onError: () => {
      toast.error(t("errors.network-error"));
    },
  });

  const items = data?.items ?? [];
  const showMarkAll = unreadCount > 0 && onMarkAllRead !== undefined;

  const emptyTitle =
    filter === "unread"
      ? t("emptyUnreadTitle")
      : filter === "system"
        ? t("emptySystem")
        : t("emptyAllTitle");

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        {/* Same string as the dialog's own name (header.tsx passes
            `dropdownAriaLabel` to PopoverContent) — deliberately ONE key, not a
            duplicate `panelTitle`. A heading, not a <p>, so screen-reader users
            can jump to it inside the panel. */}
        <h2 className="font-extrabold text-foreground text-sm">
          {t("dropdownAriaLabel")}
        </h2>
        {showMarkAll && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            // `min-h-11` + the negative-margin padding grow the HIT AREA to the
            // 44px minimum (accessibility.md) without moving the label a pixel.
            className="-mx-2 min-h-11 rounded-sm px-2 font-bold text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Tabs — a real tablist (Radix), not the design's role="menu" */}
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as NotificationFilter)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          aria-label={t("filterLabel")}
          className="w-full justify-start gap-1 border-border border-b px-3"
        >
          {DROPDOWN_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-h-11 flex-none gap-1.5 px-3 text-xs font-semibold data-[state=active]:text-primary"
            >
              {t(tab.labelKey)}
              {tab.id === "unread" && unreadCount > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-edu-error-dark px-1.5 text-[10px] font-bold text-edu-error-foreground leading-4"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                  <span className="sr-only">
                    {t("unreadCountAriaLabel", { count: unreadCount })}
                  </span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* List — MUST be a TabsContent: every TabsTrigger unconditionally
            carries `aria-controls`, so a plain <div> here leaves that pointing
            at nothing (WCAG 4.1.2). One `TabsContent value={filter}` is enough
            because `filter` IS the active value — Radix then owns the id,
            `role="tabpanel"` and `aria-labelledby` wiring. */}
        <TabsContent value={filter} className="max-h-[340px] overflow-y-auto">
          {isLoading && <PreviewSkeleton />}

          {!isLoading && isError && (
            <p
              className="px-4 py-7 text-center text-edu-error-text text-xs"
              role="alert"
            >
              {t("errors.network-error")}
            </p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p
              className="px-4 py-7 text-center text-muted-foreground text-xs"
              role="status"
            >
              {emptyTitle}
            </p>
          )}

          {!isLoading && !isError && items.length > 0 && (
            // `role="log" aria-live="polite"` (same as the notifications
            // centre): an optimistic mark-read / mark-all rewrites these rows in
            // place, and a silent rewrite is invisible to a screen-reader user
            // (WCAG 4.1.3). `role="log"` takes an accessible name, so the label
            // here is supported ARIA — unlike on a generic <div>.
            <div
              role="log"
              aria-live="polite"
              aria-label={t("listAriaLabel")}
              className="divide-y divide-border"
            >
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  variant="compact"
                  // Mark-read keeps the panel OPEN so the user sees the row lose
                  // its bold + dot and the badge drop (AC-3). No deep-link
                  // navigation here: the centre's `../grades` targets are
                  // relative to the /notifications route and would resolve wrong
                  // from any other page in the shell.
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Link
        href={tenantUrl(tenantId, "/notifications")}
        onClick={onClose}
        className="flex min-h-11 items-center justify-center border-border border-t bg-muted/40 font-bold text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {t("viewAll")}
      </Link>
    </div>
  );
}
