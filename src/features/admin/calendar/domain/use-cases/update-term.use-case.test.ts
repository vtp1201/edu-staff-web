import { describe, expect, it, vi } from "vitest";
import type { Term } from "../entities/term.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { UpdateTermUseCase } from "./update-term.use-case";

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

const patchedTerm: Term = {
  id: "t1",
  name: "Học kỳ 1 (sửa)",
  startDate: "2025-09-10",
  endDate: "2026-01-10",
  hasGrades: true,
};

const term1: Term = {
  id: "t1",
  name: "Học kỳ 1",
  startDate: "2025-09-01",
  endDate: "2025-12-31",
  hasGrades: false,
};

const term2: Term = {
  id: "t2",
  name: "Học kỳ 2",
  startDate: "2026-01-15",
  endDate: "2026-05-31",
  hasGrades: false,
};

describe("UpdateTermUseCase", () => {
  it("returns date-order failure when startDate >= endDate", async () => {
    const repo = makeRepo();
    const uc = new UpdateTermUseCase(repo);

    const result = await uc.execute({
      yearId: "ay2025",
      termId: "t1",
      name: "Học kỳ 1",
      startDate: "2026-01-20",
      endDate: "2025-09-10",
      existingTerms: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("date-order");
    expect(repo.updateTerm).not.toHaveBeenCalled();
  });

  it("returns date-overlap failure when updated term overlaps a different term", async () => {
    const repo = makeRepo();
    const uc = new UpdateTermUseCase(repo);

    // Updating t1 so it overlaps t2 [2026-01-15, 2026-05-31]
    const result = await uc.execute({
      yearId: "ay2025",
      termId: "t1",
      name: "Học kỳ 1",
      startDate: "2025-09-01",
      endDate: "2026-02-01",
      existingTerms: [term1, term2],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("date-overlap");
    expect(repo.updateTerm).not.toHaveBeenCalled();
  });

  it("does not flag overlap with self", async () => {
    const updateTerm = vi.fn().mockResolvedValue(patchedTerm);
    const repo = makeRepo({ updateTerm });
    const uc = new UpdateTermUseCase(repo);

    // Updating t1 to a range that overlaps its own old range only — must not flag
    const result = await uc.execute({
      yearId: "ay2025",
      termId: "t1",
      name: "Học kỳ 1 (sửa)",
      startDate: "2025-09-05",
      endDate: "2025-12-15",
      existingTerms: [term1, term2],
    });

    expect(result.ok).toBe(true);
    expect(updateTerm).toHaveBeenCalled();
  });

  it("patches the term on the happy path", async () => {
    const updateTerm = vi.fn().mockResolvedValue(patchedTerm);
    const repo = makeRepo({ updateTerm });
    const uc = new UpdateTermUseCase(repo);

    const result = await uc.execute({
      yearId: "ay2025",
      termId: "t1",
      name: "Học kỳ 1 (sửa)",
      startDate: "2025-09-10",
      endDate: "2026-01-10",
      existingTerms: [term1, term2],
    });

    expect(updateTerm).toHaveBeenCalledWith("ay2025", "t1", {
      name: "Học kỳ 1 (sửa)",
      startDate: "2025-09-10",
      endDate: "2026-01-10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(patchedTerm);
  });
});
