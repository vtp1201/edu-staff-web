import { describe, expect, it, vi } from "vitest";
import type {
  ClassAttendanceRangeResult,
  IAttendanceRepository,
} from "../repositories/i-attendance.repository";
import { SummarizeClassAttendanceUseCase } from "./summarize-class-attendance.use-case";

function makeRepo(result: ClassAttendanceRangeResult) {
  const getClassAttendanceRange = vi.fn().mockResolvedValue(result);
  const repo = {
    getMyHomeroomClasses: vi.fn(),
    getClassAttendance: vi.fn(),
    saveClassAttendance: vi.fn(),
    getAttendanceHistory: vi.fn(),
    getClassAttendanceRange,
  } satisfies IAttendanceRepository;
  return { repo, getClassAttendanceRange };
}

describe("SummarizeClassAttendanceUseCase", () => {
  it("asks the repository for the range and rolls it up per student", async () => {
    const { repo, getClassAttendanceRange } = makeRepo({
      roster: [
        { studentId: "s1", name: "Nguyễn An" },
        { studentId: "s2", name: "Trần Bình" },
      ],
      records: [
        { studentId: "s1", status: "present", date: "2026-04-01" },
        { studentId: "s1", status: "absent", date: "2026-04-02" },
      ],
    });

    const summary = await new SummarizeClassAttendanceUseCase(repo).execute(
      "c-1",
      "2026-04-01",
      "2026-04-30",
    );

    expect(getClassAttendanceRange).toHaveBeenCalledWith(
      "c-1",
      "2026-04-01",
      "2026-04-30",
    );
    expect(summary.students).toHaveLength(2);
    expect(summary.students[0]).toMatchObject({ rate: 50, band: "risk" });
    // The student with no record keeps a row and stays out of the mean.
    expect(summary.students[1]).toMatchObject({ rate: null, band: null });
    expect(summary.meanRate).toBe(50);
  });

  it("rejects an over-366-day range WITHOUT touching the repository", async () => {
    const { repo, getClassAttendanceRange } = makeRepo({
      roster: [],
      records: [],
    });

    await expect(
      new SummarizeClassAttendanceUseCase(repo).execute(
        "c-1",
        "2025-01-01",
        "2026-06-01",
      ),
    ).rejects.toEqual({ type: "invalid-request" });
    expect(getClassAttendanceRange).not.toHaveBeenCalled();
  });

  it("accepts exactly 366 days", async () => {
    const { repo, getClassAttendanceRange } = makeRepo({
      roster: [],
      records: [],
    });

    await new SummarizeClassAttendanceUseCase(repo).execute(
      "c-1",
      "2025-06-01",
      "2026-06-01",
    );

    expect(getClassAttendanceRange).toHaveBeenCalledOnce();
  });

  it("propagates a repository failure untouched (the action maps it)", async () => {
    const repo = {
      getMyHomeroomClasses: vi.fn(),
      getClassAttendance: vi.fn(),
      saveClassAttendance: vi.fn(),
      getAttendanceHistory: vi.fn(),
      getClassAttendanceRange: vi.fn().mockRejectedValue({ type: "forbidden" }),
    } satisfies IAttendanceRepository;

    await expect(
      new SummarizeClassAttendanceUseCase(repo).execute(
        "c-1",
        "2026-04-01",
        "2026-04-30",
      ),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
