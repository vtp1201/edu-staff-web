import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import {
  SubmitColumnScoresUseCase,
  type SubmitTarget,
} from "./submit-column-scores.use-case";

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

const cell: GradeCell = { value: 9, status: "PUBLISHED" };

describe("SubmitColumnScoresUseCase", () => {
  it("submits every target and reports full success", async () => {
    const submitScore = vi
      .fn()
      .mockResolvedValue({ studentId: "s1", columnId: "tx", cell });
    const uc = new SubmitColumnScoresUseCase(makeRepo({ submitScore }));
    const targets: SubmitTarget[] = [
      { studentId: "s1", columnId: "tx" },
      { studentId: "s2", columnId: "tx" },
    ];
    const result = await uc.execute(key, targets);
    expect(result.submitted).toEqual(targets);
    expect(result.failed).toEqual([]);
    expect(submitScore).toHaveBeenCalledTimes(2);
  });

  it("never short-circuits: 2/5 fail, both arrays fully populated in order", async () => {
    const submitScore = vi
      .fn()
      .mockImplementation(
        async (_key: ClassSubjectTermKey, studentId: string) => {
          if (studentId === "s2" || studentId === "s4") {
            const failure: GradesFailure = { type: "not-draft" };
            throw failure;
          }
          return { studentId, columnId: "tx", cell };
        },
      );
    const uc = new SubmitColumnScoresUseCase(makeRepo({ submitScore }));
    const targets: SubmitTarget[] = [
      { studentId: "s1", columnId: "tx" },
      { studentId: "s2", columnId: "tx" },
      { studentId: "s3", columnId: "tx" },
      { studentId: "s4", columnId: "tx" },
      { studentId: "s5", columnId: "tx" },
    ];
    const result = await uc.execute(key, targets);
    expect(submitScore).toHaveBeenCalledTimes(5);
    expect(result.submitted.map((t) => t.studentId)).toEqual([
      "s1",
      "s3",
      "s5",
    ]);
    expect(result.failed.map((f) => f.target.studentId)).toEqual(["s2", "s4"]);
    expect(result.failed[0].failure).toEqual({ type: "not-draft" });
    // sequential order preserved — call order matches the input targets, not
    // reordered by success/failure.
    expect(submitScore.mock.calls.map((c) => c[1])).toEqual([
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
    ]);
  });

  it("reports full failure when every target fails", async () => {
    const submitScore = vi
      .fn()
      .mockRejectedValue({ type: "locked" } satisfies GradesFailure);
    const uc = new SubmitColumnScoresUseCase(makeRepo({ submitScore }));
    const targets: SubmitTarget[] = [{ studentId: "s1", columnId: "tx" }];
    const result = await uc.execute(key, targets);
    expect(result.submitted).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].failure).toEqual({ type: "locked" });
  });

  it("maps a generic thrown error to network-error", async () => {
    const submitScore = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new SubmitColumnScoresUseCase(makeRepo({ submitScore }));
    const result = await uc.execute(key, [{ studentId: "s1", columnId: "tx" }]);
    expect(result.failed[0].failure).toEqual({ type: "network-error" });
  });

  it("returns empty results for an empty target list", async () => {
    const submitScore = vi.fn();
    const uc = new SubmitColumnScoresUseCase(makeRepo({ submitScore }));
    const result = await uc.execute(key, []);
    expect(result).toEqual({ submitted: [], failed: [] });
    expect(submitScore).not.toHaveBeenCalled();
  });
});
