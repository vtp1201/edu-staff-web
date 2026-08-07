import "server-only";
import { makeListPendingApprovalBatchesUseCase } from "@/bootstrap/di/grades.di";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { PendingApprovalVM } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/**
 * RSC seed for the tenant-wide pending-approval rollup (US-E18.46), shared by
 * `/admin/grade-book` and `/principal/grade-book`.
 *
 * ONE implementation for the two separately-guarded approver routes — same
 * reasoning as the Server Actions living here: the routes are distinct because
 * their layout guards are strict-equality, but the composition is identical and
 * a copy per route could silently drift.
 *
 * HONEST DEGRADE: a failed rollup read is returned as a failure KEY on an empty
 * page, never thrown. The rollup is a secondary discovery read — losing it must
 * shrink the screen to "picker + sheet" (its pre-US-E18.46 behaviour) with a
 * retryable error card, not take the grade sheet down with it.
 */
export async function loadPendingApprovalSeed(): Promise<PendingApprovalVM> {
  const result = await (
    await makeListPendingApprovalBatchesUseCase()
  ).execute();
  if (isFailure(result)) {
    return { items: [], nextCursor: null, hasMore: false, error: result.type };
  }
  return {
    items: result.items,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    error: null,
  };
}
