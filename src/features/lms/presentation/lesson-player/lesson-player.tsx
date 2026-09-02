"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { LessonPlayerActions, LessonPlayerVm } from "./lesson-player.i-vm";
import { PlayerBreadcrumb } from "./player-breadcrumb";
import { TextContent } from "./text-content";
import { TimelineList } from "./timeline-list";

const lessonKey = (lessonId: string) => ["lms", "lesson", lessonId] as const;

export interface LessonPlayerProps {
  vm: LessonPlayerVm;
  actions: LessonPlayerActions;
  /** Pre-resolved route an ASSIGNMENT tile hands off to. */
  assignmentsHref: string;
}

/**
 * `/student/courses/[courseId]` — the course timeline plus an inline reader for
 * the selected LESSON tile.
 *
 * US-E24.1 rebuilt this from the real contract: the notes panel, the Q&A panel,
 * the mark-complete button, the progress card and the video/PDF players are all
 * gone — none of them had an endpoint, and four of the five never will (the
 * completion pair is BE US-254 DRAFT, ADR 0076). A LESSON body is fetched
 * lazily because the list endpoint omits `content` by design.
 */
export function LessonPlayer({
  vm,
  actions,
  assignmentsHref,
}: LessonPlayerProps) {
  const t = useTranslations("courses");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    vm.initialLessonId,
  );

  const lessonQuery = useQuery({
    queryKey: activeLessonId
      ? lessonKey(activeLessonId)
      : ["lms", "lesson", "none"],
    queryFn: async () => {
      if (!activeLessonId) return null;
      const res = await actions.getLesson(activeLessonId);
      if (!res.ok) throw new Error(res.errorKey);
      return res.data;
    },
    enabled: Boolean(activeLessonId),
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const lesson = lessonQuery.data ?? null;
  const lessonName = lesson ? lesson.title : t("player.breadcrumb.pickLesson");

  return (
    <div className="flex flex-col gap-4">
      <PlayerBreadcrumb
        courseName={vm.courseName}
        coursesHref={vm.coursesListHref}
        lessonName={lessonName}
        coursesLabel={t("player.breadcrumb.coursesLink")}
        navLabel={t("player.breadcrumb.navLabel")}
      />

      {vm.errorKey && (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${vm.errorKey}`)}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* LEFT — the selected lesson's body */}
        <div className="flex flex-col overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          {/* Announce lesson switches to SR users without stealing focus. */}
          <span className="sr-only" aria-live="polite" role="status">
            {lesson ? t("a11y.lessonChanged", { title: lesson.title }) : ""}
          </span>

          <div className="px-5 pt-3.5 pb-3">
            <h1 className="font-extrabold text-[17px] text-foreground">
              {lessonName}
            </h1>
            {!activeLessonId && vm.courseDescription && (
              <p className="mt-1.5 whitespace-pre-line text-edu-text-secondary text-sm leading-relaxed">
                {vm.courseDescription}
              </p>
            )}
          </div>

          {activeLessonId === null ? (
            <EmptyState
              icon={BookOpen}
              title={t("player.content.empty.title")}
              body={t("player.content.empty.body")}
            />
          ) : lessonQuery.isPending ? (
            <div className="space-y-2.5 px-7 py-6" aria-hidden="true">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>
          ) : lessonQuery.isError || lesson === null ? (
            <p role="alert" className="px-7 py-6 text-edu-error-text text-sm">
              {t("player.content.loadError")}
            </p>
          ) : (
            <TextContent content={lesson.content} />
          )}
        </div>

        {/* RIGHT — the course timeline */}
        <aside>
          <TimelineList
            items={vm.items}
            activeLessonId={activeLessonId}
            tone={vm.tone}
            onSelectLesson={setActiveLessonId}
            assignmentsHref={assignmentsHref}
            labels={{
              navAriaLabel: t("player.timeline.navAriaLabel"),
              empty: t("player.timeline.empty"),
              type: {
                LESSON: t("player.itemType.lesson"),
                ASSIGNMENT: t("player.itemType.assignment"),
                DOCUMENT: t("player.itemType.document"),
                EXAM: t("player.itemType.exam"),
              },
              state: {
                OPEN: t("player.itemState.open"),
                CLOSED: t("player.itemState.closed"),
                UPCOMING_HIDDEN: t("player.itemState.upcoming"),
              },
              dueAt: (date) => t("player.timeline.dueAt", { date }),
              noDueAt: t("player.timeline.noDueAt"),
              openDocument: t("player.timeline.openDocument"),
              openAssignment: t("player.timeline.openAssignment"),
              openExam: t("player.timeline.openExam"),
              examDuration: (minutes) =>
                t("player.timeline.examDuration", { minutes }),
              activeStateLabel: t("a11y.activeLessonState"),
            }}
          />
        </aside>
      </div>
    </div>
  );
}
