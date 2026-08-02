"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarX2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Users,
  XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ChildSwitcher } from "@/components/shared/child-switcher";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
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
import {
  ATTENDANCE_STATUS_ORDER,
  ATTENDANCE_STATUS_TONE,
  countByStatus,
  isRetryableFailure,
  parseIsoDate,
} from "./build-parent-attendance-vm";
import type { ParentAttendanceScreenVM } from "./parent-attendance-screen.i-vm";

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
}

export function ParentAttendanceScreen({
  vm,
  isLoading = false,
  onChildSwitch,
  onRangeChange,
  onRetry,
}: ParentAttendanceScreenProps) {
  const t = useTranslations("parentAttendance");
  const tStatus = useTranslations("attendance.status");
  const format = useFormatter();

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

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        <p className="text-edu-text-secondary text-sm">{t("subtitle")}</p>
      </header>

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
              aria-invalid={vm.error === "invalid-date-range" || undefined}
              aria-describedby={
                vm.error === "invalid-date-range" ? "pa-range-error" : undefined
              }
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
              aria-invalid={vm.error === "invalid-date-range" || undefined}
              aria-describedby={
                vm.error === "invalid-date-range" ? "pa-range-error" : undefined
              }
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
            id={
              vm.error === "invalid-date-range" ? "pa-range-error" : undefined
            }
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
