import { describe, expect, it, vi } from "vitest";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { DeleteTermUseCase } from "./delete-term.use-case";

function makeRepo(
  overrides: Partial<ICalendarRepository> = {},
): ICalendarRepository {
  return {
    listYears: vi.fn(),
    createYear: vi.fn(),
    patchYear: vi.fn(),
    deleteYear: vi.fn(),
    createTerm: vi.fn(),
    patchTerm: vi.fn(),
    deleteTerm: vi.fn(),
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
    expect(repo.deleteTerm).not.toHaveBeenCalled();
  });

  it("deletes the term when hasGrades is false", async () => {
    const deleteTerm = vi.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ deleteTerm });
    const uc = new DeleteTermUseCase(repo);

    const result = await uc.execute("ay2025", "t1", false);

    expect(deleteTerm).toHaveBeenCalledWith("ay2025", "t1");
    expect(result.ok).toBe(true);
  });
});
