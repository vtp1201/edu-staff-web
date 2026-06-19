import { describe, expect, it } from "vitest";
import { MockGradeApprovalRepository } from "./grade-approval.mock.repository";

describe("MockGradeApprovalRepository", () => {
  it("lists all seeded batches when no filter", async () => {
    const repo = new MockGradeApprovalRepository();
    const batches = await repo.listApprovalBatches();
    expect(batches).toHaveLength(4);
  });

  it("filters batches by status", async () => {
    const repo = new MockGradeApprovalRepository();
    const pending = await repo.listApprovalBatches("PENDING_APPROVAL");
    expect(pending.every((b) => b.status === "PENDING_APPROVAL")).toBe(true);
    expect(pending).toHaveLength(2);
  });

  it("returns batch detail with distribution and labeled preview rows", async () => {
    const repo = new MockGradeApprovalRepository();
    const detail = await repo.getBatchDetail("batch-001");
    expect(detail.averageScore).toBe(8.2);
    expect(detail.previewRows.length).toBeGreaterThan(0);
    expect(detail.distribution).toHaveLength(5);
  });

  it("throws not-found for unknown batch detail", async () => {
    const repo = new MockGradeApprovalRepository();
    await expect(repo.getBatchDetail("nope")).rejects.toEqual({
      type: "not-found",
    });
  });

  it("approves a PENDING_APPROVAL batch → PUBLISHED", async () => {
    const repo = new MockGradeApprovalRepository();
    const batch = await repo.approveGradeBatch("batch-001");
    expect(batch.status).toBe("PUBLISHED");
  });

  it("rejects approving a LOCKED batch with batch-locked", async () => {
    const repo = new MockGradeApprovalRepository();
    await expect(repo.approveGradeBatch("batch-003")).rejects.toEqual({
      type: "batch-locked",
    });
  });

  it("rejects approving a PUBLISHED batch with not-pending-approval", async () => {
    const repo = new MockGradeApprovalRepository();
    await expect(repo.approveGradeBatch("batch-002")).rejects.toEqual({
      type: "not-pending-approval",
    });
  });

  it("requests revision and removes the batch from the queue", async () => {
    const repo = new MockGradeApprovalRepository();
    await repo.requestGradeRevision("batch-001", "Cần xem lại điểm");
    const remaining = await repo.listApprovalBatches();
    expect(remaining.find((b) => b.id === "batch-001")).toBeUndefined();
  });

  it("bulk-locks PUBLISHED batches → LOCKED", async () => {
    const repo = new MockGradeApprovalRepository();
    const locked = await repo.bulkLockBatches(["batch-002"]);
    expect(locked[0]?.status).toBe("LOCKED");
  });

  it("rejects bulk-lock of a non-PUBLISHED batch with not-published", async () => {
    const repo = new MockGradeApprovalRepository();
    await expect(repo.bulkLockBatches(["batch-001"])).rejects.toEqual({
      type: "not-published",
    });
  });
});
