"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarX2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Plus,
  Users,
  XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AttendanceSummaryBlock } from "@/components/shared/attendance-summary";
import { ChildSwitcher } from "@/components/shared/child-switcher";
import { EmptyState } from "@/components/shared/empty-state";
import {
  LeaveRequestDialog,
  type LeaveRequestSubmission,
} from "@/components/shared/leave-request-dialog";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
import { joinAbsenceReasons } from "@/features/attendance/domain/join-absence-reasons";
import { summarizeAttendance } from "@/features/attendance/domain/summarize-attendance";
import type { SubmitMyLeaveRequestInput } from "@/features/discipline/domain/entities/leave-request.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import {
  ATTENDANCE_STATUS_ORDER,
  ATTENDANCE_STATUS_TONE,
  countByStatus,
  isRetryableFailure,
  parseIsoDate,
} from "./build-parent-attendance-vm";
import type { ParentAttendanceScreenVM } from "./parent-attendance-screen.i-vm";
import type {
  RetryLeaveAttachmentsResult,
  SubmitLeaveRequestResult,
} from "./submit-leave-request.types";

/** Status is never conveyed by colour alone (accessibility.md): icon + label. */
const STATUS_ICON: Record<AttendanceStatus, LucideIcon> = {
  present: CheckCircle2,
  late: Clock,
  excusedAbsent: FileCheck2,
  absent: XCircle,
};

/**
 * Locale-ordered numeric day (`vi` → 03/08/2026, `en` → 08/03/2026). `UTC`
 * pairs with `parseIsoDate`'s noon-UTC instant so the calendar day is stable
 * across timezones and identical on server and client.
 */
const DATE_FORMAT = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
} as const;

export interface ParentAttendanceScreenProps {
  vm: ParentAttendanceScreenVM;
  /** true while the RSC re-fetches after a child/range change. */
  isLoading?: boolean;
  onChildSwitch?: (childId: string) => void;
  onRangeChange?: (next: { startDate?: string; endDate?: string }) => void;
  onRetry?: () => void;
  /** Server Action ref — creates the request, then uploads its files. */
  onSubmitLeave?: (
    input: SubmitMyLeaveRequestInput,
    formData: FormData,
  ) => Promise<SubmitLeaveRequestResult>;
  /** Server Action ref — re-uploads files to an EXISTING request. */
  onRetryAttachments?: (
    requestId: string,
    studentMemberId: string,
    formData: FormData,
  ) => Promise<RetryLeaveAttachmentsResult>;
  /** Called after a successful submission so the host can re-fetch. */
  onSubmitted?: () => void;
}

/** The subset of `files` the server reported as failed, matched by name. */
function keepFailed(files: File[], failedNames: string[]): File[] {
  return files.filter((file) => failedNames.includes(file.name));
}

export function ParentAttendanceScreen({
  vm,
  isLoading = false,
  onChildSwitch,
  onRangeChange,
  onRetry,
  onSubmitLeave,
  onRetryAttachments,
  onSubmitted,
}: ParentAttendanceScreenProps) {
  const t = useTranslations("parentAttendance");
  const tStatus = useTranslations("attendance.status");
  const tErrors = useTranslations("discipline.errors");
  const tLeave = useTranslations("discipline.studentConduct.leaveRequest");
  const format = useFormatter();

  const requestButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Plain state, NOT `useTransition`: an async transition whose action sets
  // state after an `await` can leave `isPending` stuck true, freezing the
  // button (a bug this repo has hit before).
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /**
   * Set only when the request landed but some of its FILES did not.
   *
   * `files` holds ONLY the files that failed — never the whole original
   * selection. core counts attachments server-side and refuses the 4th, so
   * re-sending the successful ones too would push a 1-of-3 failure to five
   * attachments and the retry could never succeed (tech-lead review, fix
   * round). `total` stays the originally attempted count so the "N/M" copy
   * keeps describing the same submission.
   */
  const [partialUpload, setPartialUpload] = useState<{
    requestId: string;
    studentMemberId: string;
    files: File[];
    total: number;
  } | null>(null);
  const [isRetryingFiles, setIsRetryingFiles] = useState(false);

  const hasChildren = vm.childList.length > 0;
  const activeChildId = vm.activeChildId ?? vm.childList[0]?.childId ?? null;

  // Same tablist/tabpanel pairing GradeBookScreen builds — the pair lives in
  // the consumer, not in the shared ChildSwitcher.
  const panelProps =
    hasChildren && activeChildId
      ? ({
          role: "tabpanel",
          id: `tabpanel-${activeChildId}`,
          "aria-labelledby": `tab-${activeChildId}`,
        } as const)
      : {};

  const counts = countByStatus(vm.records);
  const activeChild = vm.childList.find((c) => c.childId === activeChildId);
  // Both derivations are the SAME pure functions the student screen uses, so
  // the two screens can never disagree about a rate or a history row.
  const { summary, months } = summarizeAttendance(vm.records);
  const history = joinAbsenceReasons(vm.records, vm.leaveRequests);

  /**
   * A request needs the child's classId, and the only source is the child's own
   * attendance rows (packet Q3). An empty range therefore genuinely cannot file
   * a request — the button is disabled and SAYS SO, rather than failing on
   * submit.
   */
  const canRequestLeave =
    hasChildren &&
    activeChildId !== null &&
    vm.childClassId !== null &&
    onSubmitLeave !== undefined;

  /**
   * `discipline.errors.reason-too-short` says "ít nhất 10 ký tự" because two
   * legacy mock-only forms really do enforce ten. THIS dialog is wired to core,
   * whose rule is `minLength: 1`, so an empty reason is reported with the
   * dialog's own honest copy instead of a number the server does not enforce
   * (tech-lead review, fix round). The shared key is left alone for its other
   * two callers.
   */
  function errorCopy(errorKey: DisciplineFailure["type"]): string {
    if (errorKey === "reason-too-short") return tLeave("reasonRequired");
    return tErrors(errorKey);
  }

  async function handleSubmitLeave(submission: LeaveRequestSubmission) {
    if (!onSubmitLeave || !activeChildId || !vm.childClassId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    for (const file of submission.files) formData.append("file", file);

    const result = await onSubmitLeave(
      {
        studentMemberId: activeChildId,
        classId: vm.childClassId,
        startDate: submission.startDate,
        endDate: submission.endDate,
        reason: submission.reason,
      },
      formData,
    );
    setIsSubmitting(false);

    if (!result.ok) {
      // Stay OPEN on failure: the draft (dates, reason, files) is still there
      // and closing would make the user retype it.
      setSubmitError(errorCopy(result.errorKey as DisciplineFailure["type"]));
      return;
    }

    setDialogOpen(false);
    if (result.failedFiles.length > 0) {
      setPartialUpload({
        requestId: result.requestId,
        studentMemberId: activeChildId,
        // Keep the FILE objects (a name alone cannot be re-uploaded) but only
        // the ones the server said it did not store.
        files: keepFailed(submission.files, result.failedFiles),
        total: result.total,
      });
    } else {
      setPartialUpload(null);
      toast.success(t("submitSuccess"));
    }
    onSubmitted?.();
  }

  async function handleRetryAttachments() {
    if (!onRetryAttachments || !partialUpload) return;
    setIsRetryingFiles(true);
    const formData = new FormData();
    for (const file of partialUpload.files) formData.append("file", file);
    const result = await onRetryAttachments(
      partialUpload.requestId,
      partialUpload.studentMemberId,
      formData,
    );
    setIsRetryingFiles(false);
    if (result.failedFiles.length === 0) {
      setPartialUpload(null);
      toast.success(t("attachmentsRetrySuccess"));
      onSubmitted?.();
      return;
    }
    // Narrow again: a retry can succeed partially too.
    setPartialUpload({
      ...partialUpload,
      files: keepFailed(partialUpload.files, result.failedFiles),
    });
  }

  // Both failures are caused by the two date inputs' values, so BOTH get the
  // same invalid + described-by treatment (a11y audit Minor: only
  // `invalid-date-range` did before, leaving "range too large" colour-free but
  // also announcement-free).
  const isRangeError =
    vm.error === "invalid-date-range" || vm.error === "date-range-too-large";
  const rangeFieldProps = {
    "aria-invalid": isRangeError || undefined,
    "aria-describedby": isRangeError ? "pa-range-error" : undefined,
  } as const;

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <p className="text-edu-text-secondary text-sm">{t("subtitle")}</p>
        </div>
        {hasChildren && onSubmitLeave ? (
          <Button
            ref={requestButtonRef}
            type="button"
            // `aria-disabled` rather than `disabled`: the reason it cannot be
            // used is text the user must be able to reach, and a natively
            // disabled control is skipped by the keyboard.
            aria-disabled={!canRequestLeave}
            aria-describedby={
              canRequestLeave ? undefined : "pa-leave-unavailable"
            }
            onClick={() => {
              if (canRequestLeave) setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            {t("requestLeaveButton")}
          </Button>
        ) : null}
      </header>

      {hasChildren && onSubmitLeave && !canRequestLeave ? (
        <p
          id="pa-leave-unavailable"
          className="rounded-[var(--edu-radius-btn)] bg-edu-warning-light px-3 py-2.5 text-edu-warning-text text-xs leading-relaxed"
        >
          {t("requestLeaveUnavailable")}
        </p>
      ) : null}

      {partialUpload ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--edu-radius-btn)] bg-edu-warning-light px-3 py-2.5 text-edu-warning-text text-xs"
        >
          <span>
            {t("submitPartial", {
              failed: partialUpload.files.length,
              total: partialUpload.total,
            })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRetryingFiles}
            aria-busy={isRetryingFiles}
            onClick={handleRetryAttachments}
          >
            {t("retryAttachments")}
          </Button>
        </div>
      ) : null}

      {onSubmitLeave ? (
        <LeaveRequestDialog
          open={dialogOpen}
          minDate={vm.today}
          description={
            activeChild
              ? `${activeChild.name} · ${activeChild.className}`
              : undefined
          }
          isPending={isSubmitting}
          errorMessage={submitError}
          returnFocusRef={requestButtonRef}
          onSubmit={handleSubmitLeave}
          onOpenChange={(next) => {
            setDialogOpen(next);
            if (!next) setSubmitError(null);
          }}
        />
      ) : null}

      {hasChildren && activeChildId ? (
        <ChildSwitcher
          childList={vm.childList}
          activeChildId={activeChildId}
          onSwitch={onChildSwitch ?? (() => {})}
          isLoading={isLoading}
        />
      ) : null}

      {hasChildren ? (
        <fieldset className="flex flex-wrap items-end gap-4 rounded-[12px] border border-border bg-card p-4">
          <legend className="px-1 font-bold text-edu-text-secondary text-xs uppercase tracking-wider">
            {t("rangeLegend")}
          </legend>
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="pa-start" className="text-xs">
              {t("startDateLabel")}
            </Label>
            <Input
              id="pa-start"
              type="date"
              value={vm.range.startDate}
              {...rangeFieldProps}
              onChange={(e) => onRangeChange?.({ startDate: e.target.value })}
            />
          </div>
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="pa-end" className="text-xs">
              {t("endDateLabel")}
            </Label>
            <Input
              id="pa-end"
              type="date"
              value={vm.range.endDate}
              {...rangeFieldProps}
              onChange={(e) => onRangeChange?.({ endDate: e.target.value })}
            />
          </div>
        </fieldset>
      ) : null}

      <div {...panelProps} className="flex flex-col gap-4">
        {!hasChildren ? (
          <EmptyState
            icon={Users}
            title={t("noChildrenTitle")}
            body={t("noChildrenBody")}
          />
        ) : isLoading ? (
          <ListSkeleton
            loadingAriaLabel={t("loadingAriaLabel")}
            rows={5}
            variant="inline"
            renderRow={() => (
              <div className="flex items-center justify-between px-4 py-3.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            )}
          />
        ) : vm.error ? (
          <ListError
            id={isRangeError ? "pa-range-error" : undefined}
            message={t(`errors.${vm.error}`)}
            retryLabel={t("retry")}
            shape="inline-card"
            iconSize={10}
            retryIcon="rotate"
            showRetry={isRetryableFailure(vm.error)}
            onRetry={() => onRetry?.()}
          />
        ) : vm.records.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={t("emptyTitle")}
            body={t("emptyBody")}
          />
        ) : (
          <>
            {/* Same block, same numbers, as `/student/attendance` — fed by the
                records the page ALREADY fetched, so it costs no extra query. */}
            <AttendanceSummaryBlock
              summary={summary}
              months={months}
              history={history}
            />

            <ul
              aria-label={t("summaryLabel")}
              className="flex flex-wrap items-center gap-2"
            >
              {ATTENDANCE_STATUS_ORDER.map((status) => {
                const Icon = STATUS_ICON[status];
                return (
                  <li key={status}>
                    <StatusBadge tone={ATTENDANCE_STATUS_TONE[status]}>
                      <Icon className="size-3.5" aria-hidden="true" />
                      {/* label + count composed in the message, not in JSX —
                          word order is a translator's decision. */}
                      {t("summaryChip", {
                        label: tStatus(status),
                        count: counts[status],
                      })}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>

            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              <Table>
                <TableCaption className="sr-only">
                  {t("tableCaption")}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnDate")}</TableHead>
                    <TableHead>{t("columnStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vm.records.map((record) => {
                    const Icon = STATUS_ICON[record.status];
                    const day = parseIsoDate(record.date);
                    return (
                      <TableRow key={record.date}>
                        <TableCell className="font-medium">
                          {day
                            ? format.dateTime(day, DATE_FORMAT)
                            : record.date}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={ATTENDANCE_STATUS_TONE[record.status]}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                            {tStatus(record.status)}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
