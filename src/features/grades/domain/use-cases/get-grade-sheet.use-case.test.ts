import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeSheet } from "../entities/grade-sheet.entity";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { GetGradeSheetUseCase } from "./get-grade-sheet.use-case";

function makeRepo(over: Partial<IGradesRepository> = {}): IGradesRepository {
  return {
    getGradeSheet: vi.fn(),
    saveScore: vi.fn(),
    submitScore: vi.fn(),
    ...over,
  } as IGradesRepository;
}

const key: ClassSubjectTermKey = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

const sheet: GradeSheet = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
  scheme: {
    subjectId: "subj-1",
    yearLabel: "2024-2025",
    termId: "HK1",
    columns: [],
  },
  rows: [],
  publishMode: "SELF_PUBLISH",
};

describe("GetGradeSheetUseCase", () => {
  it("returns the grade sheet on success", async () => {
    const getGradeSheet = vi.fn().mockResolvedValue(sheet);
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute(key);
    expect(getGradeSheet).toHaveBeenCalledWith(key);
    expect(result).toEqual(sheet);
  });

  it("maps not-found failure thrown by repo", async () => {
    const getGradeSheet = vi.fn().mockRejectedValue({ type: "not-found" });
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute(key);
    expect(result).toEqual({ type: "not-found" });
  });

  it("maps a generic error to network-error", async () => {
    const getGradeSheet = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetGradeSheetUseCase(makeRepo({ getGradeSheet }));
    const result = await uc.execute(key);
    expect(result).toEqual({ type: "network-error" });
  });
});
