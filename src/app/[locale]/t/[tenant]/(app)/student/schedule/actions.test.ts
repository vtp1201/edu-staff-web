/**
 * Unit tests — student timetable Server Action.
 * Story requirement (US-E15.1 AC1 + Phase 4 QA task): a student session must
 * be the only caller that can reach `getMyTimetableAction`; a non-student
 * caller (e.g. a parent hitting /student/schedule) must be rejected with
 * `{ ok: false, errorKey: "forbidden" }` BEFORE the DI/use-case layer is ever
 * touched — the exact RBAC leak the story flags as a QA gate item. Pattern
 * mirrors `student/courses/[courseId]/actions.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const getMyTimetableExecute = vi.fn();

vi.mock("@/bootstrap/di/timetable-view.di", () => ({
  makeGetMyTimetableUseCase: vi.fn(async () => ({
    execute: getMyTimetableExecute,
  })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { getMyTimetableAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("student timetable Server Action — RBAC (AC1)", () => {
  it("rejects a non-student caller (e.g. parent) without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await getMyTimetableAction();

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getMyTimetableExecute).not.toHaveBeenCalled();
  });

  it("proceeds to the use-case when the caller IS a student", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    const timetable = { classId: "11A2", className: "11A2", slots: {} };
    getMyTimetableExecute.mockResolvedValue({ ok: true, data: timetable });

    const result = await getMyTimetableAction();

    expect(result).toEqual({ ok: true, data: timetable });
    expect(getMyTimetableExecute).toHaveBeenCalledTimes(1);
  });

  it("maps a use-case failure to its errorKey (does not swallow the failure type)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    getMyTimetableExecute.mockResolvedValue({
      ok: false,
      error: { type: "not-found" },
    });

    const result = await getMyTimetableAction();

    expect(result).toEqual({ ok: false, errorKey: "not-found" });
  });
});
