import type { PendingApprovalVM } from "../grade-entry-screen/grade-entry-screen.i-vm";

/**
 * Identity of an RSC-delivered rollup seed (US-E18.46 fix round).
 *
 * `PendingApprovalList` owns its rows locally (so "load more" can append), but
 * the seed is re-delivered whenever the RSC page re-renders — notably right
 * after an approve/reject succeeds and the screen revalidates. Without a sync
 * key the list would keep rendering the FIRST seed for the whole session, so a
 * tuple whose last pending cell was just approved would stay in the queue.
 *
 * Pure + framework-free so the "what counts as a different seed" rule is
 * unit-tested instead of asserted through a re-render. It hashes everything the
 * component derives state from — the batches (tuple, count and submission time,
 * because a partial approve only shrinks the count), the pagination cursor and
 * the read outcome — with delimiters that cannot appear in an id.
 */
export function pendingApprovalSeedKey(seed: PendingApprovalVM): string {
  const batches = seed.items
    .map(
      (b) =>
        `${b.classId}|${b.subjectId}|${b.termId}|${b.pendingCount}|${b.submittedAt}`,
    )
    .join(";");
  return [
    seed.error ?? "-",
    seed.hasMore ? "1" : "0",
    seed.nextCursor ?? "-",
    batches,
  ].join("~");
}
