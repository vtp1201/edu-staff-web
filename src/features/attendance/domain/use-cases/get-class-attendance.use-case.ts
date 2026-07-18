import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

export class GetClassAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(classId: string, date: string): Promise<AttendanceRoster> {
    return this.repo.getClassAttendance(classId, date);
  }
}
