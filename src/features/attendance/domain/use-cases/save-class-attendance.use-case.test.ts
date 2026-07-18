import { describe, expect, it, vi } from "vitest";
import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { SaveClassAttendanceUseCase } from "./save-class-attendance.use-case";

function makeRepo(
  over: Partial<IAttendanceRepository> = {},
): IAttendanceRepository {
  return {
    getMyHomeroomClasses: vi.fn(),
    getClassAttendance: vi.fn(),
    saveClassAttendance: vi.fn().mockResolvedValue(undefined),
    getAttendanceHistory: vi.fn(),
    ...over,
  };
}

const sampleRecords: AttendanceRecord[] = [
  { studentId: "S1", studentName: "A", status: "present" },
];

describe("SaveClassAttendanceUseCase", () => {
  it("delegates to repo with classId + date + records", async () => {
    const repo = makeRepo();
    const uc = new SaveClassAttendanceUseCase(repo);

    await uc.execute("10A1", "2026-05-10", sampleRecords);

    expect(repo.saveClassAttendance).toHaveBeenCalledWith(
      "10A1",
      "2026-05-10",
      sampleRecords,
    );
  });

  it("throws when classId is empty", async () => {
    const repo = makeRepo();
    const uc = new SaveClassAttendanceUseCase(repo);

    await expect(uc.execute("", "2026-05-10", sampleRecords)).rejects.toThrow(
      /classId/,
    );
    expect(repo.saveClassAttendance).not.toHaveBeenCalled();
  });

  it("throws when date is empty", async () => {
    const repo = makeRepo();
    const uc = new SaveClassAttendanceUseCase(repo);

    await expect(uc.execute("10A1", "", sampleRecords)).rejects.toThrow(/date/);
    expect(repo.saveClassAttendance).not.toHaveBeenCalled();
  });

  it("skips repo call when records is empty", async () => {
    const repo = makeRepo();
    const uc = new SaveClassAttendanceUseCase(repo);

    await uc.execute("10A1", "2026-05-10", []);

    expect(repo.saveClassAttendance).not.toHaveBeenCalled();
  });
});
