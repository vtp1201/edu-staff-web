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
    getConductSummary: vi.fn(),
    overrideConductGrade: vi.fn(),
    getLeaveRequests: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    getMyConductSummary: vi.fn(),
    getMyViolations: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    ...over,
  };
}

describe("ApproveLeaveUseCase", () => {
  it("approves a pending leave request", async () => {
    const approveLeave = vi.fn().mockResolvedValue(leave);
    const useCase = new ApproveLeaveUseCase(makeRepo({ approveLeave }));

    const res = await useCase.execute("l-1");

    expect(approveLeave).toHaveBeenCalledWith("l-1");
    expect(res.status).toBe("approved");
  });

  it("propagates already-processed failure from the repo", async () => {
    const approveLeave = vi
      .fn()
      .mockRejectedValue({ type: "already-processed" });
    const useCase = new ApproveLeaveUseCase(makeRepo({ approveLeave }));

    await expect(useCase.execute("l-1")).rejects.toMatchObject({
      type: "already-processed",
    });
  });
});
