import {
  Award,
  Calendar,
  CheckSquare,
  Eye,
  FileText,
  Upload,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssignmentEntity } from "@/features/lms/domain/entities/assignment.entity";
import { isOverdue } from "@/features/lms/domain/use-cases/derive-overdue";
import { cn } from "@/shared/utils";
import { TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import { assignmentBadge } from "./assignment-badge";
import { scoreTone } from "./score-tone";

export interface AssignmentCardProps {
  assignment: AssignmentEntity;
  onOpen: (assignment: AssignmentEntity) => void;
}

/** One assignment row: tone icon box, title, meta, due line, status badge, CTA.
 *  Overdue (pending + past deadline) gets an error border tint + error due-line. */
export function AssignmentCard({ assignment, onOpen }: AssignmentCardProps) {
  const t = useTranslations("assignments");
  const format = useFormatter();
  const now = new Date();

  const overdue = isOverdue(assignment.status, assignment.dueDate, now);
  const badge = assignmentBadge(assignment.status, assignment.dueDate, now);
  const isGraded = assignment.status === "graded";
  const isSubmitted = assignment.status === "submitted" || isGraded;

  const BoxIcon = isGraded ? Award : isSubmitted ? CheckSquare : FileText;
  const CtaIcon = isGraded ? Award : isSubmitted ? Eye : Upload;
  const ctaLabel = isGraded
    ? t("card.cta.viewGrade")
    : isSubmitted
      ? t("card.cta.viewSubmission")
      : t("card.cta.submit");

  const fmtDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Card
      className={cn(
        "gap-0 px-5 py-4 shadow-card",
        overdue ? "border-edu-error/40" : "border-border",
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[10px]",
            TONE_TINT[assignment.tone],
          )}
        >
          <BoxIcon
            className={cn("size-5", TONE_TEXT_ACCESSIBLE[assignment.tone])}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1.5">
            <h2 className="font-extrabold text-[15px] text-foreground leading-snug">
              {t("card.title", { title: assignment.title })}
            </h2>
            <StatusBadge tone={badge.tone} className="shrink-0 gap-1">
              <badge.icon className="size-3" aria-hidden="true" />
              {badge.labelValues
                ? t(badge.labelKey, badge.labelValues)
                : t(badge.labelKey)}
            </StatusBadge>
          </div>

          <p className="mt-1 text-edu-text-secondary text-xs">
            {t("card.meta", {
              subject: assignment.subject,
              className: assignment.className,
              teacherName: assignment.teacherName,
            })}
          </p>

          <p
            className={cn(
              "mt-1.5 flex items-center gap-1.5 text-xs",
              overdue
                ? "font-bold text-edu-error-text"
                : "text-edu-text-secondary",
            )}
          >
            <Calendar className="size-3" aria-hidden="true" />
            {t("card.dueDate", { date: fmtDate(assignment.dueDate) })}
          </p>

          {isSubmitted && assignment.submittedAt && (
            <p className="mt-1 flex items-center gap-1.5 text-edu-text-secondary text-xs">
              <CheckSquare className="size-3" aria-hidden="true" />
              {t("card.submittedAt", {
                date: fmtDate(assignment.submittedAt),
              })}
            </p>
          )}

          {isGraded && assignment.score !== null && (
            <div className="mt-2.5">
              <StatusBadge
                tone={scoreTone(assignment.score, assignment.maxScore)}
                className="gap-1"
              >
                <Award className="size-3" aria-hidden="true" />
                {t("graded.scoreValue", {
                  score: assignment.score,
                  max: assignment.maxScore ?? 0,
                })}
              </StatusBadge>
            </div>
          )}

          <div className="mt-3.5">
            <Button
              type="button"
              size="sm"
              variant={isSubmitted ? "secondary" : "default"}
              onClick={() => onOpen(assignment)}
            >
              <CtaIcon className="size-4" aria-hidden="true" />
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
