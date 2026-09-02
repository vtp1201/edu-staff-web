import { Calendar, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssignmentSummary } from "@/features/lms/domain/entities/assignment.entity";
import { isOverdue } from "@/features/lms/domain/use-cases/derive-overdue";
import { cn } from "@/shared/utils";
import { TONE_TEXT_ACCESSIBLE, TONE_TINT, toneForId } from "../tone";
import { assignmentBadge } from "./assignment-badge";

export interface AssignmentCardProps {
  assignment: AssignmentSummary;
  onOpen: (assignment: AssignmentSummary) => void;
}

/**
 * One assignment row: icon box, title, deadline line, deadline badge, CTA.
 *
 * Shows ONLY what the class-scoped list row carries — title and `dueAt`. The
 * subject/class/teacher meta line is gone (the row has uuids, and no endpoint a
 * student may call resolves them to names), as is the submitted/graded state
 * (a separate point read, resolved when the sheet opens).
 */
export function AssignmentCard({ assignment, onOpen }: AssignmentCardProps) {
  const t = useTranslations("assignments");
  const format = useFormatter();
  const now = new Date();

  const overdue = isOverdue(assignment.dueAt, now);
  const badge = assignmentBadge(assignment.dueAt, now);
  const tone = toneForId(assignment.subjectId);

  const fmtDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
            TONE_TINT[tone],
          )}
        >
          <FileText
            className={cn("size-5", TONE_TEXT_ACCESSIBLE[tone])}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1.5">
            <h2 className="font-extrabold text-[15px] text-foreground leading-snug">
              {assignment.title}
            </h2>
            <StatusBadge tone={badge.tone} className="shrink-0 gap-1">
              <badge.icon className="size-3" aria-hidden="true" />
              {badge.labelValues
                ? t(badge.labelKey, badge.labelValues)
                : t(badge.labelKey)}
            </StatusBadge>
          </div>

          <p
            className={cn(
              "mt-1.5 flex items-center gap-1.5 text-xs",
              overdue
                ? "font-bold text-edu-error-text"
                : "text-edu-text-secondary",
            )}
          >
            <Calendar className="size-3" aria-hidden="true" />
            {assignment.dueAt
              ? t("card.dueDate", { date: fmtDate(assignment.dueAt) })
              : t("card.noDueDate")}
          </p>

          <div className="mt-3.5">
            <Button
              type="button"
              size="sm"
              onClick={() => onOpen(assignment)}
              aria-label={t("card.cta.openAria", { title: assignment.title })}
            >
              {t("card.cta.viewDetail")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
