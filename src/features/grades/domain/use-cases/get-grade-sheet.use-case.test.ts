import { describe, expect, it, vi } from "vitest";
import type { GradeSheet } from "../entities/grade-sheet.entity";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { GetGradeSheetUseCase } from "./get-grade-sheet.use-case";

function makeRepo(over: Partial<IGradesRepository> = {}): IGradesRepository {
  return {
    getGradeSheet: vi.fn(),
    saveScore: vi.fn(),
    publishGrades: vi.fn(),
    ...over,
  } as IGradesRepository;
}

const sheet: GradeSheet = {
  classSubjectId: "cs-001",
  term: "HK1",
  scheme: { subjectId: "subj-1", yearLabel: "2024-2025", columns: [] },
  rows: [],
  publishMode: "SELF_PUBLISH",
};

describe("GetGradeSheetUseCase", () => {
  it("returns the grade sheet on success", async () => {
    const getGradeSheet = vi.fn().mockResolvedValue(sheet);
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute("cs-001", "HK1");
    expect(getGradeSheet).toHaveBeenCalledWith("cs-001", "HK1");
    expect(result).toEqual(sheet);
  });

  it("maps not-found failure thrown by repo", async () => {
    const getGradeSheet = vi.fn().mockRejectedValue({ type: "not-found" });
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute("cs-x", "HK1");
    expect(result).toEqual({ type: "not-found" });
  });

  it("maps a generic error to network-error", async () => {
    const getGradeSheet = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute("cs-001", "HK1");
    expect(result).toEqual({ type: "network-error" });
  });
});
