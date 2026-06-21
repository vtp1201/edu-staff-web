"use client";

import { CalendarRange, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type { LeaveRequestEntity } from "../../../domain/entities/leave-request.entity";
import {
  LEAVE_STATUS_BAR_CLASS,
  LEAVE_STATUS_TONE,
} from "../../discipline-screen/discipline-tones";

/**
 * Read-only leave history for the parent view (US-E09.4, UC-07). Shows status
 * badges + rejection reason; NEVER renders cancel / withdraw affordances.
 */
export function LeaveHistorySection({
  leaveRequests,
}: {
  leaveRequests: LeaveRequestEntity[];
}) {
  const t = useTranslations("discipline.studentConduct.leaveHistory");
  const tStatus = useTranslations("discipline.studentConduct.status");
  const tType = useTranslations("discipline.studentConduct.leaveRequest.types");

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="border-border border-b px-5 py-3.5">
        <h2 className="font-bold text-foreground text-sm">{t("title")}</h2>
      </div>

      {leaveRequests.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Inbox
            className="mx-auto size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2.5 font-semibold text-foreground text-sm">
            {t("empty")}
          </p>
        </div>
      ) : (
        <ul>
          {leaveRequests.map((req) => (
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
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">
                    {tType(req.type)}
                  </span>
                  <StatusBadge tone="muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="size-3" aria-hidden="true" />
                      {req.startDate}
                      {req.endDate !== req.startDate ? ` → ${req.endDate}` : ""}
                    </span>
                  </StatusBadge>
                </div>
                <p className="text-foreground text-sm">{req.reason}</p>
                {req.status === "rejected" && req.rejectionReason && (
                  <p className="mt-2 rounded-md border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-edu-error-text text-xs">
                    <span className="font-bold">{t("rejectionReason")}</span>{" "}
                    {req.rejectionReason}
                  </p>
                )}
              </div>
              <StatusBadge
                tone={LEAVE_STATUS_TONE[req.status]}
                className="shrink-0"
              >
                {tStatus(req.status)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
