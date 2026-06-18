import { describe, expect, it } from "vitest";
import { MockExamBankRepository } from "./mocks/exam-bank.mock.repository";

// Integration-level proof against the in-memory mock repo (lms not shipped —
// mock-first, decision 0014). Each test uses a fresh repo instance; the store is
// module-level so we scope assertions to created/independent records.

describe("MockExamBankRepository", () => {
  it("listExamBank with status='draft' returns only draft items", async () => {
    const repo = new MockExamBankRepository();
    const items = await repo.listExamBank({ status: "draft" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.status === "draft")).toBe(true);
  });

  it("deleteExam on a published exam rejects with cannot-delete-published", async () => {
    const repo = new MockExamBankRepository();
    await expect(repo.deleteExam("e-4")).rejects.toThrow(
      "cannot-delete-published",
    );
  });

  it("publishExam flips status to published", async () => {
    const repo = new MockExamBankRepository();
    const summary = await repo.publishExam("e-2");
    expect(summary.status).toBe("published");
    const detail = await repo.getExamDetail("e-2");
    expect(detail.status).toBe("published");
  });

  it("createExam creates a new exam with the correct fields", async () => {
    const repo = new MockExamBankRepository();
    const created = await repo.createExam({
      title: "Đề thi mới",
      subjectId: "s-math",
      durationMinutes: 30,
      maxAttempts: 2,
      questions: [],
    });
    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Đề thi mới");
    expect(created.subjectId).toBe("s-math");
    expect(created.status).toBe("draft");
    const detail = await repo.getExamDetail(created.id);
    expect(detail.title).toBe("Đề thi mới");
  });
});
