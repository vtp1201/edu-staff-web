"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  LeaveRequestDialog,
  type LeaveRequestSubmission,
} from "@/components/shared/leave-request-dialog";
import { Button } from "@/components/ui/button";
import type { SubmitLeaveRequestInput } from "../../../domain/entities/leave-request.entity";
import type { DisciplineFailure } from "../../../domain/failures/discipline.failure";
import type { StudentConductActionResult } from "../student-conduct-screen.i-vm";

/** Local date ISO "YYYY-MM-DD" (no timezone shift) — the dialog's earliest
 *  selectable day (core refuses a back-dated request). */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Student / parent self-service "xin nghỉ phép" CTA (US-E09.2), consolidated
 * onto the canonical `LeaveRequestDialog` in US-E24.20 (backlog #12) — hence
 * the rename from `leave-request-sheet.tsx`: it is a Dialog now, not a Sheet.
 *
 * No leave-TYPE control (core has no such concept — the real read mapper
 * fabricates `"other"` for every row, so this write path uses the same
 * convention) and no attachment picker (`showAttachments={false}` — this
 * submit path has no attachment-upload use-case wired).
 */
export function LeaveRequestTrigger({
  studentId,
  submittedBy,
  submitAction,
  onSubmitted,
}: {
  studentId: string;
  submittedBy: "student" | "parent";
  submitAction: (
    input: SubmitLeaveRequestInput,
  ) => Promise<StudentConductActionResult>;
  /** Called with the submitted input on success so the parent can optimistically update. */
  onSubmitted?: (input: SubmitLeaveRequestInput) => void;
}) {
  const t = useTranslations("discipline.studentConduct.leaveRequest");
  const tErr = useTranslations("discipline.errors");
  const [open, setOpen] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<
    DisciplineFailure["type"] | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = ({
    startDate,
    endDate,
    reason,
  }: LeaveRequestSubmission) => {
    setServerErrorKey(null);
    const input: SubmitLeaveRequestInput = {
      studentId,
      startDate,
      endDate,
      type: "other",
      reason,
      submittedBy,
    };
    startTransition(async () => {
      const res = await submitAction(input);
      if (res.errorKey) {
        setServerErrorKey(res.errorKey);
        return;
      }
      toast.success(t("success"));
      onSubmitted?.(input);
      setOpen(false);
    });
  };

  return (
    <>
      <Button ref={ctaRef} type="button" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        {t("button")}
      </Button>

      <LeaveRequestDialog
        open={open}
        minDate={todayISO()}
        showAttachments={false}
        isPending={isPending}
        errorMessage={serverErrorKey ? tErr(serverErrorKey) : null}
        returnFocusRef={ctaRef}
        onSubmit={handleSubmit}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setServerErrorKey(null);
        }}
      />
    </>
  );
}
