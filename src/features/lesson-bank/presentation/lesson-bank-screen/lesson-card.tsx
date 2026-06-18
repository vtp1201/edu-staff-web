"use client";

import { Eye, FileText, Link2, Presentation, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type {
  LessonEntity,
  LessonFileType,
  LessonVisibility,
} from "../../domain/entities/lesson.entity";
import { fileTypeLabel, fileTypeTone } from "./lesson-file-type";

function FileTypeIcon({
  fileType,
  className,
}: {
  fileType: LessonFileType;
  className?: string;
}) {
  const cls = cn("size-8", className);
  switch (fileType) {
    case "pdf":
      return <FileText className={cls} aria-hidden="true" />;
    case "pptx":
      return <Presentation className={cls} aria-hidden="true" />;
    case "mp4":
      return <Video className={cls} aria-hidden="true" />;
    case "link":
      return <Link2 className={cls} aria-hidden="true" />;
    default:
      return <FileText className={cls} aria-hidden="true" />;
  }
}

function visibilityTone(visibility: LessonVisibility) {
  switch (visibility) {
    case "school":
      return "success";
    case "dept":
      return "warning";
    case "private":
      return "muted";
    default:
      return "muted";
  }
}

type LessonCardProps = {
  lesson: LessonEntity;
  variant?: "grid" | "list";
  onClick?: () => void;
};

export function LessonCard({
  lesson,
  variant = "grid",
  onClick,
}: LessonCardProps) {
  const t = useTranslations("lessonBank");

  const visibilityLabel: Record<LessonVisibility, string> = {
    private: t("visibility.private"),
    dept: t("visibility.dept"),
    school: t("visibility.school"),
  };

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-4 rounded-[var(--edu-radius-card)]",
          "border border-border bg-card px-4 py-3 text-left",
          "shadow-card transition-shadow hover:shadow-card-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {/* Thumbnail placeholder */}
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-[var(--edu-radius-btn)]",
            "bg-muted",
          )}
        >
          <FileTypeIcon
            fileType={lesson.fileType}
            className="size-6 text-muted-foreground"
          />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {lesson.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {lesson.subjectName}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <StatusBadge tone={fileTypeTone(lesson.fileType)}>
            {fileTypeLabel(lesson.fileType)}
          </StatusBadge>
          <StatusBadge tone={visibilityTone(lesson.visibility)}>
            {visibilityLabel[lesson.visibility]}
          </StatusBadge>
        </div>

        <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Eye className="size-3.5" aria-hidden="true" />
          <span>{lesson.viewCount}</span>
        </div>

        <time
          dateTime={lesson.uploadedAt}
          className="hidden shrink-0 text-xs text-muted-foreground md:block"
        >
          {lesson.uploadedAt}
        </time>
      </button>
    );
  }

  // Grid variant
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col rounded-[var(--edu-radius-card)]",
        "border border-border bg-card text-left",
        "shadow-card transition-shadow hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "overflow-hidden",
      )}
    >
      {/* Thumbnail area */}
      <span
        className="grid h-32 w-full place-items-center bg-muted"
        aria-hidden="true"
      >
        <FileTypeIcon
          fileType={lesson.fileType}
          className="size-10 text-muted-foreground"
        />
      </span>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">
          {lesson.title}
        </p>
        <p className="text-xs text-muted-foreground">{lesson.subjectName}</p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={fileTypeTone(lesson.fileType)}>
            {fileTypeLabel(lesson.fileType)}
          </StatusBadge>
          <StatusBadge tone={visibilityTone(lesson.visibility)}>
            {visibilityLabel[lesson.visibility]}
          </StatusBadge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <time dateTime={lesson.uploadedAt}>{lesson.uploadedAt}</time>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden="true" />
            {lesson.viewCount}
          </span>
        </div>
      </div>
    </button>
  );
}
