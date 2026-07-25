import { describe, expect, it } from "vitest";
import type { RecordStudentAbsenceInput } from "../entities/student-absence.entity";
import { RecordStudentAbsenceUseCase } from "./record-student-absence.use-case";
import { absence, makeRepoMock, TODAY } from "./student-absence.test-doubles";

const input = (
  over: Partial<RecordStudentAbsenceInput> = {},
): RecordStudentAbsenceInput => ({
  classId: "11B2",
  studentMemberId: "stu-1",
  date: "2026-05-05",
  excused: true,
  ...over,
});

describe("RecordStudentAbsenceUseCase (INT-001)", () => {
  it("creates a RECORDED absence on valid input (FR-001/AC-003.2)", async () => {
    const repo = makeRepoMock();
    repo.recordAbsence.mockResolvedValue(absence({ state: "RECORDED" }));

    const result = await new RecordStudentAbsenceUseCase(repo, TODAY).execute(
      input(),
    );

    expect(result.state).toBe("RECORDED");
    expect(repo.recordAbsence).toHaveBeenCalledWith(input());
  });

  it("accepts today's date (FR-002 allows ≤ today)", async () => {
    const repo = makeRepoMock();
    repo.recordAbsence.mockResolvedValue(absence({ date: TODAY }));

    await new RecordStudentAbsenceUseCase(repo, TODAY).execute(
      input({ date: TODAY }),
    );

    expect(repo.recordAbsence).toHaveBeenCalledTimes(1);
  });

  it("rejects a FUTURE date with invalid-date and never calls the repository (AC-003.3)", async () => {
    const repo = makeRepoMock();

    await expect(
      new RecordStudentAbsenceUseCase(repo, TODAY).execute(
        input({ date: "2026-05-07" }),
      ),
    ).rejects.toEqual({ type: "invalid-date" });
    expect(repo.recordAbsence).not.toHaveBeenCalled();
  });

  it("rejects a datetime / malformed date with invalid-input, NOT invalid-date (NFR-009)", async () => {
    const repo = makeRepoMock();
    const useCase = new RecordStudentAbsenceUseCase(repo, TODAY);

    await expect(
      useCase.execute(input({ date: "2026-05-05T07:40:00Z" })),
    ).rejects.toEqual({ type: "invalid-input" });
    await expect(useCase.execute(input({ date: "" }))).rejects.toEqual({
      type: "invalid-input",
    });
    expect(repo.recordAbsence).not.toHaveBeenCalled();
  });

  it("rejects a reason longer than 5000 chars with invalid-input", async () => {
    const repo = makeRepoMock();

    await expect(
      new RecordStudentAbsenceUseCase(repo, TODAY).execute(
        input({ reason: "x".repeat(5001) }),
      ),
    ).rejects.toEqual({ type: "invalid-input" });
    expect(repo.recordAbsence).not.toHaveBeenCalled();
  });

  it("accepts a reason of exactly 5000 chars (boundary)", async () => {
    const repo = makeRepoMock();
    repo.recordAbsence.mockResolvedValue(absence());

    await new RecordStudentAbsenceUseCase(repo, TODAY).execute(
      input({ reason: "x".repeat(5000) }),
    );

    expect(repo.recordAbsence).toHaveBeenCalledTimes(1);
  });

  it("rejects a blank student or class selection with invalid-input", async () => {
    const repo = makeRepoMock();
    const useCase = new RecordStudentAbsenceUseCase(repo, TODAY);

    await expect(
      useCase.execute(input({ studentMemberId: "  " })),
    ).rejects.toEqual({ type: "invalid-input" });
    await expect(useCase.execute(input({ classId: "" }))).rejects.toEqual({
      type: "invalid-input",
    });
    expect(repo.recordAbsence).not.toHaveBeenCalled();
  });

  it("does NOT pre-check duplicates itself — the repo/server owns that (FR-003)", async () => {
    const repo = makeRepoMock();
    repo.recordAbsence.mockRejectedValue({ type: "duplicate-date" });

    await expect(
      new RecordStudentAbsenceUseCase(repo, TODAY).execute(input()),
    ).rejects.toEqual({ type: "duplicate-date" });
    // The call WAS made: the client pre-check is a presentation concern.
    expect(repo.recordAbsence).toHaveBeenCalledTimes(1);
  });

  it("propagates the server's forbidden re-check (NFR-008, FR-008)", async () => {
    const repo = makeRepoMock();
    repo.recordAbsence.mockRejectedValue({ type: "forbidden" });

    await expect(
      new RecordStudentAbsenceUseCase(repo, TODAY).execute(
        input({ classId: "10A1" }),
      ),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
