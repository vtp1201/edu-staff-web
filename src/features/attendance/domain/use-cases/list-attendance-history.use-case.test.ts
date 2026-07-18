import { describe, expect, it, vi } from "vitest";
import type { AttendanceDaySummary } from "../entities/attendance-day-summary.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { ListAttendanceHistoryUseCase } from "./list-attendance-history.use-case";

function makeRepo(
  over: Partial<IAttendanceRepository> = {},
): IAttendanceRepository {
  return {
    getMyHomeroomClasses: vi.fn(),
    getClassAttendance: vi.fn(),
    saveClassAttendance: vi.fn(),
    getAttendanceHistory: vi.fn(),
    ...over,
  };
}

describe("ListAttendanceHistoryUseCase", () => {
  it("delegates to repo when the range is within 31 days", async () => {
    const summaries: AttendanceDaySummary[] = [
      {
        date: "2026-05-01",
        counts: { present: 1, absent: 0, late: 0, excusedAbsent: 0 },
        totalStudents: 1,
      },
    ];
    const repo = makeRepo({
      getAttendanceHistory: vi.fn().mockResolvedValue(summaries),
    });
    const uc = new ListAttendanceHistoryUseCase(repo);

    const result = await uc.execute("10A1", "2026-05-01", "2026-05-01");

    expect(repo.getAttendanceHistory).toHaveBeenCalledWith(
      "10A1",
      "2026-05-01",
      "2026-05-01",
    );
    expect(result).toBe(summaries);
  });

  it("accepts exactly a 31-day range (inclusive boundary)", async () => {
    const repo = makeRepo({
      getAttendanceHistory: vi.fn().mockResolvedValue([]),
    });
    const uc = new ListAttendanceHistoryUseCase(repo);

    await uc.execute("10A1", "2026-05-01", "2026-05-31");

    expect(repo.getAttendanceHistory).toHaveBeenCalled();
  });

  it("rejects a range over 31 days as invalid-request without calling repo", async () => {
    const repo = makeRepo();
    const uc = new ListAttendanceHistoryUseCase(repo);

    let caught: unknown;
    try {
      await uc.execute("10A1", "2026-05-01", "2026-06-02");
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect((caught as { type?: string }).type).toBe("invalid-request");
    expect(repo.getAttendanceHistory).not.toHaveBeenCalled();
  });
});
