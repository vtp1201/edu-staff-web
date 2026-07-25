import { describe, expect, it } from "vitest";
import { RejectStaffViolationUseCase } from "./reject-staff-violation.use-case";
import {
  makeRepoMock,
  PRINCIPAL_CTX,
  violation,
} from "./staff-discipline.test-doubles";

const LONG_REASON = "Có xác nhận của bảo vệ trường về sự cố bất khả kháng.";

describe("RejectStaffViolationUseCase (INT-004 reject)", () => {
  it("transitions SUBMITTED → REJECTED with the reason (AC-005.2)", async () => {
    const repo = makeRepoMock();
    repo.rejectStaffViolation.mockResolvedValue(
      violation({ state: "REJECTED", rejectionReason: LONG_REASON }),
    );

    const result = await new RejectStaffViolationUseCase(repo).execute(
      { recordId: "sv-001", rejectionReason: LONG_REASON },
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("REJECTED");
    expect(result.rejectionReason).toBe(LONG_REASON);
  });

  it("blocks a <10-char reason client-side, zero repository calls (AC-005.1, layer 1)", async () => {
    const repo = makeRepoMock();

    await expect(
      new RejectStaffViolationUseCase(repo).execute(
        { recordId: "sv-001", rejectionReason: "ngắn" },
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });
    expect(repo.rejectStaffViolation).not.toHaveBeenCalled();
  });

  it("propagates the server's own non-empty guard as a distinct layer (AC-005.3, layer 2)", async () => {
    const repo = makeRepoMock();
    repo.rejectStaffViolation.mockRejectedValue({
      type: "missing-reject-reason",
    });

    await expect(
      new RejectStaffViolationUseCase(repo).execute(
        { recordId: "sv-001", rejectionReason: LONG_REASON },
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });
    // Layer 2 is only reachable BECAUSE layer 1 passed here.
    expect(repo.rejectStaffViolation).toHaveBeenCalledTimes(1);
  });

  it("propagates already-processed on a race (AC-005.4)", async () => {
    const repo = makeRepoMock();
    repo.rejectStaffViolation.mockRejectedValue({ type: "already-processed" });

    await expect(
      new RejectStaffViolationUseCase(repo).execute(
        { recordId: "sv-001", rejectionReason: LONG_REASON },
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "already-processed" });
  });
});
