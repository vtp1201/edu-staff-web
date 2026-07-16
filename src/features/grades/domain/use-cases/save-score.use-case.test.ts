import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { SaveScoreUseCase } from "./save-score.use-case";

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

const okCell: GradeCell = { value: 9, status: "DRAFT" };

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x && !("cell" in x);
}

describe("SaveScoreUseCase", () => {
  it("saves a valid score and returns the updated cell", async () => {
    const saveScore = vi
      .fn()
      .mockResolvedValue({ studentId: "s1", columnId: "ck", cell: okCell });
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute(key, "s1", "ck", 9, 10);
    expect(saveScore).toHaveBeenCalledWith(key, "s1", "ck", 9);
    expect(result).toEqual({ studentId: "s1", columnId: "ck", cell: okCell });
  });

  it("returns invalid-value failure for an out-of-range value", async () => {
    const saveScore = vi.fn();
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute(key, "s1", "ck", 11, 10);
    expect(saveScore).not.toHaveBeenCalled();
    expect(isFailure(result) && result.type).toBe("invalid-value");
    if (isFailure(result) && result.type === "invalid-value") {
      expect(result.columnId).toBe("ck");
    }
  });

  it("maps a thrown transport error to network-error", async () => {
    const saveScore = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute(key, "s1", "ck", 9, 10);
    expect(isFailure(result) && result.type).toBe("network-error");
  });

  it("passes through a not-draft failure thrown by the repo", async () => {
    const failure: GradesFailure = { type: "not-draft" };
    const saveScore = vi.fn().mockRejectedValue(failure);
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute(key, "s1", "ck", 9, 10);
    expect(isFailure(result) && result.type).toBe("not-draft");
  });
});
