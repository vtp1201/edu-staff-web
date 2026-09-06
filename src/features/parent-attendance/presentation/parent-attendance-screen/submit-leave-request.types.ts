import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";

/**
 * Result shapes for the leave-request Server Actions (US-E24.6).
 *
 * They live HERE, not next to the actions: a `'use server'` module may only
 * export async functions — exporting a type from one breaks the build (the
 * compiler emits it as a runtime export). Same split every other action pair in
 * this repo uses.
 */

/** Outcome of "create the request, then upload its files". */
export type SubmitLeaveRequestResult =
  | {
      ok: true;
      requestId: string;
      /** Files attempted. `0` when the user attached none. */
      total: number;
      /**
       * Files that failed. The REQUEST still exists — the screen must say
       * "đơn đã gửi, N/M tệp thất bại" and offer a files-only retry, never
       * imply the whole submission failed.
       */
      failedCount: number;
    }
  | { ok: false; errorKey: DisciplineFailure["type"] };

/** Outcome of re-uploading files to an EXISTING request (no new request). */
export interface RetryLeaveAttachmentsResult {
  ok: true;
  total: number;
  failedCount: number;
}
