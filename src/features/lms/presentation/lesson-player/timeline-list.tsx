"use client";

import {
  BookOpen,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { useFormatter } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import type { CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import { cn } from "@/shared/utils";
import { type CourseTone, TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import type { TimelineItemVm } from "./lesson-player.i-vm";

const TYPE_ICON: Record<CourseItemType, LucideIcon> = {
  LESSON: BookOpen,
  ASSIGNMENT: ClipboardList,
  DOCUMENT: FileText,
  EXAM: GraduationCap,
};

/** BE-computed state → badge tone. `UPCOMING_HIDDEN` reaches a student only on
 *  an EXAM tile, where it means "scheduled, not started". */
const STATE_TONE: Record<TimelineItemVm["state"], StatusTone> = {
  OPEN: "success",
  CLOSED: "muted",
  UPCOMING_HIDDEN: "warning",
};

export interface TimelineListProps {
  items: TimelineItemVm[];
  activeLessonId: string | null;
  tone: CourseTone;
  onSelectLesson: (lessonId: string) => void;
  /** Pre-resolved route for an ASSIGNMENT tile (the assignments screen). */
  assignmentsHref: string;
  labels: {
    navAriaLabel: string;
    empty: string;
    type: Record<CourseItemType, string>;
    state: Record<TimelineItemVm["state"], string>;
    dueAt: (date: string) => string;
    noDueAt: string;
    openDocument: string;
    openAssignment: string;
    openExam: string;
    examDuration: (minutes: number) => string;
    activeStateLabel: string;
  };
}

/**
 * The course timeline. One flat, BE-ordered list of tiles — LESSON opens
 * inline, DOCUMENT/EXAM link out, ASSIGNMENT hands off to the assignments
 * screen (there is no per-assignment route in this story).
 */
export function TimelineList({
  items,
  activeLessonId,
  tone,
  onSelectLesson,
  assignmentsHref,
  labels,
}: TimelineListProps) {
  const format = useFormatter();

  if (items.length === 0) {
    return (
      <Card className="p-5 text-center text-edu-text-secondary text-sm shadow-card">
        {labels.empty}
      </Card>
    );
  }

  const fmt = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <nav aria-label={labels.navAriaLabel}>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.itemType];
          const active =
            item.itemType === "LESSON" && item.id === activeLessonId;
          const meta = (
            <>
              <span className="flex items-center gap-1.5">
                <StatusBadge tone={STATE_TONE[item.state]}>
                  {labels.state[item.state]}
                </StatusBadge>
                <span className="text-[10.5px] text-edu-text-secondary uppercase tracking-wide">
                  {labels.type[item.itemType]}
                </span>
              </span>
              <span className="text-edu-text-secondary text-xs">
                {item.dueAt ? labels.dueAt(fmt(item.dueAt)) : labels.noDueAt}
              </span>
            </>
          );

          const body = (
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
              <span className="font-bold text-foreground text-sm">
                {item.title}
              </span>
              {item.description && (
                <span className="text-edu-text-secondary text-xs">
                  {item.description}
                </span>
              )}
              {item.examDurationMinutes !== null && (
                <span className="text-edu-text-secondary text-xs">
                  {labels.examDuration(item.examDurationMinutes)}
                </span>
              )}
              <span className="flex flex-wrap items-center gap-2">{meta}</span>
            </span>
          );

          const iconBox = (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                TONE_TINT[tone],
              )}
              aria-hidden="true"
            >
              <Icon className={cn("size-4", TONE_TEXT_ACCESSIBLE[tone])} />
            </span>
          );

          // Min height 44px + full-row hit area keeps every tile a valid touch
          // target on mobile (WCAG 2.5.5).
          const rowClass = cn(
            "flex w-full items-start gap-3 rounded-[10px] border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "border-edu-primary bg-edu-primary/12"
              : "border-border bg-card hover:bg-edu-bg",
          );

          return (
            <li key={item.id}>
              {item.itemType === "LESSON" ? (
                <button
                  type="button"
                  className={rowClass}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelectLesson(item.id)}
                >
                  {iconBox}
                  {body}
                  {active && (
                    <span className="sr-only">{labels.activeStateLabel}</span>
                  )}
                </button>
              ) : item.itemType === "ASSIGNMENT" ? (
                <a href={assignmentsHref} className={rowClass}>
                  {iconBox}
                  {body}
                  <span className="sr-only">{labels.openAssignment}</span>
                </a>
              ) : item.url || item.examUrl ? (
                <a
                  href={item.url ?? item.examUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass}
                >
                  {iconBox}
                  {body}
                  <ExternalLink
                    className="mt-0.5 size-3.5 shrink-0 text-edu-text-secondary"
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    {item.itemType === "DOCUMENT"
                      ? labels.openDocument
                      : labels.openExam}
                  </span>
                </a>
              ) : (
                // EXAM with no configured deep link — BE says a client must
                // handle its absence, so the tile stays informational.
                <div className={cn(rowClass, "cursor-default")}>
                  {iconBox}
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
