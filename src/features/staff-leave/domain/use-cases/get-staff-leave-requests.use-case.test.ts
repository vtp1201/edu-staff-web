import { describe, expect, it, vi } from "vitest";
import type { StaffLeaveRequestEntity } from "../entities/staff-leave-request.entity";
import type { IStaffLeaveRepository } from "../repositories/i-staff-leave.repository";
import { GetStaffLeaveRequestsUseCase } from "./get-staff-leave-requests.use-case";

const sample: StaffLeaveRequestEntity = {
  id: "sl-001",
  staffId: "u-1",
  staffName: "Nguyễn Thị Hương",
  initials: "NH",
  avatarTone: "var(--edu-primary)",
  staffRole: "teacher",
  department: "Tổ Toán",
  leaveType: "sick",
  startDate: "03/05/2026",
  endDate: "03/05/2026",
  days: 1,
  reason: "Khám sức khoẻ định kỳ",
  status: "pending",
  submittedAt: "29/04/2026 09:10",
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
};

function makeRepo(
  over: Partial<IStaffLeaveRepository> = {},
): IStaffLeaveRepository {
  return {
    listRequests: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    ...over,
  };
}

describe("GetStaffLeaveRequestsUseCase", () => {
  it("returns the list on success", async () => {
    const listRequests = vi
      .fn()
      .mockResolvedValue({ ok: true, value: [sample] });
    const useCase = new GetStaffLeaveRequestsUseCase(
      makeRepo({ listRequests }),
    );

    const res = await useCase.execute();

    expect(res).toEqual({ ok: true, value: [sample] });
    expect(listRequests).toHaveBeenCalledWith(undefined);
  });

  it("forwards the status filter to the repo", async () => {
    const listRequests = vi.fn().mockResolvedValue({ ok: true, value: [] });
    const useCase = new GetStaffLeaveRequestsUseCase(
      makeRepo({ listRequests }),
    );

    await useCase.execute({ status: "approved" });

    expect(listRequests).toHaveBeenCalledWith({ status: "approved" });
  });

  it("propagates a repo error result", async () => {
    const listRequests = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { type: "network-error" } });
    const useCase = new GetStaffLeaveRequestsUseCase(
      makeRepo({ listRequests }),
    );

    const res = await useCase.execute();

    expect(res).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
