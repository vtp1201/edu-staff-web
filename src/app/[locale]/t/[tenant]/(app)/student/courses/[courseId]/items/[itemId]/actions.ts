"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetAssignmentDetailUseCase,
  makeSubmitAssignmentUseCase,
} from "@/bootstrap/di/lms.di";
import type { SubmitAssignmentResult } from "@/features/lms/presentation/course-player/course-player.i-vm";

/** Route patterns (with the `(app)` group, per the repo's existing actions). */
const ITEM_PATH =
  "/[locale]/t/[tenant]/(app)/student/courses/[courseId]/items/[itemId]";
const COURSE_PATH = "/[locale]/t/[tenant]/(app)/student/courses/[courseId]";

/**
 * Submit work for ONE assignment — irreversible (BE enforces a single attempt).
 *
 * `assignmentId` is BOUND BY THE PAGE (`.bind`, like the sibling routes), so
 * the browser only ever sends `content`: a client cannot aim this action at an
 * assignment it did not navigate to.
 *
 * `content` is passed to the use-case UNTOUCHED. The 20 000-character cap in
 * the submit box is a UX affordance, not a boundary — trimming or truncating
 * here would swallow BE's `invalid-content` refusal and quietly submit
 * something other than what the student wrote.
 *
 * Authorization note (decision 0063): there is no client-supplied identity to
 * forge here. `POST /assignments/{id}/submissions` derives the student from the
 * bearer token server-side, so the submission is bound to the caller by BE; the
 * `requireRole` gate below is the route-level defence in depth.
 */
export async function submitAssignmentAction(
  assignmentId: string,
  content: string,
): Promise<SubmitAssignmentResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeSubmitAssignmentUseCase()).execute(
    assignmentId,
    content,
  );

  if (result.ok) {
    // This route shows the submitted banner; the course timeline shows the
    // same item's "✓ Đã nộp" pill on a DIFFERENT route with its own cache.
    revalidatePath(ITEM_PATH, "page");
    revalidatePath(COURSE_PATH, "page");
    return {
      ok: true,
      submission: {
        content: result.data.content,
        submittedAt: result.data.submittedAt,
      },
    };
  }

  if (result.failure.type === "already-submitted") {
    // A race (second tab / stale form). The submission EXISTS on the server —
    // this tab simply lost — so both cached routes are just as stale as on the
    // success path and must be invalidated the same way.
    revalidatePath(ITEM_PATH, "page");
    revalidatePath(COURSE_PATH, "page");

    // Re-read so the UI can show the REAL submission instead of the text still
    // sitting in this tab's textarea.
    const detail = await (await makeGetAssignmentDetailUseCase()).execute(
      assignmentId,
    );
    const mine = detail.ok ? detail.data.mySubmission : null;
    return {
      ok: false,
      errorKey: "already-submitted",
      submission: mine
        ? { content: mine.content, submittedAt: mine.submittedAt }
        : null,
    };
  }

  return { ok: false, errorKey: result.failure.type };
}
