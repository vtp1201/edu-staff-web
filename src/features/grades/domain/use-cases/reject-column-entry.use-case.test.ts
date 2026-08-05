import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeRejectionRepository } from "../repositories/i-grade-rejection.repository";
import {
  MAX_REJECTION_REASON_LENGTH,
  RejectColumnEntryUseCase,
} from "./reject-column-entry.use-case";

const key: ClassSubjectTermKey = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

const rejectedCell: StaffGradeCell = {
  value: 9,
  status: "DRAFT",
  rejection: {
    reason: "Sai điểm cuối kỳ",
    rejectedBy: "admin-1",
    rejectedAt: "2026-08-05T02:00:00Z",
  },
};

function makeRepo(
  over: Partial<IGradeRejectionRepository> = {},
): IGradeRejectionRepository {
  return { rejectEntry: vi.fn(), ...over } as IGradeRejectionRepository;
}

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x && !("cell" in x);
}

describe("RejectColumnEntryUseCase", () => {
  it("rejects a pending-approval cell and returns the updated cell", async () => {
    const rejectEntry = vi.fn().mockResolvedValue({
      studentId: "s1",
      columnId: "ck",
      cell: rejectedCell,
    });
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    const result = await uc.execute(key, "s1", "ck", "Sai điểm cuối kỳ");

    expect(rejectEntry).toHaveBeenCalledWith(
      key,
      "s1",
      "ck",
      "Sai điểm cuối kỳ",
    );
    expect(result).toEqual({
      studentId: "s1",
      columnId: "ck",
      cell: rejectedCell,
    });
  });

  it("trims the reason before sending it to the repository", async () => {
    const rejectEntry = vi.fn().mockResolvedValue({
      studentId: "s1",
      columnId: "ck",
      cell: rejectedCell,
    });
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    await uc.execute(key, "s1", "ck", "  Sai điểm  ");

    expect(rejectEntry).toHaveBeenCalledWith(key, "s1", "ck", "Sai điểm");
  });

  it("blocks an empty reason client-side without calling the repository", async () => {
    const rejectEntry = vi.fn();
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    const result = await uc.execute(key, "s1", "ck", "   \n  ");

    expect(rejectEntry).not.toHaveBeenCalled();
    expect(isFailure(result) && result.type).toBe("rejection-reason-required");
  });

  it("blocks an over-long reason client-side without calling the repository", async () => {
    const rejectEntry = vi.fn();
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    const result = await uc.execute(
      key,
      "s1",
      "ck",
      "x".repeat(MAX_REJECTION_REASON_LENGTH + 1),
    );

    expect(rejectEntry).not.toHaveBeenCalled();
    expect(isFailure(result) && result.type).toBe("rejection-reason-too-long");
  });

  it("accepts a reason of exactly the maximum length", async () => {
    const rejectEntry = vi.fn().mockResolvedValue({
      studentId: "s1",
      columnId: "ck",
      cell: rejectedCell,
    });
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    await uc.execute(key, "s1", "ck", "x".repeat(MAX_REJECTION_REASON_LENGTH));

    expect(rejectEntry).toHaveBeenCalledTimes(1);
  });

  it("returns the repository's typed failure (409 not-pending-approval)", async () => {
    const failure: GradesFailure = { type: "not-pending-approval" };
    const rejectEntry = vi.fn().mockRejectedValue(failure);
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    const result = await uc.execute(key, "s1", "ck", "Sai điểm");

    expect(isFailure(result) && result.type).toBe("not-pending-approval");
  });

  it("maps a non-failure throw to network-error", async () => {
    const rejectEntry = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new RejectColumnEntryUseCase(makeRepo({ rejectEntry }));

    const result = await uc.execute(key, "s1", "ck", "Sai điểm");

    expect(isFailure(result) && result.type).toBe("network-error");
  });
});
