import type { PendingApprovalBatch } from "../../domain/entities/pending-approval-batch.entity";
import type { ClassSubjectOption } from "../grade-entry-screen/grade-entry-screen.i-vm";

export interface PendingApprovalRow {
  /** Stable list key — the batch identity IS the full tuple (no `batchId` exists). */
  key: string;
  classId: string;
  subjectId: string;
  termId: string;
  /** Resolved class name, or the raw `classId` when the picker doesn't cover it. */
  classLabel: string;
  /** Resolved subject name, or the raw `subjectId`. */
  subjectLabel: string;
  pendingCount: number;
  submittedAt: string;
}

/**
 * Rollup batches → renderable rows (US-E18.46).
 *
 * Pure + framework-free so the label-resolution rules are unit-tested rather
 * than asserted through the DOM. It runs client-side because the SAME rules
 * must apply to the RSC-seeded first page AND to every "load more" page the
 * client fetches afterwards — resolving labels on the server would only cover
 * the first page.
 *
 * The rollup is TENANT-WIDE while the picker options are composed from the
 * classes the caller can list, so an uncovered batch falls back to raw ids
 * instead of being dropped: a batch that is waiting must stay visible (and
 * clickable) even when we cannot name it.
 *
 * Order is preserved exactly — the server's oldest-first tenant-wide sort is a
 * total order across pages that a client re-sort of one page could only break.
 */
export function buildPendingApprovalRows(
  batches: PendingApprovalBatch[],
  classSubjects: ClassSubjectOption[],
): PendingApprovalRow[] {
  return batches.map((batch) => {
    const match = classSubjects.find(
      (cs) => cs.classId === batch.classId && cs.subjectId === batch.subjectId,
    );
    return {
      key: `${batch.classId}|${batch.subjectId}|${batch.termId}`,
      classId: batch.classId,
      subjectId: batch.subjectId,
      termId: batch.termId,
      classLabel: match?.className ?? batch.classId,
      subjectLabel: match?.subjectName ?? batch.subjectId,
      pendingCount: batch.pendingCount,
      submittedAt: batch.submittedAt,
    };
  });
}
