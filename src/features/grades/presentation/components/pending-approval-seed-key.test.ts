import { describe, expect, it } from "vitest";
import type { PendingApprovalBatch } from "../../domain/entities/pending-approval-batch.entity";
import type { PendingApprovalVM } from "../grade-entry-screen/grade-entry-screen.i-vm";
import { pendingApprovalSeedKey } from "./pending-approval-seed-key";

const BATCH: PendingApprovalBatch = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  pendingCount: 12,
  submittedAt: "2026-08-01T02:00:00Z",
};

function seed(over: Partial<PendingApprovalVM> = {}): PendingApprovalVM {
  return {
    items: [BATCH],
    nextCursor: null,
    hasMore: false,
    error: null,
    ...over,
  };
}

describe("pendingApprovalSeedKey", () => {
  it("is stable for an identical seed delivered as a new object", () => {
    expect(pendingApprovalSeedKey(seed())).toBe(
      pendingApprovalSeedKey(seed({ items: [{ ...BATCH }] })),
    );
  });

  /**
   * The regression this key exists for: after an approve clears the last
   * pending cell of a tuple, the fresh RSC seed drops that batch. If the key
   * did not change, the list would keep rendering the stale queue forever.
   */
  it("changes when a batch disappears from the seed", () => {
    expect(pendingApprovalSeedKey(seed({ items: [] }))).not.toBe(
      pendingApprovalSeedKey(seed()),
    );
  });

  /** A partial approve leaves the tuple pending but with a SMALLER count. */
  it("changes when only a batch's pending count changes", () => {
    expect(
      pendingApprovalSeedKey(seed({ items: [{ ...BATCH, pendingCount: 11 }] })),
    ).not.toBe(pendingApprovalSeedKey(seed()));
  });

  it("changes when the pagination cursor or hasMore changes", () => {
    expect(pendingApprovalSeedKey(seed({ nextCursor: "cur-2" }))).not.toBe(
      pendingApprovalSeedKey(seed()),
    );
    expect(pendingApprovalSeedKey(seed({ hasMore: true }))).not.toBe(
      pendingApprovalSeedKey(seed()),
    );
  });

  /** A re-read that newly failed (or newly recovered) must re-seed too. */
  it("changes when the seed's read outcome changes", () => {
    expect(
      pendingApprovalSeedKey(seed({ items: [], error: "network-error" })),
    ).not.toBe(pendingApprovalSeedKey(seed({ items: [] })));
  });

  /** Two different batches must not collide via delimiter smuggling. */
  it("distinguishes seeds whose batches differ only by tuple", () => {
    expect(
      pendingApprovalSeedKey(seed({ items: [{ ...BATCH, termId: "HK2" }] })),
    ).not.toBe(pendingApprovalSeedKey(seed()));
  });
});
