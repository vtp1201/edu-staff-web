import { describe, expect, it } from "vitest";
import { ListStaffConductNotesUseCase } from "./list-staff-conduct-notes.use-case";
import {
  conductNote,
  makeRepoMock,
  PRINCIPAL_CTX,
  TEACHER_CTX,
} from "./staff-discipline.test-doubles";

describe("ListStaffConductNotesUseCase (INT-006)", () => {
  it("forwards termId + staffMemberId + authCtx to the repository (AC-006.6)", async () => {
    const repo = makeRepoMock();
    const rows = [conductNote()];
    repo.listStaffConductNotes.mockResolvedValue(rows);

    const result = await new ListStaffConductNotesUseCase(repo).execute(
      { termId: "HK2-2024-2025" },
      PRINCIPAL_CTX,
    );

    expect(result).toBe(rows);
    expect(repo.listStaffConductNotes).toHaveBeenCalledWith(
      { termId: "HK2-2024-2025" },
      PRINCIPAL_CTX,
    );
  });

  it("does not re-scope a teacher's request itself (server-enforced, NFR-008 pt.3)", async () => {
    const repo = makeRepoMock();
    repo.listStaffConductNotes.mockResolvedValue([]);

    await new ListStaffConductNotesUseCase(repo).execute(
      { staffMemberId: "staff-9" },
      TEACHER_CTX,
    );

    expect(repo.listStaffConductNotes).toHaveBeenCalledWith(
      { staffMemberId: "staff-9" },
      TEACHER_CTX,
    );
  });

  it("propagates term-not-found (AC-006.8)", async () => {
    const repo = makeRepoMock();
    repo.listStaffConductNotes.mockRejectedValue({ type: "term-not-found" });

    await expect(
      new ListStaffConductNotesUseCase(repo).execute(
        { termId: "nope" },
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "term-not-found" });
  });
});
