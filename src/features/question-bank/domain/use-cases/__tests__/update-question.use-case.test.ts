import { describe, expect, it } from "vitest";
import { UpdateQuestionUseCase } from "../update-question.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

describe("UpdateQuestionUseCase", () => {
  it("updates and forwards only body/expectedAnswer/tags (FR-009)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.updateResult = makeQuestion({ id: "q-1", body: "v2" });
    const result = await new UpdateQuestionUseCase(repo).execute("q-1", {
      body: "v2",
      expectedAnswer: "ans",
      tags: ["a"],
    });
    expect(result.ok).toBe(true);
    expect(repo.lastUpdate).toEqual({
      id: "q-1",
      input: { body: "v2", expectedAnswer: "ans", tags: ["a"] },
    });
  });

  it("blocks an empty body with body-required (no repo call)", async () => {
    const repo = new FakeQuestionBankRepository();
    const result = await new UpdateQuestionUseCase(repo).execute("q-1", {
      body: "  ",
    });
    expect(result).toEqual({ ok: false, failure: { type: "body-required" } });
    expect(repo.lastUpdate).toBeUndefined();
  });

  it("maps a thrown already-published failure (edit race)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.updateResult = new Error("already-published");
    const result = await new UpdateQuestionUseCase(repo).execute("q-1", {
      body: "v2",
    });
    expect(result).toEqual({
      ok: false,
      failure: { type: "already-published" },
    });
  });

  it("maps a thrown forbidden-edit failure (ownership check)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.updateResult = new Error("forbidden-edit");
    const result = await new UpdateQuestionUseCase(repo).execute("q-1", {
      body: "v2",
    });
    expect(result).toEqual({ ok: false, failure: { type: "forbidden-edit" } });
  });
});
