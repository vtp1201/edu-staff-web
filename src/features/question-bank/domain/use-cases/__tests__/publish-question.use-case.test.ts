import { describe, expect, it } from "vitest";
import { PublishQuestionUseCase } from "../publish-question.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

describe("PublishQuestionUseCase", () => {
  it("publishes and returns the PUBLISHED question", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.publishResult = makeQuestion({
      id: "q-1",
      status: "PUBLISHED",
      publishedAt: "2026-07-02T00:00:00Z",
    });
    const result = await new PublishQuestionUseCase(repo).execute("q-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("PUBLISHED");
      expect(result.value.publishedAt).toBe("2026-07-02T00:00:00Z");
    }
    expect(repo.lastPublishId).toBe("q-1");
  });

  it("maps the already-published race to that failure key (AC-905.6)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.publishResult = new Error("already-published");
    const result = await new PublishQuestionUseCase(repo).execute("q-1");
    expect(result).toEqual({
      ok: false,
      failure: { type: "already-published" },
    });
  });

  it("maps a thrown forbidden-edit failure (ownership check)", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.publishResult = new Error("forbidden-edit");
    const result = await new PublishQuestionUseCase(repo).execute("q-1");
    expect(result).toEqual({ ok: false, failure: { type: "forbidden-edit" } });
  });
});
