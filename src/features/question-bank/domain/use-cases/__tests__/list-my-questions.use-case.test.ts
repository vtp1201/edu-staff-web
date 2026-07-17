import { describe, expect, it } from "vitest";
import { ListMyQuestionsUseCase } from "../list-my-questions.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

describe("ListMyQuestionsUseCase", () => {
  it("returns the page and forwards cursor/limit to the repo", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.listMineResult = {
      items: [makeQuestion({ id: "q-1" }), makeQuestion({ id: "q-2" })],
      nextCursor: "c2",
      hasMore: true,
    };
    const result = await new ListMyQuestionsUseCase(repo).execute({
      cursor: "c1",
      limit: 6,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items.map((q) => q.id)).toEqual(["q-1", "q-2"]);
      expect(result.value.hasMore).toBe(true);
    }
    expect(repo.lastListMineParams).toEqual({ cursor: "c1", limit: 6 });
  });

  it("maps a thrown forbidden-browse failure", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.listMineResult = new Error("forbidden-browse");
    const result = await new ListMyQuestionsUseCase(repo).execute();
    expect(result).toEqual({
      ok: false,
      failure: { type: "forbidden-browse" },
    });
  });

  it("maps a thrown invalid-cursor failure", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.listMineResult = new Error("invalid-cursor");
    const result = await new ListMyQuestionsUseCase(repo).execute({
      cursor: "bad",
    });
    expect(result).toEqual({ ok: false, failure: { type: "invalid-cursor" } });
  });
});
