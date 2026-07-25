import { describe, expect, it } from "vitest";
import { ApproveStaffViolationUseCase } from "./approve-staff-violation.use-case";
import {
  makeRepoMock,
  PRINCIPAL_CTX,
  violation,
} from "./staff-discipline.test-doubles";

describe("ApproveStaffViolationUseCase (INT-004 approve)", () => {
  it("transitions SUBMITTED → APPROVED, non-self case has selfApproved false (AC-004.1)", async () => {
    const repo = makeRepoMock();
    repo.approveStaffViolation.mockResolvedValue(
      violation({
        state: "APPROVED",
        authorMemberId: "admin-1",
        approverMemberId: "admin-2",
        selfApproved: false,
      }),
    );

    const result = await new ApproveStaffViolationUseCase(repo).execute(
      "sv-001",
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("APPROVED");
    expect(result.selfApproved).toBe(false);
  });

  it("surfaces the read-derived selfApproved flag untouched when approver === author (AC-004.2)", async () => {
    const repo = makeRepoMock();
    repo.approveStaffViolation.mockResolvedValue(
      violation({
        state: "APPROVED",
        authorMemberId: "admin-1",
        approverMemberId: "admin-1",
        selfApproved: true,
      }),
    );

    const result = await new ApproveStaffViolationUseCase(repo).execute(
      "sv-001",
      PRINCIPAL_CTX,
    );

    // The use-case never recomputes/overrides it — single source of truth.
    expect(result.selfApproved).toBe(true);
  });

  it("propagates already-processed / not-found / forbidden / same-actor (AC-004.3–.5)", async () => {
    const repo = makeRepoMock();
    for (const type of [
      "already-processed",
      "not-found",
      "forbidden",
      "same-actor",
    ] as const) {
      repo.approveStaffViolation.mockRejectedValueOnce({ type });
      await expect(
        new ApproveStaffViolationUseCase(repo).execute("sv-001", PRINCIPAL_CTX),
      ).rejects.toEqual({ type });
    }
  });
});
