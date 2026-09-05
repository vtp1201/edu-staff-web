import { describe, expect, it } from "vitest";
import {
  MAX_MATERIALS,
  type PeriodPrep,
} from "../../entities/period-prep.entity";
import { DeletePeriodPrepUseCase } from "../delete-period-prep.use-case";
import { SavePeriodPrepUseCase } from "../save-period-prep.use-case";
import { FORGED_ROLES, makeSpyRepo } from "./fake-repo";

const ASSIGNED = "member-owner";

const saved: PeriodPrep = {
  classId: "c-1",
  date: "2026-09-07",
  periodNumber: 2,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "s-1",
  teacherMemberId: ASSIGNED,
  note: "Ôn tập",
  lessonPlanId: null,
  materials: [],
  createdAt: "2026-09-07T01:00:00Z",
  updatedAt: "2026-09-07T01:00:00Z",
};

function materials(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    title: `Tài liệu ${i + 1}`,
    url: `https://example.org/${i + 1}`,
  }));
}

function params(over: Record<string, unknown> = {}) {
  return {
    classId: "c-1",
    date: "2026-09-07",
    periodNumber: 2,
    assignedTeacherMemberId: ASSIGNED,
    termId: "t-1",
    academicYearId: "y-1",
    input: { note: "Ôn tập", materials: materials(1) },
    ...over,
  } as Parameters<SavePeriodPrepUseCase["execute"]>[1];
}

describe("SavePeriodPrepUseCase — slot-ownership guard (decision 0063)", () => {
  it.each(
    FORGED_ROLES,
  )("role=%s not owning the slot fails without touching the repo", async (role) => {
    const repo = makeSpyRepo();

    const result = await new SavePeriodPrepUseCase(repo).execute(
      { role, memberId: "member-other" },
      params(),
    );

    expect(result).toEqual({
      ok: false,
      error: { type: "slot-forbidden-or-missing" },
    });
    expect(repo.savePeriodPrep).not.toHaveBeenCalled();
  });

  it("blocks the 21st material client-side (no wasted round trip)", async () => {
    const repo = makeSpyRepo();

    const result = await new SavePeriodPrepUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params({
        input: { note: "", materials: materials(MAX_MATERIALS + 1) },
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: { type: "too-many-materials" },
    });
    expect(repo.savePeriodPrep).not.toHaveBeenCalled();
  });

  it("allows exactly 20 materials", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodPrep.mockResolvedValue(saved);

    const result = await new SavePeriodPrepUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params({ input: { note: "", materials: materials(MAX_MATERIALS) } }),
    );

    expect(result.ok).toBe(true);
    expect(repo.savePeriodPrep).toHaveBeenCalledTimes(1);
  });

  it("the slot owner saves and gets the mapped entity", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodPrep.mockResolvedValue(saved);

    const result = await new SavePeriodPrepUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(result).toEqual({ ok: true, data: saved });
    expect(repo.savePeriodPrep.mock.calls[0]).toEqual([
      "c-1",
      "2026-09-07",
      2,
      { termId: "t-1", academicYearId: "y-1" },
      { note: "Ôn tập", materials: materials(1) },
    ]);
  });

  it("maps a thrown typed failure (lesson plan not owned)", async () => {
    const repo = makeSpyRepo();
    repo.savePeriodPrep.mockRejectedValue({ type: "lesson-plan-not-owned" });

    const result = await new SavePeriodPrepUseCase(repo).execute(
      { role: "teacher", memberId: ASSIGNED },
      params(),
    );

    expect(result).toEqual({
      ok: false,
      error: { type: "lesson-plan-not-owned" },
    });
  });
});

describe("DeletePeriodPrepUseCase — same guard", () => {
  it.each(
    FORGED_ROLES,
  )("role=%s not owning the slot is denied", async (role) => {
    const repo = makeSpyRepo();

    const result = await new DeletePeriodPrepUseCase(repo).execute(
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
    expect(repo.deletePeriodPrep).not.toHaveBeenCalled();
  });

  it("the slot owner deletes", async () => {
    const repo = makeSpyRepo();

    const result = await new DeletePeriodPrepUseCase(repo).execute(
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
    expect(repo.deletePeriodPrep).toHaveBeenCalledTimes(1);
  });
});
