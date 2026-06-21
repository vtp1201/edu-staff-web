import { describe, expect, it, vi } from "vitest";
import type {
  LeaveRequestEntity,
  SubmitLeaveRequestInput,
} from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { SubmitLeaveRequestUseCase } from "./submit-leave-request.use-case";

const created: LeaveRequestEntity = {
  id: "l-new",
  studentId: "s-1",
  studentName: "Trần Văn Bình",
  initials: "TB",
  avatarTone: "teal",
  classId: "11B2",
  className: "11B2",
  submittedBy: "student",
  submitterName: "Trần Văn Bình (Học sinh)",
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

const validInput: SubmitLeaveRequestInput = {
  studentId: "s-1",
  startDate: "2026-06-20",
  endDate: "2026-06-20",
  type: "medical",
  reason: "Khám bệnh định kỳ tại bệnh viện",
  submittedBy: "student",
};

async function expectFailure(
  fn: () => Promise<unknown>,
  type: DisciplineFailure["type"],
) {
  await expect(fn()).rejects.toMatchObject({ type });
}

describe("SubmitLeaveRequestUseCase", () => {
  it("submits a valid request via the repo", async () => {
    const submitLeaveRequest = vi.fn().mockResolvedValue(created);
    const useCase = new SubmitLeaveRequestUseCase(
      makeRepo({ submitLeaveRequest }),
    );

    const res = await useCase.execute(validInput, TODAY);

    expect(submitLeaveRequest).toHaveBeenCalledWith(validInput);
    expect(res.id).toBe("l-new");
  });

  it("allows a start date equal to today", async () => {
    const submitLeaveRequest = vi.fn().mockResolvedValue(created);
    const useCase = new SubmitLeaveRequestUseCase(
      makeRepo({ submitLeaveRequest }),
    );

    await useCase.execute({ ...validInput, startDate: TODAY }, TODAY);
    expect(submitLeaveRequest).toHaveBeenCalled();
  });

  it("rejects with reason-too-short when reason is under 10 chars", async () => {
    const submitLeaveRequest = vi.fn();
    const useCase = new SubmitLeaveRequestUseCase(
      makeRepo({ submitLeaveRequest }),
    );

    await expectFailure(
      () => useCase.execute({ ...validInput, reason: "Ốm" }, TODAY),
      "reason-too-short",
    );
    expect(submitLeaveRequest).not.toHaveBeenCalled();
  });

  it("trims whitespace when measuring the reason length", async () => {
    const submitLeaveRequest = vi.fn();
    const useCase = new SubmitLeaveRequestUseCase(
      makeRepo({ submitLeaveRequest }),
    );

    await expectFailure(
      () => useCase.execute({ ...validInput, reason: "   short   " }, TODAY),
      "reason-too-short",
    );
  });

  it("rejects with invalid-date when start date is before today", async () => {
    const submitLeaveRequest = vi.fn();
    const useCase = new SubmitLeaveRequestUseCase(
      makeRepo({ submitLeaveRequest }),
    );

    await expectFailure(
      () => useCase.execute({ ...validInput, startDate: "2026-06-17" }, TODAY),
      "invalid-date",
    );
    expect(submitLeaveRequest).not.toHaveBeenCalled();
  });
});
