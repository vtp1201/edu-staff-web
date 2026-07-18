import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

export class SaveClassAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  async execute(
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ): Promise<void> {
    if (!classId) throw new Error("classId required");
    if (!date) throw new Error("date required");
    if (records.length === 0) return;
    await this.repo.saveClassAttendance(classId, date, records);
  }
}
