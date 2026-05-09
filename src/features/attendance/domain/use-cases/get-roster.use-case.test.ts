import { describe, expect, it, vi } from "vitest";
import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { GetRosterUseCase } from "./get-roster.use-case";

const fakeRoster: AttendanceRoster = {
  period: {
    id: "P-1",
    classId: "10A1",
    className: "10A1",
    subject: "Toán",
    date: "2026-05-10",
    period: 1,
  },
  records: [],
};

describe("GetRosterUseCase", () => {
  it("forwards args to repo and returns roster", async () => {
    const repo: IAttendanceRepository = {
      listMyClasses: vi.fn(),
      getRoster: vi.fn().mockResolvedValue(fakeRoster),
      saveAttendance: vi.fn(),
      listHistory: vi.fn(),
    };
    const uc = new GetRosterUseCase(repo);
    const result = await uc.execute("10A1", "2026-05-10", 1);
    expect(repo.getRoster).toHaveBeenCalledWith("10A1", "2026-05-10", 1);
    expect(result).toBe(fakeRoster);
  });
});
