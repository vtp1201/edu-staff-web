import { BookOpen, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { useFormatter } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import type { CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import { cn } from "@/shared/utils";
import { TONE_BG, TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

export interface CourseCardLabels {
  statusDraft: string;
  cta: string;
  /** Uppercase eyebrow of the "next deadline" block. */
  dueNext: string;
  /** `"<typeLabel> · hạn <date>"` — composed by the caller (i18n lives there). */
  dueLine: (type: string, date: string) => string;
  nothingDue: string;
  openCount: (count: number) => string;
  /** Shown instead of the count when THIS course's timeline read failed. */
  summaryError: string;
  /** Item type → human label (reuses `courses.player.itemType.*`). */
  itemType: Record<CourseItemType, string>;
}

export interface CourseCardProps {
  course: CourseCardVm;
  labels: CourseCardLabels;
}

/**
 * One course tile (US-E24.2 layout — `design_src/edu/course-items.jsx`
 * `StudentCoursesV2`, design-spec `student-course-timeline.courseCards`).
 *
 * The whole card is a single `<Link>` (a11y: no nested interactive elements),
 * so the CTA and the summary are non-interactive styled text inside it. Because
 * a link's `aria-label` overrides its whole subtree's accessible name, every
 * piece of information the card shows has to be folded into that one label or
 * it is never announced.
 *
 * Deadline urgency is a TONE PLUS A LABEL, never colour alone (WCAG 1.4.1): the
 * "Sắp đến hạn" eyebrow and the explicit date are present in both states.
 * WHETHER a deadline is urgent is decided server-side (`nextDue.dueSoon`); this
 * component only formats.
 *
 * The publish badge is DRAFT-only: a student's list is PUBLISHED-only, so a
 * "Đã xuất bản" badge on every card was noise the 0209 design removed — a DRAFT
 * row (reachable for a teacher-authored course the BE has not published) stays
 * labelled because that IS an anomaly worth showing.
 */
export function CourseCard({ course, labels }: CourseCardProps) {
  const format = useFormatter();
  const { nextDue } = course;

  const dueLine = nextDue
    ? labels.dueLine(
        labels.itemType[nextDue.itemType],
        format.dateTime(new Date(nextDue.dueAt), {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      )
    : null;

  const summaryText = course.itemsFailed
    ? labels.summaryError
    : labels.openCount(course.openCount ?? 0);

  const spokenDue = nextDue
    ? `${labels.dueNext}: ${nextDue.title} — ${dueLine}`
    : labels.nothingDue;

  return (
    <Card className="overflow-hidden p-0 shadow-card transition-shadow motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-card-hover">
      <Link
        href={course.href}
        aria-label={`${course.title} — ${spokenDue} — ${summaryText} — ${labels.cta}`}
        className="flex h-full flex-col rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className={cn("h-1.5", TONE_BG[course.tone])} aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-3 px-4.5 pt-4 pb-4.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="truncate font-extrabold text-base text-foreground">
                {course.title}
              </p>
              {course.status === "DRAFT" && (
                <span className="mt-1.5 inline-flex">
                  <StatusBadge tone="muted">{labels.statusDraft}</StatusBadge>
                </span>
              )}
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
                TONE_TINT[course.tone],
              )}
              aria-hidden="true"
            >
              <BookOpen
                className={cn("size-[18px]", TONE_TEXT_ACCESSIBLE[course.tone])}
              />
            </span>
          </div>

          {nextDue ? (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-[9px] border px-3 py-2.5",
                nextDue.dueSoon
                  ? "border-edu-warning/55 bg-edu-warning-light"
                  : "border-border bg-muted",
              )}
            >
              <Clock
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  nextDue.dueSoon
                    ? "text-edu-warning-text"
                    : "text-muted-foreground",
                )}
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-extrabold text-[10px] uppercase tracking-[0.06em]",
                    nextDue.dueSoon
                      ? "text-edu-warning-text"
                      : "text-muted-foreground",
                  )}
                >
                  {labels.dueNext}
                </p>
                <p className="mt-0.5 truncate font-bold text-[12.5px] text-foreground">
                  {nextDue.title}
                </p>
                <p className="mt-px text-[11px] text-edu-text-secondary">
                  {dueLine}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-[9px] bg-muted px-3 py-2.5 text-muted-foreground text-xs">
              {labels.nothingDue}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            {course.itemsFailed ? (
              // A failed timeline read is "unknown", not "zero" — showing `0
              // mục đang mở` here would be a confident lie.
              <span
                className="font-bold text-muted-foreground text-xs"
                title={labels.summaryError}
                aria-hidden="true"
              >
                —
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-bold text-edu-success-text text-xs">
                <span
                  className="size-[7px] rounded-full bg-edu-success-text"
                  aria-hidden="true"
                />
                {summaryText}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 font-bold text-xs",
                TONE_TEXT_ACCESSIBLE[course.tone],
              )}
            >
              {labels.cta}
              <ChevronRight
                className="size-3"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
