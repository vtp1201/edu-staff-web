import { describe, expect, it, vi } from "vitest";
import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { SaveAttendanceUseCase } from "./save-attendance.use-case";

function makeRepo(): IAttendanceRepository {
  return {
    listMyClasses: vi.fn(),
    getRoster: vi.fn(),
    saveAttendance: vi.fn().mockResolvedValue(undefined),
    listHistory: vi.fn(),
  };
}

const sampleRecords: AttendanceRecord[] = [
  {
    studentId: "S1",
    studentName: "A",
    studentCode: "C1",
    status: "present",
  },
];

describe("SaveAttendanceUseCase", () => {
  it("delegates to repo with periodId + records", async () => {
    const repo = makeRepo();
    const uc = new SaveAttendanceUseCase(repo);
    await uc.execute("P-1", sampleRecords);
    expect(repo.saveAttendance).toHaveBeenCalledWith("P-1", sampleRecords);
  });

  it("throws when periodId is empty", async () => {
    const repo = makeRepo();
    const uc = new SaveAttendanceUseCase(repo);
    await expect(uc.execute("", sampleRecords)).rejects.toThrow(/periodId/);
    expect(repo.saveAttendance).not.toHaveBeenCalled();
  });

  it("skips repo call when records is empty", async () => {
    const repo = makeRepo();
    const uc = new SaveAttendanceUseCase(repo);
    await uc.execute("P-1", []);
    expect(repo.saveAttendance).not.toHaveBeenCalled();
  });
});
