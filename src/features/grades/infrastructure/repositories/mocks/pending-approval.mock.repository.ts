import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  PendingApprovalBatch,
  PendingApprovalPage,
} from "../../../domain/entities/pending-approval-batch.entity";
import type { GradesFailure } from "../../../domain/failures/grades.failure";
import type { IPendingApprovalRepository } from "../../../domain/repositories/i-pending-approval.repository";
import { MOCK_PENDING_APPROVAL_BATCHES } from "./fixtures";

/** Mirrors BE's clamp (`<=0` → 20, `>100` → 100) so mock paging behaves alike. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Opaque-ish cursor: the mock's page anchor is just the next index. */
const CURSOR_PREFIX = "mock-pab-";

function encodeCursor(nextIndex: number): string {
  return `${CURSOR_PREFIX}${nextIndex}`;
}

function decodeCursor(cursor: string): number {
  if (!cursor.startsWith(CURSOR_PREFIX)) {
    const failure: GradesFailure = { type: "invalid-cursor" };
    throw failure;
  }
  const index = Number(cursor.slice(CURSOR_PREFIX.length));
  if (!Number.isInteger(index) || index < 0) {
    const failure: GradesFailure = { type: "invalid-cursor" };
    throw failure;
  }
  return index;
}

/**
 * Mock-mode tenant-wide rollup (US-E18.46). Reproduces the three behaviours the
 * screen depends on, so `NEXT_PUBLIC_USE_MOCK=true` demos the real approver
 * triage flow rather than a static stub:
 *
 * 1. oldest-`submittedAt`-first ordering (the BE's triage order);
 * 2. real cursor pagination incl. `hasMore` (so "load more" is exercisable);
 * 3. a `invalid-cursor` failure for an undecodable cursor.
 *
 * Every fixture row points at a `(classId, subjectId)` the mock class-subject
 * picker also knows, so clicking a row in mock mode lands on a sheet that
 * actually loads.
 */
export class MockPendingApprovalRepository
  implements IPendingApprovalRepository
{
  async listPendingApprovalBatches(
    params: { cursor?: string; limit?: number } = {},
  ): Promise<PendingApprovalPage> {
    await mockDelay();

    let limit = params.limit ?? DEFAULT_LIMIT;
    if (limit <= 0) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const all: PendingApprovalBatch[] = [...MOCK_PENDING_APPROVAL_BATCHES].sort(
      (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
    );

    const start = params.cursor ? decodeCursor(params.cursor) : 0;
    const end = Math.min(start + limit, all.length);
    const items = all.slice(start, end).map((b) => ({ ...b }));
    const hasMore = end < all.length;

    return {
      items,
      nextCursor: hasMore ? encodeCursor(end) : null,
      hasMore,
    };
  }
}
