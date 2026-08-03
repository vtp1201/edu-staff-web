import { describe, expect, it, vi } from "vitest";
import type { IStaffLeaveRepository } from "../repositories/i-staff-leave.repository";
import { ApproveStaffLeaveUseCase } from "./approve-staff-leave.use-case";

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

describe("ApproveStaffLeaveUseCase", () => {
  it("approves a request", async () => {
    const approve = vi.fn().mockResolvedValue({ ok: true });
    const useCase = new ApproveStaffLeaveUseCase(makeRepo({ approve }));

    const res = await useCase.execute("sl-001", "mem-1");

    expect(approve).toHaveBeenCalledWith("sl-001", "mem-1");
    expect(res).toEqual({ ok: true });
  });

  it("propagates not-found", async () => {
    const approve = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { type: "not-found" } });
    const useCase = new ApproveStaffLeaveUseCase(makeRepo({ approve }));

    const res = await useCase.execute("sl-x", "mem-1");

    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("propagates already-processed", async () => {
    const approve = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { type: "already-processed" } });
    const useCase = new ApproveStaffLeaveUseCase(makeRepo({ approve }));

    const res = await useCase.execute("sl-004", "mem-4");

    expect(res).toEqual({ ok: false, error: { type: "already-processed" } });
  });
});
