/**
 * Unit tests — staff-leave approve/reject Server Actions (US-E18.36).
 *
 * Both actions mutate real `core` state now that the repository is un-mocked,
 * so the `requireRole(["admin"])` gate is load-bearing: a Server Action is an
 * independently-invocable POST endpoint and the `(app)/admin/layout.tsx` RSC
 * guard covers only the page render, NOT this path (ADR 0063 defense-in-depth,
 * same shape as `admin/invitations/actions.ts`). Core re-authorizes on its own
 * (403 `VIOLATION_FORBIDDEN`), but the gate must short-circuit BEFORE any DI /
 * use-case call — proven per action by a zero-call assertion.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({ requireRole: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { approveExecute, rejectExecute, makeApprove, makeReject } = vi.hoisted(
  () => {
    const approveExecute = vi.fn();
    const rejectExecute = vi.fn();
    return {
      approveExecute,
      rejectExecute,
      makeApprove: vi.fn(async () => ({ execute: approveExecute })),
      makeReject: vi.fn(async () => ({ execute: rejectExecute })),
    };
  },
);

vi.mock("@/bootstrap/di/staff-leave.di", () => ({
  makeApproveStaffLeaveUseCase: makeApprove,
  makeRejectStaffLeaveUseCase: makeReject,
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { approveStaffLeaveAction, rejectStaffLeaveAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
});

describe("requireRole('admin') gates both staff-leave mutations", () => {
  it("approveStaffLeaveAction short-circuits with no DI / use-case call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    await expect(approveStaffLeaveAction("req-1", "mem-1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(makeApprove).not.toHaveBeenCalled();
    expect(approveExecute).not.toHaveBeenCalled();
  });

  it("rejectStaffLeaveAction short-circuits with no DI / use-case call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    await expect(
      rejectStaffLeaveAction("req-1", "mem-1", "Trùng lịch hội nghị."),
    ).resolves.toEqual({ ok: false, errorKey: "forbidden" });
    expect(makeReject).not.toHaveBeenCalled();
    expect(rejectExecute).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller the same way (no use-case call)", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "unauthenticated" });

    await expect(approveStaffLeaveAction("req-1", "mem-1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(approveExecute).not.toHaveBeenCalled();
  });

  it("asks for the admin role specifically, on both actions", async () => {
    approveExecute.mockResolvedValue({ ok: true });
    rejectExecute.mockResolvedValue({ ok: true });

    await approveStaffLeaveAction("req-1", "mem-1");
    await rejectStaffLeaveAction("req-1", "mem-1", "Lý do đủ dài");

    expect(mockRequireRole).toHaveBeenCalledTimes(2);
    for (const call of mockRequireRole.mock.calls) {
      expect(call[0]).toEqual(["admin"]);
    }
  });
});

describe("outcome threading (stable failure keys, never translated copy)", () => {
  it("forwards approve success and passes staffId through", async () => {
    approveExecute.mockResolvedValue({ ok: true });

    await expect(approveStaffLeaveAction("req-1", "mem-1")).resolves.toEqual({
      ok: true,
    });
    expect(approveExecute).toHaveBeenCalledWith("req-1", "mem-1");
  });

  it("forwards reject success with the reason and staffId", async () => {
    rejectExecute.mockResolvedValue({ ok: true });

    await expect(
      rejectStaffLeaveAction("req-1", "mem-1", "Trùng lịch hội nghị."),
    ).resolves.toEqual({ ok: true });
    expect(rejectExecute).toHaveBeenCalledWith(
      "req-1",
      "mem-1",
      "Trùng lịch hội nghị.",
    );
  });

  it("maps a domain failure to its stable errorKey", async () => {
    approveExecute.mockResolvedValue({
      ok: false,
      error: { type: "same-actor" },
    });

    await expect(approveStaffLeaveAction("req-1", "mem-1")).resolves.toEqual({
      ok: false,
      errorKey: "same-actor",
    });
  });
});
