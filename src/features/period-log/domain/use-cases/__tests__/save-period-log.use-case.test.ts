/**
 * US-E24.9 — HIGH-RISK lane. `SavePeriodLog`/`DeletePeriodLog` carry the
 * client-side slot-ownership guard (decision 0063 applied ONE layer up from the
 * repository — see the use-case's own doc comment for why). These tests are the
 * forge-role proof: a caller whose verified `memberId` is not the slot's
 * assigned teacher must fail BEFORE any HTTP call, for EVERY role value.
 */
import { describe, expect, it } from "vitest";
import type { PeriodLog } from "../../entities/period-log.entity";
import type { PeriodLogAuthContext } from "../../entities/period-log-auth-context.entity";
import { DeletePeriodLogUseCase } from "../delete-period-log.use-case";
import { SavePeriodLogUseCase } from "../save-period-log.use-case";
import { FORGED_ROLES, makeSpyRepo } from "./fake-repo";

const ASSIGNED = "member-owner";

const saved: PeriodLog = {
  classId: "c-1",
  date: "2026-09-07",
  periodNumber: 2,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "s-1",
  teacherMemberId: ASSIGNED,
  lessonTitle: "Đạo hàm",
  remark: "",
  grade: "A",
  absentCount: 1,
  createdAt: "2026-09-07T01:00:00Z",
  updatedAt: "2026-09-07T01:00:00Z",
};

function params(
  over: Partial<Parameters<SavePeriodLogUseCase["execute"]>[1]> = {},
) {
  return {
    classId: "c-1",
    date: "2026-09-07",
    periodNumber: 2,
    assignedTeacherMemberId: ASSIGNED,
    termId: "t-1",
    academicYearId: "y-1",
    input: {
      lessonTitle: "Đạo hàm",
      remark: "",
      grade: "A" as const,
      absentCount: 1,
    },
    ...over,
  };
}

describe("SavePeriodLogUseCase — slot-ownership guard (decision 0063)", () => {
  it.each(
    FORGED_ROLES,
  )("role=%s with a memberId that is NOT the slot teacher fails without touching the repo", async (role) => {
    const repo = makeSpyRepo();
    const authCtx: PeriodLogAuthContext = { role, memberId: "member-other" };

    const result = await new SavePeriodLogUseCase(repo).execute(
      authCtx,
      params(),
    );

    expect(result).toEqual({
      ok: false,
      error: { type: "slot-forbidden-or-missing" },
    });
    expect(repo.savePeriodLog).not.toHaveBeenCalled();
  });

  it("an empty memberId (unreadable token) can never match an assigned teacher", async () => {
    const repo = makeSpyRepo();

    const result = await new SavePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: "" },
      params({ assignedTeacherMemberId: "" }),
    );

    expect(result.ok).toBe(false);
    expect(repo.savePeriodLog).not.toHaveBeenCalled();
  });

  it("the slot's own teacher passes through to the repository once", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodLog.mockResolvedValue(saved);

    const result = await new SavePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(result).toEqual({ ok: true, data: saved });
    expect(repo.savePeriodLog).toHaveBeenCalledTimes(1);
  });

  it("passes term context + input verbatim to the repository", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodLog.mockResolvedValue(saved);

    await new SavePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(repo.savePeriodLog.mock.calls[0]).toEqual([
      "c-1",
      "2026-09-07",
      2,
      { termId: "t-1", academicYearId: "y-1" },
      { lessonTitle: "Đạo hàm", remark: "", grade: "A", absentCount: 1 },
    ]);
  });

  it("maps a thrown typed failure from the repository", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodLog.mockRejectedValue({ type: "term-mismatch" });

    const result = await new SavePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(result).toEqual({ ok: false, error: { type: "term-mismatch" } });
  });

  it("maps an unknown thrown value to network-error", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodLog.mockRejectedValue(new Error("boom"));

    const result = await new SavePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});

describe("DeletePeriodLogUseCase — same guard", () => {
  it.each(
    FORGED_ROLES,
  )("role=%s not owning the slot cannot delete (zero repo calls)", async (role) => {
    const repo = makeSpyRepo();

    const result = await new DeletePeriodLogUseCase(repo).execute(
      { role, memberId: "member-other" },
      {
        classId: "c-1",
        date: "2026-09-07",
        periodNumber: 2,
        assignedTeacherMemberId: ASSIGNED,
        termId: "t-1",
        academicYearId: "y-1",
      },
    );

    expect(result).toEqual({
      ok: false,
      error: { type: "slot-forbidden-or-missing" },
    });
    expect(repo.deletePeriodLog).not.toHaveBeenCalled();
  });

  it("the slot owner deletes", async () => {
    const repo = makeSpyRepo();

    const result = await new DeletePeriodLogUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      {
        classId: "c-1",
        date: "2026-09-07",
        periodNumber: 2,
        assignedTeacherMemberId: ASSIGNED,
        termId: "t-1",
        academicYearId: "y-1",
      },
    );

    expect(result.ok).toBe(true);
    expect(repo.deletePeriodLog).toHaveBeenCalledTimes(1);
  });
});
