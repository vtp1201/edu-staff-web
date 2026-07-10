/**
 * Unit tests — teacher teaching-schedule Server Action (US-E15.2 AC1/AC2).
 * A teacher session must be the only caller that can reach
 * `getMyTeachingScheduleAction`; a non-teacher caller must be rejected with
 * `{ ok: false, errorKey: "forbidden" }` BEFORE the DI/use-case layer is ever
 * touched. Pattern mirrors `student/schedule/actions.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const getScheduleExecute = vi.fn();

vi.mock("@/bootstrap/di/timetable-view.di", () => ({
  makeGetMyTeachingScheduleUseCase: vi.fn(async () => ({
    execute: getScheduleExecute,
  })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { getMyTeachingScheduleAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("teacher teaching-schedule Server Action — RBAC (AC1)", () => {
  it("rejects a non-teacher caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await getMyTeachingScheduleAction();

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getScheduleExecute).not.toHaveBeenCalled();
  });

  it("proceeds to the use-case when the caller IS a teacher", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "teacher" } as never);
    const timetable = {
      classId: "t1",
      className: "Cô Nguyễn Thị Hương",
      slots: {},
    };
    getScheduleExecute.mockResolvedValue({ ok: true, data: timetable });

    const result = await getMyTeachingScheduleAction();

    expect(result).toEqual({ ok: true, data: timetable });
    expect(getScheduleExecute).toHaveBeenCalledTimes(1);
  });

  it("maps a use-case failure to its errorKey (does not swallow the failure type)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "teacher" } as never);
    getScheduleExecute.mockResolvedValue({
      ok: false,
      error: { type: "not-found" },
    });

    const result = await getMyTeachingScheduleAction();

    expect(result).toEqual({ ok: false, errorKey: "not-found" });
  });
});
