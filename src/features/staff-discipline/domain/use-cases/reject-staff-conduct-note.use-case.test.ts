import { describe, expect, it } from "vitest";
import { RejectStaffConductNoteUseCase } from "./reject-staff-conduct-note.use-case";
import {
  conductNote,
  makeRepoMock,
  PRINCIPAL_CTX,
} from "./staff-discipline.test-doubles";

const LONG_REASON = "Cần bổ sung minh chứng cụ thể cho đánh giá này.";

describe("RejectStaffConductNoteUseCase (INT-008 reject)", () => {
  it("transitions SUBMITTED → REJECTED with the reason (AC-008.5)", async () => {
    const repo = makeRepoMock();
    repo.rejectStaffConductNote.mockResolvedValue(
      conductNote({ state: "REJECTED", rejectionReason: LONG_REASON }),
    );

    const result = await new RejectStaffConductNoteUseCase(repo).execute(
      "staff-2",
      "HK1-2025-2026",
      LONG_REASON,
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("REJECTED");
    expect(repo.rejectStaffConductNote).toHaveBeenCalledWith(
      "staff-2",
      "HK1-2025-2026",
      LONG_REASON,
      PRINCIPAL_CTX,
    );
  });

  it("blocks a <10-char reason with the SAME shared guard, zero repo calls (AC-008.4)", async () => {
    const repo = makeRepoMock();

    await expect(
      new RejectStaffConductNoteUseCase(repo).execute(
        "staff-2",
        "HK1-2025-2026",
        "ngắn",
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });
    expect(repo.rejectStaffConductNote).not.toHaveBeenCalled();
  });

  it("propagates the server's non-empty guard as a distinct layer (AC-008.6)", async () => {
    const repo = makeRepoMock();
    repo.rejectStaffConductNote.mockRejectedValue({
      type: "missing-reject-reason",
    });

    await expect(
      new RejectStaffConductNoteUseCase(repo).execute(
        "staff-2",
        "HK1-2025-2026",
        LONG_REASON,
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });
    expect(repo.rejectStaffConductNote).toHaveBeenCalledTimes(1);
  });
});
