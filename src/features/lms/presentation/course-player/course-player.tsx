"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import { formatItemWindow } from "@/features/lms/domain/use-cases/format-item-window";
import { BodyAssignment } from "./body-assignment";
import { BodyDocument } from "./body-document";
import { BodyExam } from "./body-exam";
import { BodyLesson } from "./body-lesson";
import { BodyLocked } from "./body-locked";
import { ClosedBanner } from "./closed-banner";
import { ContentPanel } from "./content-panel";
import type {
  ActiveItemVm,
  CoursePlayerVm,
  SubmitAssignmentFn,
} from "./course-player.i-vm";
import { PlayerHeader } from "./player-header";

const TYPE_LABEL_KEY = {
  LESSON: "lesson",
  ASSIGNMENT: "assignment",
  DOCUMENT: "document",
  EXAM: "exam",
} as const satisfies Record<CourseItemType, string>;

const OVERVIEW_KEY = {
  lesson: "overview.lesson",
  document: "overview.document",
  assignment: "overview.assignment",
  exam: "overview.exam",
} as const;

export interface CoursePlayerProps {
  vm: CoursePlayerVm;
  /** Bound to the active assignment by the route; `null` for every other kind
   *  and whenever the assignment read failed (no one-way action on unknown
   *  state). */
  submitAssignment: SubmitAssignmentFn | null;
}

/** The item type a "locked" member stands for (its own field) vs its kind. */
function itemTypeOf(item: ActiveItemVm): CourseItemType {
  switch (item.kind) {
    case "lesson":
      return "LESSON";
    case "document":
      return "DOCUMENT";
    case "assignment":
      return "ASSIGNMENT";
    case "exam":
      return "EXAM";
    case "locked":
      return item.itemType;
  }
}

/**
 * `/student/courses/[courseId]/items/[itemId]` — the course player (US-E24.5).
 *
 * Content pane on the left, the course's other items on the right. All data is
 * RSC-derived and arrives as ONE ViewModel; the only client state in the whole
 * tree lives inside `submit-box.tsx` (the submit lifecycle) and
 * `content-panel.tsx` (week collapse).
 *
 * The body is chosen by a single `switch` on the union's `kind` — no leaf
 * component re-checks the item type at runtime, and adding a type later is a
 * compile error here rather than a silently missing branch.
 */
export function CoursePlayer({ vm, submitAssignment }: CoursePlayerProps) {
  const t = useTranslations("courses.player");
  const tTimeline = useTranslations("courses.timeline");
  const tErrors = useTranslations("courses.errors");
  const format = useFormatter();

  const item = vm.activeItem;
  const itemType = itemTypeOf(item);

  const window = formatItemWindow(
    item.kind === "locked"
      ? { startAt: item.opensAt, dueAt: null }
      : { startAt: item.startAt, dueAt: item.dueAt },
    (date) =>
      format.dateTime(date, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
  );
  const windowText =
    window.kind === "range"
      ? tTimeline("window.range", {
          start: window.startText,
          due: window.dueText,
        })
      : window.kind === "from"
        ? tTimeline("window.from", { start: window.startText })
        : window.kind === "due"
          ? tTimeline("window.due", { due: window.dueText })
          : tTimeline("window.always");

  const flat = vm.weeks.flatMap((week) => week.items);
  const activeIndex = flat.findIndex((row) => row.id === vm.activeItemId);

  const showClosedBanner =
    (item.kind === "lesson" || item.kind === "document") &&
    item.state === "CLOSED";

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("breadcrumbLabel")}
        className="flex flex-wrap items-center gap-1.5 text-[12.5px]"
      >
        <Link
          href={vm.courseHref}
          className="inline-flex min-h-11 items-center gap-1 rounded font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft
            className="size-3"
            strokeWidth={2.3}
            aria-hidden="true"
          />
          {vm.courseName}
        </Link>
        <ChevronRight
          className="size-3 text-muted-foreground"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <span aria-current="page" className="font-bold text-foreground">
          {item.title}
        </span>
      </nav>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <PlayerHeader
            itemType={itemType}
            title={item.title}
            typeWindowLabel={`${tTimeline(
              `itemType.${TYPE_LABEL_KEY[itemType]}`,
            )} · ${windowText}`}
            state={item.kind === "locked" ? "UPCOMING_HIDDEN" : item.state}
            examLocked={item.kind === "locked"}
          />

          {showClosedBanner && <ClosedBanner />}

          {vm.activeItemErrorKey !== null && (
            <p
              role="alert"
              className="mx-4 mb-2.5 rounded-lg border border-edu-error/40 bg-edu-error-light px-3 py-2.5 font-semibold text-edu-error-text text-xs sm:mx-5"
            >
              {tErrors(vm.activeItemErrorKey)}
            </p>
          )}

          {(() => {
            switch (item.kind) {
              case "lesson":
                return <BodyLesson item={item} />;
              case "document":
                return <BodyDocument item={item} />;
              case "assignment":
                return (
                  <BodyAssignment
                    item={item}
                    submitAssignment={submitAssignment}
                  />
                );
              case "exam":
                return <BodyExam item={item} />;
              case "locked":
                return <BodyLocked item={item} />;
            }
          })()}

          <section className="border-border border-t px-4 py-4 sm:px-5">
            <h2 className="mb-2 font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.07em]">
              {t("overview.title")}
            </h2>
            <p className="text-edu-text-secondary text-sm leading-relaxed">
              {/* A locked item still describes what it IS (an exam), so the
                  overview follows its type rather than its locked-ness. */}
              {t(
                OVERVIEW_KEY[
                  item.kind === "locked" ? TYPE_LABEL_KEY[itemType] : item.kind
                ],
              )}
            </p>
            <p className="mt-2 text-muted-foreground text-xs tabular-nums">
              {t("overview.window", { window: windowText })}
            </p>
          </section>
        </div>

        <ContentPanel
          weeks={vm.weeks}
          itemHrefBase={`${vm.courseHref}/items`}
          activeItemId={vm.activeItemId}
          activeIndex={activeIndex + 1}
          totalItems={flat.length}
          prevHref={vm.prevHref}
          nextHref={vm.nextHref}
        />
      </div>
    </div>
  );
}
