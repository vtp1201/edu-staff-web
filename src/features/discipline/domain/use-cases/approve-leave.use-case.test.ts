import { describe, expect, it, vi } from "vitest";
import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { ApproveLeaveUseCase } from "./approve-leave.use-case";

const leave: LeaveRequestEntity = {
  id: "l-1",
  studentId: "s-1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "11A2",
  className: "11A2",
  submittedBy: "parent",
  submitterName: "Nguyễn Văn Đức (Phụ huynh)",
  reason: "Khám bệnh định kỳ",
  startDate: "02/05/2026",
  endDate: "02/05/2026",
  dayCount: 1,
  type: "medical",
  status: "approved",
  submittedAt: "29/04/2026 08:00",
  approvedBy: "Nguyễn Thị Hương",
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

const decide = {
  id: "l-1",
  studentMemberId: "s-1",
  classId: "11A2",
} as const;

describe("ApproveLeaveUseCase", () => {
  it("approves a pending leave request, forwarding the whole addressing tuple", async () => {
    const approveLeave = vi.fn().mockResolvedValue(leave);
    const useCase = new ApproveLeaveUseCase(makeRepo({ approveLeave }));

    const res = await useCase.execute(decide);

    // `studentMemberId` completes core's partition key — dropping it would
    // address a route that cannot exist.
    expect(approveLeave).toHaveBeenCalledWith(decide);
    expect(res.status).toBe("approved");
  });

  it("passes a server-derived authCtx straight through to the repository (decision 0063 — the check runs at the data boundary)", async () => {
    const approveLeave = vi.fn().mockResolvedValue(leave);
    const useCase = new ApproveLeaveUseCase(makeRepo({ approveLeave }));
    const authCtx = { role: "teacher", homeroomClassIds: ["11A2"] };

    await useCase.execute({ ...decide, authCtx });

    expect(approveLeave).toHaveBeenCalledWith({ ...decide, authCtx });
  });

  it("propagates already-processed failure from the repo", async () => {
    const approveLeave = vi
      .fn()
      .mockRejectedValue({ type: "already-processed" });
    const useCase = new ApproveLeaveUseCase(makeRepo({ approveLeave }));

    await expect(useCase.execute(decide)).rejects.toMatchObject({
      type: "already-processed",
    });
  });
});
