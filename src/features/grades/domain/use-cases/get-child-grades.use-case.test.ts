import { describe, expect, it, vi } from "vitest";
import type { GradeBook } from "../entities/grade-book.entity";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";
import { GetChildGradesUseCase } from "./get-child-grades.use-case";

function makeRepo(
  over: Partial<IGradeBookRepository> = {},
): IGradeBookRepository {
  return {
    getGradeBook: vi.fn(),
    getMyGrades: vi.fn(),
    getChildGrades: vi.fn(),
    ...over,
  } as IGradeBookRepository;
}

const book: GradeBook = {
  classSubjectId: "cs-001",
  term: "HK1",
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

describe("GetChildGradesUseCase", () => {
  it("returns the child's grade book on success", async () => {
    const getChildGrades = vi.fn().mockResolvedValue(book);
    const uc = new GetChildGradesUseCase(makeRepo({ getChildGrades }));
    const result = await uc.execute("child-1", "HK1");
    expect(getChildGrades).toHaveBeenCalledWith("child-1", "HK1");
    expect(result).toEqual(book);
  });

  it("maps a thrown forbidden failure", async () => {
    const getChildGrades = vi.fn().mockRejectedValue({ type: "forbidden" });
    const uc = new GetChildGradesUseCase(makeRepo({ getChildGrades }));
    expect(await uc.execute("child-x", "HK1")).toEqual({ type: "forbidden" });
  });

  it("maps a generic error to network-error", async () => {
    const getChildGrades = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetChildGradesUseCase(makeRepo({ getChildGrades }));
    expect(await uc.execute("child-1", "HK1")).toEqual({
      type: "network-error",
    });
  });
});
