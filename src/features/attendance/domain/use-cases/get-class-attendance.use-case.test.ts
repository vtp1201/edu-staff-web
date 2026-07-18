import { describe, expect, it, vi } from "vitest";
import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { GetClassAttendanceUseCase } from "./get-class-attendance.use-case";

const fakeRoster: AttendanceRoster = {
  classDate: { classId: "10A1", date: "2026-05-10" },
  records: [],
};

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

describe("GetClassAttendanceUseCase", () => {
  it("forwards classId/date to repo and returns the roster", async () => {
    const repo = makeRepo({
      getClassAttendance: vi.fn().mockResolvedValue(fakeRoster),
    });
    const uc = new GetClassAttendanceUseCase(repo);

    const result = await uc.execute("10A1", "2026-05-10");

    expect(repo.getClassAttendance).toHaveBeenCalledWith("10A1", "2026-05-10");
    expect(result).toBe(fakeRoster);
  });
});
