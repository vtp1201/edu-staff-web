import { describe, expect, it, vi } from "vitest";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { DeleteTermUseCase } from "./delete-term.use-case";

function makeRepo(
  overrides: Partial<ICalendarRepository> = {},
): ICalendarRepository {
  return {
    listYears: vi.fn(),
    createYear: vi.fn(),
    getActiveYear: vi.fn(),
    getYear: vi.fn(),
    activateYear: vi.fn(),
    archiveYear: vi.fn(),
    createTerm: vi.fn(),
    listTerms: vi.fn(),
    getTerm: vi.fn(),
    updateTerm: vi.fn(),
    archiveTerm: vi.fn(),
    ...overrides,
  };
}

describe("DeleteTermUseCase", () => {
  it("returns graded-term-delete failure when hasGrades is true", async () => {
    const repo = makeRepo();
    const uc = new DeleteTermUseCase(repo);

    const result = await uc.execute("ay2025", "t1", true);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("graded-term-delete");
    expect(repo.archiveTerm).not.toHaveBeenCalled();
  });

  it("archives the term when hasGrades is false", async () => {
    const archiveTerm = vi.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ archiveTerm });
    const uc = new DeleteTermUseCase(repo);

    const result = await uc.execute("ay2025", "t1", false);

    expect(archiveTerm).toHaveBeenCalledWith("ay2025", "t1");
    expect(result.ok).toBe(true);
  });
});
