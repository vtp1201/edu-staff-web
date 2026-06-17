import { describe, expect, it, vi } from "vitest";
import type { IStaffLeaveRepository } from "../repositories/i-staff-leave.repository";
import { RejectStaffLeaveUseCase } from "./reject-staff-leave.use-case";

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

describe("RejectStaffLeaveUseCase", () => {
  it("fails with missing-reject-reason when reason is empty / whitespace", async () => {
    const reject = vi.fn();
    const useCase = new RejectStaffLeaveUseCase(makeRepo({ reject }));

    const res = await useCase.execute("sl-001", "   ");

    expect(res).toEqual({
      ok: false,
      error: { type: "missing-reject-reason" },
    });
    expect(reject).not.toHaveBeenCalled();
  });

  it("fails with reason-too-short when trimmed reason < 10 chars", async () => {
    const reject = vi.fn();
    const useCase = new RejectStaffLeaveUseCase(makeRepo({ reject }));

    const res = await useCase.execute("sl-001", "  ngắn  ");

    expect(res).toEqual({ ok: false, error: { type: "reason-too-short" } });
    expect(reject).not.toHaveBeenCalled();
  });

  it("rejects with a valid (trimmed) reason", async () => {
    const reject = vi.fn().mockResolvedValue({ ok: true });
    const useCase = new RejectStaffLeaveUseCase(makeRepo({ reject }));

    const res = await useCase.execute("sl-001", "  Lý do hợp lệ đủ dài  ");

    expect(reject).toHaveBeenCalledWith("sl-001", "Lý do hợp lệ đủ dài");
    expect(res).toEqual({ ok: true });
  });

  it("propagates not-found from the repo", async () => {
    const reject = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { type: "not-found" } });
    const useCase = new RejectStaffLeaveUseCase(makeRepo({ reject }));

    const res = await useCase.execute("sl-x", "Lý do hợp lệ đủ dài");

    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("propagates already-processed from the repo", async () => {
    const reject = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { type: "already-processed" } });
    const useCase = new RejectStaffLeaveUseCase(makeRepo({ reject }));

    const res = await useCase.execute("sl-007", "Lý do hợp lệ đủ dài");

    expect(res).toEqual({ ok: false, error: { type: "already-processed" } });
  });
});
