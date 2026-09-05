"use client";

import { CalendarCheck, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ReasonConfirmDialog } from "@/components/shared/reason-confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import { MIN_REJECT_REASON_LENGTH } from "@/features/discipline/domain/use-cases/reject-leave.use-case";
import type {
  HomeroomActionResult,
  HomeroomLeaveActions,
  PendingLeaveCardVm,
} from "./homeroom-tab.i-vm";

export interface PendingLeaveCardProps {
  vm: PendingLeaveCardVm;
  classId: string;
  actions: HomeroomLeaveActions;
}

/**
 * "Đơn xin nghỉ chờ duyệt" (US-E24.11) — the only client boundary in this tab.
 *
 * This card is an INBOX: a decided request has nothing left to show here, so a
 * successful decision removes the row rather than flipping its status in place
 * (unlike `/teacher/discipline`'s all-statuses table).
 *
 * Both decisions are irreversible for the student, so nothing is optimistic:
 * the row only disappears AFTER the server confirmed. A failure keeps the row,
 * shows the stable failure key translated, and re-syncs from the server —
 * a 403 means the caller's picture of "what I may act on" is already stale.
 *
 * Pending state is a plain `pendingId` reset in `finally`, NOT an async
 * `useTransition`: React 19 does not reliably clear a transition's pending flag
 * when a setter runs after the `await`, which would leave both buttons disabled
 * forever after a failed decision (observed on US-E21.2). It is scoped to the
 * ROW being decided rather than the whole card, so deciding one student's
 * request never freezes (unexplained) the buttons of every other row.
 *
 * A decided row is REMOVED, which destroys the button that had focus. Focus is
 * therefore moved to the card heading in the same tick, so a keyboard/screen
 * reader user lands somewhere meaningful instead of at `<body>`.
 */
export function PendingLeaveCard({
  vm,
  classId,
  actions,
}: PendingLeaveCardProps) {
  const t = useTranslations("teacherClasses.hub.homeroom.leave");
  const tDialog = useTranslations("discipline.leave.rejectDialog");
  const tErr = useTranslations("discipline.errors");
  const router = useRouter();

  const [list, setList] = useState<LeaveRequestEntity[]>(vm.requests);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestEntity | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const settle = async (
    id: string,
    run: () => Promise<HomeroomActionResult>,
    successMessage: string,
  ) => {
    setPendingId(id);
    try {
      const res = await run();
      if (!res.ok) {
        toast.error(tErr(res.errorKey));
        // Re-read the inbox: the server's truth is the authority on what is
        // still decidable. `homeroom-tab.tsx` keys this component on the id
        // set, so a genuinely changed list remounts it with a fresh seed.
        router.refresh();
        return;
      }
      setList((prev) => prev.filter((r) => r.id !== id));
      setRejectTarget(null);
      // The focused control (the row's button, or the dialog's confirm) is
      // about to be unmounted — park focus on the card heading in the SAME
      // tick so it never falls back to <body> (WCAG 2.4.3).
      titleRef.current?.focus();
      toast.success(successMessage);
    } finally {
      setPendingId(null);
    }
  };

  const handleApprove = (req: LeaveRequestEntity) => {
    void settle(
      req.id,
      () => actions.approveLeave(req.id, req.studentId, classId),
      t("approved", { student: req.studentName }),
    );
  };

  const handleReject = (reason: string) => {
    if (!rejectTarget) return;
    const req = rejectTarget;
    void settle(
      req.id,
      () => actions.rejectLeave(req.id, req.studentId, classId, reason),
      t("rejected", { student: req.studentName }),
    );
  };

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-border border-b px-5 py-3.5">
        {/* `tabIndex={-1}` makes the heading a programmatic focus target only
            — it stays out of the tab order. */}
        <h3
          ref={titleRef}
          tabIndex={-1}
          className="font-extrabold text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("title")}
        </h3>
        <StatusBadge tone={list.length > 0 ? "warning" : "muted"}>
          {/* The badge renders a plain <span> (role=generic), where an
              aria-label is not a reliable accessible name — so the meaning is
              ALSO carried by real text: the bare digit is hidden from AT and
              the full wording is announced instead (A11Y-002). */}
          <span aria-hidden="true">{list.length}</span>
          <span className="sr-only">
            {t("countLabel", { count: list.length })}
          </span>
        </StatusBadge>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t("empty")} className="py-8" />
      ) : (
        <ul>
          {list.map((req) => (
            <li
              key={req.id}
              className="border-border border-b px-5 py-3.5 last:border-b-0"
              aria-busy={pendingId === req.id}
            >
              <p className="font-bold text-foreground text-xs">
                {req.studentName}
              </p>
              <p className="mt-0.5 text-edu-text-secondary text-xs">
                {t("item", {
                  start: req.startDate,
                  end: req.endDate,
                  reason: req.reason,
                })}
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={pendingId === req.id}
                  aria-label={t("approveLabel", { student: req.studentName })}
                  onClick={() => handleApprove(req)}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  {t("approve")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={pendingId === req.id}
                  aria-label={t("rejectLabel", { student: req.studentName })}
                  onClick={() => setRejectTarget(req)}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {t("reject")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The canonical reason dialog (decision 0026) — the same component and
          the same `discipline.leave.rejectDialog.*` copy the discipline screen
          uses, because it is literally the same decision. */}
      <ReasonConfirmDialog
        open={rejectTarget !== null}
        title={tDialog("title")}
        description={tDialog("description")}
        reasonLabel={tDialog("reason")}
        reasonPlaceholder={tDialog("reasonPlaceholder")}
        confirmLabel={tDialog("confirm")}
        cancelLabel={tDialog("cancel")}
        minLength={MIN_REJECT_REASON_LENGTH}
        requiredMessage={tDialog("reasonMinLength")}
        tooShortMessage={tDialog("reasonMinLength")}
        isPending={pendingId !== null && pendingId === rejectTarget?.id}
        // Confirming REMOVES the row that owns the invoking button, so the
        // dialog's focus return has nothing to go back to — send it here.
        returnFocusRef={titleRef}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleReject}
      />
    </section>
  );
}
