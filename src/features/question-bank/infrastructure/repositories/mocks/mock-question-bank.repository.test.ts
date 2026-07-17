import { describe, expect, it } from "vitest";
import {
  MOCK_CURRENT_TEACHER_ID,
  MOCK_FORBIDDEN_QUESTION_ID,
} from "./fixtures";
import { MockQuestionBankRepository } from "./mock-question-bank.repository";

describe("MockQuestionBankRepository (natural failure triggers)", () => {
  it("listMine returns only the current teacher's questions", async () => {
    const repo = new MockQuestionBankRepository();
    const page = await repo.listMine({});
    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every((q) => q.authorId === MOCK_CURRENT_TEACHER_ID),
    ).toBe(true);
  });

  it("search returns only PUBLISHED questions (cross-teacher) when a subject is set", async () => {
    const repo = new MockQuestionBankRepository();
    const page = await repo.search({ subjectId: "sub-phys" });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((q) => q.status === "PUBLISHED")).toBe(true);
    expect(page.items.every((q) => q.subjectId === "sub-phys")).toBe(true);
  });

  it("search throws search-filter-required when neither subject nor tag is set (bypass)", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.search({})).rejects.toThrow("search-filter-required");
  });

  it("getById throws not-found for an unknown id", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.getById("nope")).rejects.toThrow("not-found");
  });

  it("getById throws not-visible for another teacher's DRAFT", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.getById("q-other-draft")).rejects.toThrow("not-visible");
  });

  it("getById returns another teacher's PUBLISHED question (cross-teacher read)", async () => {
    const repo = new MockQuestionBankRepository();
    const q = await repo.getById(MOCK_FORBIDDEN_QUESTION_ID);
    expect(q.status).toBe("PUBLISHED");
  });

  it("create appends a DRAFT owned by the current teacher (publishedAt absent)", async () => {
    const repo = new MockQuestionBankRepository();
    const q = await repo.create({
      questionType: "SHORT_ANSWER",
      subjectId: "sub-math",
      gradeLevel: "11",
      difficulty: "EASY",
      body: "Câu hỏi mới",
    });
    expect(q.status).toBe("DRAFT");
    expect(q.authorId).toBe(MOCK_CURRENT_TEACHER_ID);
    expect(q.publishedAt).toBeUndefined();
    expect(q.expectedAnswer).toBeNull();
  });

  it("update throws forbidden-edit on another teacher's question (ownership branch)", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(
      repo.update(MOCK_FORBIDDEN_QUESTION_ID, { body: "hack" }),
    ).rejects.toThrow("forbidden-edit");
  });

  it("update throws already-published on an own PUBLISHED question", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.update("q1", { body: "v2" })).rejects.toThrow(
      "already-published",
    );
  });

  it("update mutates an own DRAFT's body/tags", async () => {
    const repo = new MockQuestionBankRepository();
    const updated = await repo.update("q3", {
      body: "Nội dung đã sửa",
      tags: ["mới"],
    });
    expect(updated.body).toBe("Nội dung đã sửa");
    expect(updated.tags).toEqual(["mới"]);
    expect(updated.status).toBe("DRAFT");
  });

  it("publish transitions an own DRAFT to PUBLISHED with a publishedAt", async () => {
    const repo = new MockQuestionBankRepository();
    const published = await repo.publish("q7");
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toBeDefined();
  });

  it("publish throws forbidden-edit on another teacher's question", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.publish(MOCK_FORBIDDEN_QUESTION_ID)).rejects.toThrow(
      "forbidden-edit",
    );
  });

  it("listMine surfaces invalid-cursor for a malformed cursor", async () => {
    const repo = new MockQuestionBankRepository();
    await expect(repo.listMine({ cursor: "-3" })).rejects.toThrow(
      "invalid-cursor",
    );
  });
});
