import { describe, expect, it } from "vitest";
import {
  type SetStaffConductNoteInput,
  STAFF_CONDUCT_NOTE_MAX_LENGTH,
} from "../entities/staff-conduct-note.entity";
import { SetStaffConductNoteUseCase } from "./set-staff-conduct-note.use-case";
import {
  conductNote,
  makeRepoMock,
  PRINCIPAL_CTX,
} from "./staff-discipline.test-doubles";

const input = (
  over: Partial<SetStaffConductNoteInput> = {},
): SetStaffConductNoteInput => ({
  staffMemberId: "staff-2",
  termId: "HK1-2025-2026",
  academicYearId: "2025-2026",
  rating: "NEEDS_IMPROVEMENT",
  note: "Chậm tiến độ nộp báo cáo chuyên môn.",
  ...over,
});

describe("SetStaffConductNoteUseCase (INT-005)", () => {
  it("creates/overwrites and returns a DRAFT record (AC-007.3)", async () => {
    const repo = makeRepoMock();
    repo.setStaffConductNote.mockResolvedValue(conductNote({ state: "DRAFT" }));

    const result = await new SetStaffConductNoteUseCase(repo).execute(
      input(),
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("DRAFT");
    expect(repo.setStaffConductNote).toHaveBeenCalledWith(
      input(),
      PRINCIPAL_CTX,
    );
  });

  it("rejects an out-of-enum rating without a repository call (AC-007.7)", async () => {
    const repo = makeRepoMock();

    await expect(
      new SetStaffConductNoteUseCase(repo).execute(
        input({ rating: "GOOD" as never }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "invalid-rating" });
    expect(repo.setStaffConductNote).not.toHaveBeenCalled();
  });

  it("rejects a blank note", async () => {
    const repo = makeRepoMock();

    await expect(
      new SetStaffConductNoteUseCase(repo).execute(
        input({ note: "  " }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({
      type: "validation",
      fields: [{ field: "note", reason: "required" }],
    });
  });

  it("rejects a note over the 5000-character cap (AC-007.10)", async () => {
    const repo = makeRepoMock();

    await expect(
      new SetStaffConductNoteUseCase(repo).execute(
        input({ note: "x".repeat(STAFF_CONDUCT_NOTE_MAX_LENGTH + 1) }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({
      type: "validation",
      fields: [{ field: "note", reason: "too-long" }],
    });
    expect(repo.setStaffConductNote).not.toHaveBeenCalled();
  });

  it("accepts a note exactly at the cap", async () => {
    const repo = makeRepoMock();
    repo.setStaffConductNote.mockResolvedValue(conductNote());

    await expect(
      new SetStaffConductNoteUseCase(repo).execute(
        input({ note: "x".repeat(STAFF_CONDUCT_NOTE_MAX_LENGTH) }),
        PRINCIPAL_CTX,
      ),
    ).resolves.toBeDefined();
  });

  it("propagates the server's APPROVED-lock backstop (AC-007.5 / NFR-009)", async () => {
    const repo = makeRepoMock();
    repo.setStaffConductNote.mockRejectedValue({ type: "locked" });

    await expect(
      new SetStaffConductNoteUseCase(repo).execute(input(), PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "locked" });
  });

  it("propagates term-not-found (AC-007.6) and forbidden (AC-007 E5)", async () => {
    const repo = makeRepoMock();
    repo.setStaffConductNote.mockRejectedValueOnce({ type: "term-not-found" });
    await expect(
      new SetStaffConductNoteUseCase(repo).execute(input(), PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "term-not-found" });

    repo.setStaffConductNote.mockRejectedValueOnce({ type: "forbidden" });
    await expect(
      new SetStaffConductNoteUseCase(repo).execute(input(), PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
