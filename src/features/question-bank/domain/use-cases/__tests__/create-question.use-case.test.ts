import { describe, expect, it } from "vitest";
import type { CreateQuestionInput } from "../../entities/question.entity";
import { CreateQuestionUseCase } from "../create-question.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

const validInput: CreateQuestionInput = {
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "11",
  difficulty: "HARD",
  body: "Giải phương trình lượng giác",
};

describe("CreateQuestionUseCase", () => {
  it("returns the created question and forwards the input to the repo", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.createResult = makeQuestion({ id: "q-new", body: validInput.body });
    const result = await new CreateQuestionUseCase(repo).execute(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("q-new");
    expect(repo.lastCreateInput).toEqual(validInput);
  });

  it("blocks an empty body with body-required (no repo call)", async () => {
    const repo = new FakeQuestionBankRepository();
    const result = await new CreateQuestionUseCase(repo).execute({
      ...validInput,
      body: "   ",
    });
    expect(result).toEqual({ ok: false, failure: { type: "body-required" } });
    expect(repo.lastCreateInput).toBeUndefined();
  });

  it("saves with a blank expectedAnswer (FR-007 — never required)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.createResult = makeQuestion({ expectedAnswer: null });
    const result = await new CreateQuestionUseCase(repo).execute({
      ...validInput,
      expectedAnswer: "",
    });
    expect(result.ok).toBe(true);
    expect(repo.lastCreateInput?.expectedAnswer).toBe("");
  });

  it.each([
    "subject-not-found",
    "type-not-supported",
    "invalid-difficulty",
    "forbidden-browse",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeQuestionBankRepository();
    repo.createResult = new Error(key);
    const result = await new CreateQuestionUseCase(repo).execute(validInput);
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });

  it("maps an unmatched thrown message to unknown (preserving it)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.createResult = new Error("boom-503");
    const result = await new CreateQuestionUseCase(repo).execute(validInput);
    expect(result).toEqual({
      ok: false,
      failure: { type: "unknown", message: "boom-503" },
    });
  });
});
