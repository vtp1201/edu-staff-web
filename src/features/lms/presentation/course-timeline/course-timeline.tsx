"use client";

import { BookOpen, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import { buildReorderedItemIds } from "@/features/lms/domain/use-cases/build-reordered-item-ids";
import { cn } from "@/shared/utils";
import { AddItemMenu } from "../teacher-course-tab/add-item-menu";
import { CourseHeader } from "./course-header";
import type {
  CourseTimelineActions,
  CourseTimelineVm,
  TimelineItemVm,
  WeekVm,
} from "./course-timeline.i-vm";
import type { TimelineRowProps } from "./timeline-row";
import { WeekSection } from "./week-section";

export interface CourseTimelineProps {
  vm: CourseTimelineVm;
  actions: CourseTimelineActions;
  /** `/…/courses/<id>/items` — the base every row links into (US-E24.5). */
  itemHrefBase: string;
}

/**
 * `/student/courses/[courseId]` — ONE vertical timeline grouped by week
 * (US-E24.3, design-spec `student-course-timeline.timeline`).
 *
 * The only stateful component in the tree: it owns the retry copy of the
 * timeline data. Everything below is presentational — a row is a plain link
 * into the course player (US-E24.5), so no row state exists.
 *
 * A failed TIMELINE read degrades independently of the course read: the header
 * still renders, and "Thử lại" re-runs just that read through a Server Action.
 * That is a single one-shot re-read, not a cache — no TanStack Query involved.
 */
export function CourseTimeline({
  vm,
  actions,
  itemHrefBase,
}: CourseTimelineProps) {
  if (vm.mode === "student") {
    return (
      <StudentTimeline vm={vm} actions={actions} itemHrefBase={itemHrefBase} />
    );
  }
  return (
    <StaffTimeline vm={vm} actions={actions} itemHrefBase={itemHrefBase} />
  );
}

function StudentTimeline({ vm, actions, itemHrefBase }: CourseTimelineProps) {
  const t = useTranslations("courses");
  const [weeks, setWeeks] = useState<WeekVm[]>(vm.weeks);
  const [openCount, setOpenCount] = useState(vm.openCount);
  const [errorKey, setErrorKey] = useState<LmsFailure["type"] | null>(
    vm.errorKey,
  );
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
          // Not a `<nav>`: each week already exposes its own labelled
          // `<section>`, and a second landmark around them would only add
          // noise for a screen-reader user walking the page.
          <div>
            {weeks.map((week, index) => (
              <WeekSection
                key={week.key}
                week={week}
                itemHrefBase={itemHrefBase}
                isLastWeek={index === weeks.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Teacher and read-only share ONE branch, because they differ only in which
 * affordances mount — the rows, the rail, the week grouping and the header are
 * the same view of the same data. Forking them would double the surface a
 * design change has to be applied to.
 *
 * It owns exactly one piece of state: which row is currently being dragged
 * over. Items, ordering and every mutation live above, in the tab that owns
 * the query cache — this component reports intent and renders what comes back.
 */
function StaffTimeline({ vm, actions, itemHrefBase }: CourseTimelineProps) {
  const t = useTranslations("courses");
  const tt = useTranslations("courses.teacher");
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  // Seeded from the RSC read and then owned here, exactly like the student
  // branch: the parent's cache re-supplies WEEKS on a successful re-read, but
  // nothing else would ever clear a stale error banner.
  const [errorKey, setErrorKey] = useState<LmsFailure["type"] | null>(
    vm.errorKey,
  );

  const isTeacher = vm.mode === "teacher";
  const orderedIds = vm.teacher?.orderedItemIds ?? [];
  const deletable = new Set(vm.teacher?.deletableItemIds ?? []);

  async function retry() {
    setIsRetrying(true);
    try {
      const res = await actions.retryListItems();
      // Only the ERROR is read here — the rows themselves arrive as new props
      // from whoever owns the timeline data above.
      setErrorKey(res.ok ? null : res.errorKey);
    } finally {
      setIsRetrying(false);
    }
  }

  /** Both interaction paths end here, with the COMPLETE new ordering. */
  function reorder(sourceId: string, targetId: string) {
    if (!actions.reorderItems || sourceId === targetId) return;
    const from = orderedIds.indexOf(sourceId);
    const to = orderedIds.indexOf(targetId);
    if (from === -1 || to === -1) return;
    // Dropping ONTO a row means "take its place": coming from above that is
    // after the target, coming from below it is before.
    const position = from < to ? "after" : "before";
    void actions.reorderItems(
      buildReorderedItemIds(orderedIds, sourceId, targetId, position),
    );
  }

  function moveBy(itemId: string, delta: -1 | 1) {
    const index = orderedIds.indexOf(itemId);
    const neighbour = orderedIds[index + delta];
    if (neighbour === undefined) return;
    reorder(itemId, neighbour);
  }

  const teacherRowProps = isTeacher
    ? (item: TimelineItemVm): Partial<TimelineRowProps> => {
        const index = orderedIds.indexOf(item.id);
        return {
          interactive: false,
          editable: true,
          isDropTarget: dragOverId === item.id && dragSourceId !== item.id,
          onDragStartItem: () => setDragSourceId(item.id),
          onDragEnterItem: () => setDragOverId(item.id),
          onDragEndItem: () => {
            setDragSourceId(null);
            setDragOverId(null);
          },
          onDropItem: () => {
            if (dragSourceId) reorder(dragSourceId, item.id);
            setDragSourceId(null);
            setDragOverId(null);
          },
          canMoveUp: index > 0,
          canMoveDown: index !== -1 && index < orderedIds.length - 1,
          onMoveUp: () => moveBy(item.id, -1),
          onMoveDown: () => moveBy(item.id, 1),
          onSaveWindow: actions.patchItemWindow
            ? (input) =>
                actions.patchItemWindow?.(item.id, input) ??
                Promise.resolve({ ok: true as const })
            : undefined,
          onDelete:
            actions.requestDeleteItem && deletable.has(item.id)
              ? () => actions.requestDeleteItem?.(item.id)
              : undefined,
        };
      }
    : (): Partial<TimelineRowProps> => ({ interactive: false });

  return (
    <div className="flex flex-col gap-4">
      <CourseHeader
        courseName={vm.courseName}
        tone={vm.tone}
        openCount={vm.openCount}
      />

      <p
        className={cn(
          "rounded-[var(--edu-radius-card)] border px-4 py-2.5 font-semibold text-[12px]",
          isTeacher
            ? "border-border bg-card text-muted-foreground"
            : "border-edu-warning/40 bg-edu-warning-light text-foreground",
        )}
      >
        {isTeacher ? tt("modeBanner") : tt("readonlyPill")}
      </p>

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
        {vm.weeks.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4">
            <EmptyState
              icon={BookOpen}
              title={t("timeline.emptyTitle")}
              body={t("timeline.empty")}
            />
            {/* An empty course is exactly where a teacher needs the add menu
                most, so it mounts here too — anchored to no week, which makes
                the new item un-windowed ("Luôn mở") unless they set a date. */}
            {isTeacher && actions.requestAddItem && vm.teacher && (
              <AddItemMenu
                weekStart={null}
                onSelectKind={actions.requestAddItem}
                examBankHref={vm.teacher.examBankHref}
              />
            )}
          </div>
        ) : (
          <div>
            {vm.weeks.map((week, index) => (
              <WeekSection
                key={week.key}
                week={week}
                itemHrefBase={itemHrefBase}
                isLastWeek={index === vm.weeks.length - 1}
                onSelectAddItemKind={
                  isTeacher ? actions.requestAddItem : undefined
                }
                examBankHref={vm.teacher?.examBankHref}
                teacherRowProps={teacherRowProps}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
