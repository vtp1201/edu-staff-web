import { describe, expect, it, vi } from "vitest";
import type { AcademicYear } from "../entities/academic-year.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { CreateYearUseCase } from "./create-year.use-case";

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

const createdYear: AcademicYear = {
  id: "ay2026",
  label: "2026–2027",
  isActive: true,
  terms: [],
};

describe("CreateYearUseCase", () => {
  it("returns unknown failure when label is empty string", async () => {
    const repo = makeRepo();
    const uc = new CreateYearUseCase(repo);

    const result = await uc.execute({ label: "", isActive: false });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(repo.createYear).not.toHaveBeenCalled();
  });

  it("returns unknown failure when label is whitespace only", async () => {
    const repo = makeRepo();
    const uc = new CreateYearUseCase(repo);

    const result = await uc.execute({ label: "   ", isActive: false });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(repo.createYear).not.toHaveBeenCalled();
  });

  it("creates the year on the happy path (isActive: true)", async () => {
    const createYear = vi.fn().mockResolvedValue(createdYear);
    const repo = makeRepo({ createYear });
    const uc = new CreateYearUseCase(repo);

    const result = await uc.execute({ label: "2026–2027", isActive: true });

    expect(createYear).toHaveBeenCalledWith({
      label: "2026–2027",
      isActive: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(createdYear);
  });

  it("trims the label before passing to repo", async () => {
    const createYear = vi.fn().mockResolvedValue(createdYear);
    const repo = makeRepo({ createYear });
    const uc = new CreateYearUseCase(repo);

    await uc.execute({ label: "  2026–2027  ", isActive: false });

    expect(createYear).toHaveBeenCalledWith({
      label: "2026–2027",
      isActive: false,
    });
  });
});
