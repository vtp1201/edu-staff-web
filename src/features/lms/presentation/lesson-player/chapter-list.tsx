"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Play,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CourseTone } from "@/features/lms/domain/entities/course.entity";
import type { LessonType } from "@/features/lms/domain/entities/lesson.entity";
import { cn } from "@/shared/utils";
import { TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import type { ChapterVm, LessonListItemVm } from "./lesson-player.i-vm";

export interface ChapterListProps {
  chapters: ChapterVm[];
  activeLessonId: string | null;
  tone: CourseTone;
  onSelectLesson: (lessonId: string) => void;
  onNext?: () => void;
  labels: {
    navAriaLabel: string;
    toggleMobile: string;
    emptyChapter: string;
    emptyCourse: string;
    nextButton: string;
    doneStateLabel: string;
    activeStateLabel: string;
    lessonType: Record<LessonType, string>;
  };
}

const TYPE_ICON: Record<LessonType, typeof Play> = {
  video: Play,
  pdf: FileText,
  text: FileText,
};

export function ChapterList({
  chapters,
  activeLessonId,
  tone,
  onSelectLesson,
  onNext,
  labels,
}: ChapterListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showOnMobile, setShowOnMobile] = useState(false);
  const baseId = useId();

  const hasContent = chapters.length > 0;

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Mobile-only collapse toggle for the whole list (AC-15). */}
      <button
        type="button"
        onClick={() => setShowOnMobile((s) => !s)}
        aria-expanded={showOnMobile}
        aria-controls={`${baseId}-nav`}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-bold text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        {labels.toggleMobile}
        <ChevronDown
          className={cn(
            "size-4 text-edu-text-secondary motion-safe:transition-transform",
            showOnMobile && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <nav
        id={`${baseId}-nav`}
        aria-label={labels.navAriaLabel}
        className={cn(showOnMobile ? "block" : "hidden", "md:block")}
      >
        {!hasContent ? (
          <div className="px-4 py-10 text-center text-edu-text-secondary text-sm">
            <BookOpen
              className="mx-auto size-7"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <p className="mt-2 leading-relaxed">{labels.emptyCourse}</p>
          </div>
        ) : (
          chapters.map((chapter, ci) => {
            const isCollapsed = !!collapsed[chapter.id];
            const listId = `${baseId}-ch-${chapter.id}`;
            const chDone = chapter.lessons.filter((l) => l.done).length;
            return (
              <div
                key={chapter.id}
                className={cn(ci > 0 && "border-border border-t")}
              >
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={listId}
                  onClick={() =>
                    setCollapsed((s) => ({
                      ...s,
                      [chapter.id]: !s[chapter.id],
                    }))
                  }
                  className="flex w-full items-center justify-between gap-2.5 bg-edu-bg px-4 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight
                        className="size-3 shrink-0 text-edu-text-secondary"
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="size-3 shrink-0 text-edu-text-secondary"
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate font-bold text-foreground text-xs">
                      {chapter.title}
                    </span>
                  </span>
                  {!chapter.isEmpty && (
                    <span className="shrink-0 font-bold text-[10.5px] text-edu-text-secondary tabular-nums">
                      {chDone}/{chapter.lessons.length}
                    </span>
                  )}
                </button>

                {!isCollapsed &&
                  (chapter.isEmpty ? (
                    <p
                      id={listId}
                      className="px-4 py-3.5 text-edu-text-secondary text-xs italic leading-relaxed"
                    >
                      {labels.emptyChapter}
                    </p>
                  ) : (
                    <ul id={listId}>
                      {chapter.lessons.map((lesson) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          tone={tone}
                          isActive={lesson.id === activeLessonId}
                          onSelect={onSelectLesson}
                          labels={labels}
                        />
                      ))}
                    </ul>
                  ))}
              </div>
            );
          })
        )}

        {onNext && hasContent && (
          <div className="border-border border-t bg-edu-bg p-3.5">
            <Button type="button" className="w-full" onClick={onNext}>
              {labels.nextButton}
              <ChevronRight
                className="size-3.5"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </Button>
          </div>
        )}
      </nav>
    </Card>
  );
}

interface LessonRowProps {
  lesson: LessonListItemVm;
  tone: CourseTone;
  isActive: boolean;
  onSelect: (lessonId: string) => void;
  labels: ChapterListProps["labels"];
}

function LessonRow({
  lesson,
  tone,
  isActive,
  onSelect,
  labels,
}: LessonRowProps) {
  const TypeIcon = TYPE_ICON[lesson.type];
  const stateSuffix = lesson.done
    ? ` — ${labels.doneStateLabel}`
    : isActive
      ? ` — ${labels.activeStateLabel}`
      : "";

  return (
    <li className="border-border border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(lesson.id)}
        aria-current={isActive ? "page" : undefined}
        aria-label={`${lesson.title}${stateSuffix}`}
        className={cn(
          "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          isActive && TONE_TINT[tone],
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
            lesson.done
              ? "border-transparent bg-edu-success/15"
              : isActive
                ? cn("border-transparent", TONE_TINT[tone])
                : "border-border",
          )}
          aria-hidden="true"
        >
          {lesson.done ? (
            <Check className="size-3 text-edu-success" strokeWidth={2.7} />
          ) : (
            <span
              className={cn(
                "font-extrabold text-[10px]",
                isActive
                  ? TONE_TEXT_ACCESSIBLE[tone]
                  : "text-edu-text-secondary",
              )}
            >
              {lesson.order}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-xs leading-snug",
              isActive
                ? cn("font-bold", TONE_TEXT_ACCESSIBLE[tone])
                : lesson.done
                  ? "font-semibold text-edu-text-secondary"
                  : "font-semibold text-foreground",
            )}
          >
            {lesson.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-edu-text-secondary">
            <TypeIcon className="size-3" strokeWidth={2.2} aria-hidden="true" />
            <span className="font-bold">{labels.lessonType[lesson.type]}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{lesson.durationLabel}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
