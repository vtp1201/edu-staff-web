import { describe, expect, it, vi } from "vitest";
import type { GradeBook } from "../entities/grade-book.entity";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";
import { GetMyGradesUseCase } from "./get-my-grades.use-case";

function makeRepo(
  over: Partial<IGradeBookRepository> = {},
): IGradeBookRepository {
  return {
    getGradeBook: vi.fn(),
    getMyGrades: vi.fn(),
    getChildGrades: vi.fn(),
    getChildList: vi.fn(),
    ...over,
  } as IGradeBookRepository;
}

const book: GradeBook = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
  className: "10A1",
  subjectName: "Toán",
  scheme: {
    subjectId: "subj-1",
    yearLabel: "2024-2025",
    termId: "HK1",
    columns: [],
  },
  rows: [],
  publishMode: "SELF_PUBLISH",
};

describe("GetMyGradesUseCase", () => {
  it("returns the student's grade books (all subjects) on success", async () => {
    const getMyGrades = vi.fn().mockResolvedValue([book]);
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    const result = await uc.execute("student-1", "2025-2026");
    expect(getMyGrades).toHaveBeenCalledWith("student-1", "2025-2026");
    expect(result).toEqual([book]);
  });

  it("maps a thrown forbidden failure", async () => {
    const getMyGrades = vi.fn().mockRejectedValue({ type: "forbidden" });
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    expect(await uc.execute("student-1", "2025-2026")).toEqual({
      type: "forbidden",
    });
  });

  it("maps a generic error to network-error", async () => {
    const getMyGrades = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    expect(await uc.execute("student-1", "2025-2026")).toEqual({
      type: "network-error",
    });
  });
});
