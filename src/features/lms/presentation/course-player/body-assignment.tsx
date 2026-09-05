"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActiveItemVm, SubmitAssignmentFn } from "./course-player.i-vm";
import { SubmitBox } from "./submit-box";
import { SubmittedBanner } from "./submitted-banner";

export interface BodyAssignmentProps {
  item: Extract<ActiveItemVm, { kind: "assignment" }>;
  /** `null` when no submit is possible at all — the page could not read the
   *  assignment, so it refuses to offer a ONE-WAY action on unknown state. */
  submitAssignment: SubmitAssignmentFn | null;
}

/**
 * An ASSIGNMENT: the brief, then exactly one of three mutually exclusive
 * states. The branching happens HERE, before `submit-box.tsx` mounts, so an
 * already-submitted or closed assignment never even renders a form that could
 * be submitted.
 *
 * A closed-and-unsubmitted assignment is a real consequence for the student, so
 * it gets error-toned text (`text-edu-error-text`, ADR 0049 — the readable
 * token, not `text-destructive`) plus a lock icon and a full sentence.
 */
export function BodyAssignment({
  item,
  submitAssignment,
}: BodyAssignmentProps) {
  const t = useTranslations("courses.player");

  return (
    <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
      <section className="flex flex-col gap-1.5">
        <h2 className="font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.07em]">
          {t("assignment.instructionsLabel")}
        </h2>
        <p className="whitespace-pre-line text-edu-text-secondary text-sm leading-relaxed">
          {item.instructions ?? t("assignment.noInstructions")}
        </p>
      </section>

      {item.mySubmission !== null ? (
        <SubmittedBanner submission={item.mySubmission} />
      ) : item.state === "CLOSED" ? (
        <p className="flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-muted px-3.5 py-3 font-bold text-edu-error-text text-xs">
          <Lock
            className="size-3.5 shrink-0"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          {t("assignment.closedNotSubmitted")}
        </p>
      ) : submitAssignment !== null ? (
        <SubmitBox assignmentId={item.id} onSubmit={submitAssignment} />
      ) : (
        <p className="text-edu-text-secondary text-sm">
          {t("assignment.unavailable")}
        </p>
      )}
    </div>
  );
}
