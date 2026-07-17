import { describe, expect, it } from "vitest";
import { GetQuestionUseCase } from "../get-question.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

describe("GetQuestionUseCase", () => {
  it("returns the question on success", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.getResult = makeQuestion({ id: "q-42", status: "PUBLISHED" });
    const result = await new GetQuestionUseCase(repo).execute("q-42");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("q-42");
    expect(repo.lastGetId).toBe("q-42");
  });

  it.each([
    "not-found",
    "not-visible",
    "network-error",
  ] as const)("maps a thrown %s failure (single-GET visibility gate)", async (key) => {
    const repo = new FakeQuestionBankRepository();
    repo.getResult = new Error(key);
    const result = await new GetQuestionUseCase(repo).execute("q-x");
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});
