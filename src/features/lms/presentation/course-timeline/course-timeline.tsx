"use client";

import { BookOpen, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import { CourseHeader } from "./course-header";
import type {
  CourseTimelineActions,
  CourseTimelineVm,
  WeekVm,
} from "./course-timeline.i-vm";
import { WeekSection } from "./week-section";

export interface CourseTimelineProps {
  vm: CourseTimelineVm;
  actions: CourseTimelineActions;
  /** Pre-resolved route an ASSIGNMENT row hands off to. */
  assignmentsHref: string;
}

/**
 * `/student/courses/[courseId]` — ONE vertical timeline grouped by week
 * (US-E24.3, design-spec `student-course-timeline.timeline`).
 *
 * The only stateful component in the tree: it owns which row is expanded
 * (shared across siblings — opening one closes the other) and the retry copy of
 * the timeline data. Everything below is presentational.
 *
 * A failed TIMELINE read degrades independently of the course read: the header
 * still renders, and "Thử lại" re-runs just that read through a Server Action.
 * That is a single one-shot re-read, not a cache — no TanStack Query involved.
 */
export function CourseTimeline({
  vm,
  actions,
  assignmentsHref,
}: CourseTimelineProps) {
  if (vm.mode !== "student") {
    // A loud failure beats a half-rendered teacher view: the teacher/read-only
    // affordances (drag-reorder, inline date edit, add item) are US-E24.10.
    throw new Error(
      `CourseTimeline: mode "${vm.mode}" is not implemented yet (US-E24.10)`,
    );
  }
  return (
    <StudentTimeline
      vm={vm}
      actions={actions}
      assignmentsHref={assignmentsHref}
    />
  );
}

function StudentTimeline({
  vm,
  actions,
  assignmentsHref,
}: CourseTimelineProps) {
  const t = useTranslations("courses");
  const [weeks, setWeeks] = useState<WeekVm[]>(vm.weeks);
  const [openCount, setOpenCount] = useState(vm.openCount);
  const [errorKey, setErrorKey] = useState<LmsFailure["type"] | null>(
    vm.errorKey,
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  // A plain boolean, not `useTransition`: an async transition can leave
  // `isPending` stuck true after a post-await setState, which would freeze the
  // retry button permanently (US-E21.2).
  const [isRetrying, setIsRetrying] = useState(false);

  async function retry() {
    setIsRetrying(true);
    try {
      const res = await actions.retryListItems();
      if (res.ok) {
        setWeeks(res.data.weeks);
        setOpenCount(res.data.openCount);
        setErrorKey(null);
        setExpandedItemId(null);
      } else {
        setErrorKey(res.errorKey);
      }
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CourseHeader
        courseName={vm.courseName}
        tone={vm.tone}
        openCount={openCount}
      />

      {errorKey && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/40 bg-edu-error-light px-4 py-3"
        >
          <p className="min-w-0 flex-1 font-semibold text-edu-error-text text-sm">
            {t(`errors.${errorKey}`)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void retry()}
            disabled={isRetrying}
          >
            <RotateCw
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {t("timeline.retry")}
          </Button>
        </div>
      )}

      <div className="rounded-[var(--edu-radius-card)] border border-border bg-card px-3 pt-1 pb-4 shadow-card sm:px-5">
        {weeks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t("timeline.emptyTitle")}
            body={t("timeline.empty")}
          />
        ) : (
          <nav aria-label={t("timeline.navLabel")}>
            {weeks.map((week, index) => (
              <WeekSection
                key={week.key}
                week={week}
                expandedItemId={expandedItemId}
                onToggleExpand={(itemId) =>
                  setExpandedItemId((current) =>
                    current === itemId ? null : itemId,
                  )
                }
                getLesson={actions.getLesson}
                assignmentsHref={assignmentsHref}
                isLastWeek={index === weeks.length - 1}
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
