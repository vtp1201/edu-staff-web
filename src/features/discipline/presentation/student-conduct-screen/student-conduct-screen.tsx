"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  LeaveRequestEntity,
  SubmitLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import { ConductSummaryCard } from "./components/conduct-summary-card";
import { LeaveHistoryList } from "./components/leave-history-list";
import { LeaveRequestSheet } from "./components/leave-request-sheet";
import { MyViolationsList } from "./components/my-violations-list";
import type { StudentConductScreenVM } from "./student-conduct-screen.i-vm";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function dayCountOf(startISO: string, endISO: string): number {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/** Build an optimistic pending entry from the just-submitted input. */
function optimisticEntry(
  input: SubmitLeaveRequestInput,
  studentName: string,
  className: string,
): LeaveRequestEntity {
  return {
    id: genId("l-optimistic"),
    studentId: input.studentId,
    studentName,
    initials: "",
    avatarTone: "primary",
    classId: className,
    className,
    submittedBy: input.submittedBy,
    submitterName: studentName,
    reason: input.reason,
    startDate: formatISODate(input.startDate),
    endDate: formatISODate(input.endDate),
    dayCount: dayCountOf(input.startDate, input.endDate),
    type: input.type,
    status: "pending",
    submittedAt: formatISODate(input.startDate),
    approvedBy: null,
    rejectedBy: null,
    rejectionReason: null,
  };
}

export function StudentConductScreen(props: StudentConductScreenVM) {
  const {
    viewerRole,
    childName,
    childClass,
    conductSummary,
    violations,
    leaveRequests,
    submitLeaveRequestAction,
    isLoading,
    loadErrorKey,
    onRetry,
  } = props;

  const t = useTranslations("discipline.studentConduct");
  const tErr = useTranslations("discipline.errors");

  const [leaveList, setLeaveList] =
    useState<LeaveRequestEntity[]>(leaveRequests);

  const isParent = viewerRole === "parent";
  const title = isParent ? t("parentTitle") : t("title");
  const subtitle = isParent ? t("parentSubtitle") : t("subtitle");
  const studentName = conductSummary?.studentName ?? childName ?? "";
  const studentId = conductSummary?.studentId ?? "";
  const className = conductSummary?.className ?? childClass ?? "";

  const handleSubmitted = (input: SubmitLeaveRequestInput) => {
    setLeaveList((prev) => [
      optimisticEntry(input, studentName, className),
      ...prev,
    ]);
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-extrabold text-2xl text-foreground">{title}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{subtitle}</p>
          {isParent && childName && (
            <p className="mt-1 font-semibold text-foreground text-sm">
              {t("childInfo", { name: childName, class: childClass ?? "" })}
            </p>
          )}
        </div>
        {!isLoading && !loadErrorKey && (
          <LeaveRequestSheet
            studentId={studentId}
            submittedBy={viewerRole}
            submitAction={submitLeaveRequestAction}
            onSubmitted={handleSubmitted}
          />
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-5" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-[var(--edu-radius-card)]" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-[var(--edu-radius-card)]" />
            <Skeleton className="h-64 w-full rounded-[var(--edu-radius-card)]" />
          </div>
        </div>
      ) : loadErrorKey ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 bg-edu-error/10 px-6 py-12 text-center"
        >
          <AlertCircle
            className="size-9 text-edu-error-text"
            aria-hidden="true"
          />
          <p className="font-semibold text-edu-error-text text-sm">
            {tErr(loadErrorKey)}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>
              {t("retry")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {conductSummary && (
            <ConductSummaryCard conductSummary={conductSummary} />
          )}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <MyViolationsList violations={violations} />
            <LeaveHistoryList leaveRequests={leaveList} />
          </div>
        </>
      )}
    </div>
  );
}
