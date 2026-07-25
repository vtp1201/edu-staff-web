import { describe, expect, it } from "vitest";
import {
  conductNote,
  makeRepoMock,
  PRINCIPAL_CTX,
} from "./staff-discipline.test-doubles";
import { SubmitStaffConductNoteUseCase } from "./submit-staff-conduct-note.use-case";

describe("SubmitStaffConductNoteUseCase (INT-007)", () => {
  it("transitions DRAFT → SUBMITTED for the natural key (AC-008.1)", async () => {
    const repo = makeRepoMock();
    repo.submitStaffConductNote.mockResolvedValue(
      conductNote({ state: "SUBMITTED" }),
    );

    const result = await new SubmitStaffConductNoteUseCase(repo).execute(
      "staff-4",
      "HK1-2025-2026",
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("SUBMITTED");
    expect(repo.submitStaffConductNote).toHaveBeenCalledWith(
      "staff-4",
      "HK1-2025-2026",
      PRINCIPAL_CTX,
    );
  });

  it("propagates invalid-transition (AC-008.7), not-found and forbidden (AC-008.8)", async () => {
    const repo = makeRepoMock();
    for (const type of [
      "invalid-transition",
      "not-found",
      "forbidden",
    ] as const) {
      repo.submitStaffConductNote.mockRejectedValueOnce({ type });
      await expect(
        new SubmitStaffConductNoteUseCase(repo).execute(
          "staff-4",
          "HK1-2025-2026",
          PRINCIPAL_CTX,
        ),
      ).rejects.toEqual({ type });
    }
  });
});
