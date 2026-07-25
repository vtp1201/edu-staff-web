import { describe, expect, it } from "vitest";
import type { EditStudentAbsenceInput } from "../entities/student-absence.entity";
import { EditStudentAbsenceUseCase } from "./edit-student-absence.use-case";
import { absence, makeRepoMock } from "./student-absence.test-doubles";

const key = {
  classId: "11B2",
  studentMemberId: "stu-1",
  date: "2026-05-05",
} as const;

describe("EditStudentAbsenceUseCase (INT-003)", () => {
  it("PATCHes only the changed field — a lone excused change carries NO reason (AC-004.2)", async () => {
    const repo = makeRepoMock();
    repo.editAbsence.mockResolvedValue(absence({ excused: false }));
    const input: EditStudentAbsenceInput = { ...key, excused: false };

    const result = await new EditStudentAbsenceUseCase(repo).execute(input);

    expect(result.excused).toBe(false);
    expect(repo.editAbsence).toHaveBeenCalledWith(input);
    // The use-case must not widen the body with an unchanged echo.
    const sent = repo.editAbsence.mock.calls[0][0] as EditStudentAbsenceInput;
    expect(Object.hasOwn(sent, "reason")).toBe(false);
  });

  it("PATCHes only reason when only reason changed", async () => {
    const repo = makeRepoMock();
    repo.editAbsence.mockResolvedValue(absence({ reason: "Đi khám răng." }));

    await new EditStudentAbsenceUseCase(repo).execute({
      ...key,
      reason: "Đi khám răng.",
    });

    const sent = repo.editAbsence.mock.calls[0][0] as EditStudentAbsenceInput;
    expect(Object.hasOwn(sent, "excused")).toBe(false);
    expect(sent.reason).toBe("Đi khám răng.");
  });

  it("accepts both fields together", async () => {
    const repo = makeRepoMock();
    repo.editAbsence.mockResolvedValue(absence());

    await new EditStudentAbsenceUseCase(repo).execute({
      ...key,
      reason: "Có giấy phép.",
      excused: true,
    });

    expect(repo.editAbsence).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty patch (no reason, no excused) with invalid-input", async () => {
    const repo = makeRepoMock();

    await expect(
      new EditStudentAbsenceUseCase(repo).execute({ ...key }),
    ).rejects.toEqual({ type: "invalid-input" });
    expect(repo.editAbsence).not.toHaveBeenCalled();
  });

  it("rejects a reason longer than 5000 chars with invalid-input", async () => {
    const repo = makeRepoMock();

    await expect(
      new EditStudentAbsenceUseCase(repo).execute({
        ...key,
        reason: "x".repeat(5001),
      }),
    ).rejects.toEqual({ type: "invalid-input" });
    expect(repo.editAbsence).not.toHaveBeenCalled();
  });

  it("rejects an incomplete natural key with invalid-input (identity is required, never editable)", async () => {
    const repo = makeRepoMock();
    const useCase = new EditStudentAbsenceUseCase(repo);

    await expect(
      useCase.execute({ ...key, classId: "", excused: true }),
    ).rejects.toEqual({ type: "invalid-input" });
    await expect(
      useCase.execute({ ...key, date: "2026-5-5", excused: true }),
    ).rejects.toEqual({ type: "invalid-input" });
    expect(repo.editAbsence).not.toHaveBeenCalled();
  });

  it("propagates the server's forbidden class-ownership re-check (NFR-008, FR-008)", async () => {
    const repo = makeRepoMock();
    repo.editAbsence.mockRejectedValue({ type: "forbidden" });

    await expect(
      new EditStudentAbsenceUseCase(repo).execute({
        ...key,
        classId: "10A1",
        excused: false,
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("propagates not-found (row changed/removed by another actor, AC-004.5)", async () => {
    const repo = makeRepoMock();
    repo.editAbsence.mockRejectedValue({ type: "not-found" });

    await expect(
      new EditStudentAbsenceUseCase(repo).execute({ ...key, excused: false }),
    ).rejects.toEqual({ type: "not-found" });
  });
});
