"use client";

import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffLeaveRequestEntity } from "@/features/staff-leave/domain/entities/staff-leave-request.entity";
import { cn } from "@/shared/utils";
import { StaffLeaveEmpty } from "./staff-leave-empty";
import { StaffLeaveFilters, type StatusFilter } from "./staff-leave-filters";
import { StaffLeaveRequestCard } from "./staff-leave-request-card";
import type {
  StaffLeaveActionOutcome,
  StaffLeaveScreenVM,
} from "./staff-leave-screen.i-vm";
import { StaffLeaveStats } from "./staff-leave-stats";

/** "MM/YYYY" for the current month — used to scope "this month" stats. */
function currentMonthKey(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** "DD/MM/YYYY" → comparable YYYYMMDD number (0 when unparseable). */
function dateKey(ddmmyyyy: string): number {
  const [d, m, y] = ddmmyyyy.split("/");
  return d && m && y ? Number.parseInt(`${y}${m}${d}`, 10) : 0;
}
/** ISO "YYYY-MM-DD" → comparable YYYYMMDD number (null when empty). */
function isoKey(iso: string): number | null {
  if (!iso) return null;
  return Number.parseInt(iso.replace(/-/g, ""), 10);
}

type ToastState = { id: number; message: string } | null;

export interface StaffLeaveScreenProps extends StaffLeaveScreenVM {
  /** Storybook-only: render the loading skeleton. */
  initialLoading?: boolean;
}

export function StaffLeaveScreen({
  initialRequests,
  loadFailed = false,
  initialLoading = false,
  onApprove,
  onReject,
}: StaffLeaveScreenProps) {
  const t = useTranslations("staffLeave");
  const [requests, setRequests] =
    useState<StaffLeaveRequestEntity[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss toast (motion-safe — pure timer, no animation dependency).
  useEffect(() => {
    if (!toast) return;
    toastTimer.current = setTimeout(() => setToast(null), 2600);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const showToast = (message: string) => setToast({ id: Date.now(), message });

  const stats = useMemo(() => {
    const month = currentMonthKey();
    const pending = requests.filter((r) => r.status === "pending").length;
    const approvedMonth = requests.filter(
      (r) => r.status === "approved" && r.startDate.includes(month),
    );
    return {
      pending,
      approvedThisMonth: approvedMonth.length,
      totalDaysThisMonth: approvedMonth.reduce((s, r) => s + r.days, 0),
    };
  }, [requests]);

  const counts = useMemo<Record<StatusFilter, number>>(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const fromKey = isoKey(dateFrom);
    const toKey = isoKey(dateTo);
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const k = dateKey(r.startDate);
      if (fromKey !== null && k < fromKey) return false;
      if (toKey !== null && k > toKey) return false;
      return true;
    });
  }, [requests, statusFilter, dateFrom, dateTo]);

  const applyOutcome = (outcome: StaffLeaveActionOutcome, onOk: () => void) => {
    if (outcome.ok) {
      onOk();
    } else {
      showToast(t(`errors.${outcome.errorKey}`));
    }
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const outcome = await onApprove(id);
      applyOutcome(outcome, () => {
        setRequests((rs) =>
          rs.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
        );
        showToast(t("toast.approved"));
      });
    });
  };

  const handleConfirmReject = (id: string) => {
    const reason = rejectReason.trim();
    startTransition(async () => {
      const outcome = await onReject(id, reason);
      applyOutcome(outcome, () => {
        setRequests((rs) =>
          rs.map((r) =>
            r.id === id
              ? { ...r, status: "rejected", rejectionReason: reason }
              : r,
          ),
        );
        setRejectingId(null);
        setRejectReason("");
        showToast(t("toast.rejected"));
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-7 sm:px-8">
      {/* Title */}
      <header className="mb-6 flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--edu-radius-card)] bg-primary/15">
          <CalendarClock className="size-5.5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {initialLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : loadFailed ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/30 bg-edu-error/10 px-6 py-12 text-center">
          <AlertTriangle
            className="size-9 text-edu-error-text"
            aria-hidden="true"
          />
          <p className="text-sm font-bold text-edu-error-text">{t("error")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <StaffLeaveStats
            pending={stats.pending}
            approvedThisMonth={stats.approvedThisMonth}
            totalDaysThisMonth={stats.totalDaysThisMonth}
          />

          <StaffLeaveFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            counts={counts}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />

          {filtered.length === 0 ? (
            <StaffLeaveEmpty status={statusFilter} />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((req) => (
                <StaffLeaveRequestCard
                  key={req.id}
                  request={req}
                  isRejecting={rejectingId === req.id}
                  rejectReason={rejectingId === req.id ? rejectReason : ""}
                  isBusy={isPending}
                  onApprove={() => handleApprove(req.id)}
                  onStartReject={() => {
                    setRejectingId(req.id);
                    setRejectReason("");
                  }}
                  onChangeRejectReason={setRejectReason}
                  onConfirmReject={() => handleConfirmReject(req.id)}
                  onCancelReject={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <output
          aria-live="polite"
          className={cn(
            "fixed bottom-7 left-1/2 z-[9000] flex -translate-x-1/2 items-center gap-2.5",
            "rounded-[var(--edu-radius-card)] bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-card-hover",
          )}
        >
          <CheckCircle2
            className="size-5 text-edu-success"
            aria-hidden="true"
          />
          {toast.message}
        </output>
      )}
    </div>
  );
}
