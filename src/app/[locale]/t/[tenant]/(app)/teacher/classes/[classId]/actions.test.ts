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
  deletePeriodLogAction,
  deletePeriodPrepAction,
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
