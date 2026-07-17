import { describe, expect, it } from "vitest";
import { SearchQuestionsUseCase } from "../search-questions.use-case";
import { FakeQuestionBankRepository, makeQuestion } from "./fake-repo";

describe("SearchQuestionsUseCase", () => {
  it("blocks with search-filter-required when neither subject nor tag is set (no repo call)", async () => {
    const repo = new FakeQuestionBankRepository();
    const result = await new SearchQuestionsUseCase(repo).execute({});
    expect(result).toEqual({
      ok: false,
      failure: { type: "search-filter-required" },
    });
    expect(repo.lastSearchParams).toBeUndefined();
  });

  it("blocks when subjectId is the 'all' sentinel and tag is empty", async () => {
    const repo = new FakeQuestionBankRepository();
    const result = await new SearchQuestionsUseCase(repo).execute({
      subjectId: "all",
      tag: "  ",
    });
    expect(result).toEqual({
      ok: false,
      failure: { type: "search-filter-required" },
    });
    expect(repo.lastSearchParams).toBeUndefined();
  });

  it("searches when a subject is set and returns the page", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.searchResult = {
      items: [makeQuestion({ id: "q-9", status: "PUBLISHED" })],
      hasMore: false,
    };
    const result = await new SearchQuestionsUseCase(repo).execute({
      subjectId: "sub-math",
      gradeLevel: "12",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.items[0]?.id).toBe("q-9");
    expect(repo.lastSearchParams).toEqual({
      subjectId: "sub-math",
      gradeLevel: "12",
    });
  });

  it("searches when only a tag is set", async () => {
    const repo = new FakeQuestionBankRepository();
    const result = await new SearchQuestionsUseCase(repo).execute({
      tag: "lượng giác",
    });
    expect(result.ok).toBe(true);
    expect(repo.lastSearchParams).toEqual({ tag: "lượng giác" });
  });

  it("maps a defense-in-depth thrown search-filter-required (bypass) to the same key", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.searchResult = new Error("search-filter-required");
    const result = await new SearchQuestionsUseCase(repo).execute({
      subjectId: "sub-math",
    });
    expect(result).toEqual({
      ok: false,
      failure: { type: "search-filter-required" },
    });
  });

  it("maps a thrown forbidden-browse failure", async () => {
    const repo = new FakeQuestionBankRepository();
    repo.searchResult = new Error("forbidden-browse");
    const result = await new SearchQuestionsUseCase(repo).execute({
      tag: "x",
    });
    expect(result).toEqual({
      ok: false,
      failure: { type: "forbidden-browse" },
    });
  });
});
