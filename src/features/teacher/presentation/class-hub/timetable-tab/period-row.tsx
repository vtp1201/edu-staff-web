"use client";

import { Check, PenLine, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import { cn } from "@/shared/utils";
import { PeriodLogForm } from "./period-log-form";
import { PeriodPrepForm } from "./period-prep-form";
import type {
  LessonPlanOptionVm,
  PeriodRowVm,
  TimetableTabActions,
} from "./timetable-tab.i-vm";

export interface PeriodRowProps {
  classId: string;
  date: string;
  dayLabel: string;
  vm: PeriodRowVm;
  log?: PeriodLog;
  prep?: PeriodPrep;
  /** GVCN of this class: may READ another teacher's log for the period. */
  canReadOthersLog: boolean;
  lessonPlans: LessonPlanOptionVm[];
  actions: TimetableTabActions;
  onLogSaved: (log: PeriodLog) => void;
  onLogDeleted: (date: string, periodNumber: number) => void;
  onPrepSaved: (prep: PeriodPrep) => void;
  onPrepDeleted: (date: string, periodNumber: number) => void;
}

/**
 * One period of one day. Pure render of booleans the page already computed
 * (`isMine`, `isLive`) plus one piece of local UI state: which inline form is
 * open. That state is deliberately NOT lifted — a row's drawer is nobody else's
 * business, and the two forms are independent (opening the prep form does not
 * close the log form; no AC asks for mutual exclusion).
 *
 * Write affordances render ONLY on the teacher's own slot. That is a rendering
 * decision — the Server Action re-derives ownership from the token regardless
 * (decision 0063), so hiding the button is convenience, never the enforcement.
 */
export function PeriodRow({
  classId,
  date,
  dayLabel,
  vm,
  log,
  prep,
  canReadOthersLog,
  lessonPlans,
  actions,
  onLogSaved,
  onLogDeleted,
  onPrepSaved,
  onPrepDeleted,
}: PeriodRowProps) {
  const t = useTranslations("teacherClasses.hub.timetable");
  const [openLog, setOpenLog] = useState(false);
  const [openPrep, setOpenPrep] = useState(false);
  const logPanelId = useId();
  const prepPanelId = useId();

  const teacherMemberId = vm.teacherMemberId ?? "";
  const showReadOnlyLog = !vm.isMine && canReadOthersLog && !!log;

  return (
    <div className="border-border border-b last:border-b-0">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-2.5",
          vm.isMine && "bg-primary/5",
        )}
      >
        <div className="w-16 shrink-0">
          <div className="font-extrabold text-edu-text-secondary text-xs tabular-nums">
            {t("period.label", { number: vm.periodNumber })}
          </div>
          {vm.timeRangeLabel && (
            <div className="text-edu-text-secondary text-[11px] tabular-nums">
              {vm.timeRangeLabel}
            </div>
          )}
        </div>

        <span
          className={cn(
            "min-w-[7.5rem] flex-1 text-sm",
            vm.isMine
              ? "font-extrabold text-primary"
              : "font-semibold text-card-foreground",
          )}
        >
          {vm.subjectName}
          {vm.isMine && (
            // 11px bold is NOT "large text" (WCAG: ≥14pt bold / ≥18pt), so it
            // needs the full 4.5:1 — `text-primary` on the row's `bg-primary/5`
            // is 3.1:1 (A11Y-001). The row already carries the brand colour on
            // the subject name and the tint; this label carries the MEANING and
            // must stay readable.
            <span className="ml-2 font-bold text-[11px] text-edu-text-primary">
              {t("period.mine")}
            </span>
          )}
          {vm.isLive && (
            <span className="ml-2 inline-flex align-middle">
              <StatusBadge tone="success">
                <span
                  aria-hidden="true"
                  className="mr-1 inline-block size-1.5 rounded-full bg-edu-success-text"
                />
                {t("period.live")}
              </StatusBadge>
            </span>
          )}
        </span>

        {vm.teacherName && (
          <span className="whitespace-nowrap text-edu-text-secondary text-xs">
            {vm.teacherName}
          </span>
        )}
        {vm.room && (
          <span className="whitespace-nowrap text-edu-text-secondary text-xs">
            {vm.room}
          </span>
        )}
      </div>

      {vm.isMine && (
        <div className="flex flex-wrap gap-2 bg-primary/5 px-4 pt-0 pb-2.5 sm:pl-20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={openLog}
            aria-controls={logPanelId}
            className={cn(log && "border-edu-success text-edu-success-text")}
            onClick={() => setOpenLog((open) => !open)}
          >
            {log ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <PenLine className="size-3.5" aria-hidden="true" />
            )}
            {log ? t("periodLog.openDone") : t("periodLog.open")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={openPrep}
            aria-controls={prepPanelId}
            className={cn(prep && "border-edu-success text-edu-success-text")}
            onClick={() => setOpenPrep((open) => !open)}
          >
            {prep ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <ScrollText className="size-3.5" aria-hidden="true" />
            )}
            {prep ? t("periodPrep.openDone") : t("periodPrep.open")}
          </Button>
        </div>
      )}

      {showReadOnlyLog && log && (
        <div className="mx-4 mb-2.5 flex flex-wrap items-baseline gap-2 rounded-[8px] bg-muted px-3 py-2 text-edu-text-secondary text-xs sm:ml-20">
          <span className="font-extrabold text-[10px] uppercase tracking-[0.05em]">
            {t("periodLog.readOnlyTitle")}
          </span>
          <span className="font-bold text-card-foreground">
            {log.lessonTitle}
          </span>
          <span>
            {t("periodLog.grade")} {log.grade} ·{" "}
            {t("periodLog.absentShort", { count: log.absentCount })}
          </span>
        </div>
      )}

      <div id={logPanelId}>
        {openLog && vm.isMine && (
          <div className="mx-4 mb-3 rounded-[10px] border border-primary/25 bg-edu-primary-light p-3 sm:ml-20">
            <p className="mb-2.5 font-extrabold text-edu-text-secondary text-[11px] uppercase tracking-[0.06em]">
              {t("periodLog.title", {
                number: vm.periodNumber,
                day: dayLabel,
              })}
            </p>
            <PeriodLogForm
              classId={classId}
              date={date}
              periodNumber={vm.periodNumber}
              assignedTeacherMemberId={teacherMemberId}
              initial={log}
              saveAction={actions.savePeriodLog}
              deleteAction={actions.deletePeriodLog}
              onSaved={(saved) => {
                onLogSaved(saved);
                setOpenLog(false);
              }}
              onDeleted={() => {
                onLogDeleted(date, vm.periodNumber);
                setOpenLog(false);
              }}
              onCancel={() => setOpenLog(false)}
            />
          </div>
        )}
      </div>

      <div id={prepPanelId}>
        {openPrep && vm.isMine && (
          <div className="mx-4 mb-3 rounded-[10px] border border-primary/25 bg-edu-primary-light p-3 sm:ml-20">
            <p className="mb-2.5 font-extrabold text-edu-text-secondary text-[11px] uppercase tracking-[0.06em]">
              {t("periodPrep.title", {
                number: vm.periodNumber,
                day: dayLabel,
              })}
            </p>
            <PeriodPrepForm
              classId={classId}
              date={date}
              periodNumber={vm.periodNumber}
              assignedTeacherMemberId={teacherMemberId}
              initial={prep}
              lessonPlans={lessonPlans}
              saveAction={actions.savePeriodPrep}
              deleteAction={actions.deletePeriodPrep}
              onSaved={(saved) => {
                onPrepSaved(saved);
                setOpenPrep(false);
              }}
              onDeleted={() => {
                onPrepDeleted(date, vm.periodNumber);
                setOpenPrep(false);
              }}
              onCancel={() => setOpenPrep(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
