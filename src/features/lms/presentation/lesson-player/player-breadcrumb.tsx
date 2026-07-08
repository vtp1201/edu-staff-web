import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface PlayerBreadcrumbProps {
  courseName: string;
  coursesHref: string;
  lessonName: string;
  coursesLabel: string;
  /** Describes the nav's PURPOSE (e.g. "Breadcrumb") — not the link text. */
  navLabel: string;
}

/** Static breadcrumb trail: Courses ‹back› › Course › Lesson. Feature-local. */
export function PlayerBreadcrumb({
  courseName,
  coursesHref,
  lessonName,
  coursesLabel,
  navLabel,
}: PlayerBreadcrumbProps) {
  return (
    <nav
      aria-label={navLabel}
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <Link
        href={coursesHref}
        className="inline-flex items-center gap-1 rounded-sm font-semibold text-edu-text-secondary outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-3" strokeWidth={2.3} aria-hidden="true" />
        {coursesLabel}
      </Link>
      <ChevronRight
        className="size-3 text-edu-text-secondary"
        aria-hidden="true"
      />
      <span className="font-semibold text-edu-text-secondary">
        {courseName}
      </span>
      <ChevronRight
        className="size-3 text-edu-text-secondary"
        aria-hidden="true"
      />
      <span className="font-bold text-foreground">{lessonName}</span>
    </nav>
  );
}
