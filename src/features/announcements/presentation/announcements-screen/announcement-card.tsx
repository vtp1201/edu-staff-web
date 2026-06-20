"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type {
  AnnouncementEntity,
  AnnouncementPriority,
  AnnouncementStatus,
} from "../../domain/entities/announcement.entity";

const PRIORITY_TONE: Record<AnnouncementPriority, StatusTone> = {
  normal: "muted",
  important: "warning",
  urgent: "error",
};

const STATUS_TONE: Record<AnnouncementStatus, StatusTone> = {
  draft: "muted",
  scheduled: "warning",
  sent: "success",
};

/**
 * Urgent card emphasis. DR-009 US-E16.1: side-stripe ban — an urgent
 * announcement is highlighted with a full 1px border + bg tint, not a
 * one-sided accent stripe.
 */
export function urgentCardClass(isUrgent: boolean): string {
  return isUrgent ? "border border-edu-error/30 bg-edu-error/10" : "";
}

export interface AnnouncementCardProps {
  item: AnnouncementEntity;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementCard({
  item,
  onView,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  const t = useTranslations("announcements");
  const isUrgent = item.priority === "urgent";
  const readPct =
    item.recipientCount > 0
      ? Math.round((item.readCount / item.recipientCount) * 100)
      : 0;
  const isDraft = item.status === "draft";

  return (
    <article
      aria-label={
        isUrgent ? t("urgentCardAriaLabel", { title: item.title }) : undefined
      }
      className={cn(
        "flex flex-col gap-3 rounded-[var(--edu-radius-card)] bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover",
        urgentCardClass(isUrgent),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={PRIORITY_TONE[item.priority]}>
            {t(`priority${cap(item.priority)}` as PriorityKey)}
          </StatusBadge>
          <StatusBadge tone={STATUS_TONE[item.status]}>
            {t(`status${cap(item.status)}` as StatusKey)}
          </StatusBadge>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {item.sentAt ?? item.scheduledAt ?? item.createdAt}
        </span>
      </div>

      <h3 className="line-clamp-2 font-bold text-card-foreground text-sm">
        {item.title}
      </h3>
      <p className="line-clamp-2 text-muted-foreground text-sm">{item.body}</p>

      <div className="flex flex-wrap gap-1.5">
        {item.audience.map((a) => (
          <span
            key={a}
            className="rounded-full bg-muted px-2.5 py-0.5 text-foreground text-xs"
          >
            {t(`audience${cap(a)}` as AudienceKey)}
          </span>
        ))}
        {item.gradeFilter.map((g) => (
          <span
            key={g}
            className="rounded-full bg-primary/12 px-2.5 py-0.5 text-edu-text-primary text-xs"
          >
            {g}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>{t("recipientCount", { count: item.recipientCount })}</span>
          <span>
            {t("readRatio", {
              read: item.readCount,
              total: item.recipientCount,
            })}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={readPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("readProgressLabel", { pct: readPct })}
        >
          <div
            className="h-full w-full origin-left rounded-full bg-edu-success-text motion-safe:transition-[transform] motion-safe:duration-500"
            style={{ transform: `scaleX(${readPct / 100})` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 pt-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("actionView")}
          onClick={() => onView(item.id)}
        >
          <Eye className="size-4" aria-hidden="true" />
        </Button>
        {isDraft && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("actionEdit")}
            onClick={() => onEdit(item.id)}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("actionDelete")}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="size-4 text-edu-error" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

type PriorityKey = "priorityNormal" | "priorityImportant" | "priorityUrgent";
type StatusKey = "statusDraft" | "statusScheduled" | "statusSent";
type AudienceKey =
  | "audienceAll"
  | "audienceTeachers"
  | "audienceParents"
  | "audienceStudents";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
