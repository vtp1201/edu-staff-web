/**
 * Unit tests — parent timetable Server Actions.
 * Story requirement (US-E15.1 AC2 + Phase 4 QA task): a non-parent session
 * (e.g. a student session hitting /parent/schedule directly, or a parent
 * probing another child's data) must be rejected with
 * `{ ok: false, errorKey: "forbidden" }` BEFORE the DI/use-case layer is ever
 * touched — every mapped-failure path stays user-safe (no leaked class/child
 * data). Pattern mirrors `student/courses/[courseId]/actions.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const getChildListExecute = vi.fn();
const getChildTimetableExecute = vi.fn();

vi.mock("@/bootstrap/di/timetable-view.di", () => ({
  makeGetChildListUseCase: vi.fn(async () => ({
    execute: getChildListExecute,
  })),
  makeGetChildTimetableUseCase: vi.fn(async () => ({
    execute: getChildTimetableExecute,
  })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { getChildListAction, getChildTimetableAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parent timetable Server Actions — RBAC (AC2)", () => {
  it("getChildListAction rejects a non-parent caller (e.g. student) without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await getChildListAction();

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getChildListExecute).not.toHaveBeenCalled();
  });

  it("getChildTimetableAction rejects a non-parent caller (e.g. student) without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await getChildTimetableAction("c1");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getChildTimetableExecute).not.toHaveBeenCalled();
  });

  it("getChildListAction proceeds to the use-case when the caller IS a parent", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "parent" } as never);
    const roster = [
      {
        childId: "c1",
        name: "Nguyễn Minh Khoa",
        classId: "11A2",
        className: "11A2",
        avatar: "NK",
        color: "primary",
      },
    ];
    getChildListExecute.mockResolvedValue({ ok: true, data: roster });

    const result = await getChildListAction();

    expect(result).toEqual({ ok: true, data: roster });
    expect(getChildListExecute).toHaveBeenCalledTimes(1);
  });

  it("getChildTimetableAction proceeds with the given childId when the caller IS a parent", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "parent" } as never);
    const timetable = { classId: "8B1", className: "8B1", slots: {} };
    getChildTimetableExecute.mockResolvedValue({ ok: true, data: timetable });

    const result = await getChildTimetableAction("c2");

    expect(result).toEqual({ ok: true, data: timetable });
    expect(getChildTimetableExecute).toHaveBeenCalledWith("c2");
  });

  it("getChildTimetableAction maps a no-child failure to its errorKey (unknown/foreign childId stays user-safe)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "parent" } as never);
    getChildTimetableExecute.mockResolvedValue({
      ok: false,
      error: { type: "no-child" },
    });

    const result = await getChildTimetableAction("not-my-child");

    expect(result).toEqual({ ok: false, errorKey: "no-child" });
  });
});
