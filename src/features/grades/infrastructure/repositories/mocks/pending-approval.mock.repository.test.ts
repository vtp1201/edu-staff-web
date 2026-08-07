import { describe, expect, it } from "vitest";
import { MockPendingApprovalRepository } from "./pending-approval.mock.repository";

describe("MockPendingApprovalRepository", () => {
  it("returns batches oldest-submittedAt-first (the BE's triage order)", async () => {
    const page =
      await new MockPendingApprovalRepository().listPendingApprovalBatches();
    const times = page.items.map((b) => Date.parse(b.submittedAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("only lists batches whose classId+subjectId exist in the picker fixture", async () => {
    // Otherwise a click-to-jump row in mock mode would navigate to a tuple the
    // mock picker cannot label or load — a demo dead end.
    const { MOCK_GRADE_SUBJECT_OPTIONS } = await import("./fixtures");
    const page =
      await new MockPendingApprovalRepository().listPendingApprovalBatches();
    for (const batch of page.items) {
      expect(
        MOCK_GRADE_SUBJECT_OPTIONS.some(
          (o) => o.classId === batch.classId && o.subjectId === batch.subjectId,
        ),
      ).toBe(true);
    }
  });

  it("paginates: a limited first page reports hasMore + a cursor", async () => {
    const repo = new MockPendingApprovalRepository();
    const first = await repo.listPendingApprovalBatches({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();
  });

  it("resumes from the cursor without repeating or skipping a batch", async () => {
    const repo = new MockPendingApprovalRepository();
    const all = await repo.listPendingApprovalBatches({ limit: 100 });
    const first = await repo.listPendingApprovalBatches({ limit: 2 });
    const second = await repo.listPendingApprovalBatches({
      cursor: first.nextCursor ?? undefined,
      limit: 100,
    });
    expect([...first.items, ...second.items]).toEqual(all.items);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects an undecodable cursor with the BE's invalid-cursor failure", async () => {
    const repo = new MockPendingApprovalRepository();
    await expect(
      repo.listPendingApprovalBatches({ cursor: "not-a-cursor" }),
    ).rejects.toEqual({ type: "invalid-cursor" });
  });
});
