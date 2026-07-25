import { describe, expect, it } from "vitest";
import { ListStudentAbsencesUseCase } from "./list-student-absences.use-case";
import { absence, makeRepoMock } from "./student-absence.test-doubles";

describe("ListStudentAbsencesUseCase (INT-002)", () => {
  it("delegates the filter to the repository verbatim", async () => {
    const repo = makeRepoMock();
    const rows = [absence(), absence({ studentMemberId: "stu-4" })];
    repo.listAbsences.mockResolvedValue(rows);

    const result = await new ListStudentAbsencesUseCase(repo).execute({
      classId: "11B2",
      from: "2026-05-01",
      to: "2026-05-06",
    });

    expect(result).toEqual(rows);
    expect(repo.listAbsences).toHaveBeenCalledWith({
      classId: "11B2",
      from: "2026-05-01",
      to: "2026-05-06",
    });
  });

  it("supports a schoolwide call with no classId (principal, FR-009)", async () => {
    const repo = makeRepoMock();
    repo.listAbsences.mockResolvedValue([]);

    await new ListStudentAbsencesUseCase(repo).execute({});

    expect(repo.listAbsences).toHaveBeenCalledWith({});
  });

  it("does NOT re-scope or client-filter — the repository is the scope boundary (NFR-008)", async () => {
    const repo = makeRepoMock();
    // Repo pinned the teacher to their own class and ignored the forged one.
    repo.listAbsences.mockResolvedValue([absence({ classId: "11B2" })]);

    const result = await new ListStudentAbsencesUseCase(repo).execute({
      classId: "10A1",
    });

    expect(repo.listAbsences).toHaveBeenCalledWith({ classId: "10A1" });
    expect(result.every((r) => r.classId === "11B2")).toBe(true);
  });

  it("propagates an empty list distinctly from an error", async () => {
    const repo = makeRepoMock();
    repo.listAbsences.mockResolvedValue([]);

    await expect(
      new ListStudentAbsencesUseCase(repo).execute({ classId: "11B2" }),
    ).resolves.toEqual([]);
  });

  it("propagates a repository failure (forbidden backstop, AC-001.6)", async () => {
    const repo = makeRepoMock();
    repo.listAbsences.mockRejectedValue({ type: "forbidden" });

    await expect(
      new ListStudentAbsencesUseCase(repo).execute({ classId: "11B2" }),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
