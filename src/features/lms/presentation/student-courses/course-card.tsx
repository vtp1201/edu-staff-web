import { AlertTriangle, BookOpen, ChevronRight, Clock } from "lucide-react";
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
  /** Short chip shown next to the eyebrow when the deadline is inside 48h —
   *  the non-colour channel that carries urgency (WCAG 1.4.1). */
  dueSoonBadge: string;
  /** `"<typeLabel> · hạn <date>"` — composed by the caller (i18n lives there). */
  dueLine: (type: string, date: string) => string;
  nothingDue: string;
  openCount: (count: number) => string;
  /** Shown instead of the count when THIS course's timeline read failed. */
  summaryError: string;
  /** Item type → human label (reuses `courses.timeline.itemType.*`). */
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
 * Deadline urgency never rides on colour alone (WCAG 1.4.1). The warning tone is
 * the THIRD channel, behind two colour-independent ones: the icon changes
 * (clock → warning triangle) and a short "Gấp" chip appears next to the eyebrow.
 * That chip is also folded into `spokenDue`, so a screen-reader user — who gets
 * only the link's `aria-label` — hears the urgency word too. WHETHER a deadline
 * is urgent is decided server-side (`nextDue.dueSoon`); this component formats.
 *
 * Eyebrow text stays `text-foreground`/`text-muted-foreground` rather than
 * `text-edu-warning-text`: at 10px/uppercase it is not "large text", so it needs
 * ≥4.5:1 and the warning text token only reaches 4.37:1 on the warning tint. The
 * warning identity lives in the icon, border and background instead.
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

  const dueEyebrow = nextDue?.dueSoon
    ? `${labels.dueNext} (${labels.dueSoonBadge})`
    : labels.dueNext;

  const spokenDue = nextDue
    ? `${dueEyebrow}: ${nextDue.title} — ${dueLine}`
    : labels.nothingDue;

  // The link's aria-label replaces its whole subtree, so the DRAFT badge is
  // invisible to AT unless it is spelled out here.
  const spokenStatus =
    course.status === "DRAFT" ? ` — ${labels.statusDraft}` : "";

  const DueIcon = nextDue?.dueSoon ? AlertTriangle : Clock;

  return (
    <Card className="overflow-hidden p-0 shadow-card transition-shadow motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-card-hover">
      <Link
        href={course.href}
        aria-label={`${course.title}${spokenStatus} — ${spokenDue} — ${summaryText} — ${labels.cta}`}
        // `ring-inset`: the Card clips overflow and the link fills it exactly,
        // so an outward ring would be cut off (WCAG 2.4.7).
        className="flex h-full flex-col rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
              <DueIcon
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
                    "flex flex-wrap items-center gap-1.5 font-extrabold text-[10px] uppercase tracking-[0.06em]",
                    nextDue.dueSoon
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <span>{labels.dueNext}</span>
                  {nextDue.dueSoon && (
                    <span className="rounded-full bg-edu-warning px-1.5 py-px text-[10px] text-edu-warning-foreground leading-[1.4]">
                      {labels.dueSoonBadge}
                    </span>
                  )}
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
              // mục đang mở` here would be a confident lie. The reason is
              // spelled out in visible text: a `title` tooltip does not exist
              // on touch and is unreliable on keyboard focus.
              <span className="min-w-0 flex-1 font-bold text-[11px] text-muted-foreground leading-tight">
                {labels.summaryError}
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
                "inline-flex shrink-0 items-center gap-1 font-bold text-xs",
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
