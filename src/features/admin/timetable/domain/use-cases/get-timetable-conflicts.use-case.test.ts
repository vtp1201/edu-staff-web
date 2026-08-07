import { describe, expect, it, vi } from "vitest";
import type { TimetableConflictScan } from "../entities/timetable.entity";
import type { ITimetableRepository } from "../repositories/i-timetable.repository";
import { GetTimetableConflictsUseCase } from "./get-timetable-conflicts.use-case";

const SCAN: TimetableConflictScan = {
  termId: "term-1",
  truncated: false,
  conflicts: [
    {
      type: "teacher-double-booked",
      day: 0,
      period: 1,
      classes: [
        { classId: "cls-a", subjectId: "sub-1" },
        { classId: "cls-b", subjectId: "sub-1" },
      ],
      teacherId: "tch-1",
    },
  ],
};

function makeRepo(
  getConflicts: ITimetableRepository["getConflicts"],
): ITimetableRepository {
  return {
    getTimetable: vi.fn(),
    updateSlot: vi.fn(),
    clearSlot: vi.fn(),
    getConflicts,
  } as unknown as ITimetableRepository;
}

describe("GetTimetableConflictsUseCase", () => {
  it("returns ok with the scan, calling the repository with no arguments", async () => {
    const getConflicts = vi.fn(async () => SCAN);
    const repo = makeRepo(getConflicts);

    const result = await new GetTimetableConflictsUseCase(repo).execute();

    expect(getConflicts).toHaveBeenCalledWith();
    expect(result).toEqual({ ok: true, value: SCAN });
  });

  it("maps a thrown typed TimetableFailure to a failed Result", async () => {
    const repo = makeRepo(
      vi.fn(async () => {
        throw { type: "forbidden", message: "Forbidden" };
      }),
    );

    const result = await new GetTimetableConflictsUseCase(repo).execute();

    expect(result).toEqual({
      ok: false,
      failure: { type: "forbidden", message: "Forbidden" },
    });
  });

  it("maps an untyped throw to fetch-failed rather than leaking it", async () => {
    const repo = makeRepo(
      vi.fn(async () => {
        throw new Error("socket hang up");
      }),
    );

    const result = await new GetTimetableConflictsUseCase(repo).execute();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.failure.type).toBe("fetch-failed");
  });

  it("passes `truncated: true` straight through — it is a hint, not a failure", async () => {
    const repo = makeRepo(vi.fn(async () => ({ ...SCAN, truncated: true })));

    const result = await new GetTimetableConflictsUseCase(repo).execute();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.truncated).toBe(true);
  });
});
