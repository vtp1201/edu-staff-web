import { describe, expect, it, vi } from "vitest";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
} from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { SubmitChildLeaveRequestUseCase } from "./submit-child-leave-request.use-case";

const created: LeaveRequestEntity = {
  id: "l-new",
  studentId: "c1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "11A2",
  className: "11A2",
  submittedBy: "parent",
  submitterName: "Phụ huynh",
  reason: "Khám bệnh định kỳ tại bệnh viện",
  startDate: "20/06/2026",
  endDate: "20/06/2026",
  dayCount: 1,
  type: "medical",
  status: "pending",
  submittedAt: "18/06/2026 08:00",
  approvedBy: null,
  rejectedBy: null,
  rejectionReason: null,
};

function makeRepo(
  over: Partial<IDisciplineRepository> = {},
): IDisciplineRepository {
  return {
    getViolations: vi.fn(),
    recordViolation: vi.fn(),
    deleteViolation: vi.fn(),
    getConductSummary: vi.fn(),
    overrideConductGrade: vi.fn(),
    getLeaveRequests: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    getMyConductSummary: vi.fn(),
    getMyViolations: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    getChildren: vi.fn(),
    getChildConductSummary: vi.fn(),
    getChildViolations: vi.fn(),
    getChildLeaveRequests: vi.fn(),
    submitLeaveForChild: vi.fn(),
    ...over,
  };
}

const TODAY = "2026-06-18";

const validInput: SubmitChildLeaveRequestInput = {
  startDate: "2026-06-20",
  endDate: "2026-06-20",
  type: "medical",
  reason: "Khám bệnh định kỳ tại bệnh viện",
};

async function expectFailure(
  fn: () => Promise<unknown>,
  type: DisciplineFailure["type"],
) {
  await expect(fn()).rejects.toMatchObject({ type });
}

describe("SubmitChildLeaveRequestUseCase", () => {
  it("submits a valid request for the child via the repo", async () => {
    const submitLeaveForChild = vi.fn().mockResolvedValue(created);
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    const res = await useCase.execute("c1", validInput, TODAY);

    expect(submitLeaveForChild).toHaveBeenCalledWith("c1", validInput);
    expect(res.status).toBe("pending");
  });

  it("rejects with invalid-child when childId is missing", async () => {
    const submitLeaveForChild = vi.fn();
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    await expectFailure(
      () => useCase.execute("", validInput, TODAY),
      "invalid-child",
    );
    expect(submitLeaveForChild).not.toHaveBeenCalled();
  });

  it("rejects with reason-too-short when reason < 10 chars", async () => {
    const submitLeaveForChild = vi.fn();
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    await expectFailure(
      () => useCase.execute("c1", { ...validInput, reason: "Ốm" }, TODAY),
      "reason-too-short",
    );
  });

  it("rejects with invalid-date when startDate is in the past", async () => {
    const submitLeaveForChild = vi.fn();
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    await expectFailure(
      () =>
        useCase.execute(
          "c1",
          { ...validInput, startDate: "2026-06-10" },
          TODAY,
        ),
      "invalid-date",
    );
  });

  it("rejects with invalid-date when endDate < startDate", async () => {
    const submitLeaveForChild = vi.fn();
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    await expectFailure(
      () =>
        useCase.execute(
          "c1",
          { ...validInput, startDate: "2026-06-20", endDate: "2026-06-19" },
          TODAY,
        ),
      "invalid-date",
    );
  });

  it("propagates a forbidden failure thrown by the repo", async () => {
    const submitLeaveForChild = vi
      .fn()
      .mockRejectedValue({ type: "forbidden" });
    const useCase = new SubmitChildLeaveRequestUseCase(
      makeRepo({ submitLeaveForChild }),
    );

    await expectFailure(
      () => useCase.execute("c1", validInput, TODAY),
      "forbidden",
    );
  });
});
