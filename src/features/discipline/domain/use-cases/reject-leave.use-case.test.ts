import { describe, expect, it, vi } from "vitest";
import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { RejectLeaveUseCase } from "./reject-leave.use-case";

const leave: LeaveRequestEntity = {
  id: "l-1",
  studentId: "s-1",
  studentName: "Phạm Đức Dũng",
  initials: "PD",
  avatarTone: "error",
  classId: "10A1",
  className: "10A1",
  submittedBy: "parent",
  submitterName: "Phạm Văn Long (Phụ huynh)",
  reason: "Gia đình có việc",
  startDate: "29/04/2026",
  endDate: "29/04/2026",
  dayCount: 1,
  type: "personal",
  status: "rejected",
  submittedAt: "28/04/2026 18:00",
  approvedBy: null,
  rejectedBy: "Nguyễn Thị Hương",
  rejectionReason: "Đã nghỉ quá 5 ngày trong tháng",
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

describe("RejectLeaveUseCase", () => {
  it("rejects a leave request with a valid reason", async () => {
    const rejectLeave = vi.fn().mockResolvedValue(leave);
    const useCase = new RejectLeaveUseCase(makeRepo({ rejectLeave }));

    const res = await useCase.execute("l-1", "Đã nghỉ quá 5 ngày trong tháng");

    expect(rejectLeave).toHaveBeenCalledWith(
      "l-1",
      "Đã nghỉ quá 5 ngày trong tháng",
    );
    expect(res.status).toBe("rejected");
  });

  it("fails with missing-reject-reason when reason is shorter than 10 chars", async () => {
    const rejectLeave = vi.fn();
    const useCase = new RejectLeaveUseCase(makeRepo({ rejectLeave }));

    await expect(useCase.execute("l-1", "ngắn")).rejects.toMatchObject({
      type: "missing-reject-reason",
    });
    expect(rejectLeave).not.toHaveBeenCalled();
  });

  it("propagates already-processed failure from the repo", async () => {
    const rejectLeave = vi
      .fn()
      .mockRejectedValue({ type: "already-processed" });
    const useCase = new RejectLeaveUseCase(makeRepo({ rejectLeave }));

    await expect(
      useCase.execute("l-1", "Lý do hợp lệ đủ dài"),
    ).rejects.toMatchObject({ type: "already-processed" });
  });
});
