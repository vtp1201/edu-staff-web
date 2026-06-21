import { describe, expect, it, vi } from "vitest";
import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { GetChildLeaveRequestsUseCase } from "./get-child-leave-requests.use-case";

const leave: LeaveRequestEntity[] = [
  {
    id: "l-c1-1",
    studentId: "c1",
    studentName: "Nguyễn Minh Khoa",
    initials: "NK",
    avatarTone: "primary",
    classId: "11A2",
    className: "11A2",
    submittedBy: "parent",
    submitterName: "Phụ huynh",
    reason: "Khám bệnh định kỳ tại bệnh viện",
    startDate: "02/05/2026",
    endDate: "02/05/2026",
    dayCount: 1,
    type: "medical",
    status: "rejected",
    submittedAt: "29/04/2026 08:00",
    approvedBy: null,
    rejectedBy: "Nguyễn Thị Hương",
    rejectionReason: "Đã nghỉ quá 5 ngày trong tháng",
  },
];

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

describe("GetChildLeaveRequestsUseCase", () => {
  it("returns leave history including a rejected entry", async () => {
    const getChildLeaveRequests = vi.fn().mockResolvedValue(leave);
    const useCase = new GetChildLeaveRequestsUseCase(
      makeRepo({ getChildLeaveRequests }),
    );

    const res = await useCase.execute("c1");

    expect(getChildLeaveRequests).toHaveBeenCalledWith("c1");
    expect(res[0]?.status).toBe("rejected");
    expect(res[0]?.rejectionReason).toBeTruthy();
  });

  it("returns an empty list when there is no leave history", async () => {
    const getChildLeaveRequests = vi.fn().mockResolvedValue([]);
    const useCase = new GetChildLeaveRequestsUseCase(
      makeRepo({ getChildLeaveRequests }),
    );

    expect(await useCase.execute("c2")).toEqual([]);
  });

  it("rejects with invalid-child when childId is empty", async () => {
    const getChildLeaveRequests = vi.fn();
    const useCase = new GetChildLeaveRequestsUseCase(
      makeRepo({ getChildLeaveRequests }),
    );

    await expect(useCase.execute("")).rejects.toMatchObject({
      type: "invalid-child",
    });
    expect(getChildLeaveRequests).not.toHaveBeenCalled();
  });

  it("propagates a not-found failure thrown by the repo", async () => {
    const getChildLeaveRequests = vi
      .fn()
      .mockRejectedValue({ type: "not-found" });
    const useCase = new GetChildLeaveRequestsUseCase(
      makeRepo({ getChildLeaveRequests }),
    );

    await expect(useCase.execute("c9")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});
