"use client";

import { Check } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Ref } from "react";
import type { SubmissionVm } from "./course-player.i-vm";

export interface SubmittedBannerProps {
  submission: SubmissionVm;
  /** Set by `submit-box.tsx` so it can move keyboard focus here when the box
   *  it replaced disappears. Unused on the page-load path (nothing to retarget
   *  — the banner is simply part of the document). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * "Đã nộp lúc …" — rendered from a SERVER-provided submission in both places
 * that can know one: the RSC read on page load, and the Server Action's own
 * response after a submit (including the 409 re-read). One component, so the
 * two paths can never drift into two different-looking confirmations.
 *
 * The grade line is a promise about a capability BE does not have yet (US-141),
 * stated plainly rather than shown as an empty score field.
 *
 * `tabIndex={-1}`: programmatically focusable (the submit flow lands here) but
 * never in the tab order — a static confirmation is not a control.
 */
export function SubmittedBanner({ submission, ref }: SubmittedBannerProps) {
  const t = useTranslations("courses.player");
  const format = useFormatter();

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-[10px] bg-edu-success-light px-3.5 py-3 font-bold text-edu-success-text text-xs"
    >
      <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
      {t("assignment.submittedAt", {
        date: format.dateTime(new Date(submission.submittedAt), {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })}
      <span className="font-semibold text-edu-text-secondary">
        {t("assignment.gradePending")}
      </span>
    </div>
  );
}
