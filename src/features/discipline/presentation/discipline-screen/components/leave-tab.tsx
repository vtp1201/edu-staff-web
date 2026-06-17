"use client";

import { Calendar, Check, Clock, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type {
  LeaveRequestEntity,
  LeaveStatus,
} from "../../../domain/entities/leave-request.entity";
import type { DisciplineScreenVM } from "../discipline-screen.i-vm";
import { LEAVE_STATUS_BAR_CLASS, LEAVE_STATUS_TONE } from "../discipline-tones";
import { DisciplineAvatar } from "./discipline-avatar";
import { RejectLeaveDialog } from "./reject-leave-dialog";

const STATUSES: LeaveStatus[] = ["pending", "approved", "rejected"];
const STATUS_ICON = { pending: Clock, approved: Check, rejected: X } as const;
const STATUS_TONE_STAT = {
  pending: "warning",
  approved: "success",
  rejected: "error",
} as const;

export function LeaveTab({
  vm,
  leaveRequests,
}: {
  vm: DisciplineScreenVM;
  leaveRequests: LeaveRequestEntity[];
}) {
  const t = useTranslations("discipline.leave");
  const tErr = useTranslations("discipline.errors");
  const [isPending, startTransition] = useTransition();

  const [list, setList] = useState<LeaveRequestEntity[]>(leaveRequests);
  const [filter, setFilter] = useState<LeaveStatus | "all">("all");
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestEntity | null>(
    null,
  );

  const filtered = useMemo(
    () => list.filter((r) => filter === "all" || r.status === filter),
    [list, filter],
  );

  const stats = useMemo(
    () => ({
      pending: list.filter((r) => r.status === "pending").length,
      approved: list.filter((r) => r.status === "approved").length,
      rejected: list.filter((r) => r.status === "rejected").length,
    }),
    [list],
  );

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await vm.approveLeaveAction(id);
      if (res.errorKey) {
        toast.error(tErr(res.errorKey));
        return;
      }
      setList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
      );
    });
  };

  const handleReject = (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    startTransition(async () => {
      const res = await vm.rejectLeaveAction(id, reason);
      if (res.errorKey) {
        toast.error(tErr(res.errorKey));
        return;
      }
      setList((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "rejected", rejectionReason: reason }
            : r,
        ),
      );
      setRejectTarget(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <StatCard
            key={s}
            label={t(`stats.${s}`)}
            value={String(stats[s])}
            icon={STATUS_ICON[s]}
            tone={STATUS_TONE_STAT[s]}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-border border-b px-5 py-3.5">
          <h2 className="flex-1 font-bold text-foreground text-sm">
            {t("title")}
          </h2>
          {(["all", ...STATUSES] as (LeaveStatus | "all")[]).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("filterAll") : t(`status.${f}`)}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Check
              className="mx-auto size-9 text-edu-success"
              aria-hidden="true"
            />
            <p className="mt-2.5 font-semibold text-edu-success-text text-sm">
              {t("empty")}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((req) => (
              <li
                key={req.id}
                className="flex items-start gap-4 border-border border-b px-5 py-4 last:border-b-0"
              >
                <span
                  className={cn(
                    "w-1 shrink-0 self-stretch rounded-sm",
                    LEAVE_STATUS_BAR_CLASS[req.status],
                  )}
                  aria-hidden="true"
                />
                <DisciplineAvatar
                  initials={req.initials}
                  tone={req.avatarTone}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-foreground text-sm">
                      {req.studentName}
                    </span>
                    <StatusBadge tone="primary">{req.className}</StatusBadge>
                    <StatusBadge tone="muted">
                      {t(`type.${req.type}`)}
                    </StatusBadge>
                  </div>
                  <p className="mb-1.5 text-foreground text-sm">
                    <span className="font-semibold">{t("reasonLabel")}</span>{" "}
                    {req.reason}
                  </p>
                  <div className="flex flex-wrap gap-4 text-edu-text-secondary text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" aria-hidden="true" />
                      {req.startDate}
                      {req.endDate !== req.startDate ? ` → ${req.endDate}` : ""}{" "}
                      ({t("days", { count: req.dayCount })})
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3" aria-hidden="true" />
                      {req.submitterName}
                    </span>
                  </div>
                  {req.status === "rejected" && req.rejectionReason && (
                    <p
                      role="alert"
                      className="mt-2 rounded-md border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-edu-error-text text-xs"
                    >
                      <span className="font-bold">{t("rejectedReason")}</span>{" "}
                      {req.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge tone={LEAVE_STATUS_TONE[req.status]}>
                    {t(`status.${req.status}`)}
                  </StatusBadge>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        aria-label={t("approveLabel", {
                          student: req.studentName,
                        })}
                        onClick={() => handleApprove(req.id)}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                        {t("approve")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        aria-label={t("rejectLabel", {
                          student: req.studentName,
                        })}
                        onClick={() => setRejectTarget(req)}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        {t("reject")}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RejectLeaveDialog
        open={rejectTarget !== null}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleReject}
      />
    </div>
  );
}
