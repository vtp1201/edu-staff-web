import type { ClassPeriod } from "../entities/class-period.entity";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

export class ListAttendanceHistoryUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(classId: string, from: string, to: string): Promise<ClassPeriod[]> {
    return this.repo.listHistory(classId, from, to);
  }
}
