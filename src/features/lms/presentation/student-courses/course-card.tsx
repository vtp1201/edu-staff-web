import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils";
import { TONE_BG, TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

export interface CourseCardProps {
  course: CourseCardVm;
  labels: {
    statusPublished: string;
    statusDraft: string;
    cta: string;
  };
}

/**
 * One course tile. Whole card is a single `<Link>` (a11y: no nested
 * interactive elements); the CTA is non-interactive styled text inside it.
 *
 * Shows only what the contract actually carries — title + publish status.
 */
export function CourseCard({ course, labels }: CourseCardProps) {
  const published = course.status === "PUBLISHED";
  const statusLabel = published ? labels.statusPublished : labels.statusDraft;

  return (
    <Card className="overflow-hidden p-0 shadow-card transition-shadow motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-card-hover">
      <Link
        href={course.href}
        aria-label={`${course.title} — ${labels.cta}`}
        className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className={cn("h-2", TONE_BG[course.tone])} />
        <div className="flex flex-col gap-3.5 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-extrabold text-base text-foreground">
              {course.title}
            </p>
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

          <div>
            <StatusBadge tone={published ? "success" : "muted"}>
              {statusLabel}
            </StatusBadge>
          </div>

          <span
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-current bg-card px-3 py-2 font-bold text-xs",
              TONE_TEXT_ACCESSIBLE[course.tone],
            )}
          >
            {labels.cta}
            <ArrowRight
              className="size-3"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </Card>
  );
}
