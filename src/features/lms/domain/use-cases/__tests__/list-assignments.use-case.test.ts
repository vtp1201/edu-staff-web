import { describe, expect, it, vi } from "vitest";
import type {
  AssignmentEntity,
  AssignmentStatusFilter,
} from "../../entities/assignment.entity";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { ListAssignmentsUseCase } from "../list-assignments.use-case";

function makeAssignment(
  over: Partial<AssignmentEntity> = {},
): AssignmentEntity {
  return {
    id: "a1",
    title: "T",
    description: "D",
    subject: "Toán",
    className: "10A1",
    teacherName: "GV",
    tone: "primary",
    dueDate: "2026-07-20T00:00:00.000Z",
    status: "pending",
    submittedAt: null,
    gradedAt: null,
    score: null,
    maxScore: null,
    teacherComment: null,
    fileName: null,
    answerText: null,
    gradedFileName: null,
    ...over,
  };
}

function makeRepo(over: Partial<ILmsRepository>): ILmsRepository {
  return over as ILmsRepository;
}

describe("ListAssignmentsUseCase", () => {
  it("passes the list through on success", async () => {
    const list = [makeAssignment()];
    const uc = new ListAssignmentsUseCase(
      makeRepo({ listAssignments: vi.fn().mockResolvedValue(list) }),
    );
    const res = await uc.execute("student-1");
    expect(res).toEqual({ ok: true, data: list });
  });

  it("forwards the statusFilter to the repository", async () => {
    const listAssignments = vi.fn().mockResolvedValue([]);
    const uc = new ListAssignmentsUseCase(makeRepo({ listAssignments }));
    const filter: AssignmentStatusFilter = "pending";
    await uc.execute("student-1", filter);
    expect(listAssignments).toHaveBeenCalledWith("student-1", "pending");
  });

  it("maps a thrown network-error to the network-error failure", async () => {
    const uc = new ListAssignmentsUseCase(
      makeRepo({
        listAssignments: vi.fn().mockRejectedValue(new Error("network-error")),
      }),
    );
    const res = await uc.execute("student-1");
    expect(res).toEqual({ ok: false, failure: { type: "network-error" } });
  });

  it("maps any other thrown error to unknown", async () => {
    const uc = new ListAssignmentsUseCase(
      makeRepo({
        listAssignments: vi.fn().mockRejectedValue(new Error("boom")),
      }),
    );
    const res = await uc.execute("student-1");
    expect(res).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});
