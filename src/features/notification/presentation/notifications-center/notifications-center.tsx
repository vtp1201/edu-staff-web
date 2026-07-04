"use client";

import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type {
  NotificationEntity,
  NotificationFilter,
  NotificationType,
} from "../../domain/entities/notification.entity";
import type {
  NotificationsCenterActions,
  NotificationsCenterVm,
} from "./notifications-center.i-vm";

// ─── Icon map per notification type ────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.FC<{ className?: string }>> = {
  grade: GraduationCap,
  attendance: CalendarDays,
  discipline: AlertTriangle,
  announcement: Megaphone,
  system: Bell,
};

const TYPE_COLOR_CLASS: Record<NotificationType, string> = {
  grade:
    "bg-[color:var(--edu-success)]/15 text-[color:var(--edu-success-text)]",
  attendance:
    "bg-[color:var(--edu-primary)]/15 text-[color:var(--edu-primary-accessible)]",
  discipline:
    "bg-[color:var(--edu-warning)]/15 text-[color:var(--edu-warning-foreground)]",
  announcement: "bg-[color:var(--edu-info)]/15 text-[color:var(--edu-info)]",
  system: "bg-muted text-muted-foreground",
};

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
];

// ─── Relative time helper ───────────────────────────────────────────────────

function relativeTime(ts: string, locale: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return locale === "vi" ? "vừa xong" : "just now";
    if (minutes < 60)
      return locale === "vi" ? `${minutes} phút trước` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return locale === "vi" ? `${hours} giờ trước` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return locale === "vi" ? `${days} ngày trước` : `${days}d ago`;
  } catch {
    return ts;
  }
}

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

interface NotificationRowProps {
  item: NotificationEntity;
  onMarkRead: (id: string) => void;
}

function NotificationRow({ item, onMarkRead }: NotificationRowProps) {
  const t = useTranslations("notifications");
  const Icon = TYPE_ICON[item.type];
  const colorCls = TYPE_COLOR_CLASS[item.type];
  const typeLabelKey = `type_${item.type}` as
    | "type_grade"
    | "type_attendance"
    | "type_discipline"
    | "type_announcement"
    | "type_system";

  return (
    <button
      type="button"
      onClick={() => onMarkRead(item.id)}
      aria-label={t("rowAriaLabel", {
        title: item.title,
        read: item.read ? t("ariaRead") : t("ariaUnread"),
      })}
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !item.read && "bg-primary/[0.08]",
      )}
    >
      {/* Unread indicator — left border via pseudo element */}
      {!item.read && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary"
        />
      )}

      {/* Type icon */}
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[var(--edu-radius-card)]",
          colorCls,
        )}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "line-clamp-1 text-sm",
              item.read
                ? "font-normal text-foreground"
                : "font-bold text-foreground",
            )}
          >
            {item.title}
          </p>
          <time
            className="shrink-0 text-muted-foreground text-xs"
            dateTime={item.ts}
            title={item.ts}
          >
            {relativeTime(item.ts, "vi")}
          </time>
        </div>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
          {item.body}
        </p>
        <span
          className={cn(
            "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight",
            colorCls,
          )}
        >
          {t(typeLabelKey)}
        </span>
      </div>
    </button>
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
