"use client";

import { Award, Check, Download } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AssignmentEntity } from "@/features/lms/domain/entities/assignment.entity";
import { scoreTone } from "./score-tone";

export interface GradedSheetProps {
  assignment: AssignmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Fully read-only graded feedback: score chip, teacher comment (empty
 *  fallback), optional graded-file mock-download link, timestamps. */
export function GradedSheet({
  assignment,
  open,
  onOpenChange,
}: GradedSheetProps) {
  const t = useTranslations("assignments");
  const format = useFormatter();

  const fmtDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("submit.closeAriaLabel")}
        className="w-full gap-0 sm:max-w-lg"
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle className="font-extrabold text-[15px]">
            {t("card.cta.viewGrade")}
          </SheetTitle>
          <SheetDescription>
            {t("card.meta", {
              subject: assignment.subject,
              className: assignment.className,
              teacherName: assignment.teacherName,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          <h3 className="font-bold text-foreground text-sm">
            {assignment.title}
          </h3>

          {assignment.score !== null && (
            <div>
              <p className="mb-2 font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
                {t("graded.scoreLabel")}
              </p>
              <StatusBadge
                tone={scoreTone(assignment.score, assignment.maxScore)}
                className="gap-1.5 px-4 py-1.5 text-base"
              >
                <Award className="size-4" aria-hidden="true" />
                {t("graded.scoreValue", {
                  score: assignment.score,
                  max: assignment.maxScore ?? 0,
                })}
              </StatusBadge>
            </div>
          )}

          <div>
            <p className="mb-2 font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
              {t("graded.commentLabel")}
            </p>
            <div className="rounded-[10px] border border-border bg-edu-bg p-4">
              {assignment.teacherComment ? (
                <p className="whitespace-pre-line text-foreground text-sm leading-relaxed">
                  {assignment.teacherComment}
                </p>
              ) : (
                <p className="text-edu-text-secondary text-sm italic">
                  {t("graded.commentEmpty")}
                </p>
              )}
            </div>
          </div>

          {assignment.gradedFileName && (
            <button
              type="button"
              className="inline-flex items-center gap-2 font-bold text-edu-primary-accessible text-sm hover:underline"
              aria-label={t("graded.downloadAriaLabel")}
              onClick={() => toast.info(t("graded.mockDownloadToast"))}
            >
              <Download className="size-4" aria-hidden="true" />
              {t("graded.attachedFileLabel")}
            </button>
          )}

          <div className="space-y-1.5 text-edu-text-secondary text-xs">
            {assignment.submittedAt && (
              <p className="flex items-center gap-1.5">
                <Check className="size-3" aria-hidden="true" />
                {t("graded.submittedAtLabel")}:{" "}
                {fmtDate(assignment.submittedAt)}
              </p>
            )}
            {assignment.gradedAt && (
              <p className="flex items-center gap-1.5">
                <Award className="size-3" aria-hidden="true" />
                {t("graded.gradedAtLabel")}: {fmtDate(assignment.gradedAt)}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
