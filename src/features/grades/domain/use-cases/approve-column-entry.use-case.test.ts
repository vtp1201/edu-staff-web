import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeDecisionRepository } from "../repositories/i-grade-decision.repository";
import { ApproveColumnEntryUseCase } from "./approve-column-entry.use-case";

const KEY: ClassSubjectTermKey = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

const APPROVED_CELL: StaffGradeCell = { value: 8, status: "PUBLISHED" };

function makeRepo(over: Partial<IGradeDecisionRepository> = {}) {
  return {
    rejectEntry: vi.fn(),
    approveEntry: vi.fn(async () => ({
      studentId: "hs-1",
      columnId: "ck",
      cell: APPROVED_CELL,
    })),
    ...over,
  } as unknown as IGradeDecisionRepository;
}

describe("ApproveColumnEntryUseCase", () => {
  it("approves ONE cell and returns the published cell", async () => {
    const repo = makeRepo();
    const result = await new ApproveColumnEntryUseCase(repo).execute(
      KEY,
      "hs-1",
      "ck",
    );
    expect(result).toEqual({
      studentId: "hs-1",
      columnId: "ck",
      cell: APPROVED_CELL,
    });
    expect(repo.approveEntry).toHaveBeenCalledWith(KEY, "hs-1", "ck");
  });

  /**
   * Approve carries NO reason (bare POST — BE `ApproveGradeUseCase` takes no
   * body), so unlike `RejectColumnEntryUseCase` there is nothing to validate
   * client-side: the use-case is a pure pass-through + failure boundary.
   */
  it("passes no reason argument to the repository", async () => {
    const repo = makeRepo();
    await new ApproveColumnEntryUseCase(repo).execute(KEY, "hs-1", "ck");
    expect(vi.mocked(repo.approveEntry).mock.calls[0]).toHaveLength(3);
  });

  it("returns a thrown GradesFailure as a value", async () => {
    const failure: GradesFailure = { type: "not-pending-approval" };
    const repo = makeRepo({
      approveEntry: vi.fn(async () => {
        throw failure;
      }),
    });
    await expect(
      new ApproveColumnEntryUseCase(repo).execute(KEY, "hs-1", "ck"),
    ).resolves.toEqual(failure);
  });

  it("maps a non-failure throw to network-error", async () => {
    const repo = makeRepo({
      approveEntry: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    await expect(
      new ApproveColumnEntryUseCase(repo).execute(KEY, "hs-1", "ck"),
    ).resolves.toEqual({ type: "network-error" });
  });
});
