// TEMP (US-E24.3): inline expand until US-E24.5 ships
// `/student/courses/[courseId]/items/[itemId]` — remove this file and route
// TimelineRow clicks to a real href instead. Every `courses.timeline.itemDetail.*`
// message key exists only for this file and dies with it.
"use client";

import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type {
  CourseTimelineActions,
  TimelineItemVm,
} from "./course-timeline.i-vm";
import { TextContent } from "./text-content";

export interface ItemDetailProps {
  item: TimelineItemVm;
  getLesson: CourseTimelineActions["getLesson"];
  /** Where an ASSIGNMENT row hands off to (submission lives there today). */
  assignmentsHref: string;
}

type LessonState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; content: string };

/**
 * What an expanded row shows. Read-only by design: submitting work, launching a
 * proctored exam and the assignment drop zone are US-E24.5/E24.10 scope, so
 * this only surfaces content the student can already reach today.
 */
export function ItemDetail({
  item,
  getLesson,
  assignmentsHref,
}: ItemDetailProps) {
  const t = useTranslations("courses");
  const closed = item.state === "CLOSED";

  const closedNote = closed ? (
    <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 font-semibold text-edu-text-secondary text-xs">
      <Lock
        className="size-3.5 shrink-0"
        strokeWidth={2.2}
        aria-hidden="true"
      />
      {t("timeline.itemDetail.closedNote")}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-2.5">
      {closedNote}
      {item.itemType === "LESSON" ? (
        <LessonBody item={item} getLesson={getLesson} />
      ) : item.itemType === "DOCUMENT" ? (
        <>
          <p className="text-edu-text-secondary text-xs leading-relaxed">
            {item.description ?? t("timeline.itemDetail.document.explainer")}
          </p>
          {item.url ? (
            <ExternalChip
              href={item.url}
              label={t("timeline.itemDetail.document.open")}
              tone="teal"
            />
          ) : (
            <p className="text-edu-text-secondary text-xs">
              {t("timeline.itemDetail.document.noLink")}
            </p>
          )}
        </>
      ) : item.itemType === "EXAM" ? (
        <>
          <p className="text-edu-text-secondary text-xs leading-relaxed">
            {t("timeline.itemDetail.exam.explainer")}
            {item.examDurationMinutes !== null &&
              ` · ${t("timeline.itemDetail.exam.duration", {
                minutes: item.examDurationMinutes,
              })}`}
          </p>
          {item.examUrl ? (
            <ExternalChip
              href={item.examUrl}
              label={t("timeline.itemDetail.exam.open")}
              tone="error"
            />
          ) : (
            <p className="text-edu-text-secondary text-xs">
              {t("timeline.itemDetail.exam.noLink")}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-edu-text-secondary text-xs leading-relaxed">
            {t("timeline.itemDetail.assignment.explainer")}
          </p>
          <Link
            href={assignmentsHref}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/55 bg-edu-primary-light px-3.5 py-2 font-bold text-edu-primary-accessible text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {t("timeline.itemDetail.assignment.open")}
            <ArrowRight
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </Link>
        </>
      )}
    </div>
  );
}

/** An outbound link chip. `rel=noreferrer` — the target is a foreign origin. */
function ExternalChip({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "teal" | "error";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-lg border px-3.5 py-2 font-bold text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        tone === "teal"
          ? "border-edu-teal/55 bg-edu-teal-light text-edu-teal-text"
          : "border-edu-error/55 bg-edu-error-light text-edu-error-text",
      )}
    >
      <ExternalLink className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </a>
  );
}

/** The LESSON branch: the body is a separate read (the list omits `content`). */
function LessonBody({
  item,
  getLesson,
}: {
  item: TimelineItemVm;
  getLesson: CourseTimelineActions["getLesson"];
}) {
  const t = useTranslations("courses");
  const [state, setState] = useState<LessonState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    void getLesson(item.id).then((res) => {
      if (!alive) return;
      setState(
        res.ok
          ? { status: "ready", content: res.data.content }
          : { status: "error" },
      );
    });
    return () => {
      alive = false;
    };
  }, [item.id, getLesson]);

  if (state.status === "loading") {
    return (
      <>
        <span className="sr-only" role="status">
          {t("player.content.loading")}
        </span>
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-8/12" />
        </div>
      </>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-edu-error-text text-xs">
        {t("player.content.loadError")}
      </p>
    );
  }
  return <TextContent content={state.content} />;
}
