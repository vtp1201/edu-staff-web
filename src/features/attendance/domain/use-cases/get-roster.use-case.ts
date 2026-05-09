import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

export class GetRosterUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(
    classId: string,
    date: string,
    period: number,
  ): Promise<AttendanceRoster> {
    return this.repo.getRoster(classId, date, period);
  }
}
