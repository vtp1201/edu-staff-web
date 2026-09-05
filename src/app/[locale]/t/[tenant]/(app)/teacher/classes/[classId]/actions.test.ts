/**
 * Server Action tests — class-hub timetable tab (US-E24.9, HIGH-RISK lane).
 *
 * Two boundaries are proved here:
 * 1. the period-log/prep mutations thread the SERVER-DERIVED `authCtx` into the
 *    use-case (never a client-supplied one) and never translate a failure;
 * 2. the three homeroom-entry actions are role-gated: a teacher who is NOT the
 *    class's GVCN is denied WITHOUT the underlying class-log action being
 *    called at all. This tab is the first screen a GVBM can load that exposes
 *    those actions, so the gate is new here (PLAN §0.9's carve-out).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const savePeriodLog = vi.fn();
const deletePeriodLog = vi.fn();
const savePeriodPrep = vi.fn();
const deletePeriodPrep = vi.fn();
const AUTH_CTX = { role: "teacher" as const, memberId: "member-me" };

vi.mock("@/bootstrap/di/period-log.di", () => ({
  makeSavePeriodLogUseCase: vi.fn(async () => ({
    useCase: { execute: savePeriodLog },
    authCtx: AUTH_CTX,
  })),
  makeDeletePeriodLogUseCase: vi.fn(async () => ({
    useCase: { execute: deletePeriodLog },
    authCtx: AUTH_CTX,
  })),
  makeSavePeriodPrepUseCase: vi.fn(async () => ({
    useCase: { execute: savePeriodPrep },
    authCtx: AUTH_CTX,
  })),
  makeDeletePeriodPrepUseCase: vi.fn(async () => ({
    useCase: { execute: deletePeriodPrep },
    authCtx: AUTH_CTX,
  })),
}));

const approveLeave = vi.fn();
const rejectLeave = vi.fn();
let leaveAuthCtx = { role: "teacher", homeroomClassIds: ["c-1"] };
vi.mock("@/bootstrap/di/discipline.di", () => ({
  makeDecideLeaveUseCases: vi.fn(async () => ({
    approve: { execute: approveLeave },
    reject: { execute: rejectLeave },
    authCtx: leaveAuthCtx,
  })),
}));

const getMyClass = vi.fn();
vi.mock("@/bootstrap/di/teacher-class.di", () => ({
  makeGetMyClassUseCase: vi.fn(async () => ({ execute: getMyClass })),
}));

const createEntryAction = vi.fn();
const submitEntryAction = vi.fn();
const reviseEntryAction = vi.fn();
vi.mock("../../class-log/actions", () => ({
  createEntryAction: (...args: unknown[]) => createEntryAction(...args),
  submitEntryAction: (...args: unknown[]) => submitEntryAction(...args),
  reviseEntryAction: (...args: unknown[]) => reviseEntryAction(...args),
}));

vi.mock("@/bootstrap/lib/resolve-current-term", () => ({
  resolveCurrentTermContext: vi.fn(async () => ({
    termId: "term-1",
    termName: "HK1",
    academicYearLabel: "2025–2026",
    academicYearId: "year-1",
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  approveLeaveAction,
  deletePeriodLogAction,
  deletePeriodPrepAction,
  rejectLeaveAction,
  reviseDailyEntryAction,
  saveDailyEntryAction,
  savePeriodLogAction,
  savePeriodPrepAction,
  submitDailyEntryAction,
} from "./actions";

const HOMEROOM_CLASS = {
  ok: true,
  data: { id: "c-1", roles: ["homeroom", "subject"] },
};
const SUBJECT_ONLY_CLASS = {
  ok: true,
  data: { id: "c-1", roles: ["subject"] },
};

beforeEach(() => {
  vi.clearAllMocks();
  leaveAuthCtx = { role: "teacher", homeroomClassIds: ["c-1"] };
});

describe("savePeriodLogAction", () => {
  it("threads the server-derived authCtx + resolved term context into the use-case", async () => {
    savePeriodLog.mockResolvedValue({ ok: true, data: { periodNumber: 2 } });

    const res = await savePeriodLogAction("c-1", "2026-09-07", 2, "member-me", {
      lessonTitle: "Đạo hàm",
      remark: "",
      grade: "A",
      absentCount: 1,
    });

    expect(savePeriodLog).toHaveBeenCalledWith(AUTH_CTX, {
      classId: "c-1",
      date: "2026-09-07",
      periodNumber: 2,
      assignedTeacherMemberId: "member-me",
      termId: "term-1",
      academicYearId: "year-1",
      input: {
        lessonTitle: "Đạo hàm",
        remark: "",
        grade: "A",
        absentCount: 1,
      },
    });
    expect(res).toEqual({ ok: true, data: { periodNumber: 2 } });
  });

  it("returns a stable errorKey, never a translated message", async () => {
    savePeriodLog.mockResolvedValue({
      ok: false,
      error: { type: "slot-forbidden-or-missing" },
    });

    const res = await savePeriodLogAction("c-1", "2026-09-07", 2, "other", {
      lessonTitle: "x",
      grade: "A",
      absentCount: 0,
    });

    expect(res).toEqual({ ok: false, errorKey: "slot-forbidden-or-missing" });
  });

  it("surfaces an unresolvable term as a failure instead of throwing at the boundary", async () => {
    const { resolveCurrentTermContext } = await import(
      "@/bootstrap/lib/resolve-current-term"
    );
    vi.mocked(resolveCurrentTermContext).mockRejectedValueOnce({
      type: "invalid-term",
    });

    const res = await savePeriodLogAction("c-1", "2026-09-07", 2, "member-me", {
      lessonTitle: "x",
      grade: "A",
      absentCount: 0,
    });

    expect(res).toEqual({ ok: false, errorKey: "slot-forbidden-or-missing" });
    expect(savePeriodLog).not.toHaveBeenCalled();
  });
});

describe("period-prep + delete actions", () => {
  it("savePeriodPrepAction passes the materials list verbatim", async () => {
    savePeriodPrep.mockResolvedValue({ ok: true, data: { periodNumber: 2 } });

    await savePeriodPrepAction("c-1", "2026-09-07", 2, "member-me", {
      note: "n",
      materials: [{ title: "t", url: "https://a.test" }],
    });

    expect(savePeriodPrep.mock.calls[0][1].input).toEqual({
      note: "n",
      materials: [{ title: "t", url: "https://a.test" }],
    });
  });

  it("deletePeriodLogAction / deletePeriodPrepAction thread authCtx too", async () => {
    deletePeriodLog.mockResolvedValue({ ok: true, data: undefined });
    deletePeriodPrep.mockResolvedValue({ ok: true, data: undefined });

    await deletePeriodLogAction("c-1", "2026-09-07", 2, "member-me");
    await deletePeriodPrepAction("c-1", "2026-09-07", 2, "member-me");

    expect(deletePeriodLog.mock.calls[0][0]).toEqual(AUTH_CTX);
    expect(deletePeriodPrep.mock.calls[0][0]).toEqual(AUTH_CTX);
  });
});

describe("homeroom daily-entry actions — role gate (forge-role proof)", () => {
  it("a SUBJECT-only teacher is denied on all three, with ZERO calls to the class-log actions", async () => {
    getMyClass.mockResolvedValue(SUBJECT_ONLY_CLASS);

    const results = await Promise.all([
      saveDailyEntryAction("c-1", "2026-09-07", "Nội dung"),
      submitDailyEntryAction("c-1", "e-1"),
      reviseDailyEntryAction("c-1", "e-1"),
    ]);

    for (const res of results) {
      expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    }
    expect(createEntryAction).not.toHaveBeenCalled();
    expect(submitEntryAction).not.toHaveBeenCalled();
    expect(reviseEntryAction).not.toHaveBeenCalled();
  });

  it("a class the caller cannot load at all is denied (fail closed)", async () => {
    getMyClass.mockResolvedValue({ ok: false, error: { type: "not-found" } });

    expect(await submitDailyEntryAction("c-1", "e-1")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(submitEntryAction).not.toHaveBeenCalled();
  });

  it("the class's GVCN is allowed through to the reused class-log actions", async () => {
    getMyClass.mockResolvedValue(HOMEROOM_CLASS);
    createEntryAction.mockResolvedValue({
      ok: true,
      entry: { entryId: "e-1" },
    });
    submitEntryAction.mockResolvedValue({
      ok: true,
      entry: { entryId: "e-1" },
    });
    reviseEntryAction.mockResolvedValue({
      ok: true,
      entry: { entryId: "e-1" },
    });

    await saveDailyEntryAction("c-1", "2026-09-07", "Nội dung", "Ghi chú");
    await submitDailyEntryAction("c-1", "e-1");
    await reviseDailyEntryAction("c-1", "e-1");

    expect(createEntryAction).toHaveBeenCalledWith(
      "c-1",
      "2026-09-07",
      "Nội dung",
      "Ghi chú",
    );
    expect(submitEntryAction).toHaveBeenCalledWith("c-1", "e-1");
    expect(reviseEntryAction).toHaveBeenCalledWith("c-1", "e-1");
  });

  it("passes the underlying class-log failure key through untranslated", async () => {
    getMyClass.mockResolvedValue(HOMEROOM_CLASS);
    createEntryAction.mockResolvedValue({
      ok: false,
      errorKey: "already-exists",
    });

    expect(await saveDailyEntryAction("c-1", "2026-09-07", "x")).toEqual({
      ok: false,
      errorKey: "already-exists",
    });
  });
});

/**
 * US-E24.11 — the two HIGH-RISK leave decisions. Both are irreversible for the
 * student, so the server-derived `authCtx` (decision 0063) must reach the
 * use-case on every call, and a failure must come back as a stable KEY the
 * presentation translates — never as translated copy.
 */
describe("approveLeaveAction / rejectLeaveAction (US-E24.11)", () => {
  const LEAVE = { id: "l-1", studentMemberId: "s-30", classId: "c-1" };

  it("approve threads the SERVER-DERIVED authCtx alongside the whole addressing tuple", async () => {
    approveLeave.mockResolvedValue({ id: "l-1", status: "approved" });

    const res = await approveLeaveAction("l-1", "s-30", "c-1");

    expect(approveLeave).toHaveBeenCalledWith({
      ...LEAVE,
      authCtx: { role: "teacher", homeroomClassIds: ["c-1"] },
    });
    expect(res).toEqual({ ok: true });
  });

  it("reject sends the reason with the same tuple + authCtx", async () => {
    rejectLeave.mockResolvedValue({ id: "l-1", status: "rejected" });

    const res = await rejectLeaveAction(
      "l-1",
      "s-30",
      "c-1",
      "Đã nghỉ quá 5 ngày trong tháng",
    );

    expect(rejectLeave).toHaveBeenCalledWith({
      ...LEAVE,
      reason: "Đã nghỉ quá 5 ngày trong tháng",
      authCtx: { role: "teacher", homeroomClassIds: ["c-1"] },
    });
    expect(res).toEqual({ ok: true });
  });

  it("a thrown DisciplineFailure comes back as a stable errorKey (the action never translates)", async () => {
    approveLeave.mockRejectedValue({ type: "already-processed" });

    expect(await approveLeaveAction("l-1", "s-30", "c-1")).toEqual({
      ok: false,
      errorKey: "already-processed",
    });
  });

  it("an unexpected throw degrades to network-error rather than leaking the error object", async () => {
    rejectLeave.mockRejectedValue(new Error("socket hang up"));

    expect(
      await rejectLeaveAction("l-1", "s-30", "c-1", "Lý do hợp lệ đủ dài"),
    ).toEqual({ ok: false, errorKey: "network-error" });
  });

  it("a forged classId is refused by the repository guard and surfaces as `forbidden`", async () => {
    // The DI-assembled scope does not contain the class being acted on; the
    // guard lives at the repository, so the use-case is what rejects.
    leaveAuthCtx = { role: "teacher", homeroomClassIds: ["some-other-class"] };
    approveLeave.mockRejectedValue({ type: "forbidden" });

    expect(await approveLeaveAction("l-1", "s-30", "c-1")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
  });

  it("never revalidates the route when the decision failed", async () => {
    const { revalidatePath } = await import("next/cache");
    approveLeave.mockRejectedValue({ type: "forbidden" });

    await approveLeaveAction("l-1", "s-30", "c-1");

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates the class-hub route after a successful decision", async () => {
    const { revalidatePath } = await import("next/cache");
    approveLeave.mockResolvedValue({ id: "l-1", status: "approved" });

    await approveLeaveAction("l-1", "s-30", "c-1");

    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/t/[tenant]/(app)/teacher/classes/[classId]",
      "page",
    );
  });
});
