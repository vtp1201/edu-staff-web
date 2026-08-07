import { describe, expect, it, vi } from "vitest";
import type { PendingApprovalPage } from "../entities/pending-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IPendingApprovalRepository } from "../repositories/i-pending-approval.repository";
import { ListPendingApprovalBatchesUseCase } from "./list-pending-approval-batches.use-case";

const PAGE: PendingApprovalPage = {
  items: [
    {
      classId: "class-1",
      subjectId: "subj-1",
      termId: "HK1",
      pendingCount: 12,
      submittedAt: "2026-08-01T02:00:00Z",
    },
  ],
  nextCursor: "cur-2",
  hasMore: true,
};

function makeRepo(over: Partial<IPendingApprovalRepository> = {}) {
  return {
    listPendingApprovalBatches: vi.fn(async () => PAGE),
    ...over,
  } as unknown as IPendingApprovalRepository;
}

describe("ListPendingApprovalBatchesUseCase", () => {
  it("returns the first page when called with no cursor", async () => {
    const repo = makeRepo();
    const result = await new ListPendingApprovalBatchesUseCase(repo).execute();
    expect(result).toEqual(PAGE);
    expect(repo.listPendingApprovalBatches).toHaveBeenCalledWith({
      cursor: undefined,
      limit: undefined,
    });
  });

  it("threads a cursor + limit through to the repository", async () => {
    const repo = makeRepo();
    await new ListPendingApprovalBatchesUseCase(repo).execute({
      cursor: "cur-2",
      limit: 50,
    });
    expect(repo.listPendingApprovalBatches).toHaveBeenCalledWith({
      cursor: "cur-2",
      limit: 50,
    });
  });

  /**
   * BE CLAMPS an out-of-range limit (`<=0` → 20, `>100` → 100) rather than
   * rejecting it, so the use-case must NOT invent a client-side rejection that
   * the server would have happily served.
   */
  it("passes an out-of-range limit through untouched (BE clamps, never rejects)", async () => {
    const repo = makeRepo();
    await new ListPendingApprovalBatchesUseCase(repo).execute({ limit: 5000 });
    expect(repo.listPendingApprovalBatches).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 5000,
    });
  });

  it("returns a thrown GradesFailure as a value", async () => {
    const failure: GradesFailure = { type: "invalid-cursor" };
    const repo = makeRepo({
      listPendingApprovalBatches: vi.fn(async () => {
        throw failure;
      }),
    });
    await expect(
      new ListPendingApprovalBatchesUseCase(repo).execute({ cursor: "bad" }),
    ).resolves.toEqual(failure);
  });

  it("maps a non-failure throw to network-error", async () => {
    const repo = makeRepo({
      listPendingApprovalBatches: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    await expect(
      new ListPendingApprovalBatchesUseCase(repo).execute(),
    ).resolves.toEqual({ type: "network-error" });
  });
});
