import { describe, expect, it } from "vitest";
import { ListStaffViolationsUseCase } from "./list-staff-violations.use-case";
import {
  makeRepoMock,
  PRINCIPAL_CTX,
  TEACHER_CTX,
  violation,
} from "./staff-discipline.test-doubles";

describe("ListStaffViolationsUseCase (INT-002)", () => {
  it("returns the repository's list and forwards params + authCtx verbatim", async () => {
    const repo = makeRepoMock();
    const rows = [violation()];
    repo.listStaffViolations.mockResolvedValue(rows);

    const result = await new ListStaffViolationsUseCase(repo).execute(
      { staffMemberId: "staff-4" },
      PRINCIPAL_CTX,
    );

    expect(result).toBe(rows);
    expect(repo.listStaffViolations).toHaveBeenCalledWith(
      { staffMemberId: "staff-4" },
      PRINCIPAL_CTX,
    );
  });

  it("does NOT re-scope a teacher's params itself — that is the server's job (NFR-008 pt.3)", async () => {
    const repo = makeRepoMock();
    repo.listStaffViolations.mockResolvedValue([]);

    await new ListStaffViolationsUseCase(repo).execute(
      { staffMemberId: "staff-9" },
      TEACHER_CTX,
    );

    // Passed through untouched: the repository is the enforcement boundary.
    expect(repo.listStaffViolations).toHaveBeenCalledWith(
      { staffMemberId: "staff-9" },
      TEACHER_CTX,
    );
  });

  it("propagates a repository failure (e.g. forbidden) unchanged", async () => {
    const repo = makeRepoMock();
    repo.listStaffViolations.mockRejectedValue({ type: "forbidden" });

    await expect(
      new ListStaffViolationsUseCase(repo).execute({}, TEACHER_CTX),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
