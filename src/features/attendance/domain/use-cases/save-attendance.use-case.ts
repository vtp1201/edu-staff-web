import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

export class SaveAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  async execute(periodId: string, records: AttendanceRecord[]): Promise<void> {
    if (!periodId) throw new Error("periodId required");
    if (records.length === 0) return;
    await this.repo.saveAttendance(periodId, records);
  }
}
