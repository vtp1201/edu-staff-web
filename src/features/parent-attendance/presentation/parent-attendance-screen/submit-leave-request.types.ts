import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";

/**
 * Result shapes for the leave-request Server Actions (US-E24.6).
 *
 * They live HERE, not next to the actions: a `'use server'` module may only
 * export async functions — exporting a type from one breaks the build (the
 * compiler emits it as a runtime export). Same split every other action pair in
 * this repo uses.
 */

/**
 * Files that did NOT upload, BY NAME — not merely how many.
 *
 * A count is not actionable: the screen has to re-send exactly the files that
 * failed, because core counts attachments server-side and 409s past its 3-file
 * cap. Re-sending the whole original list after a 1-of-3 failure would push the
 * request to 5 attachments and make the retry affordance permanently broken
 * (tech-lead review, fix round). Names are the only handle the client and the
 * server share, so they are what crosses the boundary.
 */
export type FailedAttachmentNames = string[];

/** Outcome of "create the request, then upload its files". */
export type SubmitLeaveRequestResult =
  | {
      ok: true;
      requestId: string;
      /** Files attempted. `0` when the user attached none. */
      total: number;
      /**
       * Names of the files that failed. The REQUEST still exists — the screen
       * must say "đơn đã gửi, N/M tệp thất bại" and offer a retry of THESE
       * files only, never imply the whole submission failed.
       */
      failedFiles: FailedAttachmentNames;
    }
  | { ok: false; errorKey: DisciplineFailure["type"] };

/** Outcome of re-uploading files to an EXISTING request (no new request). */
export interface RetryLeaveAttachmentsResult {
  ok: true;
  total: number;
  failedFiles: FailedAttachmentNames;
}
