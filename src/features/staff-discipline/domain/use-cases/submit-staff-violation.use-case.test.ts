import { describe, expect, it } from "vitest";
import {
  makeRepoMock,
  PRINCIPAL_CTX,
  violation,
} from "./staff-discipline.test-doubles";
import { SubmitStaffViolationUseCase } from "./submit-staff-violation.use-case";

describe("SubmitStaffViolationUseCase (INT-003)", () => {
  it("transitions DRAFT → SUBMITTED (AC-003.1)", async () => {
    const repo = makeRepoMock();
    repo.submitStaffViolation.mockResolvedValue(
      violation({ state: "SUBMITTED" }),
    );

    const result = await new SubmitStaffViolationUseCase(repo).execute(
      "sv-002",
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("SUBMITTED");
    expect(repo.submitStaffViolation).toHaveBeenCalledWith(
      "sv-002",
      PRINCIPAL_CTX,
    );
  });

  it("propagates invalid-transition on a concurrent race (AC-003.3)", async () => {
    const repo = makeRepoMock();
    repo.submitStaffViolation.mockRejectedValue({ type: "invalid-transition" });

    await expect(
      new SubmitStaffViolationUseCase(repo).execute("sv-002", PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "invalid-transition" });
  });

  it("propagates not-found (AC-003.4) and forbidden (AC-003.5)", async () => {
    const repo = makeRepoMock();
    repo.submitStaffViolation.mockRejectedValueOnce({ type: "not-found" });
    await expect(
      new SubmitStaffViolationUseCase(repo).execute("nope", PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "not-found" });

    repo.submitStaffViolation.mockRejectedValueOnce({ type: "forbidden" });
    await expect(
      new SubmitStaffViolationUseCase(repo).execute("sv-002", PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
