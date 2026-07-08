import { BookOpen, Play, Plus } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/shared/utils";
import { TONE_BG, TONE_TEXT, TONE_TINT } from "../tone";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

export interface CourseCardProps {
  course: CourseCardVm;
  labels: {
    gradeLabel: string;
    lessonsLabel: string;
    progressLabel: string;
    progressAria: string; // "Tiến độ {pct}%" already interpolated
    ctaStart: string;
    ctaContinue: string;
  };
}

/**
 * Whole card is a single `<Link>` (a11y: no nested interactive elements). The
 * CTA renders as non-interactive styled text inside the link — clicking the CTA
 * and clicking the card both navigate to the same course (fe-lead decision).
 */
export function CourseCard({ course, labels }: CourseCardProps) {
  const started = course.status !== "not-started";
  const CtaIcon = started ? Play : Plus;
  const ctaText = started ? labels.ctaContinue : labels.ctaStart;

  return (
    <Card className="overflow-hidden p-0 shadow-card transition-shadow motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-card-hover">
      <Link
        href={course.href}
        className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className={cn("h-2", TONE_BG[course.tone])} />
        <div className="flex flex-col gap-3.5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-extrabold text-base text-foreground">
                {course.name}
              </p>
              <p className="mt-0.5 truncate text-edu-text-secondary text-xs">
                {course.teacherName}
              </p>
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
                TONE_TINT[course.tone],
              )}
              aria-hidden="true"
            >
              <BookOpen className={cn("size-[18px]", TONE_TEXT[course.tone])} />
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 rounded-[7px] bg-edu-bg px-2.5 py-2 text-center">
              <div
                className={cn(
                  "font-extrabold text-[15px]",
                  TONE_TEXT[course.tone],
                )}
              >
                {course.gradeAvg ?? "—"}
              </div>
              <div className="text-[10px] text-edu-text-secondary">
                {labels.gradeLabel}
              </div>
            </div>
            <div className="flex-1 rounded-[7px] bg-edu-bg px-2.5 py-2 text-center">
              <div className="font-extrabold text-[15px] text-foreground tabular-nums">
                {course.lessonsDone}/{course.lessonsTotal}
              </div>
              <div className="text-[10px] text-edu-text-secondary">
                {labels.lessonsLabel}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-edu-text-secondary text-xs">
                {labels.progressLabel}
              </span>
              <span className={cn("font-bold text-xs", TONE_TEXT[course.tone])}>
                {course.progressPct}%
              </span>
            </div>
            <Progress
              value={course.progressPct}
              indicatorClassName={TONE_BG[course.tone]}
              aria-label={labels.progressAria}
            />
          </div>

          <span
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2 font-bold text-xs",
              started
                ? cn("border-current bg-card", TONE_TEXT[course.tone])
                : cn("border-transparent text-white", TONE_BG[course.tone]),
            )}
          >
            <CtaIcon className="size-3" strokeWidth={2.4} aria-hidden="true" />
            {ctaText}
          </span>
        </div>
      </Link>
    </Card>
  );
}
