import { describe, expect, it } from "vitest";
import type { ExamResult } from "../../entities/exam-result.entity";
import type {
  IExamRepository,
  SubmitExamInput,
} from "../../repositories/i-exam.repository";
import { SubmitExamUseCase } from "../submit-exam.use-case";

const RESULT: ExamResult = {
  examId: "exam-001",
  examTitle: "Test",
  status: "completed",
  score: 7.5,
  totalQuestions: 20,
  correctCount: 15,
  incorrectCount: 4,
  skippedCount: 1,
  timeTakenSeconds: 600,
  rank: 5,
  percentile: 80,
  passed: true,
  mcqScore: null,
  mcqMax: null,
  essayMax: null,
  essayCount: 0,
  questionResults: [],
};

const INPUT: SubmitExamInput = {
  examId: "exam-001",
  answers: [],
  startedAt: 0,
};

function makeRepo(impl: Partial<IExamRepository>): IExamRepository {
  return {
    listExams: async () => [],
    getQuestions: async () => [],
    submitExam: async () => RESULT,
    getResult: async () => RESULT,
    ...impl,
  };
}

describe("SubmitExamUseCase", () => {
  it("returns ok:true with result on success", async () => {
    const uc = new SubmitExamUseCase(makeRepo({}));
    const out = await uc.execute(INPUT);
    expect(out).toEqual({ ok: true, result: RESULT });
  });

  it("maps max-attempts-exceeded error", async () => {
    const uc = new SubmitExamUseCase(
      makeRepo({
        submitExam: async () => {
          throw new Error("max-attempts-exceeded");
        },
      }),
    );
    const out = await uc.execute(INPUT);
    expect(out).toEqual({
      ok: false,
      failure: { type: "max-attempts-exceeded" },
    });
  });

  it("maps after-deadline error", async () => {
    const uc = new SubmitExamUseCase(
      makeRepo({
        submitExam: async () => {
          throw new Error("after-deadline");
        },
      }),
    );
    const out = await uc.execute(INPUT);
    expect(out).toEqual({ ok: false, failure: { type: "after-deadline" } });
  });

  it("maps already-submitted error", async () => {
    const uc = new SubmitExamUseCase(
      makeRepo({
        submitExam: async () => {
          throw new Error("already-submitted");
        },
      }),
    );
    const out = await uc.execute(INPUT);
    expect(out).toEqual({ ok: false, failure: { type: "already-submitted" } });
  });

  it("maps unknown error", async () => {
    const uc = new SubmitExamUseCase(
      makeRepo({
        submitExam: async () => {
          throw new Error("boom");
        },
      }),
    );
    const out = await uc.execute(INPUT);
    expect(out).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});
