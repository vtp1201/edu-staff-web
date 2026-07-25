import { describe, expect, it } from "vitest";
import { FlagStudentAbsenceUseCase } from "./flag-student-absence.use-case";
import { absence, makeRepoMock } from "./student-absence.test-doubles";

const key = {
  classId: "11B2",
  studentMemberId: "stu-1",
  date: "2026-05-05",
} as const;

describe("FlagStudentAbsenceUseCase (INT-004)", () => {
  it("performs exactly ONE round trip and returns the flagged entity (AC-005.4)", async () => {
    const repo = makeRepoMock();
    repo.flagAbsence.mockResolvedValue(
      absence({ state: "FLAGGED_UNEXCUSED", flaggedByMemberId: "admin-1" }),
    );

    const result = await new FlagStudentAbsenceUseCase(repo).execute(key);

    expect(result.state).toBe("FLAGGED_UNEXCUSED");
    expect(result.flaggedByMemberId).toBe("admin-1");
    expect(repo.flagAbsence).toHaveBeenCalledTimes(1);
    expect(repo.flagAbsence).toHaveBeenCalledWith(key);
  });

  it("propagates forbidden — the principal-tier re-check lives server-side (NFR-008 pt.2)", async () => {
    const repo = makeRepoMock();
    repo.flagAbsence.mockRejectedValue({ type: "forbidden" });

    await expect(
      new FlagStudentAbsenceUseCase(repo).execute(key),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("propagates invalid-state on a re-flag attempt (terminal state, AC-005.8)", async () => {
    const repo = makeRepoMock();
    repo.flagAbsence.mockRejectedValue({ type: "invalid-state" });

    await expect(
      new FlagStudentAbsenceUseCase(repo).execute(key),
    ).rejects.toEqual({ type: "invalid-state" });
  });

  it("propagates not-found (row changed by another actor, AC-005.7)", async () => {
    const repo = makeRepoMock();
    repo.flagAbsence.mockRejectedValue({ type: "not-found" });

    await expect(
      new FlagStudentAbsenceUseCase(repo).execute(key),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("exposes NO unflag capability anywhere on the repository contract (FR-006/FR-013)", () => {
    const repo = makeRepoMock();
    expect(Object.keys(repo).sort()).toEqual([
      "editAbsence",
      "flagAbsence",
      "listAbsences",
      "recordAbsence",
    ]);
    expect("unflagAbsence" in repo).toBe(false);
  });
});
