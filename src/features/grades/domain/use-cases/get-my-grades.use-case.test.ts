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
    ...over,
  } as IGradeBookRepository;
}

const book: GradeBook = {
  classSubjectId: "cs-001",
  term: "HK1",
  className: "10A1",
  subjectName: "Toán",
  scheme: { subjectId: "subj-1", yearLabel: "2024-2025", columns: [] },
  rows: [],
  publishMode: "SELF_PUBLISH",
};

describe("GetMyGradesUseCase", () => {
  it("returns the student's grade book on success", async () => {
    const getMyGrades = vi.fn().mockResolvedValue(book);
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    const result = await uc.execute("HK1");
    expect(getMyGrades).toHaveBeenCalledWith("HK1");
    expect(result).toEqual(book);
  });

  it("maps a thrown not-published failure", async () => {
    const getMyGrades = vi.fn().mockRejectedValue({ type: "not-published" });
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    expect(await uc.execute("HK1")).toEqual({ type: "not-published" });
  });

  it("maps a generic error to network-error", async () => {
    const getMyGrades = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetMyGradesUseCase(makeRepo({ getMyGrades }));
    expect(await uc.execute("HK1")).toEqual({ type: "network-error" });
  });
});
