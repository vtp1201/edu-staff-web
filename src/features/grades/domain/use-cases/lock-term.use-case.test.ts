import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesTermRepository } from "../repositories/i-grades-term.repository";
import { LockTermUseCase } from "./lock-term.use-case";

const key: ClassSubjectTermKey = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

describe("LockTermUseCase", () => {
  it("returns ok + lockedCount on success", async () => {
    const lockTerm = vi.fn().mockResolvedValue({ lockedCount: 24 });
    const uc = new LockTermUseCase({ lockTerm } as IGradesTermRepository);
    const result = await uc.execute(key);
    expect(lockTerm).toHaveBeenCalledWith(key);
    expect(result).toEqual({ ok: true, lockedCount: 24 });
  });

  it("passes through a not-published failure (unlocked/incomplete entries remain)", async () => {
    const failure: GradesFailure = { type: "not-published" };
    const lockTerm = vi.fn().mockRejectedValue(failure);
    const uc = new LockTermUseCase({ lockTerm } as IGradesTermRepository);
    const result = await uc.execute(key);
    expect(result).toEqual(failure);
  });

  it("passes through a forbidden failure", async () => {
    const failure: GradesFailure = { type: "forbidden" };
    const lockTerm = vi.fn().mockRejectedValue(failure);
    const uc = new LockTermUseCase({ lockTerm } as IGradesTermRepository);
    expect(await uc.execute(key)).toEqual(failure);
  });

  it("maps a generic thrown error to network-error", async () => {
    const lockTerm = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new LockTermUseCase({ lockTerm } as IGradesTermRepository);
    expect(await uc.execute(key)).toEqual({ type: "network-error" });
  });
});
