"use client";

import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type { NotificationFilter } from "../../domain/entities/notification.entity";
import { NotificationRow } from "../shared/notification-row";
import type {
  NotificationsCenterActions,
  NotificationsCenterVm,
} from "./notifications-center.i-vm";

// ─── Filter tabs ────────────────────────────────────────────────────────────

interface FilterTab {
  id: NotificationFilter;
  labelKey: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: "all", labelKey: "filterAll" },
  { id: "unread", labelKey: "filterUnread" },
  { id: "grade", labelKey: "filterGrade" },
  { id: "attendance", labelKey: "filterAttendance" },
  { id: "discipline", labelKey: "filterDiscipline" },
  { id: "announcement", labelKey: "filterAnnouncement" },
  // US-E24.13 (Q1) — same tab as the bell dropdown, same label key
  // (`type_system`): one string, one key. BE accepts `type=system` but has no
  // producer yet, so this tab legitimately renders its empty state.
  { id: "system", labelKey: "type_system" },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label="Đang tải thông báo"
      aria-busy="true"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div key={i} className="flex gap-3 px-4 py-4">
          <Skeleton className="size-10 shrink-0 rounded-[var(--edu-radius-card)]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export interface NotificationsCenterScreenProps
  extends NotificationsCenterVm,
    NotificationsCenterActions {
  /** Remaining unread count for display on the "load more" label. */
  remainingCount?: number;
}

export function NotificationsCenterScreen(
  props: NotificationsCenterScreenProps,
) {
  const {
    items,
    unreadCount,
    activeFilter,
    isLoading,
    error,
    hasMore,
    isFetchingMore,
    isMutating,
    remainingCount,
    onFilterChange,
    onMarkRead,
    onMarkAllRead,
    onLoadMore,
  } = props;

  const t = useTranslations("notifications");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Page header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || isMutating}
          onClick={onMarkAllRead}
          aria-label={t("markAllReadAriaLabel")}
          className="mt-2 self-start sm:mt-0 sm:self-auto"
        >
          {t("markAllRead")}
        </Button>
      </header>

      {/* Filter pills (horizontal scroll on mobile) */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
        aria-label={t("filterLabel")}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          const showCount = tab.id === "unread" && unreadCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent/50",
              )}
            >
              {t(tab.labelKey as Parameters<typeof t>[0])}
              {showCount && (
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[10px] font-bold leading-none",
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground",
                  )}
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {showCount && (
                <span className="sr-only">
                  {t("unreadCountAriaLabel", { count: unreadCount })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main list card */}
      <div className="overflow-hidden rounded-[var(--edu-radius-card)] bg-card shadow-[var(--edu-shadow-card)]">
        {/* Loading skeleton */}
        {isLoading && <SkeletonRows />}

        {/* Error state */}
        {!isLoading && error && (
          <div
            className="flex flex-col items-center gap-3 py-12 text-center"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle
              className="size-10 text-[color:var(--edu-error)]"
              aria-hidden="true"
            />
            <p className="font-semibold text-sm text-foreground">
              {t("errorTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t(error as Parameters<typeof t>[0])}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            icon={activeFilter === "unread" ? CheckCircle2 : BellOff}
            title={
              activeFilter === "unread"
                ? t("emptyUnreadTitle")
                : activeFilter === "system"
                  ? // Distinct from the generic "Chưa có thông báo": nothing is
                    // wrong, this stream simply has no producer yet.
                    t("emptySystem")
                  : t("emptyAllTitle")
            }
            body={
              activeFilter === "unread"
                ? t("emptyUnreadBody")
                : t("emptyAllBody")
            }
          />
        )}

        {/* Notification list */}
        {!isLoading && !error && items.length > 0 && (
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
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {!isLoading && !error && items.length > 0 && (
          <div className="flex justify-center border-t border-border px-4 py-3">
            {hasMore ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isFetchingMore}
                aria-label={t("loadMoreAriaLabel", {
                  count: remainingCount ?? 0,
                })}
                className="gap-1.5 text-xs"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
                {isFetchingMore
                  ? t("loading")
                  : t("loadMore", { count: remainingCount ?? 0 })}
              </Button>
            ) : (
              <p className="text-muted-foreground text-xs">{t("allLoaded")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
