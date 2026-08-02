/**
 * Unit tests — principal schedule Server Actions (US-E15.3).
 *
 * Two things are worth proving here and nowhere else:
 * 1. the RBAC guard short-circuits BEFORE any DI factory is touched;
 * 2. the teacher roster crosses a RESULT-SHAPE boundary — the `principal`
 *    feature returns `Result<T,E>` (`.value` / `.failure`), the timetable
 *    presentation only understands `{ ok, data } | { ok, errorKey }`. The
 *    bridge is explicit (a switch), so every principal failure type must land
 *    on a real `TimetableErrorKey` — no silent coercion.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";

const {
  requireRole,
  teachersExecute,
  timetableExecute,
  makeGetPrincipalTeachersUseCase,
  makeGetMemberTimetableForPrincipalUseCase,
} = vi.hoisted(() => {
  const teachersExecute = vi.fn();
  const timetableExecute = vi.fn();
  return {
    requireRole: vi.fn(),
    teachersExecute,
    timetableExecute,
    makeGetPrincipalTeachersUseCase: vi.fn(async () => ({
      execute: teachersExecute,
    })),
    makeGetMemberTimetableForPrincipalUseCase: vi.fn(async () => ({
      execute: timetableExecute,
    })),
  };
});

vi.mock("@/bootstrap/auth-guard", () => ({ requireRole }));
vi.mock("@/bootstrap/di", () => ({ makeGetPrincipalTeachersUseCase }));
vi.mock("@/bootstrap/di/timetable-view.di", () => ({
  makeGetMemberTimetableForPrincipalUseCase,
}));

import {
  getMemberTimetableAction,
  getPrincipalTeacherListAction,
} from "./actions";

const WEEK = { classId: "t-1", className: "", slots: {} };

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, role: "principal" });
});

describe("getPrincipalTeacherListAction", () => {
  it("bridges the principal Result `.value` into the action's `data`", async () => {
    const teachers = [{ teacherId: "t-1", displayName: "Cô A" }];
    teachersExecute.mockResolvedValue(ok(teachers));

    expect(await getPrincipalTeacherListAction()).toEqual({
      ok: true,
      data: teachers,
    });
  });

  it.each([
    ["network-error", "network-error"],
    ["forbidden", "forbidden"],
    ["not-found", "not-found"],
    // No timetable counterpart exists for these two — they surface as the
    // GENERIC error banner (never collapsed into "empty", and never dressed up
    // as a transport failure: "check your connection" would be a lie).
    ["conflict-exists", "unknown"],
    ["unknown", "unknown"],
  ])("maps the %s principal failure to errorKey %s", async (from, to) => {
    teachersExecute.mockResolvedValue(fail({ type: from }));
    expect(await getPrincipalTeacherListAction()).toEqual({
      ok: false,
      errorKey: to,
    });
  });

  it("returns forbidden WITHOUT touching DI when the role guard denies", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    expect(await getPrincipalTeacherListAction()).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(makeGetPrincipalTeachersUseCase).not.toHaveBeenCalled();
    expect(requireRole).toHaveBeenCalledWith(["principal"]);
  });
});

describe("getMemberTimetableAction", () => {
  it("passes memberId + weekStart through and returns the week", async () => {
    timetableExecute.mockResolvedValue({ ok: true, data: WEEK });

    expect(await getMemberTimetableAction("t-1", "2026-08-03")).toEqual({
      ok: true,
      data: WEEK,
    });
    expect(timetableExecute).toHaveBeenCalledWith("t-1", "2026-08-03");
  });

  it("returns the failure type as a stable errorKey (never translated)", async () => {
    timetableExecute.mockResolvedValue({
      ok: false,
      error: { type: "not-found" },
    });

    expect(await getMemberTimetableAction("t-1")).toEqual({
      ok: false,
      errorKey: "not-found",
    });
  });

  it("returns forbidden WITHOUT touching DI when the role guard denies", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    expect(await getMemberTimetableAction("t-1")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(makeGetMemberTimetableForPrincipalUseCase).not.toHaveBeenCalled();
  });
});
