import { describe, expect, it, vi } from "vitest";
import type { Term } from "../entities/term.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { CreateTermUseCase } from "./create-term.use-case";

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

const createdTerm: Term = {
  id: "t-new",
  name: "Học kỳ 1",
  startDate: "2025-09-05",
  endDate: "2026-01-15",
  hasGrades: false,
};

const existingTerm: Term = {
  id: "t-existing",
  name: "Học kỳ 0",
  startDate: "2025-08-01",
  endDate: "2025-12-31",
  hasGrades: false,
};

describe("CreateTermUseCase", () => {
  it("returns date-order failure when startDate >= endDate", async () => {
    const repo = makeRepo();
    const uc = new CreateTermUseCase(repo);

    const result = await uc.execute({
      yearId: "ay2025",
      name: "Học kỳ 1",
      startDate: "2026-01-15",
      endDate: "2025-09-05",
      existingTerms: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("date-order");
    expect(repo.createTerm).not.toHaveBeenCalled();
  });

  it("returns date-order failure when startDate equals endDate", async () => {
    const repo = makeRepo();
    const uc = new CreateTermUseCase(repo);

    const result = await uc.execute({
      yearId: "ay2025",
      name: "Học kỳ 1",
      startDate: "2025-09-05",
      endDate: "2025-09-05",
      existingTerms: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("date-order");
  });

  it("returns date-overlap failure when new term overlaps an existing term", async () => {
    const repo = makeRepo();
    const uc = new CreateTermUseCase(repo);

    // existing [2025-08-01, 2025-12-31]; new [2025-09-05, 2026-01-15] overlaps
    const result = await uc.execute({
      yearId: "ay2025",
      name: "Học kỳ 1",
      startDate: "2025-09-05",
      endDate: "2026-01-15",
      existingTerms: [existingTerm],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("date-overlap");
    expect(repo.createTerm).not.toHaveBeenCalled();
  });

  it("returns ok when new term is adjacent (no overlap)", async () => {
    const createTerm = vi.fn().mockResolvedValue(createdTerm);
    const repo = makeRepo({ createTerm });
    const uc = new CreateTermUseCase(repo);

    // existing ends 2025-12-31; new starts 2025-12-31 → a.start < b.end? 2025-12-31 < 2025-12-31 = false → no overlap
    const result = await uc.execute({
      yearId: "ay2025",
      name: "Học kỳ 2",
      startDate: "2025-12-31",
      endDate: "2026-05-31",
      existingTerms: [existingTerm],
    });

    expect(result.ok).toBe(true);
    expect(createTerm).toHaveBeenCalledWith("ay2025", {
      name: "Học kỳ 2",
      startDate: "2025-12-31",
      endDate: "2026-05-31",
    });
  });

  it("creates the term on the happy path", async () => {
    const createTerm = vi.fn().mockResolvedValue(createdTerm);
    const repo = makeRepo({ createTerm });
    const uc = new CreateTermUseCase(repo);

    const result = await uc.execute({
      yearId: "ay2025",
      name: "Học kỳ 1",
      startDate: "2025-09-05",
      endDate: "2026-01-15",
      existingTerms: [],
    });

    expect(createTerm).toHaveBeenCalledWith("ay2025", {
      name: "Học kỳ 1",
      startDate: "2025-09-05",
      endDate: "2026-01-15",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(createdTerm);
  });
});
