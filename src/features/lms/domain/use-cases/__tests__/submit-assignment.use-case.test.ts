import { describe, expect, it, vi } from "vitest";
import type { AssignmentEntity } from "../../entities/assignment.entity";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { SubmitAssignmentUseCase } from "../submit-assignment.use-case";

const UPDATED: AssignmentEntity = {
  id: "a1",
  title: "T",
  description: "D",
  subject: "Toán",
  className: "10A1",
  teacherName: "GV",
  tone: "primary",
  dueDate: "2026-07-20T00:00:00.000Z",
  status: "submitted",
  submittedAt: "2026-07-15T10:00:00.000Z",
  gradedAt: null,
  score: null,
  maxScore: null,
  teacherComment: null,
  fileName: "bai-lam.pdf",
  answerText: null,
  gradedFileName: null,
};

function makeRepo(submitAssignment: unknown): ILmsRepository {
  return { submitAssignment } as unknown as ILmsRepository;
}

describe("SubmitAssignmentUseCase", () => {
  it("returns the updated assignment on success", async () => {
    const uc = new SubmitAssignmentUseCase(
      makeRepo(vi.fn().mockResolvedValue(UPDATED)),
    );
    const res = await uc.execute("a1", { overdueConfirmed: false });
    expect(res).toEqual({ ok: true, data: UPDATED });
  });

  it.each([
    ["network-error", "network-error"],
    ["not-found", "not-found"],
    ["forbidden", "forbidden"],
    ["already-submitted", "already-submitted"],
  ])("maps a thrown %s to the %s failure", async (thrown, expected) => {
    const uc = new SubmitAssignmentUseCase(
      makeRepo(vi.fn().mockRejectedValue(new Error(thrown))),
    );
    const res = await uc.execute("a1", { overdueConfirmed: false });
    expect(res).toEqual({ ok: false, failure: { type: expected } });
  });

  it("maps any unrecognized thrown error to unknown", async () => {
    const uc = new SubmitAssignmentUseCase(
      makeRepo(vi.fn().mockRejectedValue(new Error("weird"))),
    );
    const res = await uc.execute("a1", { overdueConfirmed: false });
    expect(res).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});
