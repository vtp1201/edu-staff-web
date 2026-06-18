"use client";

import { Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/shared/utils";
import type {
  LessonEntity,
  LessonVisibility,
} from "../../domain/entities/lesson.entity";
import { fileTypeLabel, fileTypeTone } from "./lesson-file-type";

function visibilityTone(v: LessonVisibility) {
  if (v === "school") return "success";
  if (v === "dept") return "warning";
  return "muted";
}

type LessonDetailSheetProps = {
  lesson: LessonEntity | null;
  onClose: () => void;
  /** Whether the current viewer can edit/delete (owner or admin). */
  canEdit: boolean;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
};

export function LessonDetailSheet({
  lesson,
  onClose,
  canEdit,
  onDelete,
  isDeleting,
}: LessonDetailSheetProps) {
  const t = useTranslations("lessonBank");

  const visibilityLabel: Record<LessonVisibility, string> = {
    private: t("visibility.private"),
    dept: t("visibility.dept"),
    school: t("visibility.school"),
  };

  return (
    <Sheet
      open={!!lesson}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        {lesson && (
          <>
            <SheetHeader className="border-b border-border px-6 pb-4 pt-6">
              <SheetTitle className="text-lg font-extrabold text-foreground">
                {t("detail.title")}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* Thumbnail placeholder */}
              <div
                className={cn(
                  "grid h-40 w-full place-items-center rounded-[var(--edu-radius-card)]",
                  "bg-muted",
                )}
                aria-hidden="true"
              >
                <span className="text-4xl text-muted-foreground">
                  {fileTypeLabel(lesson.fileType)}
                </span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {lesson.title}
                </h2>
                {lesson.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lesson.description}
                  </p>
                )}
              </div>

              {/* Meta grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.subject")}
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {lesson.subjectName}
                  </dd>
                </div>

                {lesson.department && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("detail.department")}
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {lesson.department}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.fileType")}
                  </dt>
                  <dd className="mt-0.5">
                    <StatusBadge tone={fileTypeTone(lesson.fileType)}>
                      {fileTypeLabel(lesson.fileType)}
                    </StatusBadge>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.visibility")}
                  </dt>
                  <dd className="mt-0.5">
                    <StatusBadge tone={visibilityTone(lesson.visibility)}>
                      {visibilityLabel[lesson.visibility]}
                    </StatusBadge>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.author")}
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {lesson.authorName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.uploadedAt")}
                  </dt>
                  <dd className="mt-0.5">
                    <time
                      dateTime={lesson.uploadedAt}
                      className="text-foreground"
                    >
                      {lesson.uploadedAt}
                    </time>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("detail.views")}
                  </dt>
                  <dd className="mt-0.5 text-foreground">{lesson.viewCount}</dd>
                </div>
              </dl>
            </div>

            {/* Action footer */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
              {lesson.fileType === "link" ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={lesson.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink
                      className="mr-1.5 size-4"
                      aria-hidden="true"
                    />
                    {t("detail.open")}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a href={lesson.fileUrl} download>
                    <Download className="mr-1.5 size-4" aria-hidden="true" />
                    {t("detail.download")}
                  </a>
                </Button>
              )}

              {canEdit && (
                <>
                  <Button variant="outline" size="sm" disabled>
                    <Pencil className="mr-1.5 size-4" aria-hidden="true" />
                    {t("detail.edit")}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        className="ml-auto"
                      >
                        <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
                        {t("detail.delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("detail.confirmDeleteTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("detail.confirmDeleteBody")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("detail.confirmCancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(lesson.id)}
                          className="bg-edu-error-dark hover:bg-edu-error-dark/90"
                        >
                          {isDeleting
                            ? t("detail.deleting")
                            : t("detail.confirmDelete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
