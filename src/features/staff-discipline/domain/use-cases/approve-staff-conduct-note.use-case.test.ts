import { describe, expect, it } from "vitest";
import { ApproveStaffConductNoteUseCase } from "./approve-staff-conduct-note.use-case";
import {
  conductNote,
  makeRepoMock,
  PRINCIPAL_CTX,
} from "./staff-discipline.test-doubles";

describe("ApproveStaffConductNoteUseCase (INT-008 approve)", () => {
  it("transitions SUBMITTED → APPROVED (AC-008.2)", async () => {
    const repo = makeRepoMock();
    repo.approveStaffConductNote.mockResolvedValue(
      conductNote({
        state: "APPROVED",
        approverMemberId: "admin-2",
        selfApproved: false,
      }),
    );

    const result = await new ApproveStaffConductNoteUseCase(repo).execute(
      "staff-2",
      "HK1-2025-2026",
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("APPROVED");
    expect(result.selfApproved).toBe(false);
  });

  it("surfaces selfApproved untouched when approver === author (AC-008.3)", async () => {
    const repo = makeRepoMock();
    repo.approveStaffConductNote.mockResolvedValue(
      conductNote({
        state: "APPROVED",
        authorMemberId: "admin-1",
        approverMemberId: "admin-1",
        selfApproved: true,
      }),
    );

    const result = await new ApproveStaffConductNoteUseCase(repo).execute(
      "staff-2",
      "HK1-2025-2026",
      PRINCIPAL_CTX,
    );

    expect(result.selfApproved).toBe(true);
  });

  it("propagates already-processed / not-found / forbidden", async () => {
    const repo = makeRepoMock();
    for (const type of [
      "already-processed",
      "not-found",
      "forbidden",
    ] as const) {
      repo.approveStaffConductNote.mockRejectedValueOnce({ type });
      await expect(
        new ApproveStaffConductNoteUseCase(repo).execute(
          "staff-2",
          "HK1-2025-2026",
          PRINCIPAL_CTX,
        ),
      ).rejects.toEqual({ type });
    }
  });
});
