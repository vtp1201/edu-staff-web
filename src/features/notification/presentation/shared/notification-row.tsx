"use client";

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type {
  NotificationEntity,
  NotificationType,
} from "../../domain/entities/notification.entity";
import {
  isKnownBodyKey,
  isKnownTitleKey,
} from "../../domain/notification-message-keys";

// ─── Icon map per notification type ────────────────────────────────────────

export const TYPE_ICON: Record<
  NotificationType,
  React.FC<{ className?: string }>
> = {
  grade: GraduationCap,
  attendance: CalendarDays,
  discipline: AlertTriangle,
  announcement: Megaphone,
  system: Bell,
};

export const TYPE_COLOR_CLASS: Record<NotificationType, string> = {
  grade:
    "bg-[color:var(--edu-success)]/15 text-[color:var(--edu-success-text)]",
  attendance:
    "bg-[color:var(--edu-primary)]/15 text-[color:var(--edu-primary-accessible)]",
  discipline:
    "bg-[color:var(--edu-warning)]/15 text-[color:var(--edu-warning-foreground)]",
  announcement: "bg-[color:var(--edu-info)]/15 text-[color:var(--edu-info)]",
  system: "bg-muted text-muted-foreground",
};

// ─── Relative time helper ───────────────────────────────────────────────────

export function relativeTime(ts: string, locale: string): string {
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

/**
 * ICU args the notification copy is allowed to interpolate (US-E18.25 /
 * ADR 0066). Whitelisting — rather than spreading the whole wire param bag —
 * makes "a raw UUID (`classId`/`studentMemberId`/`recordId`) can never reach
 * rendered copy" a structural guarantee instead of a copy-review promise.
 * Each arg is defaulted so a param-less wire row cannot raise an ICU
 * formatting error.
 */
export function renderableParams(
  params: Record<string, string>,
): Record<string, string> {
  return {
    severity: params.severity ?? "",
    occurredAt: params.occurredAt ?? "",
  };
}

// ─── Row ────────────────────────────────────────────────────────────────────

export interface NotificationRowProps {
  item: NotificationEntity;
  onMarkRead: (id: string) => void;
  /**
   * `"full"` (default) — the notifications centre row, unchanged since
   * US-E10.2: 40px icon box, 2-line body, type-badge pill, unread rendered as
   * a left-border stripe.
   *
   * `"compact"` — the US-E24.13 bell dropdown row (360px panel): 32px icon,
   * title only (no body, no badge), unread rendered as a trailing dot.
   */
  variant?: "full" | "compact";
}

/**
 * One notification row. Promoted out of `notifications-center.tsx` in
 * US-E24.13 so the bell dropdown reuses it instead of forking a parallel
 * component (decision 0026 — one component, one canonical home; the `variant`
 * prop is the sanctioned way to express a screen-specific difference).
 */
export function NotificationRow({
  item,
  onMarkRead,
  variant = "full",
}: NotificationRowProps) {
  const t = useTranslations("notifications");
  const compact = variant === "compact";
  const Icon = TYPE_ICON[item.type];
  const colorCls = TYPE_COLOR_CLASS[item.type];
  const typeLabelKey = `type_${item.type}` as
    | "type_grade"
    | "type_attendance"
    | "type_discipline"
    | "type_announcement"
    | "type_system";

  // US-E18.25 — title/body arrive as BE-owned i18n keys + scalar params
  // (ADR 0066). Same dynamic-key-from-closed-union convention as
  // `typeLabelKey` above, plus an allow-list so a key this build has no copy
  // for (BE ships a 5th producer) degrades to the generic fallback instead of
  // rendering a raw key or throwing.
  const titleMsgKey = isKnownTitleKey(item.titleKey)
    ? (`titles.${item.titleKey}` as const)
    : ("titles.unknown" as const);
  const bodyMsgKey = isKnownBodyKey(item.bodyKey)
    ? (`bodies.${item.bodyKey}` as const)
    : ("bodies.unknown" as const);
  const titleText = t(titleMsgKey, renderableParams(item.titleParams));
  const bodyText = t(bodyMsgKey, renderableParams(item.bodyParams));

  return (
    <button
      type="button"
      onClick={() => onMarkRead(item.id)}
      aria-label={t("rowAriaLabel", {
        title: titleText,
        read: item.read ? t("ariaRead") : t("ariaUnread"),
      })}
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Denser row inside the 360px popover panel; cn()/tailwind-merge
        // resolves this against the base `py-4` above.
        compact && "py-3",
        !item.read && "bg-primary/[0.08]",
      )}
    >
      {/* Unread indicator — left border via pseudo element (full variant only;
          the compact variant uses the trailing dot below, per design v3). */}
      {!item.read && !compact && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary"
        />
      )}

      {/* Type icon */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[var(--edu-radius-card)]",
          compact ? "size-8" : "size-10",
          colorCls,
        )}
        aria-hidden="true"
      >
        <Icon className={compact ? "size-4" : "size-5"} />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              compact ? "line-clamp-2" : "line-clamp-1",
              item.read
                ? "font-normal text-foreground"
                : "font-bold text-foreground",
            )}
          >
            {titleText}
          </p>
          {!compact && (
            <time
              className="shrink-0 text-muted-foreground text-xs"
              dateTime={item.ts}
              title={item.ts}
            >
              {relativeTime(item.ts, "vi")}
            </time>
          )}
        </div>
        {compact ? (
          <time
            className="mt-0.5 block text-muted-foreground text-xs"
            dateTime={item.ts}
            title={item.ts}
          >
            {relativeTime(item.ts, "vi")}
          </time>
        ) : (
          <>
            <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
              {bodyText}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight",
                colorCls,
              )}
            >
              {t(typeLabelKey)}
            </span>
          </>
        )}
      </div>

      {/* Compact unread indicator — trailing dot (design v3 NotifDropdown). */}
      {!item.read && compact && (
        <span
          data-slot="notification-unread-dot"
          aria-hidden="true"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
        />
      )}
    </button>
  );
}
